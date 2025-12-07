"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import type { SafeProduct } from "@/app/page";
import type { Database } from "@/lib/database.types";

// Row type from Supabase
export type Parallel = Database["public"]["Tables"]["parallels"]["Row"];

// Only these 7 booleans drive badges
type BadgeKeys =
  | "is_hobby_exclusive"
  | "is_retail_exclusive"
  | "is_fotl_exclusive"
  | "is_numbered"
  | "is_auto"
  | "is_sp"
  | "is_ssp";

const BADGE_DEFS: { key: BadgeKeys; label: string }[] = [
  { key: "is_hobby_exclusive", label: "Hobby Exclusive" },
  { key: "is_retail_exclusive", label: "Retail Exclusive" },
  { key: "is_fotl_exclusive", label: "FOTL Exclusive" },
  { key: "is_numbered", label: "Serial Numbered" },
  { key: "is_auto", label: "Auto" },
  { key: "is_sp", label: "SP" },
  { key: "is_ssp", label: "SSP" },
];

type AdminUploadTabProps = {
  products: SafeProduct[];
};

export default function AdminUploadTab({ products }: AdminUploadTabProps) {
  // filters
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  // parallels for the selected set
  const [parallels, setParallels] = useState<Parallel[]>([]);
  const [selectedParallelId, setSelectedParallelId] = useState<string | null>(
    null
  );

  // files
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  // badge toggle state
  const [badges, setBadges] = useState<Record<BadgeKeys, boolean>>({
    is_hobby_exclusive: false,
    is_retail_exclusive: false,
    is_fotl_exclusive: false,
    is_numbered: false,
    is_auto: false,
    is_sp: false,
    is_ssp: false,
  });

  // status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load parallels whenever the selected product changes
  useEffect(() => {
    if (!selectedProductId) {
      setParallels([]);
      setSelectedParallelId(null);
      return;
    }

    const loadParallels = async () => {
      setError(null);

      const { data, error } = await supabase
        .from("parallels")
        .select("*")
        .eq("product_id", selectedProductId);

      if (error) {
        console.error("Error loading parallels:", error);
        setError("Failed to load parallels for this set.");
        setParallels([]);
        return;
      }

      setParallels(data ?? []);
    };

    loadParallels();
  }, [selectedProductId]);

  const handleBadgeToggle = (key: BadgeKeys, value: boolean) => {
    setBadges((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!selectedParallelId) {
      setError("Please select a parallel.");
      return;
    }

    if (!frontFile || !backFile) {
      setError("Please upload both front and back images.");
      return;
    }

    setIsSubmitting(true);

    try {
      const bucket = "parallel-images"; // must match your Supabase bucket name
      const folder = `parallels/${selectedParallelId}`;

      const frontExt = frontFile.name.split(".").pop() ?? "jpg";
      const backExt = backFile.name.split(".").pop() ?? "jpg";

      const frontPath = `${folder}/front-${Date.now()}.${frontExt}`;
      const backPath = `${folder}/back-${Date.now()}.${backExt}`;

      // upload front
      const { error: frontErr } = await supabase.storage
        .from(bucket)
        .upload(frontPath, frontFile, { upsert: true });

      if (frontErr) {
        console.error("Front upload error:", frontErr);
        throw new Error(frontErr.message ?? "Failed to upload front image.");
      }

      // upload back
      const { error: backErr } = await supabase.storage
        .from(bucket)
        .upload(backPath, backFile, { upsert: true });

      if (backErr) {
        console.error("Back upload error:", backErr);
        throw new Error(backErr.message ?? "Failed to upload back image.");
      }

      // insert image records
      const { error: insertErr } = await supabase
        .from("parallel_images")
        .insert([
          {
            parallel_id: selectedParallelId,
            storage_path: frontPath,
          },
          {
            parallel_id: selectedParallelId,
            storage_path: backPath,
          },
        ]);

      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw new Error("Failed to save image records.");
      }

      // update badges on the parallel row
      const { error: updateErr } = await supabase
        .from("parallels")
        .update({ ...badges })
        .eq("id", selectedParallelId);

      if (updateErr) {
        console.error("Badge update error:", updateErr);
        throw new Error("Images uploaded, but failed to update badges.");
      }

      // reset parallel/files/badges (keep year + set)
      setMessage("Upload successful and badges updated.");
      setSelectedParallelId(null);
      setFrontFile(null);
      setBackFile(null);
      setBadges({
        is_hobby_exclusive: false,
        is_retail_exclusive: false,
        is_fotl_exclusive: false,
        is_numbered: false,
        is_auto: false,
        is_sp: false,
        is_ssp: false,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong while uploading.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // derived lists
  const yearOptions = Array.from(
    new Set(products.map((p) => p.year).filter((y): y is number => !!y))
  ).sort((a, b) => b - a);

  const filteredProducts =
    selectedYear === ""
      ? []
      : products.filter((p) => p.year === Number(selectedYear));

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-semibold">Admin: Upload Parallel Images</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Year */}
        <div className="space-y-2">
          <Label>Year</Label>
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              setSelectedYear(value);
              setSelectedProductId(null);
              setParallels([]);
              setSelectedParallelId(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Set */}
        <div className="space-y-2">
          <Label>Set</Label>
          <Select
            value={selectedProductId ?? ""}
            onValueChange={(value) => {
              setSelectedProductId(value);
              setSelectedParallelId(null);
            }}
            disabled={!selectedYear}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a set" />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              {filteredProducts.length === 0 && selectedYear && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  No sets found for {selectedYear}.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Parallel */}
        <div className="space-y-2">
          <Label>Select Parallel</Label>
          <Select
            value={selectedParallelId ?? ""}
            onValueChange={(value) => setSelectedParallelId(value)}
            disabled={!selectedProductId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a parallel" />
            </SelectTrigger>
            <SelectContent>
              {parallels.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name ?? p.slug ?? p.id}
                </SelectItem>
              ))}
              {selectedProductId && parallels.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">
                  No parallels found for this set.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Files */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="front">Front image</Label>
            <Input
              id="front"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFrontFile(e.target.files ? e.target.files[0] : null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="back">Back image</Label>
            <Input
              id="back"
              type="file"
              accept="image/*"
              onChange={(e) =>
                setBackFile(e.target.files ? e.target.files[0] : null)
              }
            />
          </div>
        </div>

        {/* Badges */}
        <div className="space-y-3">
          <Label>Badges</Label>
          <div className="grid grid-cols-2 gap-3">
            {BADGE_DEFS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">{label}</span>
                <Switch
                  checked={badges[key]}
                  onCheckedChange={(value) => handleBadgeToggle(key, value)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Status */}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {message && <p className="text-sm text-green-500">{message}</p>}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Uploading..." : "Upload & Save"}
        </Button>
      </form>
    </div>
  );
}

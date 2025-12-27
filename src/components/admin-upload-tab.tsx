"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ParallelRow = Database["public"]["Tables"]["parallels"]["Row"];
type ParallelUpdate = Database["public"]["Tables"]["parallels"]["Update"];

type BadgeKeys =
  | "is_hobby_exclusive"
  | "is_retail_exclusive"
  | "is_fotl_hit"
  | "is_numbered"
  | "is_auto"
  | "is_sp"
  | "is_ssp";

const BADGE_DEFS: ReadonlyArray<{ key: BadgeKeys; label: string }> = [
  { key: "is_hobby_exclusive", label: "Hobby" },
  { key: "is_retail_exclusive", label: "Retail" },
  { key: "is_fotl_hit", label: "FOTL" },
  { key: "is_numbered", label: "#'d" },
  { key: "is_auto", label: "Auto" },
  { key: "is_sp", label: "SP" },
  { key: "is_ssp", label: "SSP" },
] as const;

type AdminUploadTabProps = {
  products: SafeProduct[];
};

type BulkRow = {
  localKey: string;
  id: string; // existing only
  product_id: string;
  name: string;
  badges: Record<BadgeKeys, boolean>;
};

type Side = "front" | "back";

type ParallelImageRec = {
  // We try to read id if it exists in your table; if not, we'll delete by (parallel_id + storage_path)
  id?: string;
  parallel_id: string;
  storage_path?: string | null;
};

type ImageIndex = {
  count: number;
  front?: ParallelImageRec;
  back?: ParallelImageRec;
};

const IMAGE_BUCKET = "parallel-images"; // <-- IMPORTANT: set to your real bucket name

function cloneRow(r: BulkRow): BulkRow {
  return JSON.parse(JSON.stringify(r)) as BulkRow;
}

function getFotlHit(p: ParallelRow): boolean {
  const maybe = p as unknown as { is_fotl_hit?: boolean | null };
  return !!maybe.is_fotl_hit;
}

function makeBadgesFromParallel(p: ParallelRow): Record<BadgeKeys, boolean> {
  return {
    is_hobby_exclusive: !!p.is_hobby_exclusive,
    is_retail_exclusive: !!p.is_retail_exclusive,
    is_fotl_hit: getFotlHit(p),
    is_numbered: !!p.is_numbered,
    is_auto: !!p.is_auto,
    is_sp: !!p.is_sp,
    is_ssp: !!p.is_ssp,
  };
}

function badgesEqual(
  a: Record<BadgeKeys, boolean>,
  b: Record<BadgeKeys, boolean>
): boolean {
  return (Object.keys(a) as BadgeKeys[]).every((k) => a[k] === b[k]);
}

function toParallelUpdate(r: BulkRow): ParallelUpdate {
  return {
    is_hobby_exclusive: r.badges.is_hobby_exclusive,
    is_retail_exclusive: r.badges.is_retail_exclusive,
    is_fotl_hit: r.badges.is_fotl_hit,
    is_numbered: r.badges.is_numbered,
    is_auto: r.badges.is_auto,
    is_sp: r.badges.is_sp,
    is_ssp: r.badges.is_ssp,
  };
}

function fileExt(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? (parts.pop() || "jpg").toLowerCase() : "jpg";
}

function detectSideFromPath(path?: string | null): Side | null {
  if (!path) return null;
  const p = path.toLowerCase();
  if (p.includes("/front-") || p.includes("/front/") || p.includes("front-"))
    return "front";
  if (p.includes("/back-") || p.includes("/back/") || p.includes("back-"))
    return "back";
  return null;
}

function shortPath(path?: string | null, max = 42) {
  if (!path) return "";
  if (path.length <= max) return path;
  return `${path.slice(0, Math.floor(max / 2))}…${path.slice(
    -Math.floor(max / 2)
  )}`;
}

export default function AdminUploadTab({ products }: AdminUploadTabProps) {
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );

  const [rows, setRows] = useState<BulkRow[]>([]);
  const initialRowsRef = useRef<Map<string, BulkRow>>(new Map());

  // Indexed images per parallel (front/back + count + record info)
  const [imageIndex, setImageIndex] = useState<Record<string, ImageIndex>>({});

  // selected files per row (front/back)
  const [pendingFiles, setPendingFiles] = useState<
    Record<string, { front?: File; back?: File }>
  >({});

  // per-row upload state
  const [uploading, setUploading] = useState<Record<string, Side | null>>({});

  // per-row delete state
  const [deleting, setDeleting] = useState<Record<string, Side | null>>({});

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => {
    return Array.from(
      new Set(products.map((p) => p.year).filter((y): y is number => !!y))
    ).sort((a, b) => b - a);
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedYear) return [];
    const year = Number(selectedYear);
    return products.filter((p) => p.year === year);
  }, [products, selectedYear]);

  async function reloadCurrentProduct() {
    if (!selectedProductId) return;
    const pid = selectedProductId;
    setSelectedProductId(null);
    queueMicrotask(() => setSelectedProductId(pid));
  }

  useEffect(() => {
    const load = async () => {
      setError(null);
      setMessage(null);

      if (!selectedProductId) {
        setRows([]);
        setImageIndex({});
        setPendingFiles({});
        initialRowsRef.current = new Map();
        return;
      }

      // 1) load parallels
      const { data: parallels, error: parallelsErr } = await supabase
        .from("parallels")
        .select("*")
        .eq("product_id", selectedProductId);

      if (parallelsErr) {
        console.error("Error loading parallels:", parallelsErr);
        setError("Failed to load parallels for this set.");
        setRows([]);
        setImageIndex({});
        initialRowsRef.current = new Map();
        return;
      }

      const safe = parallels ?? [];

      // 2) load images (front/back + count + record info)
      const nextIndex: Record<string, ImageIndex> = {};
      if (safe.length > 0) {
        const ids = safe.map((p) => p.id);

        const { data: imgs, error: imgsErr } = await supabase
          .from("parallel_images")
          .select("*")
          .in("parallel_id", ids);

        if (imgsErr) {
          console.warn("Could not load image info:", imgsErr);
        } else {
          for (const raw of imgs ?? []) {
            const r = raw as unknown as ParallelImageRec;

            const pid = r.parallel_id;
            if (!nextIndex[pid]) nextIndex[pid] = { count: 0 };
            nextIndex[pid].count += 1;

            const side = detectSideFromPath(r.storage_path);
            if (!side) continue;

            // Keep the first detected front/back as the "primary" one for delete buttons.
            if (side === "front" && !nextIndex[pid].front)
              nextIndex[pid].front = r;
            if (side === "back" && !nextIndex[pid].back)
              nextIndex[pid].back = r;
          }
        }
      }

      setImageIndex(nextIndex);

      const mapped: BulkRow[] = safe.map((p) => ({
        localKey: p.id,
        id: p.id,
        product_id: p.product_id,
        name: (p.name ?? "").toString(),
        badges: makeBadgesFromParallel(p),
      }));

      setRows(mapped);

      const snap = new Map<string, BulkRow>();
      for (const r of mapped) snap.set(r.localKey, cloneRow(r));
      initialRowsRef.current = snap;

      // clear pending file selections when switching sets
      setPendingFiles({});
      setUploading({});
      setDeleting({});
    };

    load();
  }, [selectedProductId]);

  const updateBadge = (localKey: string, key: BadgeKeys, value: boolean) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.localKey !== localKey) return r;
        return { ...r, badges: { ...r.badges, [key]: value } };
      })
    );
  };

  const isDirty = (r: BulkRow) => {
    const initial = initialRowsRef.current.get(r.localKey);
    if (!initial) return true;
    return !badgesEqual(initial.badges, r.badges);
  };

  const handleSaveBadges = async () => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const changed = rows.filter((r) => isDirty(r));
      if (changed.length === 0) {
        setMessage("No badge changes to save.");
        return;
      }

      const ops = changed.map((r) =>
        supabase.from("parallels").update(toParallelUpdate(r)).eq("id", r.id)
      );

      const results = await Promise.all(ops);
      const firstErr = results.find((x) => x.error)?.error;
      if (firstErr) {
        console.error("Update parallels error:", firstErr);
        throw new Error(firstErr.message ?? "Failed to update parallels.");
      }

      setMessage(`Saved ${changed.length} parallel badge update(s).`);
      await reloadCurrentProduct();
    } catch (e: unknown) {
      const msg =
        e instanceof Error ? e.message : "Something went wrong while saving.";
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const setRowFile = (localKey: string, side: Side, file?: File) => {
    setPendingFiles((prev) => ({
      ...prev,
      [localKey]: { ...(prev[localKey] ?? {}), [side]: file },
    }));
  };

  const uploadSide = async (localKey: string, side: Side) => {
    setError(null);
    setMessage(null);

    const row = rows.find((r) => r.localKey === localKey);
    if (!row) return;

    const file = pendingFiles[localKey]?.[side];
    if (!file) {
      setError(`Choose a ${side} image first.`);
      return;
    }

    setUploading((prev) => ({ ...prev, [localKey]: side }));

    try {
      const ext = fileExt(file.name);
      const uuid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      // Put side in the filename so we can infer front/back later without extra DB columns
      const path = `${row.product_id}/${row.id}/${side}-${uuid}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file, { upsert: false });

      if (upErr) throw upErr;

      // Insert record into parallel_images
      const { error: dbErr } = await supabase.from("parallel_images").insert({
        parallel_id: row.id,
        storage_path: path,
      } as any);

      if (dbErr) throw dbErr;

      setMessage(`Uploaded ${side} image for "${row.name}".`);

      // clear that selected file
      setRowFile(localKey, side, undefined);

      // refresh indicators
      await reloadCurrentProduct();
    } catch (e: any) {
      setError(e?.message ?? `Failed to upload ${side} image.`);
    } finally {
      setUploading((prev) => ({ ...prev, [localKey]: null }));
    }
  };

  const deleteSide = async (localKey: string, side: Side) => {
    setError(null);
    setMessage(null);

    const row = rows.find((r) => r.localKey === localKey);
    if (!row) return;

    const idx = imageIndex[row.id];
    const rec = side === "front" ? idx?.front : idx?.back;
    const path = rec?.storage_path ?? undefined;

    if (!path) {
      setError(`No ${side} image found to delete.`);
      return;
    }

    const ok = window.confirm(
      `Delete the ${side} image for "${row.name}"?\n\n${path}`
    );
    if (!ok) return;

    setDeleting((prev) => ({ ...prev, [localKey]: side }));

    try {
      // 1) delete from storage
      const { error: storageErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([path]);

      if (storageErr) throw storageErr;

      // 2) delete from DB
      // Prefer deleting by id if your table has it, else fallback to (parallel_id + storage_path)
      if (rec?.id) {
        const { error: dbErr } = await supabase
          .from("parallel_images")
          .delete()
          .eq("id", rec.id);

        if (dbErr) throw dbErr;
      } else {
        const { error: dbErr } = await supabase
          .from("parallel_images")
          .delete()
          .eq("parallel_id", row.id)
          .eq("storage_path", path);

        if (dbErr) throw dbErr;
      }

      setMessage(`Deleted ${side} image for "${row.name}".`);
      await reloadCurrentProduct();
    } catch (e: any) {
      setError(e?.message ?? `Failed to delete ${side} image.`);
    } finally {
      setDeleting((prev) => ({ ...prev, [localKey]: null }));
    }
  };

  return (
    <div className="space-y-4 text-slate-100">
      <h2 className="text-xl font-semibold">
        Admin: Parallels (Badges + Photos)
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-slate-200">Year</Label>
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              setSelectedYear(value);
              setSelectedProductId(null);
              setRows([]);
              setImageIndex({});
              setPendingFiles({});
              initialRowsRef.current = new Map();
              setMessage(null);
              setError(null);
            }}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
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

        <div className="space-y-2">
          <Label className="text-slate-200">Set</Label>
          <Select
            value={selectedProductId ?? ""}
            onValueChange={(value) => {
              setSelectedProductId(value);
              setMessage(null);
              setError(null);
            }}
            disabled={!selectedYear}
          >
            <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
              <SelectValue placeholder="Choose a set" />
            </SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
              {filteredProducts.length === 0 && selectedYear && (
                <div className="px-3 py-2 text-xs text-slate-300">
                  No sets found for {selectedYear}.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="default"
          onClick={handleSaveBadges}
          disabled={!selectedProductId || isSaving}
        >
          {isSaving ? "Saving..." : "Save badge changes"}
        </Button>

        {error && <p className="text-sm text-red-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-950/60">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-slate-900 text-slate-100">
            <tr className="text-left">
              <th className="px-3 py-3 w-[230px]">Parallel</th>
              <th className="px-3 py-3 w-[220px]">Photos</th>
              <th className="px-3 py-3 w-[260px]">Front Photo</th>
              <th className="px-3 py-3 w-[260px]">Back Photo</th>
              <th className="px-3 py-3">Badges</th>
            </tr>
          </thead>

          <tbody className="text-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-8 text-slate-300" colSpan={5}>
                  Select a year + set to load parallels.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const idxRec = imageIndex[r.id] ?? { count: 0 };
                const hasFront = !!idxRec.front?.storage_path;
                const hasBack = !!idxRec.back?.storage_path;

                const rowUploading = uploading[r.localKey] ?? null;
                const rowDeleting = deleting[r.localKey] ?? null;

                return (
                  <tr
                    key={r.localKey}
                    className={[
                      "border-t border-slate-800",
                      idx % 2 === 0 ? "bg-slate-950/40" : "bg-slate-900/25",
                    ].join(" ")}
                  >
                    {/* Name (read-only) */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-1">
                        <div className="font-medium text-slate-50">
                          {r.name}
                        </div>
                        <div className="text-xs text-slate-300">
                          ID: <span className="text-slate-200">{r.id}</span>
                        </div>
                      </div>
                    </td>

                    {/* Photo status + delete */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2 text-xs">
                        <div className="text-slate-200">
                          {idxRec.count} img total
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-slate-200">
                              Front:{" "}
                              <span
                                className={
                                  hasFront
                                    ? "text-emerald-300"
                                    : "text-slate-400"
                                }
                              >
                                {hasFront ? "✅" : "—"}
                              </span>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!hasFront || rowDeleting === "front"}
                              onClick={() => deleteSide(r.localKey, "front")}
                            >
                              {rowDeleting === "front"
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>

                          {hasFront && (
                            <div className="font-mono text-[11px] text-slate-300">
                              {shortPath(idxRec.front?.storage_path)}
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-slate-200">
                              Back:{" "}
                              <span
                                className={
                                  hasBack
                                    ? "text-emerald-300"
                                    : "text-slate-400"
                                }
                              >
                                {hasBack ? "✅" : "—"}
                              </span>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!hasBack || rowDeleting === "back"}
                              onClick={() => deleteSide(r.localKey, "back")}
                            >
                              {rowDeleting === "back"
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>

                          {hasBack && (
                            <div className="font-mono text-[11px] text-slate-300">
                              {shortPath(idxRec.back?.storage_path)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Front upload */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-slate-950 border-slate-700 text-slate-100 file:text-slate-100"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setRowFile(r.localKey, "front", f);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={
                              !pendingFiles[r.localKey]?.front ||
                              rowUploading === "front"
                            }
                            onClick={() => uploadSide(r.localKey, "front")}
                          >
                            {rowUploading === "front"
                              ? "Uploading..."
                              : "Upload Front"}
                          </Button>
                        </div>
                      </div>
                    </td>

                    {/* Back upload */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-col gap-2">
                        <Input
                          type="file"
                          accept="image/*"
                          className="bg-slate-950 border-slate-700 text-slate-100 file:text-slate-100"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            setRowFile(r.localKey, "back", f);
                          }}
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={
                              !pendingFiles[r.localKey]?.back ||
                              rowUploading === "back"
                            }
                            onClick={() => uploadSide(r.localKey, "back")}
                          >
                            {rowUploading === "back"
                              ? "Uploading..."
                              : "Upload Back"}
                          </Button>
                        </div>
                      </div>
                    </td>

                    {/* Badges */}
                    <td className="px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-3">
                        {BADGE_DEFS.map(({ key, label }) => (
                          <div
                            key={key}
                            className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-950/50 px-2 py-1"
                            title={label}
                          >
                            <span className="text-xs text-slate-200">
                              {label}
                            </span>
                            <Switch
                              checked={r.badges[key]}
                              onCheckedChange={(v) =>
                                updateBadge(r.localKey, key, v)
                              }
                            />
                          </div>
                        ))}
                        {isDirty(r) && (
                          <span className="inline-flex items-center rounded-full bg-amber-200/20 px-2 py-0.5 text-xs text-amber-200">
                            Unsaved badge changes
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-300">
        Front/Back detection is inferred from the stored file path (we upload as{" "}
        <span className="text-slate-200">front-*.ext</span> and{" "}
        <span className="text-slate-200">back-*.ext</span>).
      </p>
    </div>
  );
}

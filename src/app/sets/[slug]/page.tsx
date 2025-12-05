// src/app/sets/[slug]/page.tsx

import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { FlippableImage } from "@/components/FlippableImage";

// Props type for Next 16 App Router (params is a Promise)
type SetPageProps = {
  params: Promise<{ slug: string }>;
};

type ProductRow = {
  id: string;
  full_display_name: string;
  slug: string;
  year: number;
  manufacturers?: { name: string | null; slug: string | null } | null;
  sports?: { name: string | null; slug: string | null } | null;
};

type ParallelImageRow = {
  storage_path: string;
};

type ParallelRow = {
  id: string;
  name: string;
  slug: string;
  serial_min: number | null;
  serial_max: number | null;
  is_case_hit: boolean | null;
  rarity_tier: string | null;
  is_hobby_exclusive: boolean | null;
  is_retail_exclusive: boolean | null;
  notes: string | null;
  sort_order: number | null;
  // IMPORTANT: actually load this relation
  parallel_images: ParallelImageRow[] | null;
};

// Helper: clean up the display name
// - removes trailing " - /99" style serial suffixes
// - removes "FOTL" from the title text
function displayParallelName(name: string) {
  // remove " - /99" or similar
  let cleaned = name.replace(/\s*-\s*\/\d+$/i, "");

  // remove the word "FOTL" anywhere in the name
  cleaned = cleaned.replace(/\bFOTL\b/gi, "");

  // collapse extra spaces / stray dashes and trim
  cleaned = cleaned.replace(/\s+/g, " ").replace(/[-–]\s*$/, "");

  return cleaned.trim();
}

// Helper: derive checklist flags from the row
// (no more "case hit" entry)
function buildChecklist(parallel: {
  name: string;
  serial_max: number | null;
  is_hobby_exclusive: boolean | null;
  is_retail_exclusive: boolean | null;
  rarity_tier: string | null;
}) {
  const isSerial = parallel.serial_max != null;
  const isFOTL = parallel.name.toLowerCase().includes("fotl");

  const rarity = (parallel.rarity_tier ?? "").toLowerCase();
  const isSP = rarity === "sp";
  const isSSP = rarity === "ssp";

  return [
    {
      key: "serial",
      label: isSerial
        ? `Serial numbered /${parallel.serial_max}`
        : "Not numbered",
      active: isSerial,
    },
    {
      key: "fotl",
      label: "FOTL exclusive",
      active: isFOTL,
    },
    {
      key: "hobby",
      label: "Hobby exclusive",
      active: !!parallel.is_hobby_exclusive,
    },
    {
      key: "retail",
      label: "Retail exclusive",
      active: !!parallel.is_retail_exclusive,
    },
    {
      key: "sp",
      label: "SP (short print)",
      active: isSP,
    },
    {
      key: "ssp",
      label: "SSP (super short print)",
      active: isSSP,
    },
  ];
}

export default async function SetPage(props: SetPageProps) {
  const { slug } = await props.params;

  // Load the product (set) by slug
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      `
      id,
      full_display_name,
      slug,
      year,
      manufacturers ( name, slug ),
      sports ( name, slug )
    `.trim()
    )
    .eq("slug", slug)
    .maybeSingle<ProductRow>();

  // If we don't find the set, show a simple not-found state
  if (productError || !product) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-emerald-400" />
              <span className="text-lg font-semibold tracking-tight">
                CardCheck
              </span>
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set not found
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            We couldn&apos;t find a set with slug{" "}
            <code className="rounded bg-slate-900 px-2 py-1 text-xs">
              {slug}
            </code>
            .
          </p>
          {productError && (
            <p className="mt-2 text-xs text-red-300">
              Supabase error: {productError.message}
            </p>
          )}
          <Link href="/" className="mt-6 inline-block text-emerald-300">
            Go back home
          </Link>
        </section>
      </main>
    );
  }

  // Load all parallels for this product, INCLUDING images
  const { data: parallels, error: parallelsError } = (await supabase
    .from("parallels")
    .select(
      `
      id,
      name,
      slug,
      serial_min,
      serial_max,
      is_case_hit,
      rarity_tier,
      is_hobby_exclusive,
      is_retail_exclusive,
      notes,
      sort_order,
      parallel_images ( storage_path )
    `.trim()
    )
    .eq("product_id", product.id)
    .order("sort_order", { ascending: true })) as {
    data: ParallelRow[] | null;
    error: any;
  };

  const safeParallels: ParallelRow[] = parallels ?? [];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-emerald-400" />
            <span className="text-lg font-semibold tracking-tight">
              CardCheck
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-slate-300 hover:text-emerald-300"
          >
            ← Back to sets
          </Link>
        </div>
      </header>

      {/* Page content */}
      <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        {/* Set header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Set
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {product.full_display_name}
            </h1>
            <div className="flex flex-wrap gap-2 text-sm text-slate-300">
              <span className="rounded-full border border-slate-700 px-2 py-0.5">
                {product.year}
              </span>
              {product.manufacturers?.name && (
                <span className="rounded-full border border-slate-700 px-2 py-0.5">
                  {product.manufacturers.name}
                </span>
              )}
              {product.sports?.name && (
                <span className="rounded-full border border-slate-700 px-2 py-0.5">
                  {product.sports.name}
                </span>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-slate-400">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em]">
              Slug
            </div>
            <div className="mt-1 rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] text-emerald-300">
              {product.slug}
            </div>
          </div>
        </div>

        {/* Parallels section */}
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Parallels</h2>
            <span className="text-xs text-slate-400">
              {safeParallels.length} parallel
              {safeParallels.length === 1 ? "" : "s"}
            </span>
          </div>

          {parallelsError && (
            <div className="mb-2 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-100">
              Error loading parallels: {parallelsError.message}
            </div>
          )}

          {safeParallels.length === 0 ? (
            <p className="text-sm text-slate-400">
              No parallels have been added for this set yet.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {safeParallels.map((parallel) => (
                <article
                  key={parallel.id}
                  className="flex gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3"
                >
                  {/* Image block */}
                  <div className="relative w-20 flex-shrink-0 md:w-24">
                    {(() => {
                      // No images at all – show the old placeholder
                      if (
                        !parallel.parallel_images ||
                        parallel.parallel_images.length === 0
                      ) {
                        return (
                          <div className="aspect-[2.5/3.5] w-full rounded-md bg-black/90 ring-1 ring-slate-800" />
                        );
                      }

                      // Try to detect front/back by filename; fall back to first/second
                      const paths = parallel.parallel_images.map(
                        (img) => img.storage_path
                      );

                      const frontPath =
                        paths.find((p) => p.toLowerCase().includes("front")) ??
                        paths[0];

                      const backPath =
                        paths.find((p) => p.toLowerCase().includes("back")) ??
                        (paths.length > 1 ? paths[1] : undefined);

                      const { data: frontData } = supabase.storage
                        .from("parallel-images")
                        .getPublicUrl(frontPath);

                      const { data: backData } = backPath
                        ? supabase.storage
                            .from("parallel-images")
                            .getPublicUrl(backPath)
                        : { data: { publicUrl: "" } };

                      const frontUrl = frontData.publicUrl;
                      const backUrl = backData.publicUrl || undefined;

                      return (
                        <FlippableImage
                          frontUrl={frontUrl}
                          backUrl={backUrl}
                          alt={parallel.name}
                        />
                      );
                    })()}
                  </div>

                  {/* Info column */}
                  <div className="flex flex-1 flex-col gap-2">
                    {/* Name (without /99 etc) */}
                    <h3 className="text-sm font-semibold text-slate-100 leading-snug">
                      {displayParallelName(parallel.name)}
                    </h3>

                    {/* Checklist */}
                    {(() => {
                      const checklist = buildChecklist(parallel);

                      return (
                        <div className="grid gap-1 text-[11px] text-slate-300 sm:grid-cols-2">
                          {checklist.map((item) => (
                            <div
                              key={item.key}
                              className="flex items-center gap-2"
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  item.active
                                    ? "bg-emerald-400"
                                    : "bg-slate-700"
                                }`}
                              />
                              <span
                                className={item.active ? "" : "text-slate-500"}
                              >
                                {item.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* Optional notes */}
                    {parallel.notes && (
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {parallel.notes}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

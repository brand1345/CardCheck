// src/app/page.tsx
import { supabase } from "@/lib/supabaseClient";
import ProductsExplorer from "@/components/products-explorer";

type ProductRow = {
  id: string;
  full_display_name: string;
  slug: string;
  year: number;
  is_active: boolean;
  manufacturers?: { name: string | null; slug: string | null } | null;
  sports?: { name: string | null; slug: string | null } | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("products")
    .select(
      `
      id,
      full_display_name,
      slug,
      year,
      is_active,
      manufacturers ( name, slug ),
      sports ( name, slug )
    `
    )
    .eq("is_active", true)
    .order("year", { ascending: false });

  const safeProducts =
    (data as ProductRow[] | null)?.map((p) => ({
      id: p.id,
      name: p.full_display_name,
      slug: p.slug,
      year: p.year,
      manufacturerName: p.manufacturers?.name ?? "Unknown",
      manufacturerSlug: p.manufacturers?.slug ?? "unknown",
      sportName: p.sports?.name ?? "Unknown",
      sportSlug: p.sports?.slug ?? "unknown",
    })) ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* Top nav */}
      <header className="border-b border-slate-700/70 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-emerald-400 shadow-sm shadow-emerald-500/40" />
            <span className="text-lg font-semibold tracking-tight">
              CardCheck
            </span>
          </div>
          <nav className="flex gap-6 text-sm text-slate-300">
            <button className="hover:text-white transition-colors">
              Browse
            </button>
            <button className="hover:text-white transition-colors">
              About
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-slate-800/70 bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
              Know your parallel.
            </h1>
            <p className="mt-2 text-sm text-slate-300">
              A visual guide to parallels across Topps and Panini products.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Filter by sport, manufacturer, and year to quickly find the product
            you&apos;re looking for.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Active Sets
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-100">
            Error loading products: {error.message}
          </div>
        )}

        <ProductsExplorer products={safeProducts} />
      </section>
    </main>
  );
}

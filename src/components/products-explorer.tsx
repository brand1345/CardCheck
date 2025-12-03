"use client";

import { useMemo, useState } from "react";

type UiProduct = {
  id: string;
  name: string;
  slug: string;
  year: number;
  manufacturerName: string;
  manufacturerSlug: string;
  sportName: string;
  sportSlug: string;
};

type Props = {
  products: UiProduct[];
};

type SortOption = "newest" | "oldest" | "az";

export default function ProductsExplorer({ products }: Props) {
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [manufacturerFilter, setManufacturerFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<SortOption>("newest");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { sports, manufacturers, years } = useMemo(() => {
    const sportSet = new Map<string, string>();
    const manufacturerSet = new Map<string, string>();
    const yearSet = new Set<number>();

    for (const p of products) {
      sportSet.set(p.sportSlug, p.sportName);
      manufacturerSet.set(p.manufacturerSlug, p.manufacturerName);
      yearSet.add(p.year);
    }

    const sports = Array.from(sportSet.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const manufacturers = Array.from(manufacturerSet.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const years = Array.from(yearSet.values()).sort((a, b) => b - a);

    return { sports, manufacturers, years };
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    let result = products.slice();

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.manufacturerName.toLowerCase().includes(term) ||
          p.sportName.toLowerCase().includes(term) ||
          String(p.year).includes(term)
      );
    }

    if (sportFilter !== "all") {
      result = result.filter((p) => p.sportSlug === sportFilter);
    }

    if (manufacturerFilter !== "all") {
      result = result.filter((p) => p.manufacturerSlug === manufacturerFilter);
    }

    if (yearFilter !== "all") {
      const yearNumber = Number(yearFilter);
      result = result.filter((p) => p.year === yearNumber);
    }

    result.sort((a, b) => {
      if (sortOrder === "newest") return b.year - a.year;
      if (sortOrder === "oldest") return a.year - b.year;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [
    products,
    sportFilter,
    manufacturerFilter,
    yearFilter,
    sortOrder,
    searchTerm,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<string, UiProduct[]>();

    for (const p of filteredAndSorted) {
      const key = `${p.sportName} • ${p.manufacturerName}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    return Array.from(map.entries());
  }, [filteredAndSorted]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-900/85 p-4 shadow-sm shadow-black/30 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Search
            </label>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
              placeholder="Search by set name, year, sport, or manufacturer…"
            />
          </div>

          <div className="flex flex-1 gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Sport
              </label>
              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
              >
                <option value="all">All sports</option>
                {sports.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Manufacturer
              </label>
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
              >
                <option value="all">All manufacturers</option>
                {manufacturers.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-24">
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
              >
                <option value="all">All</option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-300">
            Sort by
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOption)}
            className="w-40 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-slate-50 outline-none ring-emerald-400/40 focus:border-emerald-400 focus:ring-2"
          >
            <option value="newest">Year: Newest first</option>
            <option value="oldest">Year: Oldest first</option>
            <option value="az">Name: A → Z</option>
          </select>
        </div>
      </div>

      {/* Grouped products */}
      {grouped.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/85 px-4 py-6 text-sm text-slate-200">
          No sets match these filters.
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([groupKey, groupProducts]) => (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100">
                  {groupKey}
                </h3>
                <span className="text-xs text-slate-400">
                  {groupProducts.length} set
                  {groupProducts.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groupProducts.map((p) => (
                  <a
                    key={p.id}
                    href={`/sets/${p.slug}`}
                    className="group flex flex-col justify-between rounded-xl border border-slate-700 bg-slate-900/85 p-4 shadow-sm shadow-black/40 transition hover:border-emerald-400/70 hover:bg-slate-900"
                  >
                    <div>
                      <div className="text-sm text-emerald-300">{p.year}</div>
                      <div className="mt-1 text-base font-semibold text-slate-50">
                        {p.name}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {p.manufacturerName} • {p.sportName}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                      <span className="rounded-full border border-slate-600 px-2 py-0.5">
                        View parallels
                      </span>
                      <span className="opacity-0 transition group-hover:opacity-100">
                        ↗
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

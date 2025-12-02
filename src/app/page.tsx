import { supabase } from "@/lib/supabaseClient";

export default async function Home() {
  const { data: products, error } = await supabase
    .from("products")
    .select("id, full_display_name, slug")
    .order("year", { ascending: false });

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Card Products</h1>
      {error && <div>Error: {error.message}</div>}
      <ul className="space-y-2">
        {products?.map((p) => (
          <li key={p.id} className="border rounded px-4 py-2">
            <div className="font-semibold">{p.full_display_name}</div>
            <div className="text-sm text-gray-500">{p.slug}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

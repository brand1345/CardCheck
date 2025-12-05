"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductsExplorer from "@/components/products-explorer";
import AdminUploadTab from "@/components/admin-upload-tab";
import type { SafeProduct } from "@/app/page";

type Props = {
  products: SafeProduct[];
};

export default function HomeTabs({ products }: Props) {
  const isAdmin = true; // later: wire to real auth

  return (
    <Tabs defaultValue="browse" className="w-full">
      <TabsList>
        <TabsTrigger value="browse">Browse Sets</TabsTrigger>
        {isAdmin && <TabsTrigger value="admin">Admin Upload</TabsTrigger>}
      </TabsList>

      <TabsContent value="browse" className="pt-4">
        <ProductsExplorer products={products} />
      </TabsContent>

      {isAdmin && (
        <TabsContent value="admin" className="pt-4">
          <AdminUploadTab products={products} />
        </TabsContent>
      )}
    </Tabs>
  );
}

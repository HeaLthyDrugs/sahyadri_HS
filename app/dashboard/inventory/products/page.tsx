"use client";

import { ProductsPage } from "@/components/admin/pages/inventory/products";
import { withPermission } from "@/components/withPermission";

const ProtectedProductsPage = withPermission(ProductsPage);

export default function InventoryProductsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Products</h1>
      <ProtectedProductsPage />
    </>
  );
} 

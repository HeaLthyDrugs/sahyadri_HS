"use client";

import { PackagesPage } from "@/components/admin/pages/inventory/packages";
import { withPermission } from '@/components/withPermission';

const ProtectedPackagesPage = withPermission(PackagesPage);

export default function InventoryPackagesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Packages</h1>
      <ProtectedPackagesPage />
    </>
  );
} 

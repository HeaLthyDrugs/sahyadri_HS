"use client";

import { BillingEntriesPage } from "@/components/admin/pages/billing/entries";
import { withPermission } from '@/components/withPermission';

const ProtectedBillingEntriesPage = withPermission(BillingEntriesPage);

export default function BillingEntriesListPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Billing Entries</h1>
      <ProtectedBillingEntriesPage />
    </>
  );
} 
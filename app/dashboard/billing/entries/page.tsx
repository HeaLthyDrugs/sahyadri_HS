"use client";

import { BillingEntriesPage } from "@/components/admin/pages/billing/entries";
import { withStrictPermission } from '@/components/withPermission';

const ProtectedBillingEntriesPage = withStrictPermission(BillingEntriesPage, '/dashboard/billing/entries');

export default function BillingEntriesListPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Billing Entries</h1>
      <ProtectedBillingEntriesPage />
    </>
  );
} 
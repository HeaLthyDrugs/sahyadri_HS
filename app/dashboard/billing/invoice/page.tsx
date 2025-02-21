"use client";

import InvoicePage from "@/components/admin/pages/billing/invoice";
import { withPermission } from '@/components/withPermission';

const ProtectedInvoicePage = withPermission(InvoicePage);

export default function BillingInvoicePage({
  searchParams
}: {
  searchParams: { packageId?: string; month?: string }
}) {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Invoice</h1>
      <ProtectedInvoicePage searchParams={searchParams} />
    </>
  );
}
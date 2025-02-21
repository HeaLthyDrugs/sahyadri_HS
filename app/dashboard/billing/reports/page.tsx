"use client";

import Report from "@/components/admin/pages/billing/report";
import { withPermission } from '@/components/withPermission';

const ProtectedReportPage = withPermission(Report);

export default function BillingReportsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Billing Reports</h1>
      <ProtectedReportPage />
    </>
  );
} 
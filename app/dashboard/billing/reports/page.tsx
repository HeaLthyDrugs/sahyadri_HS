"use client";

import Report from "@/components/admin/pages/billing/report";
import { withStrictPermission } from '@/components/withPermission';

const ProtectedReportPage = withStrictPermission(Report, '/dashboard/billing/reports');

export default function BillingReportsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Billing Reports</h1>
      <ProtectedReportPage />
    </>
  );
} 
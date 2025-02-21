"use client";

import StaffPage from "@/components/admin/pages/consumer/staff";
import { withPermission } from '@/components/withPermission';

const ProtectedStaffPage = withPermission(StaffPage);


export default function ConsumerStaffPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Staff Management</h1>
      <ProtectedStaffPage />
    </>
  );
} 
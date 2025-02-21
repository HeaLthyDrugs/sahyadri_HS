"use client";

import { ProgramsPage } from "@/components/admin/pages/consumer/programs";
import { withPermission } from '@/components/withPermission';

const ProtectedProgramsPage = withPermission(ProgramsPage);

export default function ConsumerProgramsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Programs</h1>
      <ProtectedProgramsPage />
    </>
  );
} 
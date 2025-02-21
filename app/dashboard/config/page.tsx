"use client";

import Config from "@/components/admin/pages/config";
import { withPermission } from '@/components/withPermission';

const ProtectedConfigPage = withPermission(Config);

export default function ConfigurationPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">System Configuration</h1>
      <ProtectedConfigPage />
    </>
  );
} 
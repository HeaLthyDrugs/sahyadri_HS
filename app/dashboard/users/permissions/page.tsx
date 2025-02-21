"use client";

import PermissionsPage from "@/components/admin/pages/users/permissions";
import { withPermission } from '@/components/withPermission';

const ProtectedPermissionsPage = withPermission(PermissionsPage);

export default function UsersPermissionsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Permissions Management</h1>
      <ProtectedPermissionsPage />
    </>
  );
}



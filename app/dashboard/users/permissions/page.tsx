"use client";

import PermissionsPage from "@/components/admin/pages/users/permissions";
import { withStrictPermission } from '@/components/withPermission';

const ProtectedPermissionsPage = withStrictPermission(PermissionsPage, '/dashboard/users/permissions');

export default function UsersPermissionsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Permissions Management</h1>
      <ProtectedPermissionsPage />
    </>
  );
}



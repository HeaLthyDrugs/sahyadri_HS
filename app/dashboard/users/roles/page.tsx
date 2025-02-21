"use client";

import RolesPage from "@/components/admin/pages/users/roles";
import { withPermission } from '@/components/withPermission';

const ProtectedRolesPage = withPermission(RolesPage);

export default function UsersRolesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Roles Management</h1>
      <ProtectedRolesPage />
    </>
  );
}




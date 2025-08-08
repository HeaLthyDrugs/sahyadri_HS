"use client";

import RolesPage from "@/components/admin/pages/users/roles";
import { withStrictPermission } from '@/components/withPermission';

const ProtectedRolesPage = withStrictPermission(RolesPage, '/dashboard/users/roles');

export default function UsersRolesPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">Roles Management</h1>
      <ProtectedRolesPage />
    </>
  );
}




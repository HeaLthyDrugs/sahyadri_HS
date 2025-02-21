"use client";

import ManageUsersPage from "@/components/admin/pages/users/manage";
import { withPermission } from '@/components/withPermission';

const ProtectedManageUsersPage = withPermission(ManageUsersPage);

export default function UsersManagePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold mb-6">User Management</h1>
      <ProtectedManageUsersPage />
    </>
  );
} 
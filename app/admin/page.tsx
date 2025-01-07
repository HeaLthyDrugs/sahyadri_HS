"use client";

import { useEffect } from "react";
import { redirect, useRouter } from "next/navigation";
import { AdminDashboard } from "../../components/admin/dashboard";

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Check authentication on component mount
    const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
    if (!isAuthenticated) {
      router.push("/admin/login");
    }
  }, [router]);

  return <AdminDashboard />;
} 
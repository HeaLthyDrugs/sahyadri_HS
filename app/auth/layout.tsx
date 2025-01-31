import { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Admin Dashboard - Sahyadri Hospitality Services",
  description: "Admin dashboard for managing Sahyadri Hospitality Services",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${geist.className} min-h-screen bg-gray-100`}>
      {children}
    </div>
  );
} 
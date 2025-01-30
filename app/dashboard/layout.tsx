"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { FiChevronDown, FiChevronRight, FiMenu, FiX } from "react-icons/fi";
import { 
  RiDashboardLine, 
  RiArchiveLine,
  RiUserLine,
  RiMoneyDollarCircleLine,
  RiPagesLine,
  RiShoppingCart2Line,
  RiGroupLine,
  RiCalendarEventLine,
  RiTeamLine,
  RiFileListLine,
  RiFileTextLine,
  RiPieChartLine,
  RiLogoutBoxLine,
  RiSettingsLine
} from "react-icons/ri";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  items?: { name: string; path: string; icon: React.ReactNode }[];
  path?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      path: "/dashboard",
      icon: <RiDashboardLine className="w-5 h-5" />
    },
    {
      title: "Inventory Management",
      icon: <RiArchiveLine className="w-5 h-5" />,
      items: [
        { name: "Packages", path: "/dashboard/inventory/packages", icon: <RiPagesLine className="w-4 h-4" /> },
        { name: "Products", path: "/dashboard/inventory/products", icon: <RiShoppingCart2Line className="w-4 h-4" /> }
      ]
    },
    {
      title: "Consumer Management",
      icon: <RiUserLine className="w-5 h-5" />,
      items: [
        { name: "Programs", path: "/dashboard/consumer/programs", icon: <RiCalendarEventLine className="w-4 h-4" /> },
        { name: "Participants", path: "/dashboard/consumer/participants", icon: <RiGroupLine className="w-4 h-4" /> },
        { name: "Staff", path: "/dashboard/consumer/staff", icon: <RiTeamLine className="w-4 h-4" /> }
      ]
    },
    {
      title: "Billing",
      icon: <RiMoneyDollarCircleLine className="w-5 h-5" />,
      items: [
        { name: "Entries", path: "/dashboard/billing/entries", icon: <RiFileListLine className="w-4 h-4" /> },
        { name: "Invoice", path: "/dashboard/billing/invoice", icon: <RiFileTextLine className="w-4 h-4" /> },
        { name: "Reports", path: "/dashboard/billing/reports", icon: <RiPieChartLine className="w-4 h-4" /> }
      ]
    },
    {
      title: "Configuration",
      path: "/dashboard/config",
      icon: <RiSettingsLine className="w-5 h-5" />
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    router.push("/dashboard/login");
  };

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const isActivePath = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white z-30 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-lg font-semibold">Dashboard</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            {isSidebarOpen ? (
              <FiX className="w-6 h-6" />
            ) : (
              <FiMenu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40
        w-64 bg-white shadow-lg
        transform transition-transform duration-200 ease-in-out
        md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo - Hidden on mobile as it's in the header */}
          <div className="p-4 border-b hidden md:block">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.png"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <span className="text-lg font-semibold">Dashboard</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto mt-16 md:mt-0">
            <ul className="space-y-2">
              {menuItems.map((item) => (
                <li key={item.title}>
                  {item.items ? (
                    // Dropdown Menu
                    <div>
                      <button
                        onClick={() => toggleMenu(item.title)}
                        className="w-full flex items-center justify-between px-4 py-2 text-left text-gray-700 hover:bg-gray-50 rounded-lg group"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 group-hover:text-amber-600 transition-colors">
                            {item.icon}
                          </span>
                          <span className="text-gray-500 group-hover:text-amber-600 transition-colors font-bold">{item.title}</span>
                        </div>
                        {openMenus.includes(item.title) ? (
                          <FiChevronDown className="w-4 h-4" />
                        ) : (
                          <FiChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {openMenus.includes(item.title) && (
                        <ul className="ml-4 mt-2 space-y-2">
                          {item.items.map((subItem) => (
                            <li key={subItem.path}>
                              <button
                                onClick={() => {
                                  router.push(subItem.path);
                                  setIsSidebarOpen(false);
                                }}
                                className={`w-full px-4 py-2 text-sm rounded-lg text-left flex items-center gap-3 transition-colors ${
                                  isActivePath(subItem.path)
                                    ? "bg-amber-50 text-amber-700"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span className={`${
                                  isActivePath(subItem.path)
                                    ? "text-amber-600"
                                    : "text-gray-400"
                                }`}>
                                  {subItem.icon}
                                </span>
                                {subItem.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    // Regular Menu Item
                    <button
                      onClick={() => {
                        router.push(item.path!);
                        setIsSidebarOpen(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-left flex items-center gap-3 ${
                        isActivePath(item.path!)
                          ? "bg-amber-50 text-amber-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`${
                        isActivePath(item.path!)
                          ? "text-amber-600"
                          : "text-gray-500"
                      }`}>
                        {item.icon}
                      </span>
                      {item.title}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
            >
              <RiLogoutBoxLine className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="md:ml-64 p-4 md:p-8 mt-16 md:mt-0">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          {children}
        </div>
      </div>
    </div>
  );
} 
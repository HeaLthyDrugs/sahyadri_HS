"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { PackagesPage } from "./pages/inventory/packages";
import { ProductsPage } from "./pages/inventory/products";
import { ProgramsPage } from "./pages/consumer/programs";

import { ParticipantsPage } from "./pages/consumer/participants";
import { BillingEntriesPage } from "./pages/billing/entries";
import { OverviewPage } from "./pages/overview";
import InvoicePage from "./pages/billing/invoice";
import Report from "./pages/billing/report";
import StaffPage from "./pages/consumer/staff";
import Config from "./pages/config";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  items?: { name: string; path: string; icon: React.ReactNode }[];
  path?: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: "Dashboard",
      path: "overview",
      icon: <RiDashboardLine className="w-5 h-5" />
    },
    {
      title: "Inventory Management",
      icon: <RiArchiveLine className="w-5 h-5" />,
      items: [
        { name: "Packages", path: "packages", icon: <RiPagesLine className="w-4 h-4" /> },
        { name: "Products", path: "products", icon: <RiShoppingCart2Line className="w-4 h-4" /> }
      ]
    },
    {
      title: "Consumer Management",
      icon: <RiUserLine className="w-5 h-5" />,
      items: [
        { name: "Programs", path: "programs", icon: <RiCalendarEventLine className="w-4 h-4" /> },
        { name: "Participants", path: "participants", icon: <RiGroupLine className="w-4 h-4" /> },
        { name: "Staff", path: "staff", icon: <RiTeamLine className="w-4 h-4" /> }
      ]
    },
    {
      title: "Billing",
      icon: <RiMoneyDollarCircleLine className="w-5 h-5" />,
      items: [
        { name: "Entries", path: "entries", icon: <RiFileListLine className="w-4 h-4" /> },
        { name: "Invoice", path: "invoice", icon: <RiFileTextLine className="w-4 h-4" /> },
        { name: "Reports", path: "reports", icon: <RiPieChartLine className="w-4 h-4" /> }
      ]
    },
    {
      title: "Configuration",
      path: "config",
      icon: <RiSettingsLine className="w-5 h-5" />
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    router.push("/admin/login");
  };

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const handleNavigation = (path: string) => {
    setActiveTab(path);
    setIsSidebarOpen(false);
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
            <span className="text-lg font-semibold ">Admin Panel</span>
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
              <span className="text-lg font-semibold">Admin Panel</span>
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
                          <span>{item.title}</span>
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
                                onClick={() => handleNavigation(subItem.path)}
                                className={`w-full px-4 py-2 text-sm rounded-lg text-left flex items-center gap-3 transition-colors ${
                                  activeTab === subItem.path
                                    ? "bg-amber-50 text-amber-700"
                                    : "text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                <span className={`${
                                  activeTab === subItem.path
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
                      onClick={() => handleNavigation(item.path!)}
                      className={`w-full px-4 py-2 rounded-lg text-left flex items-center gap-3 ${
                        activeTab === item.path
                          ? "bg-amber-50 text-amber-700"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`${
                        activeTab === item.path
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
          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h2>
          
          {/* Content based on active tab */}
          <AdminContent activeTab={activeTab} />
        </div>
      </div>
    </div>
  );
}

function AdminContent({ activeTab }: { activeTab: string }) {
  switch (activeTab) {
    case "overview":
      return <OverviewPage />;
    case "packages":
      return <PackagesPage />;
    case "products":
      return <ProductsPage />;
    case "programs":
      return <ProgramsPage />;
    case "participants":
      return <ParticipantsPage />;
    case "staff":
      return <StaffPage />;
    case "entries":
      return <BillingEntriesPage />;
    case "invoice":
      return <InvoicePage />;
    case "reports":
      return <Report />;
    case "config":
      return <Config />;
    default:
      return (
        <div className="text-center text-gray-500">
          Content for {activeTab} coming soon...
        </div>
      );
  }
}

function DashboardCard({ title, value, trend }: { title: string; value: string; trend: string }) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="bg-gray-50 p-4 md:p-6 rounded-lg">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <div className="mt-2 flex items-baseline">
        <p className="text-xl md:text-2xl font-semibold text-gray-900">{value}</p>
        <span
          className={`ml-2 text-sm font-medium ${
            isPositive ? "text-green-600" : "text-red-600"
          }`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
} 
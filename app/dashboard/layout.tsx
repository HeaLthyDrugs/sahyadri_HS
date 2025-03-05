"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { FiChevronDown, FiChevronRight, FiMenu, FiX, FiChevronUp } from "react-icons/fi";
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
  RiSettingsLine,
  RiShieldUserLine,
  RiUserSettingsLine,
  RiMailLine,
  RiAppsLine,
  RiUser3Line
} from "react-icons/ri";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  items?: { name: string; path: string; icon: React.ReactNode }[];
  path?: string;
}

interface UserProfile {
  full_name: string;
  role_name: string;
}

interface ProfileResponse {
  full_name: string;
  roles: {
    name: string;
  }[];
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select(`
              full_name,
              roles!inner (
                name
              )
            `)
            .eq('id', user.id)
            .single();

          if (data && Array.isArray(data.roles) && data.roles.length > 0) {
            setUserProfile({
              full_name: data.full_name,
              role_name: data.roles[0].name
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

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
      title: "Roles Management",
      icon: <RiShieldUserLine className="w-5 h-5" />,
      items: [
        { name: "Roles", path: "/dashboard/users/roles", icon: <RiUserSettingsLine className="w-4 h-4" /> },
        { name: "Users", path: "/dashboard/users/manage", icon: <RiMailLine className="w-4 h-4" /> },
        { name: "Permissions", path: "/dashboard/users/permissions", icon: <RiAppsLine className="w-4 h-4" /> }
      ]
    },
    {
      title: "Configuration",
      path: "/dashboard/config",
      icon: <RiSettingsLine className="w-5 h-5" />
    },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
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

          {/* Profile Menu */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center justify-between w-full p-3 text-gray-900 rounded-lg hover:bg-gray-100 group transition-colors duration-200"
              >
                <span className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <RiUser3Line className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">{userProfile?.full_name || 'Profile'}</span>
                    <span className="text-xs text-gray-500">{userProfile?.role_name}</span>
                  </div>
                </span>
                {isProfileMenuOpen ? (
                  <FiChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <FiChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>

              {isProfileMenuOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-lg shadow-lg border border-gray-100 py-1">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <RiUserSettingsLine className="w-4 h-4" />
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                  >
                    <RiLogoutBoxLine className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
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
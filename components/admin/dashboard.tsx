"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  RiMenu2Line,
  RiCloseLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowDownSLine,
  RiArrowRightSLine
} from "react-icons/ri";
import { PackagesPage } from "./pages/inventory/packages";
import { ProductsPage } from "./pages/inventory/products";
import { ProgramsPage } from "./pages/consumer/programs";
import { InvoicePage } from "./pages/billing/invoice";
import { ParticipantsPage } from "./pages/consumer/participants";
import { BillingEntriesPage } from "./pages/billing/entries";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  items?: { name: string; path: string; icon: React.ReactNode }[];
  path?: string;
}

interface DashboardStats {
  totalParticipants: number;
  activePrograms: number;
  totalProducts: number;
  monthlyRevenue: number;
  participantTrend: number;
  revenueTrend: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
}

export function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    activePrograms: 0,
    totalProducts: 0,
    monthlyRevenue: 0,
    participantTrend: 0,
    revenueTrend: 0
  });

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch total participants
      const { data: participants } = await supabase
        .from('participants')
        .select('count');

      // Fetch active programs
      const { data: programs } = await supabase
        .from('programs')
        .select('count')
        .eq('status', 'Ongoing');

      // Fetch total products
      const { data: products } = await supabase
        .from('products')
        .select('count');

      // Calculate monthly revenue from billing entries
      const startOfMonth = format(new Date(), 'yyyy-MM-01');
      const { data: revenue } = await supabase
        .from('billing_entries')
        .select('quantity, rate')
        .gte('date', startOfMonth);

      const monthlyRevenue = revenue?.reduce((acc, entry) => 
        acc + (entry.quantity * entry.rate), 0) || 0;

      setStats({
        totalParticipants: participants?.[0]?.count || 0,
        activePrograms: programs?.[0]?.count || 0,
        totalProducts: products?.[0]?.count || 0,
        monthlyRevenue,
        participantTrend: 12, // Example trend percentage
        revenueTrend: 8 // Example trend percentage
      });

      // Fetch recent activity
      const { data: activity } = await supabase
        .from('activity_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(5);

      setRecentActivity(activity || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsLoading(false);
    }
  };

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
    <div className="flex h-screen bg-gray-100">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? (
          <RiCloseLine className="w-6 h-6" />
        ) : (
          <RiMenu2Line className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 transform ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 transition duration-200 ease-in-out lg:block bg-white w-64 shadow-lg z-40`}
      >
        {/* Sidebar content */}
        <div className="h-full flex flex-col">
          <div className="p-4 border-b">
            <Image
              src="/logo.png"
              alt="Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            {menuItems.map((item) => (
              <div key={item.title} className="mb-2">
                {item.items ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className="w-full flex items-center justify-between p-2 rounded-md hover:bg-gray-100"
                    >
                      <div className="flex items-center">
                        {item.icon}
                        <span className="ml-3">{item.title}</span>
                      </div>
                      {openMenus.includes(item.title) ? (
                        <RiArrowDownSLine className="w-5 h-5" />
                      ) : (
                        <RiArrowRightSLine className="w-5 h-5" />
                      )}
                    </button>
                    {openMenus.includes(item.title) && (
                      <div className="ml-4 mt-2 space-y-2">
                        {item.items.map((subItem) => (
                          <button
                            key={subItem.path}
                            onClick={() => setActiveTab(subItem.path)}
                            className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 ${
                              activeTab === subItem.path ? "bg-gray-100" : ""
                            }`}
                          >
                            {subItem.icon}
                            <span className="ml-3">{subItem.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => setActiveTab(item.path!)}
                    className={`w-full flex items-center p-2 rounded-md hover:bg-gray-100 ${
                      activeTab === item.path ? "bg-gray-100" : ""
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.title}</span>
                  </button>
                )}
              </div>
            ))}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-2 rounded-md hover:bg-gray-100 text-red-600"
            >
              <RiLogoutBoxLine className="w-5 h-5" />
              <span className="ml-3">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <AdminContent 
          activeTab={activeTab} 
          stats={stats} 
          isLoading={isLoading}
          recentActivity={recentActivity}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
}

function AdminContent({ 
  activeTab, 
  stats, 
  isLoading,
  recentActivity,
  setActiveTab 
}: { 
  activeTab: string;
  stats: DashboardStats;
  isLoading: boolean;
  recentActivity: RecentActivity[];
  setActiveTab: (tab: string) => void;
}) {
  switch (activeTab) {
    case "overview":
      return (
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-6">Dashboard Overview</h1>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Total Participants"
              value={stats.totalParticipants}
              trend={stats.participantTrend}
              icon={<RiGroupLine className="w-6 h-6" />}
              loading={isLoading}
            />
            <StatCard
              title="Active Programs"
              value={stats.activePrograms}
              icon={<RiCalendarEventLine className="w-6 h-6" />}
              loading={isLoading}
            />
            <StatCard
              title="Total Products"
              value={stats.totalProducts}
              icon={<RiShoppingCart2Line className="w-6 h-6" />}
              loading={isLoading}
            />
            <StatCard
              title="Monthly Revenue"
              value={`₹${stats.monthlyRevenue.toLocaleString()}`}
              trend={stats.revenueTrend}
              icon={<RiMoneyDollarCircleLine className="w-6 h-6" />}
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg" />
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activity</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <QuickActionButton
                  label="Add Program"
                  icon={<RiCalendarEventLine className="w-5 h-5" />}
                  onClick={() => setActiveTab("programs")}
                />
                <QuickActionButton
                  label="Add Product"
                  icon={<RiShoppingCart2Line className="w-5 h-5" />}
                  onClick={() => setActiveTab("products")}
                />
                <QuickActionButton
                  label="Billing Entry"
                  icon={<RiFileListLine className="w-5 h-5" />}
                  onClick={() => setActiveTab("entries")}
                />
                <QuickActionButton
                  label="View Invoice"
                  icon={<RiFileTextLine className="w-5 h-5" />}
                  onClick={() => setActiveTab("invoice")}
                />
              </div>
            </div>
          </div>
        </div>
      );
    case "packages":
      return <PackagesPage />;
    case "products":
      return <ProductsPage />;
    case "programs":
      return <ProgramsPage />;
    case "participants":
      return <ParticipantsPage />;
    case "staff":
      return <div>Staff page coming soon...</div>;
    case "entries":
      return <BillingEntriesPage />;
    case "invoice":
      return <InvoicePage />;
    case "reports":
      return <div>Reports page coming soon...</div>;
    default:
      return (
        <div className="text-center text-gray-500">
          Content for {activeTab} coming soon...
        </div>
      );
  }
}

function StatCard({ 
  title, 
  value, 
  trend, 
  icon, 
  loading 
}: { 
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ReactNode;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          <div className="h-8 bg-gray-100 rounded w-3/4"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-500 text-sm">{title}</h3>
            <span className="text-gray-400">{icon}</span>
          </div>
          <div className="flex items-end">
            <span className="text-2xl font-semibold">{value}</span>
            {trend !== undefined && (
              <span className={`ml-2 flex items-center text-sm ${
                trend >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {trend >= 0 ? (
                  <RiArrowUpLine className="w-4 h-4" />
                ) : (
                  <RiArrowDownLine className="w-4 h-4" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  return (
    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
      <div className="mr-4">
        {activity.type === 'program' && <RiCalendarEventLine className="w-5 h-5 text-blue-500" />}
        {activity.type === 'billing' && <RiFileListLine className="w-5 h-5 text-green-500" />}
        {activity.type === 'participant' && <RiUserLine className="w-5 h-5 text-purple-500" />}
      </div>
      <div>
        <p className="text-sm text-gray-600">{activity.description}</p>
        <p className="text-xs text-gray-400">
          {format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a')}
        </p>
      </div>
    </div>
  );
}

function QuickActionButton({ 
  label, 
  icon, 
  onClick 
}: { 
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
} 
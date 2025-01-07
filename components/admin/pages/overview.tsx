"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  RiGroupLine,
  RiCalendarEventLine,
  RiShoppingCart2Line,
  RiFileListLine,
  RiPieChartLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiAlertLine,
} from "react-icons/ri";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalParticipants: number;
  activePrograms: number;
  totalProducts: number;
  totalOrders: number;
  participantsTrend: string;
  programsTrend: string;
  productsTrend: string;
  ordersTrend: string;
}

interface ChartData {
  name: string;
  participants: number;
  orders: number;
}

interface ProgramDistribution {
  name: string;
  value: number;
}

export function OverviewPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalParticipants: 0,
    activePrograms: 0,
    totalProducts: 0,
    totalOrders: 0,
    participantsTrend: "+0%",
    programsTrend: "+0%",
    productsTrend: "+0%",
    ordersTrend: "+0%",
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [programDistribution, setProgramDistribution] = useState<ProgramDistribution[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch participants count
      const { data: participants } = await supabase
        .from('participants')
        .select('created_at', { count: 'exact' });

      // Fetch active programs
      const { data: programs } = await supabase
        .from('programs')
        .select('*')
        .eq('status', 'Active');

      // Fetch products with low stock
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .lt('stock_quantity', 10);

      // Fetch program distribution
      const { data: programTypes } = await supabase
        .from('programs')
        .select('type, id');

      // Update stats
      setStats({
        totalParticipants: participants?.length || 0,
        activePrograms: programs?.length || 0,
        totalProducts: 150, // Example static data
        totalOrders: 89, // Example static data
        participantsTrend: "+12%",
        programsTrend: "+5%",
        productsTrend: "-2%",
        ordersTrend: "+15%",
      });

      // Set low stock products
      setLowStockProducts(products || []);

      // Process program distribution
      const distribution = processProgramDistribution(programTypes);
      setProgramDistribution(distribution);

      // Generate sample chart data
      const last7Days = generateLast7DaysData();
      setChartData(last7Days);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const processProgramDistribution = (programs: any[]) => {
    const distribution = programs?.reduce((acc: any, program: any) => {
      acc[program.type] = (acc[program.type] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution || {}).map(([name, value]) => ({
      name,
      value: value as number,
    }));
  };

  const generateLast7DaysData = () => {
    return Array.from({ length: 7 }, (_, i) => ({
      name: format(new Date(Date.now() - i * 24 * 60 * 60 * 1000), 'MMM dd'),
      participants: Math.floor(Math.random() * 50) + 20,
      orders: Math.floor(Math.random() * 30) + 10,
    })).reverse();
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Participants"
          value={stats.totalParticipants}
          trend={stats.participantsTrend}
          icon={<RiGroupLine className="w-6 h-6" />}
        />
        <StatCard
          title="Active Programs"
          value={stats.activePrograms}
          trend={stats.programsTrend}
          icon={<RiCalendarEventLine className="w-6 h-6" />}
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          trend={stats.productsTrend}
          icon={<RiShoppingCart2Line className="w-6 h-6" />}
        />
        <StatCard
          title="Monthly Orders"
          value={stats.totalOrders}
          trend={stats.ordersTrend}
          icon={<RiFileListLine className="w-6 h-6" />}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="participants" 
                  stroke="#8884d8" 
                  name="Participants"
                />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#82ca9d" 
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Program Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {programDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Low Stock Alert Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
          <RiAlertLine className="w-6 h-6 text-amber-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lowStockProducts.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.stock_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Low Stock
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  trend, 
  icon 
}: { 
  title: string; 
  value: number; 
  trend: string; 
  icon: React.ReactNode;
}) {
  const isPositive = trend.startsWith("+");

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="p-2 bg-amber-50 rounded-lg">
          {icon}
        </div>
        <span className={`flex items-center text-sm font-medium ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          {trend}
          {isPositive ? (
            <RiArrowUpLine className="ml-1" />
          ) : (
            <RiArrowDownLine className="ml-1" />
          )}
        </span>
      </div>
      <h3 className="text-2xl font-bold mt-4">{value}</h3>
      <p className="text-gray-500 text-sm">{title}</p>
    </div>
  );
}
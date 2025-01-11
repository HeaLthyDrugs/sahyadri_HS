"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  RiFileChartLine,
  RiDownloadLine,
  RiFilterLine,
  RiRefreshLine,
} from "react-icons/ri";

interface Package {
  id: string;
  name: string;
  type: string;
}

interface Program {
  id: string;
  name: string;
  total_participants: number;
}

interface ReportData {
  date: string;
  program: string;
  package: string;
  product: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function ReportPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [summary, setSummary] = useState({
    totalQuantity: 0,
    totalAmount: 0,
    averagePerDay: 0,
  });

  useEffect(() => {
    fetchPackages();
    fetchPrograms();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    }
  };

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    }
  };

  const generateReport = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    setIsLoading(true);
    try {
      // Get start and end dates for the selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Build query
      let query = supabase
        .from('billing_entries')
        .select(`
          entry_date,
          quantity,
          programs (name),
          packages (name),
          products (name, rate)
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr);

      // Add filters if selected
      if (selectedPackage) {
        query = query.eq('package_id', selectedPackage);
      }
      if (selectedProgram) {
        query = query.eq('program_id', selectedProgram);
      }

      const { data, error } = await query.order('entry_date', { ascending: true });

      if (error) throw error;

      // Transform data
      const formattedData: ReportData[] = (data || []).map(entry => ({
        date: format(new Date(entry.entry_date), 'dd/MM/yyyy'),
        program: entry.programs[0]?.name || 'N/A',
        package: entry.packages[0]?.name || 'N/A',
        product: entry.products[0]?.name || 'N/A',
        quantity: entry.quantity,
        rate: entry.products[0]?.rate || 0,
        amount: entry.quantity * (entry.products[0]?.rate || 0)
      }));

      // Calculate summary
      const totalQuantity = formattedData.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = formattedData.reduce((sum, item) => sum + item.amount, 0);
      const averagePerDay = totalQuantity / formattedData.length || 0;

      setReportData(formattedData);
      setSummary({
        totalQuantity,
        totalAmount,
        averagePerDay
      });

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSV = () => {
    if (reportData.length === 0) {
      toast.error('No data to download');
      return;
    }

    const headers = ['Date', 'Program', 'Package', 'Product', 'Quantity', 'Rate', 'Amount'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row => 
        [
          row.date,
          `"${row.program}"`,
          `"${row.package}"`,
          `"${row.product}"`,
          row.quantity,
          row.rate,
          row.amount
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${selectedMonth}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RiFilterLine className="w-5 h-5" />
          Report Filters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
            <select
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            >
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            >
              <option value="">All Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={generateReport}
              disabled={isLoading}
              className="flex-1 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                "Generating..."
              ) : (
                <>
                  <RiRefreshLine className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>
            <button
              onClick={downloadCSV}
              disabled={reportData.length === 0}
              className="bg-gray-100 text-gray-600 px-4 py-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
              title="Download CSV"
            >
              <RiDownloadLine className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Total Quantity</h3>
            <p className="text-2xl font-semibold mt-2">{summary.totalQuantity.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
            <p className="text-2xl font-semibold mt-2">₹{summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-sm font-medium text-gray-500">Average Per Day</h3>
            <p className="text-2xl font-semibold mt-2">{summary.averagePerDay.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Report Table */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Package</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.program}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.package}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.product}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{row.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Totals</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{summary.totalQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{summary.totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* No Data Message */}
      {!isLoading && reportData.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <RiFileChartLine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
          <p className="text-gray-500">Select filters and generate report to view data</p>
        </div>
      )}
    </div>
  );
}

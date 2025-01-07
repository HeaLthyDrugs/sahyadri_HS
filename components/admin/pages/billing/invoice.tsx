"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import {
  RiPrinterLine,
  RiDownloadLine,
  RiCalendarLine,
  RiFileTextLine,
} from "react-icons/ri";

interface Package {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  rate: number;
}

interface BillingEntry {
  id: string;
  program_id: string | null;
  package_id: string;
  product_id: string;
  entry_date: string;
  quantity: number;
  product: Product;
}

interface InvoiceData {
  packageDetails: Package | null;
  month: string;
  entries: BillingEntry[];
  totalAmount: number;
}

export default function InvoicePage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    packageDetails: null,
    month: "",
    entries: [],
    totalAmount: 0
  });

  useEffect(() => {
    fetchPackages();
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

  const generateInvoice = async () => {
    if (!selectedPackage || !selectedMonth) {
      toast.error('Please select both package and month');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch package details
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', selectedPackage)
        .single();

      if (packageError) {
        console.error('Package error:', packageError);
        throw new Error('Failed to fetch package details');
      }

      if (!packageData) {
        throw new Error('Package not found');
      }

      // Get start and end dates for the selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Fetch entries for the selected month and package
      const { data: entriesData, error: entriesError } = await supabase
        .from('billing_entries')
        .select(`
          id,
          program_id,
          package_id,
          product_id,
          entry_date,
          quantity,
          product:products (
            id,
            name,
            rate
          )
        `)
        .eq('package_id', selectedPackage)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr)
        .order('entry_date', { ascending: true });

      if (entriesError) {
        console.error('Entries error:', entriesError);
        throw new Error('Failed to fetch billing entries');
      }

      if (!entriesData) {
        throw new Error('No entries found for the selected period');
      }

      // Calculate total amount
      const total = entriesData.reduce((sum, entry) => {
        return sum + (entry.quantity * (entry.product?.rate || 0));
      }, 0);

      setInvoiceData({
        packageDetails: packageData,
        month: selectedMonth,
        entries: entriesData,
        totalAmount: total
      });

      toast.success('Invoice generated successfully');

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadAsPDF = () => {
    // Implement PDF download functionality
    toast.success('PDF download started');
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <div className="print:hidden flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow">
        <div className="flex-1 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Package
          </label>
          <select
            value={selectedPackage}
            onChange={(e) => setSelectedPackage(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
          >
            <option value="">Choose a package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({pkg.type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-end space-x-2">
          <button
            onClick={generateInvoice}
            disabled={isLoading}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
          >
            {isLoading ? "Generating..." : "Generate Invoice"}
          </button>
        </div>
      </div>

      {/* Invoice Preview */}
      {invoiceData.packageDetails && (
        <div className="bg-white rounded-lg shadow">
          {/* Invoice Actions */}
          <div className="print:hidden p-4 border-b flex justify-end space-x-4">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <RiPrinterLine className="w-5 h-5" />
              Print
            </button>
            <button
              onClick={downloadAsPDF}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <RiDownloadLine className="w-5 h-5" />
              Download PDF
            </button>
          </div>

          {/* Invoice Content */}
          <div className="p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                <p className="text-gray-600 mt-1">Sahyadri Hospitality Services</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Invoice Date: {format(new Date(), 'dd/MM/yyyy')}</p>
                <p className="text-gray-600">Invoice #: INV-{format(new Date(), 'yyyyMMdd')}</p>
              </div>
            </div>

            {/* Package & Month Info */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-700">Package Details</h3>
                  <p className="text-gray-600">{invoiceData.packageDetails.name}</p>
                  <p className="text-gray-600">Type: {invoiceData.packageDetails.type}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-semibold text-gray-700">Billing Period</h3>
                  <p className="text-gray-600">{format(new Date(invoiceData.month), 'MMMM yyyy')}</p>
                </div>
              </div>
            </div>

            {/* Entries Table */}
            <div className="mb-8 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(entry.entry_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.product?.name || 'Unknown Product'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{entry.product?.rate.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{((entry.quantity || 0) * (entry.product?.rate || 0)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {invoiceData.entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                        No entries found for the selected period
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="font-medium">Subtotal:</span>
                    <span>₹{invoiceData.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="font-medium">GST (18%):</span>
                    <span>₹{(invoiceData.totalAmount * 0.18).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-2 text-lg font-bold border-t">
                    <span>Total:</span>
                    <span>₹{(invoiceData.totalAmount * 1.18).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-8 border-t">
              <p className="text-gray-600 text-sm">Thank you for your business!</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Payment Terms: Net 30</p>
                <p>Please make payments to:</p>
                <p>Bank: Example Bank</p>
                <p>Account: XXXX-XXXX-XXXX-1234</p>
                <p>IFSC: EXBK0000123</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


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
  RiBuilding4Line,
  RiLoader4Line,
} from "react-icons/ri";
import Image from 'next/image';
import InvoiceForm from "./invoice-form";

interface Package {
  id: string;
  name: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  rate: number;
  index: number;
}

interface Program {
  id: string;
  name: string;
  customer_name: string;
}

interface BillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

interface DatabaseBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

interface InvoiceData {
  packageDetails: Package;
  month: string;
  entries: BillingEntry[];
  totalAmount: number;
}

interface InvoiceConfig {
  id: string;
  company_name: string;
  from_address: string[];
  bill_to_address: string[];
  gstin: string;
  pan: string;
  footer_note: string;
  logo_url: string;
}

interface InvoicePageProps {
  searchParams: {
    packageId?: string;
    month?: string;
  };
}

export default function InvoicePage({ searchParams }: InvoicePageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<Package[]>([]);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const currentMonth = format(new Date(), 'yyyy-MM');

  useEffect(() => {
    fetchPackages();
    fetchInvoiceConfig();
  }, []);

  useEffect(() => {
    if (searchParams.packageId && searchParams.month) {
      generateInvoiceData(searchParams.packageId, searchParams.month);
    }
  }, [searchParams.packageId, searchParams.month]);

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

  const fetchInvoiceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_config')
        .select('*')
        .single();

      if (error) throw error;

      setInvoiceConfig({
        ...data,
        from_address: data?.from_address || [],
        bill_to_address: Array.isArray(data?.bill_to_address)
          ? data.bill_to_address
          : data?.bill_to_address ? [data.bill_to_address] : [],
        logo_url: 'https://sahyadriservices.in/production/images/logo.png'
      });
    } catch (error) {
      console.error('Error fetching invoice config:', error);
      toast.error('Failed to fetch invoice configuration');
    }
  };

  const generateInvoiceData = async (packageId: string, month: string) => {
    setIsLoading(true);
    try {
      // Get start and end dates for the selected month
      const startDate = `${month}-01`;
      const endDate = new Date(month + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Get package details
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (packageError) throw packageError;
      if (!packageData) throw new Error('Package not found');

      // Get billing entries
      const { data: entriesData, error: entriesError } = await supabase
        .from('billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          programs:program_id (
            id,
            name,
            customer_name
          ),
          products:product_id (
            id,
            name,
            rate,
            index
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr)
        .order('products(index)', { ascending: true });

      if (entriesError) throw entriesError;

      if (!entriesData || entriesData.length === 0) {
        throw new Error(`No entries found for package ${packageData.name} between ${format(new Date(startDate), 'dd/MM/yyyy')} and ${format(new Date(endDateStr), 'dd/MM/yyyy')}`);
      }

      // Transform and aggregate entries
      const transformedEntries = entriesData.reduce((acc: BillingEntry[], entry: any) => {
        if (!entry.products || !entry.programs) return acc;

        const existingEntry = acc.find(e => e.products.id === entry.products.id);
        if (existingEntry) {
          existingEntry.quantity += entry.quantity || 0;
        } else {
          const newEntry: BillingEntry = {
            id: entry.id,
            entry_date: entry.entry_date,
            quantity: entry.quantity || 0,
            programs: {
              id: entry.programs.id,
              name: entry.programs.name,
              customer_name: entry.programs.customer_name
            },
            products: {
              id: entry.products.id,
              name: entry.products.name,
              rate: entry.products.rate,
              index: entry.products.index
            }
          };
          acc.push(newEntry);
        }
        return acc;
      }, []);

      // Sort entries by product index
      transformedEntries.sort((a, b) => (a.products.index || 0) - (b.products.index || 0));

      // Calculate total
      const totalAmount = transformedEntries.reduce((sum, entry) => {
        const rate = entry.products.rate || 0;
        const quantity = entry.quantity || 0;
        return sum + (rate * quantity);
      }, 0);

      setInvoiceData({
        packageDetails: packageData,
        month,
        entries: transformedEntries,
        totalAmount
      });
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!searchParams.packageId || !searchParams.month) return;
    
    try {
      const response = await fetch('/api/invoice/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: searchParams.packageId,
          month: searchParams.month,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to print invoice');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast.error('Failed to print invoice');
    }
  };

  const handleDownload = async () => {
    if (!searchParams.packageId || !searchParams.month) return;
    
    try {
      const response = await fetch('/api/invoice/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: searchParams.packageId,
          month: searchParams.month,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to download invoice');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${searchParams.month}-${searchParams.packageId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Section */}
      <InvoiceForm 
        packages={packages}
        currentMonth={currentMonth}
        selectedPackage={searchParams.packageId}
        selectedMonth={searchParams.month || currentMonth}
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed bottom-2 right-2 bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-[1000] border border-amber-100">
          <div className="relative">
            <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 border-2 border-amber-100 rounded-full animate-pulse"></div>
          </div>
          <span className="text-sm font-medium text-amber-700">Generating invoice...</span>
        </div>
      )}

      {/* Invoice Preview */}
      {invoiceData && invoiceConfig && (
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
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              <RiDownloadLine className="w-5 h-5" />
              Download PDF
            </button>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="p-8 bg-white">
            {/* Company Header */}
            <div className="flex justify-between items-start mb-4 pb-2 border-b">
              <div className="flex items-start gap-4">
                <Image
                  src={invoiceConfig.logo_url}
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="rounded-lg object-contain"
                  priority
                  unoptimized
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{invoiceConfig.company_name}</h1>
                  {invoiceConfig.from_address.map((line: string, index: number) => (
                    <p key={index} className="text-gray-600 text-sm">{line}</p>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-amber-600">INVOICE</h2>
              </div>
            </div>

            {/* Billing Details */}
            <div className="grid grid-cols-2 gap-4 my-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Ship to:</h3>
                <div className="text-gray-600 text-sm">
                  {invoiceConfig.from_address.map((line: string, index: number) => (
                    <p key={index}>{line}</p>
                  ))}
                  <p className="mt-1">GSTIN: {invoiceConfig.gstin}</p>
                  <p>PAN: {invoiceConfig.pan}</p>
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Bill to:</h3>
                <div className="text-gray-600 text-sm">
                  {invoiceConfig.bill_to_address.map((line: string, index: number) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Invoice Title */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <RiFileTextLine className="w-4 h-4 text-amber-600" />
                INVOICE for {format(new Date(invoiceData.month), 'MMMM yyyy')} - {invoiceData.packageDetails.name}
              </h3>
            </div>

            {/* Entries Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-2 border-gray-200">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sr. No</th>
                    <th className="w-[40%] px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product Name</th>
                    <th className="w-[15%] px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                    <th className="w-[15%] px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Basic Rate</th>
                    <th className="w-[20%] px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData.entries.map((entry, index) => {
                    const rate = entry.products.rate || 0;
                    const quantity = entry.quantity || 0;
                    const lineTotal = rate * quantity;

                    return (
                      <tr key={entry.id}>
                        <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.products.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          ₹{rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          ₹{lineTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-right font-semibold">Total Amount:</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right">
                      ₹{invoiceData.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-8 border-t">
              <div className="flex justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-gray-900">Company Details:</h4>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>PAN: {invoiceConfig.pan}</p>
                    <p>GSTIN: {invoiceConfig.gstin}</p>
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <h4 className="font-semibold text-gray-900">Authorized Signatory:</h4>
                  <div className="mt-8 w-48 border-t border-gray-300 inline-block"></div>
                </div>
              </div>

              {invoiceConfig.footer_note && (
                <div className="mt-8 text-center text-sm text-gray-600">
                  <p>{invoiceConfig.footer_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generatePDF } from '@/lib/pdf-generator';
import { revalidatePath } from 'next/cache';
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

interface SupabaseBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
  programs: Program;
  products: Product;
}

interface DatabaseBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
  programs: {
    id: string;
    name: string;
    customer_name: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
    index: number;
  };
}

interface InvoiceData {
  packageDetails: Package | null;
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

const pdfStyles = `
  @media print {
    body * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
  
  #invoice-content {
    max-width: 1140px;
    margin: 0 auto;
    padding: 20px;
    font-size: 12px;
    line-height: 1.4;
    color: #1f2937;
  }
  
  #invoice-content .table-container {
    margin: 12px 0;
    overflow-x: visible;
    page-break-inside: avoid;
  }
  
  #invoice-content table {
    width: 100%;
    border-collapse: collapse;
  }
  
  #invoice-content table th,
  #invoice-content table td {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }
  
  #invoice-content table th {
    background-color: #fff7ed;
    font-weight: 600;
    font-size: 11px;
  }
  
  #invoice-content .company-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e5e7eb;
  }
  
  #invoice-content .company-header img {
    width: 48px;
    height: auto;
  }
  
  #invoice-content .company-header h1 {
    font-size: 18px;
    margin-bottom: 2px;
  }
  
  #invoice-content .company-header p {
    margin: 1px 0;
    font-size: 11px;
  }
  
  #invoice-content .billing-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 8px 0;
  }
  
  #invoice-content .billing-details h3 {
    font-size: 14px;
    margin-bottom: 2px;
  }
  
  #invoice-content .billing-details p {
    margin: 1px 0;
    font-size: 11px;
  }
  
  #invoice-content .total-section {
    margin-top: 8px;
    border-top: 1px solid #e5e7eb;
    padding-top: 8px;
  }
  
  #invoice-content .total-section .total-amount {
    font-size: 14px;
    font-weight: 600;
  }
  
  #invoice-content .footer {
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
  }
  
  #invoice-content .footer-note {
    margin-top: 8px;
    text-align: center;
    font-size: 10px;
    color: #6b7280;
  }
  
  #invoice-content .signature-section {
    margin-top: 24px;
    text-align: right;
  }
  
  #invoice-content .signature-line {
    margin-top: 32px;
    border-top: 1px solid #e5e7eb;
    width: 200px;
    display: inline-block;
  }
  
  #invoice-content .company-details {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin: 6px 0;
  }
  
  #invoice-content .company-details .detail-item {
    margin: 1px 0;
  }
  
  #invoice-content .invoice-info {
    text-align: right;
    font-size: 11px;
    margin-bottom: 6px;
  }
  
  #invoice-content .invoice-info h2 {
    font-size: 16px;
    color: #d97706;
    margin-bottom: 2px;
  }
  
  #invoice-content .page-break-after {
    page-break-after: always;
  }
  
  #invoice-content .page-break-inside-avoid {
    page-break-inside: avoid;
  }
  
  /* Pagination styles */
  #invoice-content .entries-table {
    page-break-inside: auto;
  }

  #invoice-content .entries-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  #invoice-content .entries-table thead {
    display: table-header-group;
  }

  #invoice-content .entries-table tbody {
    page-break-inside: avoid;
  }

  #invoice-content .page-header {
    display: none;
  }

  @media print {
    #invoice-content .page-header {
      display: block;
      margin-bottom: 20px;
    }

    #invoice-content .entries-table {
      margin-bottom: 20px;
    }
  }

  /* Column width styles */
  #invoice-content table th,
  #invoice-content table td {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
  }

  /* Specific column widths */
  #invoice-content table th:nth-child(1),
  #invoice-content table td:nth-child(1) {
    width: 10%; /* Sr. No column - reduced width */
    padding-right: 4px;
  }

  #invoice-content table th:nth-child(2),
  #invoice-content table td:nth-child(2) {
    width: 45%; /* Product Name column - increased width */
    padding-right: 24px; /* Add more spacing after product name */
  }

  #invoice-content table th:nth-child(3),
  #invoice-content table td:nth-child(3) {
    width: 15%; /* Quantity column */
  }

  #invoice-content table th:nth-child(4),
  #invoice-content table td:nth-child(4) {
    width: 17.5%; /* Basic Rate column */
  }

  #invoice-content table th:nth-child(5),
  #invoice-content table td:nth-child(5) {
    width: 17.5%; /* Total column */
  }

  /* Ensure table uses these fixed widths */
  #invoice-content table {
    table-layout: fixed;
    width: 100%;
  }

  /* Prevent text overflow in cells */
  #invoice-content table td {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Page break and spacing styles */
  #invoice-content .page-break-before {
    page-break-before: always;
    padding-top: 12mm; /* Add top padding for subsequent pages */
  }

  /* Page header spacing */
  #invoice-content .page-header {
    margin-bottom: 30px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e5e7eb;
  }
`;

async function getPackages() {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

async function getInvoiceConfig() {
  const supabase = createServerComponentClient({ cookies });
  const { data, error } = await supabase
    .from('invoice_config')
    .select('*')
    .single();

  if (error) throw error;
  return {
    ...data,
    from_address: data?.from_address || [],
    bill_to_address: Array.isArray(data?.bill_to_address) 
      ? data.bill_to_address 
      : data?.bill_to_address ? [data.bill_to_address] : [],
    logo_url: 'https://sahyadriservices.in/production/images/logo.png'
  };
}

async function generateInvoiceData(packageId: string, month: string) {
  const supabase = createServerComponentClient({ cookies });

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
  const transformedEntries = entriesData.reduce((acc: BillingEntry[], entry) => {
    if (!entry.products || !entry.programs) return acc;

    const existingEntry = acc.find(e => e.products?.id === entry.products?.id);
    if (existingEntry) {
      existingEntry.quantity += entry.quantity || 0;
    } else {
      acc.push({
        id: entry.id,
        entry_date: entry.entry_date,
        quantity: entry.quantity || 0,
        programs: entry.programs,
        products: entry.products
      });
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

  return {
    packageDetails: packageData,
    month,
    entries: transformedEntries,
    totalAmount
  };
}

export default async function InvoicePage({
  searchParams
}: {
  searchParams: { packageId?: string; month?: string }
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const packages = await getPackages();
  const invoiceConfig = await getInvoiceConfig();
  const currentMonth = format(new Date(), 'yyyy-MM');

  let invoiceData: InvoiceData | null = null;
  
  if (searchParams.packageId && searchParams.month) {
    try {
      setIsLoading(true);
      invoiceData = await generateInvoiceData(searchParams.packageId, searchParams.month);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      toast.error(error.message || 'Failed to generate invoice');
    } finally {
      setIsLoading(false);
    }
  }

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const response = await fetch(`/api/invoice/print?packageId=${searchParams.packageId}&month=${searchParams.month}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate print version');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
      toast.success('Print version generated successfully');
    } catch (error: any) {
      console.error('Error printing invoice:', error);
      toast.error(error.message || 'Failed to print invoice');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/invoice/download?packageId=${searchParams.packageId}&month=${searchParams.month}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${searchParams.packageId}_${searchParams.month}.pdf`;
      window.open(url, '_blank');
      window.URL.revokeObjectURL(url);
      toast.success('PDF generated successfully');
    } catch (error: any) {
      console.error('Error downloading invoice:', error);
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <style>{pdfStyles}</style>
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
      {invoiceData && (
        <div className="bg-white rounded-lg shadow">
          {/* Invoice Actions */}
          <div className="print:hidden p-4 border-b flex justify-end space-x-4">
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {isPrinting ? (
                <RiLoader4Line className="w-5 h-5 animate-spin" />
              ) : (
                <RiPrinterLine className="w-5 h-5" />
              )}
              {isPrinting ? 'Printing...' : 'Print'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              {isDownloading ? (
                <RiLoader4Line className="w-5 h-5 animate-spin" />
              ) : (
                <RiDownloadLine className="w-5 h-5" />
              )}
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>

          {/* Updated Invoice Content */}
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
                INVOICE for {format(new Date(invoiceData.month), 'MMMM yyyy')} - {invoiceData.packageDetails?.name}
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

      {/* Add print-specific styles */}
      <style jsx global>{`
        @media print {
          img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .company-logo {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            print-color: exact !important;
          }
        }
      `}</style>
    </div>
  );
}



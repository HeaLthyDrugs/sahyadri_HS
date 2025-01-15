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
} from "react-icons/ri";
import Image from 'next/image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
    line-height: 1.2; /* Reduced line height */
    color: #1f2937;
  }
  
  #invoice-content .table-container {
    margin: 8px 0; /* Reduced margin */
    overflow-x: visible;
  }
  
  #invoice-content table {
    width: 100%;
    border-collapse: collapse;
  }
  
  #invoice-content table th,
  #invoice-content table td {
    padding: 4px 8px; /* Reduced padding */
    text-align: left;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle; /* Added for better vertical alignment */
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
    margin-bottom: 16px; /* Reduced margin */
    padding-bottom: 8px; /* Reduced padding */
    border-bottom: 1px solid #e5e7eb;
  }
  
  #invoice-content .company-header img {
    width: 48px;
    height: auto;
  }
  
  #invoice-content .company-header h1 {
    font-size: 18px;
    margin-bottom: 2px; /* Reduced margin */
  }
  
  #invoice-content .company-header p {
    margin: 1px 0; /* Reduced margin */
    font-size: 11px;
  }
  
  #invoice-content .billing-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px; /* Reduced gap */
    margin: 8px 0; /* Reduced margin */
  }
  
  #invoice-content .billing-details h3 {
    font-size: 14px;
    margin-bottom: 2px; /* Reduced margin */
  }
  
  #invoice-content .billing-details p {
    margin: 1px 0; /* Reduced margin */
    font-size: 11px;
  }
  
  #invoice-content .total-section {
    margin-top: 8px; /* Reduced margin */
    border-top: 1px solid #e5e7eb;
    padding-top: 8px; /* Reduced padding */
  }
  
  #invoice-content .total-section .total-amount {
    font-size: 14px;
    font-weight: 600;
  }
  
  #invoice-content .footer {
    margin-top: 16px; /* Reduced margin */
    padding-top: 8px; /* Reduced padding */
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
  }
  
  #invoice-content .footer-note {
    margin-top: 8px; /* Reduced margin */
    text-align: center;
    font-size: 10px;
    color: #6b7280;
  }
  
  #invoice-content .signature-section {
    margin-top: 24px; /* Reduced margin */
    text-align: right;
  }
  
  #invoice-content .signature-line {
    margin-top: 32px; /* Reduced margin */
    border-top: 1px solid #e5e7eb;
    width: 200px;
    display: inline-block;
  }
  
  #invoice-content .company-details {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    margin: 6px 0; /* Reduced margin */
  }
  
  #invoice-content .company-details .detail-item {
    margin: 1px 0; /* Reduced margin */
  }
  
  #invoice-content .invoice-info {
    text-align: right;
    font-size: 11px;
    margin-bottom: 6px; /* Reduced margin */
  }
  
  #invoice-content .invoice-info h2 {
    font-size: 16px;
    color: #d97706;
    margin-bottom: 2px; /* Reduced margin */
  }
`;

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
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    id: '',
    company_name: '',
    from_address: [],
    bill_to_address: [],
    gstin: '',
    pan: '',
    footer_note: '',
    logo_url: '/logo.png'
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    fetchInvoiceConfig();
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

  const fetchInvoiceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_config')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setInvoiceConfig({
          ...data,
          from_address: data.from_address || [],
          bill_to_address: Array.isArray(data.bill_to_address) 
            ? data.bill_to_address 
            : data.bill_to_address ? [data.bill_to_address] : [],
          logo_url: data.logo_url || '/logo.png'
        });
      }
    } catch (error) {
      console.error('Error fetching invoice config:', error);
      toast.error('Failed to fetch invoice configuration');
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
        return sum + (entry.quantity * (entry.product[0]?.rate || 0));
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

  const downloadAsPDF = async () => {
    try {
      toast.loading('Generating PDF...');
      
      const invoiceElement = document.getElementById('invoice-content');
      if (!invoiceElement) {
        throw new Error('Invoice element not found');
      }

      // Apply specific styles for PDF generation
      const pdfSpecificStyles = document.createElement('style');
      pdfSpecificStyles.textContent = pdfStyles;
      document.head.appendChild(pdfSpecificStyles);

      const canvas = await html2canvas(invoiceElement, {
        scale: 2, // Increased scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('invoice-content');
          if (clonedElement) {
            // Apply additional PDF-specific styles
            clonedElement.style.width = '210mm';
            clonedElement.style.marginBottom = '20mm';
            clonedElement.style.padding = '20mm';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.fontSize = '12px';
            
            // Ensure table cells have proper spacing
            const tables = clonedElement.getElementsByTagName('table');
            Array.from(tables).forEach(table => {
              table.style.width = '100%';
              table.style.tableLayout = 'fixed';
            });
          }
        }
      });

      // Create PDF with proper dimensions
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(
        imgData, 
        'JPEG', 
        imgX, 
        imgY, 
        imgWidth * ratio, 
        imgHeight * ratio, 
        undefined, 
        'FAST'
      );

      // Generate filename
      const fileName = `Invoice-${format(new Date(), 'yyyyMMdd')}-${invoiceData.packageDetails?.name || 'unknown'}.pdf`;
      
      pdf.save(fileName);
      
      // Clean up
      document.head.removeChild(pdfSpecificStyles);
      
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="space-y-6">
      <style>{pdfStyles}</style>
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

          {/* Updated Invoice Content */}
          <div id="invoice-content" className="p-8 bg-white">
            {/* Company Header */}
            <div className="company-header">
              <div className="flex items-center gap-4">
                <Image
                  src={invoiceConfig.logo_url}
                  alt="Company Logo"
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{invoiceConfig.company_name}</h1>
                  {invoiceConfig.from_address.map((line, index) => (
                    <p key={index} className="text-gray-600">{line}</p>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-amber-600">INVOICE</h2>
                <p className="text-gray-600 mt-2">Date: {format(new Date(), 'dd/MM/yyyy')}</p>
              </div>
            </div>

            {/* Billing Details */}
            <div className="billing-details">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">From:</h3>
                <div className="text-gray-600">
                  {invoiceConfig.from_address.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Bill To:</h3>
                <div className="text-gray-600">
                  {invoiceConfig.bill_to_address.map((line, index) => (
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

            {/* Entries Table - remains mostly same but with updated styling */}
            <div className="mb-8 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border-2 border-gray-200">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sr. No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Basic Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoiceData.entries.map((entry, index) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
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
                  <div className="flex justify-between py-2 text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>₹{invoiceData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Updated Footer */}
            <div className="mt-8 pt-8 border-t grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <h4 className="font-semibold text-gray-900">Company Details:</h4>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>PAN: {invoiceConfig.pan}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Authorized Signatory:</h4>
                <div className="mt-16 pt-4 border-t border-gray-200">
                  <p className="text-gray-600">Signature & Stamp</p>
                </div>
              </div>
            </div>

            {invoiceConfig.footer_note && (
              <div className="mt-8 text-center text-sm text-gray-600">
                <p>{invoiceConfig.footer_note}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



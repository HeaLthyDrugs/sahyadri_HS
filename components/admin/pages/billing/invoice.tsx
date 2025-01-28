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
  index: number;
}

interface BillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: { id: string; name: string; }[];
  products: Product;
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

  const currentMonth = format(new Date(), 'yyyy-MM');

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

    // Check if selected month is in the future
    const selectedDate = new Date(selectedMonth + '-01');
    const currentDate = new Date();
    if (selectedDate > currentDate) {
      toast.error('Cannot generate invoice for future months. Please select current or past months only.');
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

      // First get package details
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('id', selectedPackage)
        .single();

      if (packageError) throw packageError;

      // Update the billing entries query to join with products and order by product index
      const entriesQuery = supabase
        .from('billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          program_id,
          package_id,
          product_id,
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
        .eq('package_id', selectedPackage)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr)
        .order('products(index)', { ascending: true });

      const { data: entriesData, error: entriesError } = await entriesQuery;

      if (entriesError) {
        console.error('Entries Error:', entriesError);
        throw entriesError;
      }

      if (!entriesData || entriesData.length === 0) {
        throw new Error(`No entries found for package ${packageData.name} between ${format(new Date(startDate), 'dd/MM/yyyy')} and ${format(new Date(endDateStr), 'dd/MM/yyyy')}`);
      }

      // Transform and aggregate the entries by product, maintaining the index order
      const transformedEntries = entriesData.reduce((acc: any[], entry) => {
        if (!entry.products || !entry.products.name) {
          console.error('Invalid product data:', entry);
          return acc;
        }

        const existingEntry = acc.find(e => e.products.id === entry.products.id);

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
      transformedEntries.sort((a, b) => 
        (a.products.index || 0) - (b.products.index || 0)
      );

      // Calculate total with null checks
      const total = transformedEntries.reduce((sum, entry) => {
        const rate = entry.products.rate || 0;
        const quantity = entry.quantity || 0;
        return sum + (rate * quantity);
      }, 0);

      setInvoiceData({
        packageDetails: packageData,
        month: selectedMonth,
        entries: transformedEntries,
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
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('invoice-content');
          if (clonedElement) {
            clonedElement.style.width = '210mm';
            clonedElement.style.padding = '20mm';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.fontSize = '12px';
          }
        }
      });
  
      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
  
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions
      const imgProps = pdf.getImageProperties(imgData);
      const pdfRatio = pdfWidth / pdfHeight;
      const imgRatio = imgProps.width / imgProps.height;
      
      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / imgRatio;
      
      // Calculate number of pages needed
      const pageCount = Math.ceil(imgHeight / pdfHeight);
      
      // Add pages one by one
      for (let page = 0; page < pageCount; page++) {
        if (page > 0) {
          pdf.addPage();
        }
        
        // Calculate the slice of the image to use for this page
        const position = -page * pdfHeight;
        
        pdf.addImage(
          imgData,
          'JPEG',
          0,
          position,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
      }
  
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
            max={currentMonth}
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

            {/* Entries Tables with Pagination */}
            {(() => {
              const ITEMS_PER_PAGE = 25;
              
              return (
                <table className="min-w-full divide-y divide-gray-200 border-2 border-gray-200 entries-table">
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{rate.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{lineTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-right font-semibold">Total Amount:</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        ₹{invoiceData.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}

            {/* Updated Footer */}
            <div className="mt-8 pt-8 border-t grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <h4 className="font-semibold text-gray-900">Company Details:</h4>
                <div className="text-sm text-gray-600 space-y-0.5">
                  <p>PAN: {invoiceConfig.pan}</p>
                  <p>GSTIN: {invoiceConfig.gstin}</p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900">Authorized Signatory:</h4>
                  {/* Signature space  */}
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



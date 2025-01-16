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
  RiPrinterLine,
} from "react-icons/ri";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

const pdfStyles = `
  @media print {
    body * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
  }

  #report-content {
    max-width: 1140px;
    margin: 0 auto;
    padding: 10px;
    font-family: 'Arial', sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #1f2937;
    background-color: white;
  }

  #report-content .page-header {
    display: block !important;
    margin-bottom: 16px;
    text-align: center;
    padding: 8px 0;
    border-bottom: 2px solid #f59e0b;
  }

  #report-content .page-header h2 {
    font-size: 18px !important;
    font-weight: 800;
    color: #1f2937 !important;
    margin-bottom: 8px;
  }

  #report-content .page-header .subtitle {
    font-size: 14px;
    color: #4b5563;
    margin-top: 4px;
  }

  #report-content .table-container {
    margin: 16px 0;
    overflow-x: visible;
    page-break-inside: avoid;
  }

  #report-content table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e5e7eb;
    margin-bottom: 20px;
  }

  #report-content table th {
    background-color: #f8fafc !important;
    color: #1f2937 !important;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 8px;
    border-bottom: 2px solid #e5e7eb;
  }

  #report-content table td {
    padding: 10px 8px;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
  }

  #report-content table tr:nth-child(even) {
    background-color: #f9fafb;
  }

  #report-content table tfoot {
    font-weight: 600;
    background-color: #f8fafc !important;
    border-top: 2px solid #e5e7eb;
  }

  #report-content table tfoot td {
    color: #1f2937 !important;
  }

  /* Page break and spacing */
  #report-content .page-break-before {
    page-break-before: always;
    margin-top: 20mm;
  }

  /* Summary section */
  #report-content .summary-section {
    margin: 20px 0;
    padding: 16px;
    background-color: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
  }

  /* Report metadata */
  #report-content .report-metadata {
    margin: 16px 0;
    font-size: 11px;
    color: #6b7280;
  }

  /* Page numbers */
  #report-content .page-number {
    position: running(pageNumber);
    font-size: 10px;
    color: #6b7280;
    text-align: center;
    margin-top: 8px;
  }

  @page {
    margin: 20mm;
    @bottom-center {
      content: "Page " counter(page) " of " counter(pages);
    }
  }
`;

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

  const downloadAsPDF = async () => {
    try {
      toast.loading('Generating PDF...');

      const reportElement = document.getElementById('report-content');
      if (!reportElement) {
        throw new Error('Report element not found');
      }

      const pdfSpecificStyles = document.createElement('style');
      pdfSpecificStyles.textContent = pdfStyles;
      document.head.appendChild(pdfSpecificStyles);

      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('report-content');
          if (clonedElement) {
            clonedElement.style.width = '210mm';
            clonedElement.style.padding = '20mm';
            clonedElement.style.boxSizing = 'border-box';
            clonedElement.style.fontSize = '12px';
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;

      let imgWidth = pdfWidth;
      let imgHeight = pdfWidth / imgRatio;

      const pageCount = Math.ceil(imgHeight / pdfHeight);

      for (let page = 0; page < pageCount; page++) {
        if (page > 0) {
          pdf.addPage();
        }

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

      const fileName = `Report-${format(new Date(), 'yyyyMMdd')}.pdf`;

      pdf.save(fileName);

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

      {/* Report Actions */}
      <div className="print:hidden p-4 border-b flex justify-end space-x-4">
        <button
          onClick={() => window.print()}
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

      {/* Summary Cards */}
      {/* {reportData.length > 0 && (
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
      )} */}

      {/* Report Table */}
      {reportData.length > 0 && (
        <div id="report-content" className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="page-header">
            <h2 className="text-xl font-bold text-center text-amber-600">2025 Catering Services Report</h2>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const ITEMS_PER_PAGE = 20;
              const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);

              return Array.from({ length: totalPages }).map((_, pageIndex) => {
                const startIndex = pageIndex * ITEMS_PER_PAGE;
                const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, reportData.length);
                const pageEntries = reportData.slice(startIndex, endIndex);

                return (
                  <div
                    key={pageIndex}
                    className={`mb-8 overflow-x-auto ${pageIndex > 0 ? 'page-break-before' : ''}`}
                  >
                    {pageIndex > 0 && (
                      <div className="page-header page-break-before">
                        <h3 className="text-lg font-semibold text-center">
                          Continued Report - Page {pageIndex + 1}
                        </h3>
                      </div>
                    )}

                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th scope="col">Sr. No</th>
                          <th scope="col">Program Name</th>
                          <th scope="col">Catering Package</th>
                          <th scope="col">Extra Catering Package</th>
                          <th scope="col">Cold Drink Package</th>
                          <th scope="col" className="text-right">Gr. Total Per Prog.</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pageEntries.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{startIndex + index + 1}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.program}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.package}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Extra Package Data</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Cold Drink Data</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{row.amount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      {pageIndex === totalPages - 1 && (
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Totals</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">₹{summary.totalAmount.toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                );
              });
            })()}
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

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
  RiCalendarLine,
  RiBuilding4Line,
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

interface ProgramReport {
  programDetails: {
    name: string;
    startDate: string;
    endDate: string;
    totalParticipants: number;
  };
  packages: {
    [key: string]: {
      packageName: string;
      items: {
        productName: string;
        quantity: number;
        rate: number;
        total: number;
      }[];
      packageTotal: number;
    };
  };
  grandTotal: number;
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
    max-width: 1200px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  }

  #report-content .page-header {
    background: #f8fafc;
    padding: 24px;
    border-radius: 12px 12px 0 0;
    margin-bottom: 24px;
    border-bottom: 1px solid #e5e7eb;
  }

  #report-content .page-header h2 {
    color: #1f2937 !important;
    font-size: 20px !important;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  #report-content .page-header .subtitle {
    color: #4b5563;
  }

  #report-content table {
    margin: 24px;
    width: calc(100% - 48px);
    border-radius: 8px;
    overflow: hidden;
    border: none;
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  }

  #report-content table th {
    background-color: #f8fafc !important;
    padding: 16px 12px;
  }

  #report-content table td {
    padding: 12px;
  }

  #report-content .summary-section {
    margin: 24px;
    border-radius: 8px;
  }

  /* Table specific styles */
  #report-content .entries-table {
    page-break-inside: auto;
    margin: 0;
    width: 100%;
  }

  #report-content .entries-table tr {
    page-break-inside: avoid;
    page-break-after: auto;
  }

  #report-content .entries-table thead {
    display: table-header-group;
  }

  #report-content .entries-table tbody {
    page-break-inside: avoid;
  }

  /* Specific column widths */
  #report-content table th:nth-child(1),
  #report-content table td:nth-child(1) {
    width: 8%;
    text-align: center;
  }

  #report-content table th:nth-child(2),
  #report-content table td:nth-child(2) {
    width: 25%;
  }

  #report-content table th:nth-child(3),
  #report-content table td:nth-child(3) {
    width: 20%;
  }

  #report-content table th:nth-child(4),
  #report-content table td:nth-child(4) {
    width: 20%;
  }

  #report-content table th:nth-child(5),
  #report-content table td:nth-child(5) {
    width: 15%;
  }

  #report-content table th:nth-child(6),
  #report-content table td:nth-child(6) {
    width: 12%;
    text-align: right;
  }

  /* Page break and spacing */
  #report-content .page-break-before {
    page-break-before: always;
    padding-top: 12mm;
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
  const [reportType, setReportType] = useState<'monthly' | 'program'>('monthly');
  const [programReport, setProgramReport] = useState<ProgramReport | null>(null);

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
    if (reportType === 'monthly') {
      await generateMonthlyReport();
    } else {
      await generateProgramReport();
    }
  };

  const generateMonthlyReport = async () => {
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

  const generateProgramReport = async () => {
    if (!selectedProgram) {
      toast.error('Please select a program');
      return;
    }

    setIsLoading(true);
    try {
      // Fetch program details
      const { data: programData, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', selectedProgram)
        .single();

      if (programError) throw programError;

      // Fetch billing entries grouped by package
      const { data: billingData, error: billingError } = await supabase
        .from('billing_entries')
        .select(`
          quantity,
          packages (id, name),
          products (name, rate)
        `)
        .eq('program_id', selectedProgram);

      if (billingError) throw billingError;

      // Process and group data by package
      const packageGroups: ProgramReport['packages'] = {};
      let grandTotal = 0;

      billingData.forEach(entry => {
        const packageName = entry.packages[0]?.name || 'Unknown';
        if (!packageGroups[packageName]) {
          packageGroups[packageName] = {
            packageName,
            items: [],
            packageTotal: 0
          };
        }

        const total = entry.quantity * (entry.products[0]?.rate || 0);
        packageGroups[packageName].items.push({
          productName: entry.products[0]?.name || 'Unknown',
          quantity: entry.quantity,
          rate: entry.products[0]?.rate || 0,
          total
        });
        packageGroups[packageName].packageTotal += total;
        grandTotal += total;
      });

      setProgramReport({
        programDetails: {
          name: programData.name,
          startDate: programData.start_date,
          endDate: programData.end_date,
          totalParticipants: programData.total_participants
        },
        packages: packageGroups,
        grandTotal
      });

      toast.success('Program report generated successfully');
    } catch (error) {
      console.error('Error generating program report:', error);
      toast.error('Failed to generate program report');
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

  const generateEnhancedPDF = async (elementId: string, fileName: string) => {
    try {
      toast.loading('Preparing PDF...');

      const element = document.getElementById(elementId);
      if (!element) throw new Error('Report element not found');

      // Add print styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = pdfStyles;
      document.head.appendChild(styleSheet);

      // Configure html2canvas with better quality settings
      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.width = '210mm';
            clonedElement.style.margin = '0';
            clonedElement.style.padding = '20mm';
            clonedElement.style.boxSizing = 'border-box';
          }
        }
      });

      // Create PDF with better quality settings
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
        hotfixes: ['px_scaling']
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

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128);
        pdf.text(
          `Page ${i} of ${pageCount}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      pdf.save(fileName);

      // Cleanup
      document.head.removeChild(styleSheet);
      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const ProgramReportView = () => {
    if (!programReport) return null;

    return (
      <div id="report-content" className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="page-header">
          <h2 className="text-xl font-bold text-center text-amber-600">Program Report</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Program Name:</strong> {programReport.programDetails.name}</p>
              <p><strong>Duration:</strong> {format(new Date(programReport.programDetails.startDate), 'dd/MM/yyyy')} - {format(new Date(programReport.programDetails.endDate), 'dd/MM/yyyy')}</p>
            </div>
            <div>
              <p><strong>Total Participants:</strong> {programReport.programDetails.totalParticipants}</p>
            </div>
          </div>
        </div>

        {Object.values(programReport.packages).map((packageData, index) => (
          <div key={index} className={`mb-8 ${index > 0 ? 'mt-8' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 px-6">{packageData.packageName}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col">Product Name</th>
                    <th scope="col">Quantity</th>
                    <th scope="col">Rate</th>
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {packageData.items.map((item, itemIndex) => (
                    <tr key={itemIndex}>
                      <td className="px-6 py-4">{item.productName}</td>
                      <td className="px-6 py-4">{item.quantity}</td>
                      <td className="px-6 py-4">₹{item.rate.toFixed(2)}</td>
                      <td className="px-6 py-4">₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-6 py-4 font-semibold">Package Total</td>
                    <td className="px-6 py-4 font-semibold">₹{packageData.packageTotal.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        <div className="mt-8 px-6 py-4 bg-gray-50">
          <p className="text-xl font-bold">Grand Total: ₹{programReport.grandTotal.toFixed(2)}</p>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const fileName = reportType === 'monthly' 
      ? `Monthly-Report-${selectedMonth}.pdf`
      : `Program-Report-${programReport?.programDetails.name}-${format(new Date(), 'yyyyMMdd')}.pdf`;
    
    await generateEnhancedPDF('report-content', fileName);
  };

  const MonthlyReportContent = () => {
    const ITEMS_PER_PAGE = 25; // Adjust based on your needs
    const totalPages = Math.ceil(reportData.length / ITEMS_PER_PAGE);

    return (
      <div id="report-content" className="p-8">
        {/* Report Header */}
        <div className="page-header">
          <h2 className="text-xl font-bold text-center">Monthly Billing Report</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Period:</strong> {format(new Date(selectedMonth), 'MMMM yyyy')}</p>
              {selectedProgram && (
                <p><strong>Program:</strong> {programs.find(p => p.id === selectedProgram)?.name}</p>
              )}
            </div>
            <div className="text-right">
              <p><strong>Date Generated:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
              {selectedPackage && (
                <p><strong>Package:</strong> {packages.find(p => p.id === selectedPackage)?.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 my-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Quantity</p>
            <p className="text-xl font-semibold">{summary.totalQuantity.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-xl font-semibold">₹{summary.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Average Per Day</p>
            <p className="text-xl font-semibold">{summary.averagePerDay.toFixed(2)}</p>
          </div>
        </div>

        {/* Entries Table */}
        {Array.from({ length: totalPages }).map((_, pageIndex) => {
          const startIndex = pageIndex * ITEMS_PER_PAGE;
          const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, reportData.length);
          const pageEntries = reportData.slice(startIndex, endIndex);

          return (
            <div 
              key={pageIndex}
              className={`mb-8 ${pageIndex > 0 ? 'page-break-before' : ''}`}
            >
              {pageIndex > 0 && (
                <div className="page-header">
                  <h3 className="text-lg font-semibold mb-4">
                    Continued - Page {pageIndex + 1}
                  </h3>
                </div>
              )}

              <table className="min-w-full divide-y divide-gray-200 entries-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                      Sr. No
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                      Program
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                      Package
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                      Quantity
                    </th>
                    <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pageEntries.map((row, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-500 text-center">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {row.program}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {row.package}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {row.product}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        {row.quantity}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900 text-right">
                        ₹{row.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {pageIndex === totalPages - 1 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-900">
                        Grand Total
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        ₹{summary.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <style>{pdfStyles}</style>
      {/* Controls Section */}
      <div className="print:hidden bg-white p-6 rounded-lg shadow-md">
        {/* Report Type Selector */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
            <RiFileChartLine className="w-5 h-5 text-amber-600" />
            Report Type
          </h2>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <button
              onClick={() => setReportType('monthly')}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === 'monthly'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RiCalendarLine className={`w-5 h-5 ${
                  reportType === 'monthly' ? 'text-amber-600' : 'text-gray-400'
                }`} />
                <div className="text-left">
                  <p className="font-medium">Monthly Report</p>
                  <p className="text-sm text-gray-500">View monthly billing summary</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => setReportType('program')}
              className={`p-4 rounded-lg border-2 transition-all ${
                reportType === 'program'
                  ? 'border-amber-600 bg-amber-50 text-amber-900'
                  : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <RiBuilding4Line className={`w-5 h-5 ${
                  reportType === 'program' ? 'text-amber-600' : 'text-gray-400'
                }`} />
                <div className="text-left">
                  <p className="font-medium">Program Report</p>
                  <p className="text-sm text-gray-500">View program-wise details</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <RiFilterLine className="w-5 h-5 text-amber-600" />
            Report Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportType === 'monthly' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Month
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Select Program
                </label>
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                >
                  <option value="">Choose a program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Package
              </label>
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

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={isLoading}
                className="w-full bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 h-[42px]"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  <>
                    <RiRefreshLine className="w-5 h-5" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Render appropriate report view */}
      {reportType === 'monthly' ? (
        <>
          {reportData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md">
              {/* Report Actions */}
              <div className="print:hidden p-4 border-b flex justify-end space-x-4">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <RiPrinterLine className="w-5 h-5" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <RiDownloadLine className="w-5 h-5" />
                  Download PDF
                </button>
              </div>

              <MonthlyReportContent />
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
        </>
      ) : (
        <>
          {programReport && (
            <div className="bg-white rounded-lg shadow-md">
              {/* Report Actions for Program Report */}
              <div className="print:hidden p-4 border-b flex justify-end space-x-4">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <RiPrinterLine className="w-5 h-5" />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <RiDownloadLine className="w-5 h-5" />
                  Download PDF
                </button>
              </div>

              {/* Program Report Content */}
              <ProgramReportView />
            </div>
          )}
        </>
      )}
    </div>
  );
}

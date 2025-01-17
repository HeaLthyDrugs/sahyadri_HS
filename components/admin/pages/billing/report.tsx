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
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
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

interface BillingEntry {
  entry_date: string;
  quantity: number;
  programs: { id: string; name: string; }[];
  packages: { id: string; name: string; type: string; }[];
  products: { name: string; rate: number; }[];
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

      // Build query to get program-wise package totals - Updated query structure
      let query = supabase
        .from('billing_entries')
        .select(`
          entry_date,
          quantity,
          programs:program_id (
            id,
            name
          ),
          packages:package_id (
            id,
            name,
            type
          ),
          products:product_id (
            name,
            rate
          )
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr);

      if (selectedProgram) {
        query = query.eq('program_id', selectedProgram);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Debug log to check the raw data
      console.log('Raw data from query:', data);

      // Group and transform data by program
      const programTotals = new Map();

      (data || []).forEach((entry: BillingEntry) => {
        const programId = entry.programs?.[0]?.id || 'unknown';
        const programName = entry.programs?.[0]?.name || 'N/A';
        const packageType = entry.packages?.[0]?.type?.toLowerCase() || 'unknown';
        const amount = entry.quantity * (entry.products?.[0]?.rate || 0);

        if (!programTotals.has(programId)) {
          programTotals.set(programId, {
            date: selectedMonth,
            program: programName,
            cateringTotal: 0,
            extraTotal: 0,
            coldDrinkTotal: 0,
            grandTotal: 0
          });
        }

        const programData = programTotals.get(programId);
        
        switch (packageType) {
          case 'catering':
            programData.cateringTotal = (programData.cateringTotal || 0) + amount;
            break;
          case 'extra':
            programData.extraTotal = (programData.extraTotal || 0) + amount;
            break;
          case 'cold drink':
            programData.coldDrinkTotal = (programData.coldDrinkTotal || 0) + amount;
            break;
        }
        
        programData.grandTotal = (programData.grandTotal || 0) + amount;
      });

      // Convert to array and ensure all values are numbers
      const formattedData: ReportData[] = Array.from(programTotals.values());

      // Debug log to check the transformed data
      console.log('Transformed data:', formattedData);

      // Calculate summary
      const summary = {
        totalQuantity: data?.length || 0,
        totalAmount: formattedData.reduce((sum, item) => sum + (Number(item.grandTotal) || 0), 0),
        averagePerDay: formattedData.length ? (data?.length || 0) / formattedData.length : 0
      };

      setReportData(formattedData);
      setSummary(summary);

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

      // Build query for billing entries
      let query = supabase
        .from('billing_entries')
        .select(`
          quantity,
          packages (id, name, type),
          products (name, rate)
        `)
        .eq('program_id', selectedProgram);

      // Add package filter if selected
      if (selectedPackage) {
        query = query.eq('package_id', selectedPackage);
      }

      const { data: billingData, error: billingError } = await query;

      if (billingError) throw billingError;

      // Process and group data by package type
      const packageGroups: ProgramReport['packages'] = {};
      let grandTotal = 0;

      billingData.forEach(entry => {
        const packageType = entry.packages?.[0]?.type?.toLowerCase() || 'unknown';
        const quantity = entry.quantity || 0;
        const rate = entry.products?.[0]?.rate || 0;
        const total = quantity * rate;

        if (!packageGroups[packageType]) {
          packageGroups[packageType] = {
            packageName: packageType,
            items: [],
            packageTotal: 0
          };
        }

        packageGroups[packageType].items.push({
          productName: entry.products?.[0]?.name || 'Unknown',
          quantity,
          rate,
          total
        });

        packageGroups[packageType].packageTotal += total;
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

    const headers = ['Date', 'Program', 'Catering Total', 'Extra Total', 'Cold Drink Total', 'Grand Total'];
    const csvContent = [
      headers.join(','),
      ...reportData.map(row =>
        [
          row.date,
          `"${row.program}"`,
          row.cateringTotal,
          row.extraTotal,
          row.coldDrinkTotal,
          row.grandTotal
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

    // Helper function to format currency
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

    // Filter packages based on selection
    const getFilteredPackages = () => {
      if (!selectedPackage) return Object.keys(programReport.packages);
      const pkg = packages.find(p => p.id === selectedPackage);
      return pkg ? [pkg.type] : [];
    };

    // Package table component
    const PackageTable = ({ packageType, packageData }: { 
      packageType: string, 
      packageData: ProgramReport['packages'][string] 
    }) => {
      if (!packageData?.items || packageData.items.length === 0) return null;

      return (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">{packageType.toUpperCase()} PACKAGE</h3>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left p-4 w-1/3">product name</th>
                  <th className="text-left p-4 w-1/4">Quantity</th>
                  <th className="text-left p-4 w-1/4">rate</th>
                  <th className="text-left p-4 w-1/4">Total</th>
                </tr>
              </thead>
              <tbody>
                {packageData.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="p-4">{item.productName}</td>
                    <td className="p-4">{item.quantity}</td>
                    <td className="p-4">{formatCurrency(item.rate)}</td>
                    <td className="p-4">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
                {/* Package Total */}
                <tr className="bg-gray-50">
                  <td colSpan={3} className="p-4 font-semibold text-right">
                    Package Total:
                  </td>
                  <td className="p-4 font-semibold">
                    {formatCurrency(packageData.packageTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      );
    };

    return (
      <div id="report-content" className="bg-white rounded-lg shadow-md overflow-hidden p-8">
        {/* Program Header */}
        <div className="flex justify-between mb-8 text-lg">
          <div>
            <span className="font-semibold">Program name: </span>
            <span>{programReport.programDetails.name}</span>
          </div>
          <div>
            <span className="font-semibold">from to duration: </span>
            <span>
              {format(new Date(programReport.programDetails.startDate), 'dd/MM/yyyy')} - {format(new Date(programReport.programDetails.endDate), 'dd/MM/yyyy')}
            </span>
          </div>
          <div>
            <span className="font-semibold">No. of people: </span>
            <span>{programReport.programDetails.totalParticipants}</span>
          </div>
        </div>

        {/* Package Tables */}
        <div className="space-y-6">
          {getFilteredPackages().map(packageType => (
            <PackageTable
              key={packageType}
              packageType={packageType}
              packageData={programReport.packages[packageType.toLowerCase()]}
            />
          ))}
        </div>

        {/* Grand Total */}
        <div className="mt-8 text-right">
          <p className="text-xl font-bold">
            Grand Total: {formatCurrency(programReport.grandTotal)}
          </p>
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
    const ITEMS_PER_PAGE = 25;
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

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 entries-table">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center">
                  Sr. No
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Program Name
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Catering Total
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Extra Total
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Cold Drink Total
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Grand Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-500 text-center">
                    {index + 1}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {row.program}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    ₹{row.cateringTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    ₹{row.extraTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right">
                    ₹{row.coldDrinkTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 text-right font-medium">
                    ₹{row.grandTotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  ₹{summary.totalAmount.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
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

      {/* Report Content */}
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

          {/* Monthly Report Content */}
          {reportType === 'monthly' && <MonthlyReportContent />}
          
          {/* Program Report Content */}
          {reportType === 'program' && programReport && <ProgramReportView />}
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

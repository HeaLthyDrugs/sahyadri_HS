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
import MonthlyReport from "@/components/ui/report/MonthlyReport";
import ProgramReport from "@/components/ui/report/ProgramReport";
import AnnualReport from "@/components/ui/report/AnnualReport";
import DayReport from "@/components/ui/report/DayReport";

interface Package {
  id: string;
  name: string;
  type: string;
}

interface Program {
  id: string;
  name: string;
  total_participants: number;
  start_date: string;
  end_date: string;
}

export interface ReportData {
  date: string;
  program: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
}

// Add new interface for day report
interface DayReportData extends ReportData {
  entries: {
    packageType: string;
    productName: string;
    quantity: number;
    rate: number;
    total: number;
  }[];
}

interface ProgramReport {
  programDetails: {
    name: string;
    startDate: string;
    endDate: string;
    totalParticipants: number;
    customerName: string;
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
  package_id: string;
  packages: {
    id: string;
    name: string;
    type: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
  };
}

interface CateringData {
  program: string;
  products: { [key: string]: number };
  total: number;
  comment?: string;
}

interface MonthlyData {
  month: string;
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
  total: number;
}

interface CateringProduct {
  id: string;
  name: string;
  quantity: number;
}

// Update the report type definition
type ReportType = 'day' | 'program' | 'monthly' | 'lifetime';

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
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState({
    start: format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [dayReportData, setDayReportData] = useState<DayReportData | null>(null);
  const [summary, setSummary] = useState({
    totalQuantity: 0,
    totalAmount: 0,
    averagePerDay: 0,
  });
  const [reportType, setReportType] = useState<ReportType>('day');
  const [programReport, setProgramReport] = useState<ProgramReport | null>(null);
  const [cateringData, setCateringData] = useState<CateringData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [cateringProducts, setCateringProducts] = useState<CateringProduct[]>([]);
  const [reportComments, setReportComments] = useState<{ [key: string]: string }>({});
  const [programFilterDate, setProgramFilterDate] = useState(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchPackages();
    if (reportType === 'program') {
      fetchProgramsByDate();
    } else {
      fetchPrograms();
    }
    fetchCateringProducts();
  }, [reportType, programFilterDate]);

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

  const fetchProgramsByDate = async () => {
    try {
      const startDate = `${programFilterDate}-01`;
      const endDate = new Date(programFilterDate + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .or(`and(start_date.gte.${startDate},start_date.lte.${endDateStr}),and(end_date.gte.${startDate},end_date.lte.${endDateStr})`)
        .order('name');

      if (error) throw error;
      setPrograms(data || []);
      
      // Reset selected program when date changes
      setSelectedProgram("");
    } catch (error) {
      console.error('Error fetching programs by date:', error);
      toast.error('Failed to fetch programs');
      setPrograms([]);
    }
  };

  const fetchCateringProducts = async () => {
    try {
      // First get the catering package (type: Normal)
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', 'Normal');

      if (packagesError) throw packagesError;
      
      // If no catering packages found, return early
      if (!packagesData || packagesData.length === 0) {
        console.log('No catering packages found');
        setCateringProducts([]);
        return;
      }

      // Get all products from catering packages
      const packageIds = packagesData.map(pkg => pkg.id);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, index')
        .in('package_id', packageIds)
        .order('index');

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        console.log('No products found for catering packages');
        setCateringProducts([]);
        return;
      }

      setCateringProducts(productsData.map(p => ({ ...p, quantity: 0 })));
    } catch (error) {
      console.error('Error fetching catering products:', error);
      toast.error('Failed to fetch catering products');
      setCateringProducts([]);
    }
  };

  const generateReport = async () => {
    if (reportType === 'day') {
      await generateDayReport();
    } else if (reportType === 'monthly') {
      await generateMonthlyReport();
    } else if (reportType === 'program') {
      await generateProgramReport();
    } else {
      await generateLifetimeReport();
    }
  };

  const generateMonthlyReport = async () => {
    if (!selectedMonth) {
      toast.error('Please select a month');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    setIsLoading(true);
    // Clear previous data
    setReportData([]);
    setCateringData([]);
    
    try {
      // Get start and end dates for the selected month
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      const endDateStr = format(endDate, 'yyyy-MM-dd');

      // Build query for billing entries
      let query = supabase
        .from('billing_entries')
        .select(`
          entry_date,
          quantity,
          program_id,
          package_id,
          product_id,
          programs:programs!inner (
            id,
            name
          ),
          packages:packages!inner (
            id,
            name,
            type
          ),
          products:products!inner (
            id,
            name,
            rate
          )
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr);

      // Add program filter if selected
      if (selectedProgram) {
        query = query.eq('program_id', selectedProgram);
      }

      const { data: entriesData, error } = await query;

      if (error) throw error;

      if (!entriesData || entriesData.length === 0) {
        throw new Error('No entries found for the selected period');
      }

      // Always process data for all packages view
      const programTotals = new Map<string, ReportData>();

      entriesData.forEach((entry: any) => {
        const programId = entry.programs.id;
        const programName = entry.programs.name;
        const amount = entry.quantity * entry.products.rate;
        const packageType = entry.packages.type.toLowerCase();

        if (!programTotals.has(programId)) {
          programTotals.set(programId, {
            date: format(new Date(entry.entry_date), 'yyyy-MM-dd'),
            program: programName,
            cateringTotal: 0,
            extraTotal: 0,
            coldDrinkTotal: 0,
            grandTotal: 0
          });
        }

        const programData = programTotals.get(programId)!;
        
        // Update totals based on package type
        switch (packageType) {
          case 'normal':
            programData.cateringTotal += amount;
            break;
          case 'extra':
            programData.extraTotal += amount;
            break;
          case 'cold drink':
            programData.coldDrinkTotal += amount;
            break;
        }
        
        programData.grandTotal += amount;
      });

      const reportDataArray = Array.from(programTotals.values());
      setReportData(reportDataArray);

      // Process data for catering view if needed
      if (selectedPackage === 'normal') {
        const cateringEntries = new Map<string, CateringData>();

        entriesData.forEach((entry: any) => {
          if (entry.packages.type.toLowerCase() !== 'normal') return;

          const programId = entry.programs.id;
          const programName = entry.programs.name;
          const productId = entry.product_id;
          const quantity = entry.quantity;

          if (!cateringEntries.has(programId)) {
            cateringEntries.set(programId, {
              program: programName,
              products: {},
              total: 0
            });
          }

          const data = cateringEntries.get(programId)!;
          data.products[productId] = (data.products[productId] || 0) + quantity;
          data.total += quantity;
        });

        const cateringDataArray = Array.from(cateringEntries.values());
        if (cateringDataArray.length === 0) {
          throw new Error('No catering data found for the selected period');
        }
        setCateringData(cateringDataArray);
      }

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      // Clear report data on error
      setReportData([]);
      setCateringData([]);
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
          id,
          entry_date,
          quantity,
          package_id,
          product_id,
          packages:packages!inner (
            id,
            name,
            type
          ),
          products:products!inner (
            id,
            name,
            rate
          )
        `)
        .eq('program_id', selectedProgram)
        .order('entry_date', { ascending: true });

      // Add package filter if selected
      if (selectedPackage && selectedPackage !== 'all') {
        query = query.eq('package_id', selectedPackage);
      }

      const { data: billingData, error: billingError } = await query;

      if (billingError) {
        console.error('Billing error:', billingError);
        throw billingError;
      }

      if (!billingData || billingData.length === 0) {
        toast.error('No billing data found for the selected program');
        setProgramReport(null);
        setReportData([]);
        return;
      }

      // Process and group data by package type
      const packageGroups: { [key: string]: any } = {};
      let grandTotal = 0;

      // First, organize data by package type
      billingData.forEach((entry: any) => {
        const packageType = entry.packages.type;
        if (!packageGroups[packageType]) {
          packageGroups[packageType] = {
            packageName: entry.packages.name,
            products: new Map(),
            entries: new Map(),
            totals: {},
            rates: {},
            totalAmounts: {},
            grandTotal: 0
          };
        }

        // Store unique products
        packageGroups[packageType].products.set(entry.product_id, {
          id: entry.product_id,
          name: entry.products.name,
          rate: entry.products.rate
        });

        // Group quantities by date and product
        const dateKey = entry.entry_date;
        if (!packageGroups[packageType].entries.has(dateKey)) {
          packageGroups[packageType].entries.set(dateKey, {
            date: dateKey,
            quantities: {}
          });
        }

        const dateEntry = packageGroups[packageType].entries.get(dateKey);
        dateEntry.quantities[entry.product_id] = (dateEntry.quantities[entry.product_id] || 0) + entry.quantity;

        // Update totals
        packageGroups[packageType].totals[entry.product_id] = 
          (packageGroups[packageType].totals[entry.product_id] || 0) + entry.quantity;
        packageGroups[packageType].rates[entry.product_id] = entry.products.rate;
        packageGroups[packageType].totalAmounts[entry.product_id] = 
          packageGroups[packageType].totals[entry.product_id] * entry.products.rate;
        
        // Update package grand total
        packageGroups[packageType].grandTotal += entry.quantity * entry.products.rate;
        grandTotal += entry.quantity * entry.products.rate;
      });

      // Convert Map objects to arrays and sort products by name
      const processedPackages: { [key: string]: any } = {};
      Object.entries(packageGroups).forEach(([type, data]) => {
        processedPackages[type] = {
          packageName: data.packageName,
          products: Array.from(data.products.values()).sort((a: any, b: any) => a.name.localeCompare(b.name)),
          entries: Array.from(data.entries.values()).sort((a: any, b: any) => a.date.localeCompare(b.date)),
          totals: data.totals,
          rates: data.rates,
          totalAmounts: data.totalAmounts,
          grandTotal: data.grandTotal
        };
      });

      setProgramReport({
        programDetails: {
          name: programData.name,
          startDate: programData.start_date,
          endDate: programData.end_date,
          totalParticipants: programData.total_participants,
          customerName: programData.customer_name
        },
        packages: processedPackages,
        grandTotal
      });

      // Set reportData to trigger display
      setReportData([{
        date: format(new Date(), 'yyyy-MM-dd'),
        program: programData.name,
        cateringTotal: 0,
        extraTotal: 0,
        coldDrinkTotal: 0,
        grandTotal
      }]);

      toast.success('Program report generated successfully');
    } catch (error) {
      console.error('Error generating program report:', error);
      toast.error('Failed to generate program report');
      setProgramReport(null);
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnnualReport = async () => {
    setIsLoading(true);
    try {
      const year = new Date().getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      // Build query for billing entries
      let query = supabase
        .from('billing_entries')
        .select(`
          entry_date,
          quantity,
          packages (id, name, type),
          products (name, rate)
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true });

      // Add package filter if selected
      if (selectedPackage && selectedPackage !== 'all') {
        query = query.eq('packages.type', selectedPackage);
      }

      const { data: entriesData, error } = await query;

      if (error) throw error;

      // Process and group data by month and package type
      const monthlyGroups = new Map<string, MonthlyData>();

      entriesData.forEach(entry => {
        const month = format(new Date(entry.entry_date), 'yyyy-MM');
        const packageType = entry.packages?.[0]?.type?.toLowerCase() || 'unknown';
        const quantity = entry.quantity || 0;
        const rate = entry.products?.[0]?.rate || 0;
        const total = quantity * rate;

        if (!monthlyGroups.has(month)) {
          monthlyGroups.set(month, {
            month,
            packages: {},
            total: 0
          });
        }

        const monthData = monthlyGroups.get(month)!;

        if (!monthData.packages[packageType]) {
          monthData.packages[packageType] = {
            packageName: packageType,
            items: [],
            packageTotal: 0
          };
        }

        monthData.packages[packageType].items.push({
          productName: entry.products?.[0]?.name || 'Unknown',
          quantity,
          rate,
          total
        });

        monthData.packages[packageType].packageTotal += total;
        monthData.total += total;
      });

      setMonthlyData(Array.from(monthlyGroups.values()));
      toast.success('Annual report generated successfully');
    } catch (error) {
      console.error('Error generating annual report:', error);
      toast.error('Failed to generate annual report');
    } finally {
      setIsLoading(false);
    }
  };

  const generateDayReport = async () => {
    if (!selectedDay) {
      toast.error('Please select a day');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    setIsLoading(true);
    try {
      // The date from the input is already in YYYY-MM-DD format
      const formattedDate = selectedDay;

      // Map the package type to the correct value
      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink',
        'all': 'all'
      };

      const mappedPackageType = packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap] || selectedPackage;

      console.log('Generating report for:', { 
        selectedDay,
        formattedDate,
        selectedPackage,
        mappedPackageType 
      });

      const response = await fetch('/api/reports/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          packageType: mappedPackageType
        }),
      });

      const result = await response.json();
      console.log('API Response:', {
        status: response.status,
        ok: response.ok,
        result
      });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate report');
      }

      const { data, debug } = result;

      if (!data || !data.entries || data.entries.length === 0) {
        console.log('No data found:', debug); // Log debug info
        setReportData([]);
        setDayReportData(null);
        toast.error(
          `No entries found for ${format(new Date(selectedDay), 'dd/MM/yyyy')}` +
          (selectedPackage !== 'all' ? ` in ${packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap] || selectedPackage} package` : '')
        );
        return;
      }

      // Set the data directly from the API response
      setDayReportData(data);
      setReportData([data]); // Wrap in array for compatibility with other report types
      toast.success('Day report generated successfully');
    } catch (error) {
      console.error('Error generating day report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      setReportData([]);
      setDayReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLifetimeReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsLoading(true);
    try {
      // Build query for billing entries
      let query = supabase
        .from('billing_entries')
        .select(`
          entry_date,
          quantity,
          packages (id, name, type),
          products (name, rate)
        `)
        .gte('entry_date', dateRange.start)
        .lte('entry_date', dateRange.end)
        .order('entry_date', { ascending: true });

      // Add package filter if selected
      if (selectedPackage && selectedPackage !== 'all') {
        query = query.eq('packages.type', selectedPackage);
      }

      const { data: entriesData, error } = await query;

      if (error) throw error;

      if (!entriesData || entriesData.length === 0) {
        throw new Error('No entries found for the selected period');
      }

      // Process and group data by month and package type
      const monthlyGroups = new Map<string, MonthlyData>();

      entriesData.forEach(entry => {
        const month = format(new Date(entry.entry_date), 'yyyy-MM');
        const packageType = entry.packages?.[0]?.type?.toLowerCase() || 'unknown';
        const quantity = entry.quantity || 0;
        const rate = entry.products?.[0]?.rate || 0;
        const total = quantity * rate;

        if (!monthlyGroups.has(month)) {
          monthlyGroups.set(month, {
            month,
            packages: {},
            total: 0
          });
        }

        const monthData = monthlyGroups.get(month)!;

        if (!monthData.packages[packageType]) {
          monthData.packages[packageType] = {
            packageName: packageType,
            items: [],
            packageTotal: 0
          };
        }

        monthData.packages[packageType].items.push({
          productName: entry.products?.[0]?.name || 'Unknown',
          quantity,
          rate,
          total
        });

        monthData.packages[packageType].packageTotal += total;
        monthData.total += total;
      });

      setMonthlyData(Array.from(monthlyGroups.values()));
      toast.success('Lifetime report generated successfully');
    } catch (error) {
      console.error('Error generating lifetime report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      setMonthlyData([]);
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
        scale: 2,
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
      const totalPages = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(128);
        pdf.text(
          `Page ${i} of ${totalPages}`,
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
          <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
            {packageType.toUpperCase()} PACKAGE
          </h3>
          <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Product Name
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Rate
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packageData.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 border-r border-gray-100">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center border-r border-gray-100">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right border-r border-gray-100">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="px-6 py-4 text-right text-gray-800 border-t border-gray-200">
                    Package Total:
                  </td>
                  <td className="px-6 py-4 text-right text-gray-800 border-t border-gray-200">
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
      <div id="report-content" className="bg-white rounded-lg shadow-lg overflow-hidden p-8">
        {/* Program Header */}
        <div className="grid grid-cols-3 gap-6 mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-1">
            <span className="text-sm font-semibold text-gray-600">Program Name</span>
            <p className="text-lg text-gray-900">{programReport.programDetails.name}</p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-gray-600">Duration</span>
            <p className="text-lg text-gray-900">
              {format(new Date(programReport.programDetails.startDate), 'dd/MM/yyyy')} - {format(new Date(programReport.programDetails.endDate), 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-sm font-semibold text-gray-600">Total Participants</span>
            <p className="text-lg text-gray-900">{programReport.programDetails.totalParticipants}</p>
          </div>
        </div>

        {/* Package Tables */}
        <div className="space-y-8">
          {getFilteredPackages().map(packageType => (
            <PackageTable
              key={packageType}
              packageType={packageType}
              packageData={programReport.packages[packageType.toLowerCase()]}
            />
          ))}
        </div>

        {/* Grand Total */}
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xl font-bold text-amber-900 text-right">
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

  const handleCommentChange = (programName: string, comment: string) => {
    setReportComments(prev => ({ ...prev, [programName]: comment }));
  };

  // Update the report type selector UI
  const reportTypes = [
    {
      id: 'day',
      name: '1 Day Report',
      description: 'View day-wise details',
      icon: RiCalendarLine
    },
    {
      id: 'program',
      name: 'Program Report',
      description: 'View program-wise details',
      icon: RiBuilding4Line
    },
    {
      id: 'monthly',
      name: 'Monthly Report',
      description: 'View monthly billing summary',
      icon: RiCalendarLine
    },
    {
      id: 'lifetime',
      name: 'Lifetime Report',
      description: 'View lifetime billing summary',
      icon: RiFileChartLine
    }
  ];

  return (
    <div className="space-y-6">
      <style>{pdfStyles}</style>
      {/* Controls Section */}
      <div className="print:hidden bg-white p-6 rounded-lg shadow-md">
        {/* Report Type Selector */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
            <RiFileChartLine className="w-5 h-5 text-amber-600" />
            Report Type
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {reportTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setReportType(type.id as ReportType);
                  // Reset selections when changing report type
                  setSelectedPackage("");
                  setSelectedProgram("");
                  setReportData([]);
                }}
                className={`p-3 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md ${
                  reportType === type.id
                    ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 shadow-inner'
                    : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/30'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <type.icon className={`w-5 h-5 ${
                    reportType === type.id ? 'text-amber-600' : 'text-gray-400'
                  }`} />
                  <div className="text-center">
                    <p className="font-medium text-sm">{type.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <RiFilterLine className="w-5 h-5 text-amber-600" />
            Report Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {reportType === 'day' ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Day
                  </label>
                  <input
                    type="date"
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    <option value="">Select Package</option>
                    <option value="all">All Packages</option>
                    <option value="normal">Catering Package</option>
                    <option value="extra">Extra Package</option>
                    <option value="cold drink">Cold Drink Package</option>
                  </select>
                </div>
              </>
            ) : reportType === 'monthly' ? (
              <>
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
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    <option value="">Select Package</option>
                    <option value="all">All Packages</option>
                    <option value="normal">Catering Package</option>
                  </select>
                </div>
              </>
            ) : reportType === 'program' ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Month/Year
                  </label>
                  <input
                    type="month"
                    value={programFilterDate}
                    onChange={(e) => setProgramFilterDate(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Program
                  </label>
                  <select
                    value={selectedProgram}
                    onChange={(e) => setSelectedProgram(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    <option value="">Choose a program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({format(new Date(program.start_date), 'dd/MM/yyyy')} - {format(new Date(program.end_date), 'dd/MM/yyyy')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    <option value="">Select Package</option>
                    <option value="all">All Packages</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => setSelectedPackage(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    <option value="">Select Package</option>
                    <option value="all">All Packages</option>
                    {packages.map((pkg) => (
                      <option key={pkg.id} value={pkg.type.toLowerCase()}>
                        {pkg.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

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
          {/* Report Content based on type */}
          {reportType === 'day' && dayReportData && (
            <DayReport 
              data={dayReportData}
              selectedDay={selectedDay}
              selectedPackage={selectedPackage || 'all'}
            />
          )}
          {reportType === 'monthly' && (
            <MonthlyReport 
              data={reportData} 
              month={selectedMonth} 
              type={selectedPackage as 'all' | 'normal'}
              cateringData={selectedPackage === 'normal' ? cateringData : undefined}
              products={selectedPackage === 'normal' ? cateringProducts : undefined}
            />
          )}
          {reportType === 'program' && programReport && (
            <ProgramReport 
              programName={programReport.programDetails.name}
              customerName={programReport.programDetails.customerName}
              startDate={programReport.programDetails.startDate}
              endDate={programReport.programDetails.endDate}
              totalParticipants={programReport.programDetails.totalParticipants}
              selectedPackage={selectedPackage}
              packages={programReport.packages}
              grandTotal={programReport.grandTotal}
            />
          )}
          {reportType === 'lifetime' && monthlyData.length > 0 && (
            <AnnualReport 
              startDate={dateRange.start}
              endDate={dateRange.end}
              selectedPackage={selectedPackage}
              monthlyData={monthlyData}
            />
          )}
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

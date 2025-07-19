"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { toast } from "react-hot-toast";
import {
  RiFileChartLine,
  RiDownloadLine,
  RiFilterLine,
  RiRefreshLine,
  RiPrinterLine,
  RiCalendarLine,
  RiBuilding4Line,
  RiArrowDownSLine,
} from "react-icons/ri";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MonthlyReport from "@/components/ui/report/MonthlyReport";
import ProgramReport from "@/components/ui/report/ProgramReport";
import DayReport from "@/components/ui/report/DayReport";
import LifeTimeReport from "@/components/ui/report/LifeTimeReport";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface Package {
  id: string;
  name: string;
  type: string;
}

type Program = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  status: string;
  total_participants: number;
};

interface ReportData {
  date: string;
  program: string;
  start_date: string;
  end_date: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
  customer_name: string;
  total_participants: number;
}

interface AnnualReportData {
  program: string;
  packages: {
    [key: string]: number;
  };
  total: number;
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
  program_id: string;
  package_id: string;
  product_id: string;
  programs: {
    id: string;
    name: string;
  };
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

// Add the ProductConsumption interface at the top with other interfaces
interface ProductConsumption {
  id: string;
  name: string;
  monthlyQuantities: { [month: string]: number };
  total: number;
}

interface PackageType {
  id: string;
  type: string;
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

const ProgramSelect = ({
  value,
  onChange,
  programs
}: {
  value: string;
  onChange: (value: string) => void;
  programs: Program[];
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedProgram = programs.find(p => p.id === value);
  const STAFF_ID = 'staff'; // Fixed ID for staff option
  
  // Extract number prefix from program name
  const extractNumberPrefix = (name: string): number => {
    const match = name.trim().match(/^(\d+)\s/);
    return match ? parseInt(match[1], 10) : Infinity; // Return Infinity for names without numbers to sort them last
  };

  // Sort programs by numerical prefix
  const sortedPrograms = [...programs].sort((a, b) => {
    const numberA = extractNumberPrefix(a.name);
    const numberB = extractNumberPrefix(b.name);
    
    // Sort by numerical prefix first
    return numberA - numberB;
  });

  return (
    <div className="relative">
      <button
        type="button"
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="block truncate">
          {value === STAFF_ID 
            ? "Staff Report" 
            : selectedProgram 
              ? selectedProgram.name 
              : "Select Program"}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <RiArrowDownSLine className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Staff Report Option */}
          <div
            className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-amber-50 ${
              value === STAFF_ID ? 'bg-amber-50 text-amber-900' : 'text-gray-900'
            }`}
            onClick={() => {
              onChange(STAFF_ID);
              setIsOpen(false);
            }}
          >
            <span className="block truncate font-medium">Staff Report</span>
            {value === STAFF_ID && (
              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* Program Options */}
          {sortedPrograms.map((program) => (
            <div
              key={program.id}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-amber-50 ${
                value === program.id ? 'bg-amber-50 text-amber-900' : 'text-gray-900'
              }`}
              onClick={() => {
                onChange(program.id);
                setIsOpen(false);
              }}
            >
              <span className="block truncate">
                {program.name}
                <span className="ml-2 text-xs text-gray-500">
                  ({format(new Date(program.start_date), 'dd/MM/yyyy')})
                </span>
              </span>
              {value === program.id && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-amber-600">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function ReportPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // Current month in YYYY-MM format
  );
  const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM'),
    end: format(new Date(), 'yyyy-MM')
  });
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [annualReportData, setAnnualReportData] = useState<ProductConsumption[]>([]);
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
  const [packageTypes, setPackageTypes] = useState<PackageType[]>([]);
  const [reportComments, setReportComments] = useState<{ [key: string]: string }>({});
  const [programFilterDate, setProgramFilterDate] = useState(format(new Date(), 'yyyy-MM'));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isStaffMode, setIsStaffMode] = useState(false);

  // Memoize the data fetching functions
  const fetchPackages = useCallback(async () => {
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
  }, []);

  const fetchPrograms = useCallback(async () => {
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
  }, []);

  const fetchProgramsByDate = useCallback(async () => {
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
      setSelectedProgram("");
    } catch (error) {
      console.error('Error fetching programs by date:', error);
      toast.error('Failed to fetch programs');
      setPrograms([]);
    }
  }, [programFilterDate]);

  const fetchCateringProducts = useCallback(async () => {
    try {
      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink'
      };

      if (!selectedPackage || selectedPackage === 'all') {
        setCateringProducts([]);
        return;
      }

      const mappedType = packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap];

      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', mappedType);

      if (packagesError) throw packagesError;

      if (!packagesData || packagesData.length === 0) {
        setCateringProducts([]);
        return;
      }

      const packageIds = packagesData.map(pkg => pkg.id);
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, index')
        .in('package_id', packageIds)
        .order('index');

      if (productsError) throw productsError;

      if (!productsData || productsData.length === 0) {
        setCateringProducts([]);
        return;
      }

      setCateringProducts(productsData.map(p => ({ ...p, quantity: 0 })));
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
      setCateringProducts([]);
    }
  }, [selectedPackage]);

  // Optimize useEffect dependencies
  useEffect(() => {
    fetchPackages();
    if (reportType === 'program') {
      fetchProgramsByDate();
    } else {
      fetchPrograms();
    }
  }, [reportType, programFilterDate, fetchPackages, fetchPrograms, fetchProgramsByDate]);

  // Optimize report generation functions
  const generateReport = useCallback(async () => {
    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    switch (reportType) {
      case 'day':
        if (!selectedMonth) {
          toast.error('Please select month');
          return;
        }
        await generateDayReport();
        break;
      case 'monthly':
        if (!selectedMonth) {
          toast.error('Please select month');
          return;
        }
        await generateMonthlyReport();
        break;
      case 'program':
        if (!selectedProgram && !isStaffMode) {
          toast.error('Please select a program');
          return;
        }
        await generateProgramReport();
        break;
      case 'lifetime':
        if (!dateRange.start || !dateRange.end) {
          toast.error('Please select date range');
          return;
        }
        await generateLifetimeReport();
        break;
      default:
        toast.error('Invalid report type');
    }
  }, [selectedMonth, selectedProgram, selectedPackage, reportType, dateRange.start, dateRange.end, isStaffMode, programFilterDate]);

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
    setCateringProducts([]);
    setAnnualReportData([]); // Clear annual report data

    try {
      const response = await fetch('/api/reports/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month: selectedMonth,
          type: selectedPackage
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      const { data } = await response.json();

      if (!data) {
        throw new Error('No data received from server');
      }

      setReportData(data.reportData || []);
      setCateringData(data.cateringData || []);
      setCateringProducts(data.products || []);
      setPackageTypes(data.packageTypes || []);

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      // Clear report data on error
      setReportData([]);
      setCateringData([]);
      setCateringProducts([]);
      setPackageTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateProgramReport = async () => {
    try {
      if (!isStaffMode && !selectedProgram) {
        toast.error('Please select a program');
        return;
      }

      setIsLoading(true);
      // Clear any existing data
      setProgramReport(null);
      setReportData([]);

      // Get package type mapping
      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink'
      };

      if (isStaffMode) {
        // Handle staff report generation
        const startDate = `${programFilterDate}-01`;
        const endDate = new Date(programFilterDate + '-01');
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
        const endDateStr = format(endDate, 'yyyy-MM-dd');

        // First get the package IDs for the selected package type
        let packageQuery = supabase.from('packages').select('id, type, name');
        if (selectedPackage !== 'all') {
          const mappedType = packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap];
          if (mappedType) {
            packageQuery = packageQuery.eq('type', mappedType);
          }
        } else {
          // For 'all' packages, only get the main package types
          packageQuery = packageQuery.in('type', ['Normal', 'Extra', 'Cold Drink']);
        }

        const { data: packagesData, error: packagesError } = await packageQuery;
        if (packagesError) throw packagesError;

        if (!packagesData || packagesData.length === 0) {
          toast.error('No packages found for the selected type');
          return;
        }

        const packageIds = packagesData.map(pkg => pkg.id);

        // Build query for staff billing entries
        const { data: staffData, error: staffError } = await supabase
          .from('staff_billing_entries')
          .select(`
            entry_date,
            quantity,
            packages:packages!inner (id, name, type),
            products:products!inner (id, name, rate)
          `)
          .in('package_id', packageIds)
          .gte('entry_date', startDate)
          .lte('entry_date', endDateStr)
          .order('entry_date', { ascending: true });

        if (staffError) throw staffError;

        if (!staffData || staffData.length === 0) {
          toast.error('No billing data found for the selected month');
          setProgramReport(null);
          setReportData([]);
          return;
        }

        // Process and group data by package type
        const packageGroups: { [key: string]: any } = {};
        let grandTotal = 0;

        // First, organize data by package type
        staffData.forEach((entry: any) => {
          const packageType = entry.packages.type;
          if (!packageGroups[packageType]) {
            packageGroups[packageType] = {
              packageName: entry.packages.name,
              items: [],
              packageTotal: 0
            };
          }

          // Find existing item or create new one
          let item = packageGroups[packageType].items.find(
            (i: any) => i.productName === entry.products.name
          );

          if (!item) {
            item = {
              productName: entry.products.name,
              quantity: 0,
              rate: entry.products.rate,
              total: 0,
              dates: {}
            };
            packageGroups[packageType].items.push(item);
          }

          // Add or update date-wise consumption
          const dateKey = format(new Date(entry.entry_date), 'yyyy-MM-dd');
          item.dates[dateKey] = (item.dates[dateKey] || 0) + entry.quantity;
          item.quantity += entry.quantity;
          item.total = item.quantity * item.rate;

          // Update package total
          packageGroups[packageType].packageTotal = packageGroups[packageType].items.reduce(
            (sum: number, item: any) => sum + item.total,
            0
          );
        });

        // Update grand total after all packages are processed
        grandTotal = Object.values(packageGroups).reduce(
          (sum: number, pkg: any) => sum + pkg.packageTotal,
          0
        );

        setProgramReport({
          programDetails: {
            name: 'Staff Report',
            startDate: startDate,
            endDate: endDateStr,
            totalParticipants: 0,
            customerName: 'Staff'
          },
          packages: packageGroups,
          grandTotal
        });

        // Set reportData to trigger display
        setReportData([{
          date: format(new Date(), 'yyyy-MM-dd'),
          program: 'Staff Report',
          start_date: startDate,
          end_date: endDateStr,
          cateringTotal: packageGroups['Normal']?.packageTotal || 0,
          extraTotal: packageGroups['Extra']?.packageTotal || 0,
          coldDrinkTotal: packageGroups['Cold Drink']?.packageTotal || 0,
          grandTotal,
          customer_name: 'Staff',
          total_participants: 0
        }]);

        toast.success('Staff report generated successfully');
      } else {
        // Program report generation logic
        // First get program details to ensure it exists
        const { data: programData, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', selectedProgram)
          .single();

        if (programError) throw programError;

        // First get the package IDs for the selected package type
        let packageQuery = supabase.from('packages').select('id, type, name');
        if (selectedPackage !== 'all') {
          const mappedType = packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap];
          if (mappedType) {
            packageQuery = packageQuery.eq('type', mappedType);
          }
        } else {
          // For 'all' packages, only get the main package types
          packageQuery = packageQuery.in('type', ['Normal', 'Extra', 'Cold Drink']);
        }

        const { data: packagesData, error: packagesError } = await packageQuery;
        if (packagesError) throw packagesError;

        if (!packagesData || packagesData.length === 0) {
          toast.error('No packages found for the selected type');
          return;
        }

        const packageIds = packagesData.map(pkg => pkg.id);

        // Build query for billing entries
        const { data: billingData, error: billingError } = await supabase
          .from('billing_entries')
          .select(`
            entry_date,
            quantity,
            packages:packages!inner (id, name, type),
            products:products!inner (id, name, rate)
          `)
          .eq('program_id', selectedProgram)
          .in('package_id', packageIds)
          .order('entry_date', { ascending: true });

        if (billingError) throw billingError;

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
              items: [],
              packageTotal: 0
            };
          }

          // Find existing item or create new one
          let item = packageGroups[packageType].items.find(
            (i: any) => i.productName === entry.products.name
          );

          if (!item) {
            item = {
              productName: entry.products.name,
              quantity: 0,
              rate: entry.products.rate,
              total: 0,
              dates: {}
            };
            packageGroups[packageType].items.push(item);
          }

          // Add or update date-wise consumption
          const dateKey = format(new Date(entry.entry_date), 'yyyy-MM-dd');
          item.dates[dateKey] = (item.dates[dateKey] || 0) + entry.quantity;
          item.quantity += entry.quantity;
          item.total = item.quantity * item.rate;

          // Update package total
          packageGroups[packageType].packageTotal = packageGroups[packageType].items.reduce(
            (sum: number, item: any) => sum + item.total,
            0
          );
        });

        // Update grand total after all packages are processed
        grandTotal = Object.values(packageGroups).reduce(
          (sum: number, pkg: any) => sum + pkg.packageTotal,
          0
        );

        setProgramReport({
          programDetails: {
            name: programData.name,
            startDate: programData.start_date,
            endDate: programData.end_date,
            totalParticipants: programData.total_participants,
            customerName: programData.customer_name
          },
          packages: packageGroups,
          grandTotal
        });

        // Set reportData to trigger display
        setReportData([{
          date: format(new Date(), 'yyyy-MM-dd'),
          program: programData.name,
          start_date: programData.start_date,
          end_date: programData.end_date,
          cateringTotal: packageGroups['Normal']?.packageTotal || 0,
          extraTotal: packageGroups['Extra']?.packageTotal || 0,
          coldDrinkTotal: packageGroups['Cold Drink']?.packageTotal || 0,
          grandTotal,
          customer_name: programData.customer_name,
          total_participants: programData.total_participants
        }]);

        toast.success('Program report generated successfully');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
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
        // Make sure we're using the correct case for package types
        // The database stores package types as 'Normal', 'Extra', 'Cold Drink'
        // but the dropdown uses lowercase values
        let packageTypeFilter;
        switch(selectedPackage) {
          case 'normal':
            packageTypeFilter = 'Normal';
            break;
          case 'extra':
            packageTypeFilter = 'Extra';
            break;
          case 'cold drink':
            packageTypeFilter = 'Cold Drink';
            break;
          default:
            packageTypeFilter = selectedPackage;
        }
        query = query.eq('packages.type', packageTypeFilter);
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
    try {
      if (!selectedMonth || !selectedPackage) {
        toast.error('Please select both month and package');
        return;
      }

      setIsLoading(true);
      setReportType('day');

      // Clear any existing data from other report types
      setDayReportData(null);
      setReportData([]);

      // For day reports, the DayReport component handles its own data fetching
      // We just need to set the report type and let the component do the work
      toast.success('Day report ready to display');
    } catch (error) {
      console.error('Error setting up day report:', error);
      toast.error('Failed to setup day report');
      setReportData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLifetimeReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      toast.error('Please select both start and end months');
      return;
    }

    if (!selectedPackage) {
      toast.error('Please select a package');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Generating lifetime report with params:', {
        startMonth: dateRange.start,
        endMonth: dateRange.end,
        packageId: selectedPackage,
        currentReportType: reportType,
        hasAnnualData: annualReportData.length > 0
      });

      const response = await fetch('/api/reports/lifetime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startMonth: dateRange.start,
          endMonth: dateRange.end,
          packageId: selectedPackage === 'all' ? null : selectedPackage
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate report');
      }

      // Get the response data
      const { data } = await response.json();

      console.log('Received response data:', data);
      console.log('Combined data debug:', {
        programEntriesProcessed: data.debug?.programEntriesProcessed || 0,
        staffEntriesProcessed: data.debug?.staffEntriesProcessed || 0,
        totalProductsWithData: data.package?.products?.filter((p: any) => p.total > 0).length || 0,
        totalConsumption: data.package?.products?.reduce((sum: number, p: any) => sum + (p.total || 0), 0) || 0
      });

      if (!data || !data.package) {
        throw new Error('Invalid response data structure');
      }

      // Ensure the data structure is correct
      const processedData = data.package.products.map((product: { id: string; name: string; monthlyQuantities?: { [key: string]: number }; total?: number }) => ({
        id: product.id,
        name: product.name,
        monthlyQuantities: product.monthlyQuantities || {},
        total: product.total || 0
      }));

      // Update the state with the processed data
      setAnnualReportData(processedData);

      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating lifetime report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate report');
      setAnnualReportData([]);
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

  const handlePrint = async () => {
    try {
      setIsGeneratingPDF(true);

      const response = await fetch(`/api/reports/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedMonth,
          packageType: selectedPackage,
          programId: selectedProgram,
          startMonth: dateRange.start,
          endMonth: dateRange.end,
          action: 'print'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate print version');
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(pdfUrl);
        };
      }

    } catch (error) {
      console.error('Error preparing print version:', error);
      toast.error('Failed to prepare print version');
      // Fallback to basic window.print()
      window.print();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Generating PDF...');

      const response = await fetch(`/api/reports/${reportType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedMonth,
          packageType: selectedPackage,
          programId: selectedProgram,
          startMonth: dateRange.start,
          endMonth: dateRange.end,
          action: 'download'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(toastId);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCommentChange = (programName: string, comment: string) => {
    setReportComments(prev => ({ ...prev, [programName]: comment }));
    
    // Save comment to database with debounce
    const timeoutId = setTimeout(async () => {
      try {
        const commentData: any = {
          report_type: reportType,
          reference_id: programName,
          comment: comment.trim() || null,
          ofStaff: isStaffMode
        };
        
        // Add month for staff reports
        if (isStaffMode && selectedMonth) {
          commentData.month = selectedMonth;
        } else if (reportType === 'program' && selectedProgram) {
          commentData.program_id = selectedProgram;
        }
        
        // Use the exact column names that match the unique index
        let conflictTarget = '';
        if (isStaffMode) {
          conflictTarget = 'report_type,reference_id,month,"ofStaff"';
        } else {
          conflictTarget = 'report_type,reference_id,"ofStaff"';
        }
        
        const { error } = await supabase
          .from('report_comments')
          .upsert(commentData, { onConflict: conflictTarget });
          
        if (error) {
          console.error('Upsert error:', error);
          throw error;
        }
      } catch (error) {
        console.error('Error saving comment:', error);
        toast.error('Failed to save comment');
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
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

  // Update the shouldShowReport condition
  const shouldShowReport = (() => {
    switch (reportType) {
      case 'day':
        return selectedMonth && selectedPackage && !isLoading;
      case 'monthly':
        return reportData.length > 0;
      case 'program':
        return programReport !== null;
      case 'lifetime':
        return annualReportData.length > 0;
      default:
        return false;
    }
  })();

  // Debug logging for rendering conditions
  console.log('Render conditions:', {
    reportType,
    reportDataLength: reportData.length,
    annualReportDataLength: annualReportData.length,
    isLoading,
    selectedPackage,
    dateRange,
    shouldShowReport
  });

  // Update the package selection options for program report
  const renderPackageOptions = () => {
    if (reportType === 'program') {
      return (
        <>
          <option value="">Select Package</option>
          <option value="all">All Packages</option>
          <option value="normal">Catering Package</option>
          <option value="extra">Extra Catering Package</option>
          <option value="cold drink">Cold Drinks Package</option>
        </>
      );
    }
    if (reportType === 'monthly') {
      return (
        <>
          <option value="">Select Package</option>
          <option value="all">All Packages</option>
        </>
      );
    }
    if (reportType === 'lifetime') {
      return (
        <>
          <option value="">Select Package</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} ({pkg.type})
            </option>
          ))}
        </>
      );
    }
    return (
      <>
        <option value="">Select Package</option>
        <option value="all">All Packages</option>
        {packages.map((pkg) => (
          <option key={pkg.id} value={pkg.id}>
            {pkg.name} ({pkg.type})
          </option>
        ))}
      </>
    );
  };

  const STAFF_ID = 'staff';

  // Modify the useEffect that handles program selection
  useEffect(() => {
    if (selectedProgram === 'staff') {
      setIsStaffMode(true);
      // Clear existing program data when switching to staff mode
      setProgramReport(null);
      setReportData([]);
    } else {
      setIsStaffMode(false);
      // Clear existing staff data when switching to program mode
      setProgramReport(null);
      setReportData([]);
    }
    // Set default package selection to 'all' whenever program selection changes
    setSelectedPackage("all");
  }, [selectedProgram]);

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
                  // Only reset selections if switching to a different report type
                  if (reportType !== type.id) {
                    setSelectedPackage("");
                    setSelectedProgram("");
                    setReportData([]);
                  }
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
                    Select Month
                  </label>
                  <input
                    type="month"
                    id="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setReportData([]); // Clear report data when month changes
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    id="package"
                    value={selectedPackage}
                    onChange={(e) => {
                      setSelectedPackage(e.target.value);
                      // Don't clear report data when package changes
                      if (reportType === 'program' as ReportType) {
                        generateProgramReport();
                      }
                    }}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {renderPackageOptions()}
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
                    {renderPackageOptions()}
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
                  <ProgramSelect
                    value={selectedProgram}
                    onChange={setSelectedProgram}
                    programs={programs}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Package
                  </label>
                  <select
                    value={selectedPackage}
                    onChange={(e) => {
                      setSelectedPackage(e.target.value);
                      // Remove the automatic report generation
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 p-2 border-2"
                  >
                    {renderPackageOptions()}
                  </select>
                </div>
              </>
            ) : reportType === 'lifetime' ? (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Start Month
                  </label>
                  <input
                    type="month"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    End Month
                  </label>
                  <input
                    type="month"
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
                    {renderPackageOptions()}
                  </select>
                </div>
              </>
            ) : null}

            <div className="flex items-end">
              <button
                onClick={generateReport}
                disabled={isLoading || (reportType === 'program' ? ((!selectedProgram && !isStaffMode) || !selectedPackage) : !selectedPackage)}
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
      {shouldShowReport && (
        <div className="bg-white rounded-lg shadow-md">
          {reportType === 'day' && selectedMonth && selectedPackage && (
            <DayReport
              selectedMonth={selectedMonth}
              selectedPackage={selectedPackage}
            />
          )}
          {reportType === 'monthly' && reportData.length > 0 && (
            <MonthlyReport
              data={reportData}
              month={selectedMonth}
              type={selectedPackage as 'all' | 'normal' | 'extra' | 'cold drink'}
              cateringData={selectedPackage !== 'all' ? cateringData : undefined}
              products={selectedPackage !== 'all' ? cateringProducts : undefined}
            />
          )}
          {reportType === 'program' && programReport && (
            <ProgramReport
              programId={selectedProgram}
              programName={programReport.programDetails.name}
              customerName={programReport.programDetails.customerName}
              startDate={programReport.programDetails.startDate}
              endDate={programReport.programDetails.endDate}
              totalParticipants={programReport.programDetails.totalParticipants}
              selectedPackage={selectedPackage}
              packages={programReport.packages}
              grandTotal={programReport.grandTotal}
              isStaffMode={isStaffMode}
              month={programFilterDate}
              onModeChange={(isStaff) => {
                setSelectedProgram(isStaff ? 'staff' : '');
                setIsStaffMode(isStaff);
              }}
              onMonthChange={(month) => {
                setProgramFilterDate(month);
                if (isStaffMode) {
                  // Trigger report generation when month changes in staff mode
                  generateProgramReport();
                }
              }}
            />
          )}
          {reportType === 'lifetime' && annualReportData.length > 0 && (
            <LifeTimeReport
              startMonth={dateRange.start}
              endMonth={dateRange.end}
              packageData={{
                id: selectedPackage,
                name: packages.find(p => p.id === selectedPackage)?.name || 'All Packages',
                type: packages.find(p => p.id === selectedPackage)?.type || 'all',
                products: annualReportData.map(product => ({
                  id: product.id,
                  name: product.name,
                  monthlyQuantities: product.monthlyQuantities || {},
                  total: product.total || 0
                }))
              }}
              months={Array.from(
                new Set(
                  annualReportData.flatMap(product =>
                    Object.keys(product.monthlyQuantities || {})
                  )
                )
              ).sort()}
            />
          )}
        </div>
      )}

      {/* No Data Message */}
      {!isLoading && !shouldShowReport && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <RiFileChartLine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Report Data</h3>
          <p className="text-gray-500">Select filters and generate report to view data</p>
        </div>
      )}
    </div>
  );
}

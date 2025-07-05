import { format } from "date-fns";
import React, { useState, useEffect, useMemo } from "react";
import { RiDownloadLine, RiPrinterLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import LoadingSpinner from '../LoadingSpinner';
import { supabase } from "@/lib/supabase";

interface DayReportProps {
  selectedMonth: string;
  selectedPackage: string;
}

interface ProductEntry {
  id: string;
  name: string;
  rate: number;
  index?: number;
}

interface DailyEntry {
  [productId: string]: number;
}

interface ReportData {
  [date: string]: DailyEntry;
}

// Product order for catering package
const PRODUCT_ORDER = ['Morning Tea', 'Breakfast', 'Morning CRT', 'LUNCH', 'Afternoon CRT', 'Hi-TEA', 'DINNER'];

const PRODUCTS_PER_TABLE = 7;

// Add new interface for package types
interface PackageGroup {
  type: string;
  name: string;
  products: ProductEntry[];
  activeProducts?: ProductEntry[];
  productChunks?: ProductEntry[][];
}

// Function to get active products for a specific package group
const getActiveProductsForGroup = (products: ProductEntry[], packageType: string, reportData: ReportData): ProductEntry[] => {
  if (!products.length) return [];
  
  // First sort products based on package type and index
  const sortedProducts = [...products].sort((a, b) => {
    if (packageType.toLowerCase() === 'normal') {
      const indexA = PRODUCT_ORDER.indexOf(a.name);
      const indexB = PRODUCT_ORDER.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
    }
    return (a.index || 0) - (b.index || 0);
  });

  // Filter out products with no consumption
  return sortedProducts.filter(product => 
    Object.values(reportData).some(dateData => (dateData[product.id] || 0) > 0)
  );
};

// Function to get product chunks for a specific package group
const getProductChunksForGroup = (activeProducts: ProductEntry[], packageType: string, reportData: ReportData, activeDates: string[]): ProductEntry[][] => {
  if (!activeProducts.length) return [];
  
  // Adjust chunk size based on package type
  let chunkSize = PRODUCTS_PER_TABLE;
  if (packageType.toLowerCase() === 'extra' || packageType.toLowerCase() === 'cold drink') {
    chunkSize = Math.min(PRODUCTS_PER_TABLE, 9);
  }

  const chunks: ProductEntry[][] = [];
  for (let i = 0; i < activeProducts.length; i += chunkSize) {
    const chunk = activeProducts.slice(i, i + chunkSize);
    // Only add chunk if it has data for at least some dates
    if (chunk.length > 0 && activeDates.some(date => 
      chunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
    )) {
      chunks.push(chunk);
    }
  }
  return chunks;
};

const DayReport: React.FC<DayReportProps> = ({ selectedMonth, selectedPackage }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [reportData, setReportData] = useState<ReportData>({});
  const [dates, setDates] = useState<string[]>([]);
  const [packageType, setPackageType] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);
  const [packageGroups, setPackageGroups] = useState<PackageGroup[]>([]);

  // Function to check if a row has any consumption
  const hasRowConsumption = (date: string): boolean => {
    // Get all product entries for this date
    const dateEntries = reportData[date] || {};
    // Check if any product has a value greater than 0
    return Object.values(dateEntries).some(quantity => quantity > 0);
  };

  // Function to check if a product has any consumption
  const hasProductConsumption = (productId: string): boolean => {
    // Check each date for this product's consumption
    return Object.values(reportData).some(dateData => 
      (dateData[productId] || 0) > 0
    );
  };

  // Filter out products with no consumption
  const activeProducts = useMemo(() => {
    if (!products.length || !Object.keys(reportData).length) return [];
    
    // First sort products based on package type and index
    const sortedProducts = [...products].sort((a, b) => {
      if (packageType.toLowerCase() === 'normal') {
        const indexA = PRODUCT_ORDER.indexOf(a.name);
        const indexB = PRODUCT_ORDER.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
      }
      return (a.index || 0) - (b.index || 0);
    });

    // Then filter out products with no consumption
    return sortedProducts.filter(product => hasProductConsumption(product.id));
  }, [products, reportData, packageType]);

  // Show only dates that have consumption data (filter out empty rows)
  const activeDates = useMemo(() => {
    if (!dates.length) {
      console.log('activeDates: no dates available');
      return [];
    }
    
    // Filter dates to only show those that have actual consumption data
    const datesWithData = dates.filter(date => {
      const dateData = reportData[date] || {};
      // Check if any product has consumption greater than 0 for this date
      return Object.values(dateData).some(quantity => quantity > 0);
    }).sort();
    
    console.log('activeDates calculation:', {
      totalDates: dates.length,
      datesWithData: datesWithData.length,
      emptyDatesFiltered: dates.length - datesWithData.length,
      sampleDate: datesWithData[0],
      sampleDateConsumption: datesWithData[0] && reportData[datesWithData[0]] ? Object.values(reportData[datesWithData[0]]).reduce((sum, qty) => sum + qty, 0) : 0,
      activeDatesRange: {
        first: datesWithData[0],
        last: datesWithData[datesWithData.length - 1]
      },
      // Specific June 2025 debugging
      isJune2025: datesWithData[0]?.startsWith('2025-06'),
      june30thIncluded: datesWithData.includes('2025-06-30')
    });
    
    return datesWithData;
  }, [dates, reportData]);

  // Function to check if a chunk has any data (check if any date has data for any product in chunk)
  const hasChunkData = (chunk: ProductEntry[], dates: string[]): boolean => {
    // Check if any date has data for any product in this chunk
    return dates.some(date => 
      chunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
    );
  };

  // Function to check if a date has data for a specific chunk
  const hasDateDataForChunk = (date: string, chunk: ProductEntry[]): boolean => {
    return chunk.some(product => (reportData[date]?.[product.id] || 0) > 0);
  };

  // Split products into chunks with optimized chunk size and only show chunks with data
  const productChunks = useMemo(() => {
    if (!activeProducts.length) return [];
    
    // Adjust chunk size based on package type
    let chunkSize = PRODUCTS_PER_TABLE;
    if (packageType.toLowerCase() === 'extra catering' || packageType.toLowerCase() === 'cold drinks') {
      // Use smaller chunks for packages with more products
      chunkSize = Math.min(PRODUCTS_PER_TABLE, 9);
    }

    const chunks: ProductEntry[][] = [];
    for (let i = 0; i < activeProducts.length; i += chunkSize) {
      const chunk = activeProducts.slice(i, i + chunkSize);
      // Only add chunk if it has data for at least some active dates
      if (chunk.length > 0 && activeDates.some(date => 
        chunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
      )) {
        chunks.push(chunk);
      }
    }
    return chunks;
  }, [activeProducts, packageType, activeDates, reportData]);

  // Calculate totals for each product
  const productTotals = useMemo(() => {
    if (!activeProducts.length || !Object.keys(reportData).length) return {};
    
    return activeProducts.reduce((totals, product) => {
      totals[product.id] = activeDates.reduce((sum, date) => {
        return sum + (reportData[date]?.[product.id] || 0);
      }, 0);
      return totals;
    }, {} as { [key: string]: number });
  }, [activeProducts, activeDates, reportData]);

  // Process package groups with their active products and chunks
  const processedPackageGroups = useMemo(() => {
    if (!packageGroups.length) return [];
    
    return packageGroups.map(group => {
      const activeProducts = getActiveProductsForGroup(group.products, group.type, reportData);
      const productChunks = getProductChunksForGroup(activeProducts, group.type, reportData, activeDates);
      
      return {
        ...group,
        activeProducts,
        productChunks
      };
    });
  }, [packageGroups, reportData, activeDates]);

  // Memoize the data fetching function to prevent unnecessary re-renders
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (selectedPackage === 'all') {
        // Fetch all packages first to get their names
        const { data: allPackagesData, error: allPackagesError } = await supabase
          .from('packages')
          .select('id, type, name')
          .order('type');

        if (allPackagesError) throw allPackagesError;

        // Group packages by type
        const packagesByType = allPackagesData?.reduce((acc, pkg) => {
          if (!acc[pkg.type]) {
            acc[pkg.type] = pkg;
          }
          return acc;
        }, {} as { [key: string]: any });

        const packageTypes = ['Normal', 'Extra', 'Cold Drink'];
        const allProducts: PackageGroup[] = [];
        const allReportData: ReportData = {};
        const allDates = new Set<string>();

        // Calculate date range once
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
        const endDate = new Date(year, month, 0); // Day 0 of next month = last day of current month
        
        // Use string formatting to avoid timezone issues
        const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

        console.log('Date range calculation (All Packages):', {
          selectedMonth,
          year,
          month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startDateStr,
          endDateStr,
          daysInMonth: endDate.getDate()
        });

        // Initialize all dates in the month with empty data
        for (let d = 1; d <= endDate.getDate(); d++) {
          // Use local timezone to avoid timezone conversion issues
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          allDates.add(dateStr);
          allReportData[dateStr] = {};
        }

        console.log('All Packages - Date initialization verification:', {
          selectedMonth,
          year,
          month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          daysInMonth: endDate.getDate(),
          generatedDates: Array.from(allDates).sort(),
          sampleDateCheck: {
            day1: `${year}-${month.toString().padStart(2, '0')}-01`,
            day15: `${year}-${month.toString().padStart(2, '0')}-15`,
            lastDay: `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`
          }
        });

        // Fetch data for each package type
        for (const type of packageTypes) {
          const packageData = packagesByType[type];
          if (!packageData) continue;

          // Fetch products for this package
          const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('id, name, rate, index')
            .eq('package_id', packageData.id)
            .order('index');

          if (productsError) throw productsError;

          if (productsData && productsData.length > 0) {
            // Sort products based on type
            const sortedProducts = [...productsData].sort((a, b) => {
              if (type.toLowerCase() === 'normal') {
                const indexA = PRODUCT_ORDER.indexOf(a.name);
                const indexB = PRODUCT_ORDER.indexOf(b.name);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
              }
              return (a.index || 0) - (b.index || 0);
            });

            // Add package with its name to allProducts
            allProducts.push({
              type: packageData.type,
              name: packageData.name,
              products: sortedProducts
            });

            // Fetch billing entries for this package (both program and staff entries)
            const [programEntriesResponse, staffEntriesResponse] = await Promise.all([
              supabase
                .from('billing_entries')
                .select('entry_date, quantity, product_id')
                .eq('package_id', packageData.id)
                .gte('entry_date', startDateStr)
                .lte('entry_date', endDateStr)
                .order('entry_date'),
              supabase
                .from('staff_billing_entries')
                .select('entry_date, quantity, product_id')
                .eq('package_id', packageData.id)
                .gte('entry_date', startDateStr)
                .lte('entry_date', endDateStr)
                .order('entry_date')
            ]);

            if (programEntriesResponse.error) throw programEntriesResponse.error;
            if (staffEntriesResponse.error) throw staffEntriesResponse.error;

            console.log(`Package ${type} (${packageData.id}) data:`, {
              programEntries: programEntriesResponse.data?.length || 0,
              staffEntries: staffEntriesResponse.data?.length || 0,
              dateRange: { startDateStr, endDateStr },
              packageId: packageData.id,
              packageType: packageData.type,
              packageName: packageData.name
            });

            // Add detailed June 2025 debugging for this package
            const june2025ProgramEntries = programEntriesResponse.data?.filter(entry => 
              entry.entry_date.startsWith('2025-06')
            ) || [];
            const june2025StaffEntries = staffEntriesResponse.data?.filter(entry => 
              entry.entry_date.startsWith('2025-06')
            ) || [];
            
            console.log(`Package ${type} June 2025 data:`, {
              packageId: packageData.id,
              june2025ProgramEntries: june2025ProgramEntries.length,
              june2025StaffEntries: june2025StaffEntries.length,
              june2025ProgramTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0),
              june2025StaffTotal: june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0),
              june2025CombinedTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0) + 
                                   june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0)
            });

            // Process program entries data
            if (programEntriesResponse.data) {
              programEntriesResponse.data.forEach(entry => {
                const dateStr = entry.entry_date;
                if (!allReportData[dateStr]) {
                  allReportData[dateStr] = {};
                }
                allReportData[dateStr][entry.product_id] = (allReportData[dateStr][entry.product_id] || 0) + entry.quantity;
              });
            }

            // Process staff entries data (add to existing quantities)
            if (staffEntriesResponse.data) {
              staffEntriesResponse.data.forEach(entry => {
                const dateStr = entry.entry_date;
                if (!allReportData[dateStr]) {
                  allReportData[dateStr] = {};
                }
                allReportData[dateStr][entry.product_id] = (allReportData[dateStr][entry.product_id] || 0) + entry.quantity;
              });
            }
          }
        }

        setPackageGroups(allProducts);
        setReportData(allReportData);
        setDates(Array.from(allDates).sort());
        setPackageType('all');
        setProducts([]); // Clear products as we're using package groups

        console.log('Fetched Data (All Packages):', {
          packageGroups: allProducts,
          reportData: allReportData,
          dates: Array.from(allDates).sort(),
          packageType: 'all',
          totalEntries: Object.values(allReportData).reduce((total, dateData) => 
            total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
          ),
          monthTotal: Object.values(allReportData).reduce((total, dateData) => 
            total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
          ),
          detailedBreakdown: {
            byDate: Object.entries(allReportData).map(([date, data]) => ({
              date,
              total: Object.values(data).reduce((sum, qty) => sum + qty, 0)
            })),
            byProduct: (() => {
              const productTotals: { [key: string]: number } = {};
              Object.values(allReportData).forEach(dateData => {
                Object.entries(dateData).forEach(([productId, qty]) => {
                  productTotals[productId] = (productTotals[productId] || 0) + qty;
                });
              });
              return productTotals;
            })()
          },
          // Add June 2025 specific calculation for comparison with LifeTime Report
          june2025Verification: {
            monthKey: '2025-06',
            june2025DayReportTotal: Object.entries(allReportData)
              .filter(([date]) => date.startsWith('2025-06'))
              .reduce((total, [date, dateData]) => 
                total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
              ),
            june2025DateBreakdown: Object.entries(allReportData)
              .filter(([date]) => date.startsWith('2025-06'))
              .map(([date, dateData]) => ({
                date,
                total: Object.values(dateData).reduce((sum, qty) => sum + qty, 0)
              }))
              .sort((a, b) => a.date.localeCompare(b.date)),
            expectedLifeTimeReportMatch: 19670,
            calculationMatches: Object.entries(allReportData)
              .filter(([date]) => date.startsWith('2025-06'))
              .reduce((total, [date, dateData]) => 
                total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
              ) === 19670,
            // Show all June dates to verify June 30th is included
            allJuneDates: Object.keys(allReportData)
              .filter(date => date.startsWith('2025-06'))
              .sort(),
            totalJuneDates: Object.keys(allReportData)
              .filter(date => date.startsWith('2025-06')).length,
            june30thIncluded: Object.keys(allReportData).includes('2025-06-30'),
            june30thTotal: Object.values(allReportData['2025-06-30'] || {}).reduce((sum, qty) => sum + qty, 0)
          },
          programEntries: packageTypes.map(type => {
            const pkg = packagesByType[type];
            return { type, hasPackage: !!pkg };
          })
        });

      } else {
        // Original single package logic
        const { data: packageData, error: packageError } = await supabase
          .from('packages')
          .select('id, type, name')
          .eq('id', selectedPackage)
          .single();

        if (packageError) throw packageError;
        setPackageType(packageData.type);

        // Rest of your existing single package logic...
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, rate, index')
          .eq('package_id', packageData.id)
          .order('index');

        if (productsError) throw productsError;

        const sortedProducts = [...(productsData || [])].sort((a, b) => {
          if (packageData.type.toLowerCase() === 'normal') {
            const indexA = PRODUCT_ORDER.indexOf(a.name);
            const indexB = PRODUCT_ORDER.indexOf(b.name);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
          }
          return (a.index || 0) - (b.index || 0);
        });

        setProducts(sortedProducts);
        setPackageGroups([{
          type: packageData.type,
          name: packageData.name,
          products: sortedProducts
        }]);

        // Calculate date range
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1); // month - 1 because Date months are 0-indexed
        const endDate = new Date(year, month, 0); // Day 0 of next month = last day of current month

        // Use string formatting to avoid timezone issues
        const startDateStr = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDateStr = `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

        console.log('Date range calculation (Single Package):', {
          selectedMonth,
          year,
          month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startDateStr,
          endDateStr,
          daysInMonth: endDate.getDate()
        });

        // Fetch billing entries (both program and staff entries)
        const [programEntriesResponse, staffEntriesResponse] = await Promise.all([
          supabase
            .from('billing_entries')
            .select('entry_date, quantity, product_id')
            .eq('package_id', packageData.id)
            .gte('entry_date', startDateStr)
            .lte('entry_date', endDateStr)
            .order('entry_date'),
          supabase
            .from('staff_billing_entries')
            .select('entry_date, quantity, product_id')
            .eq('package_id', packageData.id)
            .gte('entry_date', startDateStr)
            .lte('entry_date', endDateStr)
            .order('entry_date')
        ]);

        if (programEntriesResponse.error) throw programEntriesResponse.error;
        if (staffEntriesResponse.error) throw staffEntriesResponse.error;

        console.log('Single package data fetch:', {
          packageId: packageData.id,
          packageType: packageData.type,
          programEntries: programEntriesResponse.data?.length || 0,
          staffEntries: staffEntriesResponse.data?.length || 0,
          dateRange: { 
            start: startDateStr, 
            end: endDateStr 
          }
        });

        // Process data into the required format
        const processedData: ReportData = {};
        const datesSet = new Set<string>();

        // Initialize all dates in the month with empty data
        for (let d = 1; d <= endDate.getDate(); d++) {
          // Use local timezone to avoid timezone conversion issues
          const dateStr = `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
          datesSet.add(dateStr);
          processedData[dateStr] = {};
        }

        console.log('Single Package - Date initialization verification:', {
          selectedMonth,
          year,
          month,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          daysInMonth: endDate.getDate(),
          generatedDates: Array.from(datesSet).sort(),
          sampleDateCheck: {
            day1: `${year}-${month.toString().padStart(2, '0')}-01`,
            day15: `${year}-${month.toString().padStart(2, '0')}-15`,
            lastDay: `${year}-${month.toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`
          }
        });

        // Fill in the actual data from program entries
        programEntriesResponse.data?.forEach(entry => {
          const date = entry.entry_date;
          if (!processedData[date]) {
            processedData[date] = {};
          }
          processedData[date][entry.product_id] = (processedData[date][entry.product_id] || 0) + entry.quantity;
        });

        // Fill in the actual data from staff entries (add to existing quantities)
        staffEntriesResponse.data?.forEach(entry => {
          const date = entry.entry_date;
          if (!processedData[date]) {
            processedData[date] = {};
          }
          processedData[date][entry.product_id] = (processedData[date][entry.product_id] || 0) + entry.quantity;
        });

        setDates(Array.from(datesSet).sort());
        setReportData(processedData);

        console.log('Fetched Data (Single Package):', {
          products: sortedProducts,
          packageGroups: [{
            type: packageData.type,
            name: packageData.name,
            products: sortedProducts
          }],
          reportData: processedData,
          dates: Array.from(datesSet).sort(),
          packageType: packageData.type,
          totalEntries: Object.values(processedData).reduce((total, dateData) => 
            total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
          ),
          programEntriesCount: programEntriesResponse.data?.length || 0,
          staffEntriesCount: staffEntriesResponse.data?.length || 0,
          dateRange: {
            start: startDateStr,
            end: endDateStr,
            totalDaysInMonth: endDate.getDate(),
            datesInitialized: Array.from(datesSet).length
          },
          // June 2025 specific debugging
          june2025Verification: selectedMonth === '2025-06' ? {
            june2025Total: Object.entries(processedData)
              .filter(([date]) => date.startsWith('2025-06'))
              .reduce((total, [date, dateData]) => 
                total + Object.values(dateData).reduce((sum, qty) => sum + qty, 0), 0
              ),
            allJuneDates: Object.keys(processedData)
              .filter(date => date.startsWith('2025-06'))
              .sort(),
            totalJuneDates: Object.keys(processedData)
              .filter(date => date.startsWith('2025-06')).length,
            june30thIncluded: Object.keys(processedData).includes('2025-06-30'),
            june30thTotal: Object.values(processedData['2025-06-30'] || {}).reduce((sum, qty) => sum + qty, 0)
          } : null
        });
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMonth && selectedPackage) {
      fetchData();
    }
  }, [selectedMonth, selectedPackage]);

  const handlePrint = async () => {
    try {
      setActionType('print');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Preparing document for print...');

      // Transform the data for the API
      const transformedPackages = processedPackageGroups.reduce((acc, group) => {
        if (group.activeProducts && group.activeProducts.length > 0) {
          acc[group.type] = {
            type: group.type,
            name: group.name,
            products: group.activeProducts,
            reportData,
            dates: activeDates
          };
        }
        return acc;
      }, {} as Record<string, any>);

      const response = await fetch('/api/reports/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedMonth,
          packageType: selectedPackage,
          packages: transformedPackages,
          action: 'print'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate printable document');
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

      toast.dismiss(toastId);
      toast.success('Document ready for printing', {
        duration: 3000,
        icon: '🖨️'
      });
    } catch (error) {
      console.error('Error preparing print:', error);
      toast.error('Failed to prepare document for printing', {
        duration: 4000,
        icon: '❌'
      });
    } finally {
      setIsGeneratingPDF(false);
      setActionType(null);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setActionType('download');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Generating PDF...');

      // Transform the data for the API
      const transformedPackages = processedPackageGroups.reduce((acc, group) => {
        if (group.activeProducts && group.activeProducts.length > 0) {
          acc[group.type] = {
            type: group.type,
            name: group.name,
            products: group.activeProducts,
            reportData,
            dates: activeDates
          };
        }
        return acc;
      }, {} as Record<string, any>);

      const response = await fetch('/api/reports/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedMonth,
          packageType: selectedPackage,
          packages: transformedPackages,
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
      a.download = `day-report-${selectedMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss(toastId);
      toast.success('PDF downloaded successfully', {
        duration: 3000,
        icon: '📥'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF', {
        duration: 4000,
        icon: '❌'
      });
    } finally {
      setIsGeneratingPDF(false);
      setActionType(null);
    }
  };

  // Modify the hasAnyData check to handle both single package and all packages cases
  const hasAnyData = useMemo(() => {
    console.log('hasAnyData calculation:', {
      selectedPackage,
      packageGroupsLength: packageGroups.length,
      reportDataKeys: Object.keys(reportData).length,
      reportDataValues: Object.values(reportData).length,
      activeDatesLength: activeDates.length
    });

    if (selectedPackage === 'all') {
      // For all packages, check if we have package groups and active dates with data
      const hasData = packageGroups.length > 0 && activeDates.length > 0;
      console.log('All packages hasData:', hasData);
      return hasData;
    } else {
      // For single package, check if we have active dates with data
      const hasData = activeDates.length > 0;
      console.log('Single package hasData:', hasData);
      return hasData;
    }
  }, [selectedPackage, packageGroups, reportData, activeDates]);

  // Add a debug effect to monitor state changes
  useEffect(() => {
    console.log('State Update:', {
      hasAnyData,
      reportData: Object.keys(reportData).length,
      packageGroups: packageGroups.length,
      selectedPackage,
      isGeneratingPDF
    });
  }, [hasAnyData, reportData, packageGroups, selectedPackage, isGeneratingPDF]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white w-full">
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden max-w-5xl mx-auto">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !hasAnyData}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
        >
          {isGeneratingPDF && actionType === 'print' ? (
            <LoadingSpinner size="sm" className="text-gray-600 mr-2" />
          ) : (
            <RiPrinterLine className="w-5 h-5 mr-2" />
          )}
          {isGeneratingPDF && actionType === 'print' ? 'Preparing...' : 'Print'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !hasAnyData}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
        >
          {isGeneratingPDF && actionType === 'download' ? (
            <LoadingSpinner size="sm" className="text-gray-600 mr-2" />
          ) : (
            <RiDownloadLine className="w-5 h-5 mr-2" />
          )}
          {isGeneratingPDF && actionType === 'download' ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Report Content */}
      <div className="max-w-5xl mx-auto px-4">
        {isGeneratingPDF && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex items-center space-x-4">
              <LoadingSpinner size="lg" className="text-gray-600" />
              <div className="text-gray-700">
                {actionType === 'print' ? 'Preparing document...' : 'Generating PDF...'}
              </div>
            </div>
          </div>
        )}

        {/* Report Header */}
        <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900">
            Report for {format(new Date(selectedMonth), 'MMMM yyyy')}
          </h2>
        </div>

        {(() => {
          console.log('Rendering report:', {
            activeDatesWithData: activeDates.length,
            totalDatesInMonth: dates.length,
            processedPackageGroups: processedPackageGroups.length,
            emptyDatesFiltered: dates.length - activeDates.length
          });
          return activeDates.length > 0;
        })() ? (
          <div className="space-y-8">
            {processedPackageGroups.map((packageGroup, groupIndex) => (
              <div key={groupIndex} className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {packageGroup.name} ({packageGroup.type})
                </h3>
                {packageGroup.productChunks?.map((productChunk, chunkIndex) => {
                  // Show only dates with data for this chunk (filter out empty rows)
                  console.log('Processing chunk', chunkIndex, 'with products:', productChunk.map(p => ({ id: p.id, name: p.name })));
                  console.log('Sample reportData for first active date:', activeDates[0], reportData[activeDates[0]]);
                  
                  // Use only dates that have data for this chunk
                  const chunkDates = activeDates.filter(date => 
                    productChunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
                  );

                  console.log('ChunkDates for chunk', chunkIndex, ':', chunkDates.length, 'dates with data');
                  console.log('Date range:', chunkDates[0], 'to', chunkDates[chunkDates.length - 1]);
                  
                  // Don't render chunk if no dates have data
                  if (chunkDates.length === 0) {
                    console.log('Skipping chunk', chunkIndex, 'as no dates have data');
                    return null;
                  }
                  
                  // Specific verification for June 2025
                  if (chunkDates[0]?.startsWith('2025-06')) {
                    console.log('June 2025 verification (filtered dates):', {
                      totalDatesInChunk: chunkDates.length,
                      originalActiveDates: activeDates.length,
                      june30thIncluded: chunkDates.includes('2025-06-30'),
                      firstDate: chunkDates[0],
                      lastDate: chunkDates[chunkDates.length - 1],
                      june30thData: reportData['2025-06-30'] ? Object.values(reportData['2025-06-30']).reduce((sum, qty) => sum + qty, 0) : 0
                    });
                  }

                  return (
                    <div key={chunkIndex} className="relative overflow-x-auto">
                      <div className="border border-gray-200">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-1.5 py-1 border-b border-r border-gray-200 text-left font-normal text-gray-900 w-[100px] sticky left-0 bg-gray-50 z-10">
                                Date
                              </th>
                              {productChunk.map(product => (
                                <th 
                                  key={product.id}
                                  className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[45px]"
                                >
                                  {product.name}
                                </th>
                              ))}
                              <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[45px]">
                                Average
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white">
                            {chunkDates.map(date => (
                              <tr key={date} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="px-1.5 py-1 border-r border-gray-200 text-gray-900 font-normal sticky left-0 bg-white z-10">
                                  {format(new Date(date), 'dd/MM/yyyy')}
                                </td>
                                {productChunk.map(product => {
                                  const quantity = reportData[date]?.[product.id] || 0;
                                  return (
                                    <td 
                                      key={`${date}-${product.id}`}
                                      className={`px-1.5 py-1 border-r border-gray-200 text-center ${
                                        quantity > 0 ? 'text-gray-900' : 'text-gray-400'
                                      }`}
                                    >
                                      {quantity || '-'}
                                    </td>
                                  );
                                })}
                                <td className="px-1.5 py-1 border-r border-gray-200 text-center text-gray-900">
                                  {(() => {
                                    const nonZeroProducts = productChunk.filter(product => 
                                      (reportData[date]?.[product.id] || 0) > 0
                                    );
                                    const sum = productChunk.reduce((acc, product) => 
                                      acc + (reportData[date]?.[product.id] || 0), 0
                                    );
                                    
                                    // Calculate average only for products with data (non-zero)
                                    if (nonZeroProducts.length === 0) return '-';
                                    const avg = Math.round(sum / nonZeroProducts.length);
                                    return avg > 0 ? avg : '-';
                                  })()}
                                </td>
                              </tr>
                            ))}
                            {/* Total Row */}
                            <tr className="bg-amber-50 font-medium">
                              <td className="px-1.5 py-1 border-r border-gray-200 text-gray-900 sticky left-0 bg-amber-50 z-10">
                                Total
                              </td>
                              {productChunk.map(product => {
                                const total = chunkDates.reduce((sum, date) => 
                                  sum + (reportData[date]?.[product.id] || 0), 0
                                );
                                return (
                                  <td 
                                    key={`total-${product.id}`}
                                    className="px-1.5 py-1 border-r border-gray-200 text-center text-amber-900"
                                  >
                                    {total || '-'}
                                  </td>
                                );
                              })}
                              <td className="px-1.5 py-1 border-r border-gray-200 text-center text-amber-900">
                                {(() => {
                                  // Calculate the average of totals (total for each product divided by number of dates)
                                  const productTotals = productChunk.map(product => 
                                    chunkDates.reduce((sum, date) => 
                                      sum + (reportData[date]?.[product.id] || 0), 0
                                    )
                                  );
                                  
                                  const nonZeroTotals = productTotals.filter(total => total > 0);
                                  if (nonZeroTotals.length === 0) return '-';
                                  
                                  const averageOfTotals = Math.round(
                                    nonZeroTotals.reduce((sum, total) => sum + total, 0) / nonZeroTotals.length
                                  );
                                  return averageOfTotals > 0 ? averageOfTotals : '-';
                                })()}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500 mb-2">
              No data found for {format(new Date(selectedMonth), 'MMMM yyyy')}
            </p>
            <div className="text-sm text-gray-400 space-y-1">
              <p>Package Groups: {packageGroups.length}</p>
              <p>Total Date Entries: {Object.keys(reportData).length}</p>
              <p>Dates With Data: {activeDates.length}</p>
              <p>Has Any Data: {hasAnyData.toString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayReport; 
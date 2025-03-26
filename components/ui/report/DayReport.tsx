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
const PRODUCT_ORDER = ['MT', 'BF', 'M-CRT', 'LUNCH', 'A-CRT', 'HI TEA', 'DINNER'];

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
  
  // Sort products based on package type
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
    // Only add chunk if it has any data
    if (chunk.some(product => 
      activeDates.some(date => (reportData[date]?.[product.id] || 0) > 0)
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

  // Filter out dates with no consumption
  const activeDates = useMemo(() => {
    if (!dates.length || !Object.keys(reportData).length) return [];
    return dates.filter(hasRowConsumption);
  }, [dates, reportData]);

  // Function to check if a chunk has any data
  const hasChunkData = (chunk: ProductEntry[], dates: string[]): boolean => {
    return chunk.some(product => 
      dates.some(date => (reportData[date]?.[product.id] || 0) > 0)
    );
  };

  // Function to check if a date has data for a specific chunk
  const hasDateDataForChunk = (date: string, chunk: ProductEntry[]): boolean => {
    return chunk.some(product => (reportData[date]?.[product.id] || 0) > 0);
  };

  // Split products into chunks with optimized chunk size and filter empty chunks
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
      // Only add chunk if it has any data
      if (hasChunkData(chunk, activeDates)) {
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
        const startDate = new Date(`${selectedMonth}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Initialize all dates in the month with empty data
        for (let d = 1; d <= endDate.getDate(); d++) {
          const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), d);
          const dateStr = currentDate.toISOString().split('T')[0];
          allDates.add(dateStr);
          allReportData[dateStr] = {};
        }

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

            // Fetch billing entries for this package
            const { data: entriesData, error: entriesError } = await supabase
              .from('billing_entries')
              .select('entry_date, quantity, product_id')
              .eq('package_id', packageData.id)
              .gte('entry_date', startDateStr)
              .lte('entry_date', endDateStr)
              .order('entry_date');

            if (entriesError) throw entriesError;

            // Process entries data
            if (entriesData) {
              entriesData.forEach(entry => {
                const dateStr = entry.entry_date;
                if (!allReportData[dateStr]) {
                  allReportData[dateStr] = {};
                }
                allReportData[dateStr][entry.product_id] = entry.quantity;
              });
            }
          }
        }

        setPackageGroups(allProducts);
        setReportData(allReportData);
        setDates(Array.from(allDates).sort());
        setPackageType('all');
        setProducts([]); // Clear products as we're using package groups

        console.log('Fetched Data:', {
          packageGroups: allProducts,
          reportData: allReportData,
          dates: Array.from(allDates).sort(),
          packageType: 'all'
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
        const startDate = new Date(`${selectedMonth}-01`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

        // Fetch billing entries
        const { data: entriesData, error: entriesError } = await supabase
          .from('billing_entries')
          .select('entry_date, quantity, product_id')
          .eq('package_id', packageData.id)
          .gte('entry_date', startDate.toISOString().split('T')[0])
          .lte('entry_date', endDate.toISOString().split('T')[0])
          .order('entry_date');

        if (entriesError) throw entriesError;

        // Process data into the required format
        const processedData: ReportData = {};
        const datesSet = new Set<string>();

        // Initialize all dates in the month with empty data
        for (let d = 1; d <= endDate.getDate(); d++) {
          const currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), d);
          const dateStr = currentDate.toISOString().split('T')[0];
          datesSet.add(dateStr);
          processedData[dateStr] = {};
        }

        // Fill in the actual data
        entriesData?.forEach(entry => {
          const date = entry.entry_date;
          if (!processedData[date]) {
            processedData[date] = {};
          }
          processedData[date][entry.product_id] = entry.quantity;
        });

        setDates(Array.from(datesSet).sort());
        setReportData(processedData);

        console.log('Fetched Data:', {
          products: sortedProducts,
          packageGroups: [{
            type: packageData.type,
            name: packageData.name,
            products: sortedProducts
          }],
          reportData: processedData,
          dates: Array.from(datesSet).sort(),
          packageType: packageData.type
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
    if (selectedPackage === 'all') {
      // For all packages, check if any package group has data
      return packageGroups.some(group => 
        group.products.some(product => 
          Object.values(reportData).some(dateData => 
            (dateData[product.id] || 0) > 0
          )
        )
      );
    } else {
      // For single package, check if there's any consumption data
      return Object.values(reportData).some(dateData => 
        Object.values(dateData).some(quantity => quantity > 0)
      );
    }
  }, [selectedPackage, packageGroups, reportData]);

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

        {activeDates.length > 0 ? (
          <div className="space-y-8">
            {processedPackageGroups.map((packageGroup, groupIndex) => (
              <div key={groupIndex} className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  {packageGroup.name} ({packageGroup.type})
                </h3>
                {packageGroup.productChunks?.map((productChunk, chunkIndex) => {
                  // Filter dates that have data for this chunk
                  const chunkDates = activeDates.filter(date => 
                    productChunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
                  );

                  if (chunkDates.length === 0) return null;

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
                                    const sum = productChunk.reduce((acc, product) => 
                                      acc + (reportData[date]?.[product.id] || 0), 0
                                    );
                                    const avg = Math.round(sum / productChunk.length);
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
                                  const totalSum = productChunk.reduce((acc, product) => 
                                    acc + chunkDates.reduce((sum, date) => 
                                      sum + (reportData[date]?.[product.id] || 0), 0
                                    ), 0
                                  );
                                  const totalAvg = Math.round(totalSum / (productChunk.length * chunkDates.length));
                                  return totalAvg > 0 ? totalAvg : '-';
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
            <p className="text-gray-500">
              No data found for {format(new Date(selectedMonth), 'MMMM yyyy')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayReport; 
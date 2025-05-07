"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RiDownloadLine, RiPrinterLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface PackageItem {
  productName: string;
  quantity: number;
  rate: number;
  total: number;
  dates?: { [date: string]: number };
  comment?: string;
}

interface PackageData {
  items: PackageItem[];
  packageTotal: number;
}

interface Packages {
  [key: string]: PackageData;
}

interface ProgramReportProps {
  programId: string;
  programName: string;
  customerName: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  selectedPackage: string;
  packages: Packages;
  grandTotal: number;
}

// Package type mapping and order
const PACKAGE_TYPE_DISPLAY = {
  'Normal': 'CATERING PACKAGE',
  'Extra': 'EXTRA CATERING PACKAGE',
  'Cold Drink': 'COLD DRINKS PACKAGE'
} as const;

const PACKAGE_TYPE_ORDER = ['Normal', 'Extra', 'Cold Drink'];

// Define catering product order according to the provided sequence - EXACT MATCH with the screenshot
const CATERING_PRODUCT_ORDER = [
  'Morning Tea',
  'Breakfast',
  'Morning CRT',
  'LUNCH',
  'Afternoon CRT',
  'Hi-TEA',
  'DINNER'
];

// Function to normalize product names for comparison
const normalizeProductName = (name: string): string => {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Function to get the product order index, using normalized comparison
const getProductOrderIndex = (productName: string): number => {
  const normalizedName = normalizeProductName(productName);
  
  for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
    const orderName = normalizeProductName(CATERING_PRODUCT_ORDER[i]);
    
    // Exact match
    if (normalizedName === orderName) {
      return i;
    }
    
    // Contains match (for partial matches)
    if (normalizedName.includes(orderName) || orderName.includes(normalizedName)) {
      return i;
    }
  }
  
  return -1;
};

const ProgramReport: React.FC<ProgramReportProps> = ({
  programId,
  programName,
  customerName,
  startDate,
  endDate,
  totalParticipants,
  selectedPackage,
  packages,
  grandTotal
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});
  const [savedStates, setSavedStates] = useState<{ [key: string]: boolean }>({});
  const supabase = createClientComponentClient();

  // Fetch existing comments when component mounts
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('program_item_comments')
          .select('package_type, product_name, comment')
          .eq('program_id', programId);

        if (error) throw error;

        const commentMap = data.reduce((acc, item) => {
          const key = `${item.package_type}:${item.product_name}`;
          acc[key] = item.comment;
          return acc;
        }, {} as { [key: string]: string });

        setComments(commentMap);
      } catch (error) {
        console.error('Error fetching comments:', error);
        toast.error('Failed to load comments');
      }
    };

    if (programId) {
      fetchComments();
    }
  }, [programId]);

  // Updated saveComment function
  const saveComment = async (packageType: string, productName: string, comment: string) => {
    const commentKey = `${packageType}:${productName}`;
    
    try {
      setSavingStates(prev => ({ ...prev, [commentKey]: true }));
      setSavedStates(prev => ({ ...prev, [commentKey]: false }));

      const { error } = await supabase
        .from('program_item_comments')
        .upsert({
          program_id: programId,
          package_type: packageType,
          product_name: productName,
          comment: comment.trim() || null
        }, {
          onConflict: 'program_id,package_type,product_name'
        });

      if (error) throw error;

      // Show success state
      setSavedStates(prev => ({ ...prev, [commentKey]: true }));
      
      // Reset success state after 2 seconds
      setTimeout(() => {
        setSavedStates(prev => ({ ...prev, [commentKey]: false }));
      }, 2000);

    } catch (error) {
      console.error('Error saving comment:', error);
      toast.error('Failed to save comment');
    } finally {
      setSavingStates(prev => ({ ...prev, [commentKey]: false }));
    }
  };

  // Updated handleCommentChange with debounce
  const handleCommentChange = (packageType: string, productName: string, comment: string) => {
    const commentKey = `${packageType}:${productName}`;
    setComments(prev => ({ ...prev, [commentKey]: comment }));

    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      saveComment(packageType, productName, comment);
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  // Get all unique dates from all items
  const getAllDates = () => {
    const datesSet = new Set<string>();
    Object.values(packages).forEach(pkg => {
      pkg.items.forEach(item => {
        if (item.dates) {
          Object.keys(item.dates).forEach(date => datesSet.add(date));
        }
      });
    });
    return Array.from(datesSet).sort();
  };

  const handlePrint = async () => {
    try {
      setActionType('print');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Preparing document for print...');

      // Transform the data structure to match API expectations
      const transformedPackages = Object.entries(packages).reduce((acc, [type, data]) => {
        acc[type] = {
          products: data.items.map(item => ({
            id: item.productName,
            name: item.productName,
            rate: item.rate,
            comment: comments[`${type}:${item.productName}`] || null // Include comments in transformation
          })),
          entries: getAllDates().map(date => ({
            date,
            quantities: data.items.reduce((q, item) => {
              q[item.productName] = item.dates?.[date] || 0;
              return q;
            }, {} as Record<string, number>)
          })),
          totals: data.items.reduce((t, item) => {
            t[item.productName] = item.quantity;
            return t;
          }, {} as Record<string, number>),
          rates: data.items.reduce((r, item) => {
            r[item.productName] = item.rate;
            return r;
          }, {} as Record<string, number>),
          totalAmounts: data.items.reduce((ta, item) => {
            ta[item.productName] = item.total;
            return ta;
          }, {} as Record<string, number>)
        };
        return acc;
      }, {} as any);

      const response = await fetch('/api/reports/program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programName,
          customerName,
          startDate,
          endDate,
          totalParticipants,
          selectedPackage,
          packages: transformedPackages,
          action: 'print'
        })
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

      // Transform the data structure to match API expectations
      const transformedPackages = Object.entries(packages).reduce((acc, [type, data]) => {
        acc[type] = {
          products: data.items.map(item => ({
            id: item.productName,
            name: item.productName,
            rate: item.rate,
            comment: comments[`${type}:${item.productName}`] || null // Include comments in transformation
          })),
          entries: getAllDates().map(date => ({
            date,
            quantities: data.items.reduce((q, item) => {
              q[item.productName] = item.dates?.[date] || 0;
              return q;
            }, {} as Record<string, number>)
          })),
          totals: data.items.reduce((t, item) => {
            t[item.productName] = item.quantity;
            return t;
          }, {} as Record<string, number>),
          rates: data.items.reduce((r, item) => {
            r[item.productName] = item.rate;
            return r;
          }, {} as Record<string, number>),
          totalAmounts: data.items.reduce((ta, item) => {
            ta[item.productName] = item.total;
            return ta;
          }, {} as Record<string, number>)
        };
        return acc;
      }, {} as any);

      const response = await fetch('/api/reports/program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          programName,
          customerName,
          startDate,
          endDate,
          totalParticipants,
          selectedPackage,
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
      a.download = `program-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
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

  const renderPackageTables = () => {
    if (!packages || Object.keys(packages).length === 0) {
      return null;
    }

    // Get all unique dates
    const allDates = getAllDates();

    // Filter out dates with no consumption
    const datesWithConsumption = allDates.filter(date => 
      Object.values(packages).some(pkg => 
        pkg.items.some(item => (item.dates?.[date] || 0) > 0)
      )
    ).sort();

    // Filter package groups based on selected package
    const filteredPackages = selectedPackage === 'all' 
      ? packages 
      : Object.entries(packages).reduce((acc, [type, data]) => {
          if (type === selectedPackage) {
            acc[type] = data;
          }
          return acc;
        }, {} as typeof packages);

    if (Object.keys(filteredPackages).length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">
            No data found for the selected package type.
          </p>
        </div>
      );
    }

    // Sort package types according to defined order
    const sortedPackageTypes = Object.keys(filteredPackages).sort((a, b) => {
      const orderA = PACKAGE_TYPE_ORDER.indexOf(a) !== -1 ? PACKAGE_TYPE_ORDER.indexOf(a) : 999;
      const orderB = PACKAGE_TYPE_ORDER.indexOf(b) !== -1 ? PACKAGE_TYPE_ORDER.indexOf(b) : 999;
      return orderA - orderB;
    });

    const PRODUCTS_PER_TABLE = 7;

    return (
      <div className="space-y-6">
        {sortedPackageTypes.map((packageType, packageIndex) => {
          const packageData = filteredPackages[packageType];
          
          if (!packageData || !packageData.items || packageData.items.length === 0) {
            return null;
          }

          // Get all items with any consumption
          const itemsWithConsumption = [...packageData.items]
            .filter(item => Object.values(item.dates || {}).some(qty => qty > 0));

          if (itemsWithConsumption.length === 0) return null;

          // Apply special sorting ONLY for Normal/Catering package
          let sortedItems = [...itemsWithConsumption];
          
          if (packageType.toLowerCase() === 'normal') {
            // Create a map for fast lookup of product order
            const orderMap = new Map();
            CATERING_PRODUCT_ORDER.forEach((name, index) => {
              // Store both regular and normalized versions
              orderMap.set(name, index);
              orderMap.set(normalizeProductName(name), index);
            });
            
            // Custom sort function that prioritizes our defined order
            sortedItems = sortedItems.sort((a, b) => {
              const nameA = a.productName.trim();
              const nameB = b.productName.trim();
              
              // Try direct match first
              const directOrderA = orderMap.get(nameA);
              const directOrderB = orderMap.get(nameB);
              
              // Then try normalized match
              const normA = normalizeProductName(nameA);
              const normB = normalizeProductName(nameB);
              const orderA = directOrderA !== undefined ? directOrderA : orderMap.get(normA);
              const orderB = directOrderB !== undefined ? directOrderB : orderMap.get(normB);
              
              // If both have a defined order, sort by that order
              if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
              }
              
              // If only one has a defined order, prioritize it
              if (orderA !== undefined) return -1;
              if (orderB !== undefined) return 1;
              
              // Check for partial matches using getProductOrderIndex
              const indexA = getProductOrderIndex(nameA);
              const indexB = getProductOrderIndex(nameB);
              
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              
              // Fallback to alphabetical sorting
              return nameA.localeCompare(nameB);
            });
            
            // Force the exact order from CATERING_PRODUCT_ORDER if possible
            const exactOrderItems = new Array(CATERING_PRODUCT_ORDER.length).fill(null);
            const remainingItems: PackageItem[] = [];
            
            // First pass: look for exact matches (case insensitive)
            sortedItems.forEach(item => {
              const normalizedName = normalizeProductName(item.productName);
              
              for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
                const orderName = CATERING_PRODUCT_ORDER[i];
                const normalizedOrderName = normalizeProductName(orderName);
                
                if (normalizedName === normalizedOrderName || 
                    item.productName.trim().toUpperCase() === orderName.toUpperCase()) {
                  exactOrderItems[i] = item;
                  return;
                }
              }
              
              // Check for partial matches
              const partialIndex = getProductOrderIndex(item.productName);
              if (partialIndex !== -1) {
                exactOrderItems[partialIndex] = item;
              } else {
                remainingItems.push(item);
              }
            });
            
            // Combine the ordered items with any remaining items
            sortedItems = [...exactOrderItems.filter(Boolean), ...remainingItems];
          }

          // Only chunk normal package items
          const shouldChunk = packageType.toLowerCase() === 'normal';
          const itemChunks = shouldChunk 
            ? sortedItems.reduce((chunks: PackageItem[][], item: PackageItem, index: number) => {
                if (index % PRODUCTS_PER_TABLE === 0) {
                  chunks.push([]);
                }
                chunks[chunks.length - 1].push(item);
                return chunks;
              }, [] as PackageItem[][])
            : [sortedItems];

          return (
            <div key={`${packageType}-${packageIndex}`} className="w-full">
              <div className="mb-1 bg-white">
                <div className="flex justify-center items-center bg-gray-50 py-2 border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900">
                    {PACKAGE_TYPE_DISPLAY[packageType as keyof typeof PACKAGE_TYPE_DISPLAY] || packageType.toUpperCase()}
                  </h3>
                </div>
              </div>

              {itemChunks.map((chunk, chunkIndex) => {
                // Filter dates that have data for this chunk
                const chunkDates = datesWithConsumption.filter(date => 
                  chunk.some(item => (item.dates?.[date] || 0) > 0)
                );

                if (chunkDates.length === 0) return null;

                return (
                  <div key={chunkIndex} className="relative overflow-x-auto mb-2">
                    <div className="border border-gray-200">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-left font-normal text-gray-900 w-[100px]">
                              Product Name
                            </th>
                            {chunkDates.map(date => (
                              <th key={date} className="px-1 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[30px]">
                                {format(new Date(date), 'dd')}
                              </th>
                            ))}
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[40px]">
                              Total
                            </th>
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[45px]">
                              Rate
                            </th>
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[50px]">
                              Amount
                            </th>
                            <th className="px-1.5 py-1 border-b border-gray-200 text-center font-normal text-gray-900 w-[150px]">
                              Comments
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {chunk.map(item => {
                            // Calculate row totals
                            const rowTotal = chunkDates.reduce((sum, date) => 
                              sum + (item.dates?.[date] || 0), 0
                            );

                            if (rowTotal === 0) return null;

                            return (
                              <tr key={item.productName} className="border-b border-gray-200">
                                <td className="px-1.5 py-1 border-r border-gray-200 text-gray-900">
                                  {item.productName}
                                </td>
                                {chunkDates.map(date => (
                                  <td key={date} className="px-1 py-1 border-r border-gray-200 text-center text-gray-900">
                                    {item.dates?.[date] || '-'}
                                  </td>
                                ))}
                                <td className="px-1.5 py-1 border-r border-gray-200 text-center text-gray-900">
                                  {item.quantity}
                                </td>
                                <td className="px-1.5 py-1 border-r border-gray-200 text-center text-gray-900">
                                  ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-1.5 py-1 text-center text-gray-900">
                                  ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-1.5 py-1 border-l border-gray-200">
                                  <div className="relative">
                                    <textarea
                                      value={comments[`${packageType}:${item.productName}`] || ''}
                                      onChange={(e) => handleCommentChange(packageType, item.productName, e.target.value)}
                                      placeholder="Add comment..."
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-none pr-6"
                                      rows={1}
                                      style={{ minHeight: '2rem' }}
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 transition-opacity duration-200">
                                      {savingStates[`${packageType}:${item.productName}`] && (
                                        <LoadingSpinner size="sm" className="text-amber-400 opacity-60 w-3 h-3" />
                                      )}
                                      {savedStates[`${packageType}:${item.productName}`] && (
                                        <svg
                                          className="w-3 h-3 text-green-500 opacity-60"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}

              {/* Package Total */}
              <div className="mb-2 py-1 px-2 text-right text-[11px]">
                <span className="font-normal mr-2">Package Total:</span>
                <span className="text-gray-900">₹{packageData.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })}

        {/* Grand Total */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex justify-end">
            <div className="text-right">
              <span className="font-semibold mr-4">Grand Total:</span>
              <span className="text-amber-900">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasPackages = packages && Object.keys(packages).length > 0;

  return (
    <div className="bg-white w-full">
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden max-w-5xl mx-auto">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !hasPackages}
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
          disabled={isGeneratingPDF || !hasPackages}
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
      <div className="bg-white max-w-5xl mx-auto px-4">
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

        {hasPackages ? (
          <>
            {/* Report Header */}
            <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Program Report - {programName}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Customer Name</p>
                  <p className="font-medium">{customerName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Start Date</p>
                  <p className="font-medium">{format(new Date(startDate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-600">End Date</p>
                  <p className="font-medium">{format(new Date(endDate), 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Participants</p>
                  <p className="font-medium">{totalParticipants}</p>
                </div>
              </div>
            </div>
            {renderPackageTables()}
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No data found for program {programName}
              {selectedPackage !== 'all' ? ` in ${selectedPackage} package` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramReport;

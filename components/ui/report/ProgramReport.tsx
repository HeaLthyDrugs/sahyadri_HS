"use client"

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RiDownloadLine, RiPrinterLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { EditGuard } from '@/components/PermissionGuard';
import { useStrictPermissions } from '@/hooks/use-strict-permissions';

interface PackageItem {
  productName: string;
  serve_item_no?: number;
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
  programId?: string;
  programName?: string;
  customerName?: string;
  startDate?: string;
  endDate?: string;
  totalParticipants?: number;
  selectedPackage: string;
  packages: Packages;
  grandTotal: number;
  isStaffMode?: boolean;
  month?: string;
  onModeChange?: (isStaff: boolean) => void;
  onMonthChange?: (month: string) => void;
}

const PACKAGE_TYPE_DISPLAY = {
  'Normal': 'CATERING PACKAGE',
  'Extra': 'EXTRA CATERING PACKAGE',
  'Cold Drink': 'COLD DRINKS PACKAGE'
} as const;

const PACKAGE_TYPE_ORDER = ['Normal', 'Extra', 'Cold Drink'];

const CATERING_PRODUCT_ORDER = [
  'Morning Tea',
  'Breakfast',
  'Morning CRT',
  'LUNCH',
  'Afternoon CRT',
  'Hi-TEA',
  'DINNER'
];

const normalizeProductName = (name: string): string => {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const getProductOrderIndex = (productName: string): number => {
  const normalizedName = normalizeProductName(productName);
  
  for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
    const orderName = normalizeProductName(CATERING_PRODUCT_ORDER[i]);
    
    if (normalizedName === orderName) {
      return i;
    }
    
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
  grandTotal,
  isStaffMode = false,
  month,
  onModeChange,
  onMonthChange
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({});
  const [savedStates, setSavedStates] = useState<{ [key: string]: boolean }>({});
  const supabase = createClientComponentClient();
  const { canEdit } = useStrictPermissions();

  // Fetch existing comments when component mounts
  useEffect(() => {
    const fetchComments = async () => {
      if ((!isStaffMode && !programId) || (isStaffMode && !month)) return;
      
      try {
        let query = supabase
          .from('report_comments')
          .select('reference_id, comment')
          .eq('report_type', 'program_item')
          .eq('ofStaff', isStaffMode);
          
        if (isStaffMode) {
          query = query.eq('month', month);
        } else {
          query = query.eq('program_id', programId);
        }
          
        const { data, error } = await query;
        if (error) throw error;

        const commentMap = (data || []).reduce((acc, item) => {
          // Extract the original comment key from the unique reference_id
          const originalKey = isStaffMode 
            ? item.reference_id.replace(`${month}:`, '')
            : item.reference_id.replace(`${programId}:`, '');
          acc[originalKey] = item.comment;
          return acc;
        }, {} as { [key: string]: string });

        setComments(commentMap);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };

    fetchComments();
  }, [programId, isStaffMode, month]);

  const saveComment = async (packageType: string, productName: string, comment: string) => {
    const commentKey = `${packageType}:${productName}`;
    
    try {
      setSavingStates(prev => ({ ...prev, [commentKey]: true }));
      setSavedStates(prev => ({ ...prev, [commentKey]: false }));

      if (!comment.trim()) {
        const uniqueReferenceId = isStaffMode 
          ? `${month}:${commentKey}` 
          : `${programId}:${commentKey}`;

        const { error } = await supabase
          .from('report_comments')
          .delete()
          .eq('report_type', 'program_item')
          .eq('reference_id', uniqueReferenceId)
          .eq('ofStaff', isStaffMode);

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
      } else {
        const uniqueReferenceId = isStaffMode 
          ? `${month}:${commentKey}` 
          : `${programId}:${commentKey}`;

        const commentData: any = {
          report_type: 'program_item',
          reference_id: uniqueReferenceId,
          comment: comment.trim(),
          ofStaff: isStaffMode
        };
        
        if (isStaffMode && month) {
          commentData.month = month;
        } else if (!isStaffMode && programId) {
          commentData.program_id = programId;
        }

        const { data: existing } = await supabase
          .from('report_comments')
          .select('id')
          .eq('report_type', 'program_item')
          .eq('reference_id', uniqueReferenceId)
          .eq('ofStaff', isStaffMode)
          .maybeSingle();

        let error;
        if (existing) {
          ({ error } = await supabase
            .from('report_comments')
            .update(commentData)
            .eq('id', existing.id));
        } else {
          ({ error } = await supabase
            .from('report_comments')
            .insert(commentData));
        }

        if (error) {
          throw error;
        }
      }

      setSavedStates(prev => ({ ...prev, [commentKey]: true }));
      
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

  const [commentTimeouts, setCommentTimeouts] = useState<{ [key: string]: NodeJS.Timeout }>({});

  const handleCommentChange = (packageType: string, productName: string, comment: string) => {
    if (!canEdit) {
      return;
    }
    
    const commentKey = `${packageType}:${productName}`;
    setComments(prev => ({ ...prev, [commentKey]: comment }));

    if (commentTimeouts[commentKey]) {
      clearTimeout(commentTimeouts[commentKey]);
    }

    const timeoutId = setTimeout(() => {
      saveComment(packageType, productName, comment);
      setCommentTimeouts(prev => {
        const newTimeouts = { ...prev };
        delete newTimeouts[commentKey];
        return newTimeouts;
      });
    }, 1500);

    setCommentTimeouts(prev => ({ ...prev, [commentKey]: timeoutId }));
  };

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

      const transformedPackages = Object.entries(packages).reduce((acc, [type, data]) => {
        acc[type] = {
          products: data.items.map(item => ({
            id: item.productName,
            name: item.productName,
            serve_item_no: item.serve_item_no,
            rate: item.rate,
            comment: comments[`${type}:${item.productName}`] || null
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
          action: 'print',
          isStaffMode,
          month
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

      const transformedPackages = Object.entries(packages).reduce((acc, [type, data]) => {
        acc[type] = {
          products: data.items.map(item => ({
            id: item.productName,
            name: item.productName,
            serve_item_no: item.serve_item_no,
            rate: item.rate,
            comment: comments[`${type}:${item.productName}`] || null
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
          action: 'download',
          isStaffMode,
          month
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

    const allDates = getAllDates();

    const datesWithConsumption = allDates.filter(date => 
      Object.values(packages).some(pkg => 
        pkg.items.some(item => (item.dates?.[date] || 0) > 0)
      )
    ).sort();

    const filteredPackages = (() => {
      if (selectedPackage === 'all') {
        return packages;
      }

      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink'
      };

      const mappedType = packageTypeMap[selectedPackage.toLowerCase() as keyof typeof packageTypeMap];
      if (!mappedType) return {};

      return Object.entries(packages).reduce((acc, [type, data]) => {
        if (type === mappedType) {
          acc[type] = data;
        }
        return acc;
      }, {} as typeof packages);
    })();

    if (Object.keys(filteredPackages).length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">
            No data found for the selected package type.
          </p>
        </div>
      );
    }

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

          const itemsWithConsumption = [...packageData.items]
            .filter(item => Object.values(item.dates || {}).some(qty => qty > 0));

          if (itemsWithConsumption.length === 0) return null;

          let sortedItems = [...itemsWithConsumption];
          
          if (packageType.toLowerCase() === 'normal') {
            const orderMap = new Map();
            CATERING_PRODUCT_ORDER.forEach((name, index) => {
              orderMap.set(name, index);
              orderMap.set(normalizeProductName(name), index);
            });
            
            sortedItems = sortedItems.sort((a, b) => {
              const nameA = a.productName.trim();
              const nameB = b.productName.trim();
              
              const directOrderA = orderMap.get(nameA);
              const directOrderB = orderMap.get(nameB);
              
              const normA = normalizeProductName(nameA);
              const normB = normalizeProductName(nameB);
              const orderA = directOrderA !== undefined ? directOrderA : orderMap.get(normA);
              const orderB = directOrderB !== undefined ? directOrderB : orderMap.get(normB);
              
              if (orderA !== undefined && orderB !== undefined) {
                return orderA - orderB;
              }
              
              if (orderA !== undefined) return -1;
              if (orderB !== undefined) return 1;
              
              const indexA = getProductOrderIndex(nameA);
              const indexB = getProductOrderIndex(nameB);
              
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              
              return nameA.localeCompare(nameB);
            });
            
            const exactOrderItems = new Array(CATERING_PRODUCT_ORDER.length).fill(null);
            const remainingItems: PackageItem[] = [];
            
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
              
              const partialIndex = getProductOrderIndex(item.productName);
              if (partialIndex !== -1) {
                exactOrderItems[partialIndex] = item;
              } else {
                remainingItems.push(item);
              }
            });
            
            sortedItems = [...exactOrderItems.filter(Boolean), ...remainingItems];
          }

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
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[30px]">
                              Sr. No
                            </th>
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[40px]">
                              Serv. Itm
                            </th>
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
                          {chunk.map((item, itemIndex) => {
                            const rowTotal = chunkDates.reduce((sum, date) => 
                              sum + (item.dates?.[date] || 0), 0
                            );

                            if (rowTotal === 0) return null;

                            return (
                              <tr key={item.productName} className="border-b border-gray-200">
                                <td className="px-1.5 py-1 border-r border-gray-200 text-center text-gray-900">
                                  {itemIndex + 1}
                                </td>
                                <td className="px-1.5 py-1 border-r border-gray-200 text-center text-gray-900">
                                  {item.serve_item_no || '-'}
                                </td>
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
                                  {canEdit ? (
                                    <div className="relative">
                                      <div className="min-w-0 max-w-full overflow-hidden">
                                        <textarea
                                          value={comments[`${packageType}:${item.productName}`] || ''}
                                          onChange={(e) => {
                                            const target = e.target;
                                            target.style.height = 'auto';
                                            target.style.height = Math.max(32, target.scrollHeight) + 'px';
                                            handleCommentChange(packageType, item.productName, e.target.value);
                                          }}
                                          placeholder="Add comment..."
                                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 resize-y pr-6"
                                          rows={1}
                                          style={{ 
                                            minHeight: '2rem',
                                            maxWidth: '100%',
                                            scrollbarWidth: 'none',
                                            msOverflowStyle: 'none'
                                          }}
                                          onInput={(e) => {
                                            const target = e.target as HTMLTextAreaElement;
                                            target.style.height = 'auto';
                                            target.style.height = Math.max(32, target.scrollHeight) + 'px';
                                          }}
                                        />
                                      </div>
                                      <div className="absolute right-2 top-2 transition-opacity duration-200 z-10">
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
                                  ) : (
                                    <div className="min-w-0 max-w-full overflow-hidden">
                                      <textarea
                                        value={comments[`${packageType}:${item.productName}`] || ''}
                                        placeholder="Add comment..."
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded bg-gray-50 text-gray-600 resize-none cursor-not-allowed"
                                        rows={1}
                                        style={{ 
                                          minHeight: '2rem',
                                          maxWidth: '100%',
                                          scrollbarWidth: 'none',
                                          msOverflowStyle: 'none'
                                        }}
                                        disabled
                                        readOnly
                                      />
                                    </div>
                                  )}
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

              <div className="mb-2 py-1 px-2 text-right text-[11px]">
                <span className="font-normal mr-2">Package Total:</span>
                <span className="text-gray-900">₹{packageData.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          );
        })}

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

  const getCurrentMonth = () => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  };

  return (
    <div className="bg-white w-full">
      <div className="flex justify-end items-center mb-6 print:hidden max-w-5xl mx-auto">
        <div className="flex gap-4">
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
      </div>

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
            <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {isStaffMode ? 'Staff Catering Report' : `Program Report - ${programName}`}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {isStaffMode ? (
                  <div className="col-span-full">
                    <p className="text-gray-600">Month</p>
                    <p className="font-medium">{format(new Date(month + '-01'), 'MMMM yyyy')}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-gray-600">Customer Name</p>
                      <p className="font-medium">{customerName}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Start Date</p>
                      <p className="font-medium">{format(new Date(startDate!), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">End Date</p>
                      <p className="font-medium">{format(new Date(endDate!), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Participants</p>
                      <p className="font-medium">{totalParticipants}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            {renderPackageTables()}
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No data found {isStaffMode ? `for ${format(new Date(month + '-01'), 'MMMM yyyy')}` : `for program ${programName}`}
              {selectedPackage !== 'all' ? ` in ${selectedPackage} package` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramReport;
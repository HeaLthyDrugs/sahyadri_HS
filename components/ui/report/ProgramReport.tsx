"use client"

import React, { useState } from 'react';
import { format } from 'date-fns';
import { RiDownloadLine, RiPrinterLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';

interface PackageItem {
  productName: string;
  quantity: number;
  rate: number;
  total: number;
  dates?: { [date: string]: number };
}

interface PackageData {
  items: PackageItem[];
  packageTotal: number;
}

interface Packages {
  [key: string]: PackageData;
}

interface ProgramReportProps {
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

const ProgramReport: React.FC<ProgramReportProps> = ({
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
            id: item.productName, // Using productName as id since we don't have actual ids
            name: item.productName,
            rate: item.rate
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
            rate: item.rate
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

          // Filter out items with no consumption
          const sortedItems = [...packageData.items]
            .filter(item => Object.values(item.dates || {}).some(qty => qty > 0));

          if (sortedItems.length === 0) return null;

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
                                {format(new Date(date), 'dd/MM').split('/').map((part, i) => (
                                  <React.Fragment key={i}>
                                    {i > 0 && <br />}
                                    {part}
                                  </React.Fragment>
                                ))}
                              </th>
                            ))}
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[40px]">
                              Total
                            </th>
                            <th className="px-1.5 py-1 border-b border-r border-gray-200 text-center font-normal text-gray-900 w-[45px]">
                              Rate
                            </th>
                            <th className="px-1.5 py-1 border-b border-gray-200 text-center font-normal text-gray-900 w-[50px]">
                              Amount
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

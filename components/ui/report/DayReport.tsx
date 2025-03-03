import { format } from "date-fns";
import React, { useState } from "react";
import { RiDownloadLine, RiPrinterLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import LoadingSpinner from '../LoadingSpinner';

interface DayReportEntry {
  packageType: string;
  productName: string;
  quantity: number;
  rate: number;
  total: number;
}

interface DayReportData {
  date: string;
  entries: DayReportEntry[];
  grandTotal: number;
}

interface DayReportProps {
  data: DayReportData;
  selectedDay: string;
  selectedPackage?: string;
}

// Package type mapping and order
const PACKAGE_TYPE_DISPLAY = {
  'Normal': 'CATERING PACKAGE',
  'normal': 'CATERING PACKAGE',
  'catering': 'CATERING PACKAGE',
  'Extra': 'EXTRA CATERING',
  'extra': 'EXTRA CATERING',
  'Cold Drink': 'COLD DRINKS',
  'cold drink': 'COLD DRINKS',
  'cold': 'COLD DRINKS'
} as const;


const PACKAGE_TYPE_ORDER = ['Normal', 'Extra', 'Cold Drink'];

// Define product order for catering package
const CATERING_PRODUCT_ORDER = [
  'MT',
  'BF',
  'M-CRT',
  'LUNCH',
  'A-CRT',
  'HI TEA',
  'DINNER'
];

// Helper function to get product order index
const getProductOrderIndex = (productName: string, packageType: string): number => {
  if (normalizePackageType(packageType) === 'Normal') {
    const index = CATERING_PRODUCT_ORDER.indexOf(productName);
    return index === -1 ? CATERING_PRODUCT_ORDER.length : index;
  }
  return -1;
};

// Normalize package type to prevent duplicates
const normalizePackageType = (type: string): string => {
  const normalized = type.toLowerCase();
  if (normalized === 'extra' || normalized === 'Extra') return 'Extra';
  if (normalized === 'cold drink' || normalized === 'cold') return 'Cold Drink';
  if (normalized === 'normal' || normalized === 'catering') return 'Normal';
  return type;
};

const DayReport = ({ data, selectedDay, selectedPackage = 'all' }: DayReportProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);

  const handlePrint = async () => {
    try {
      setActionType('print');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Preparing document for print...');

      const formattedDate = format(new Date(selectedDay), 'yyyy-MM-dd');
      
      const packageTypeMap: { [key: string]: string } = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink',
        'catering': 'Normal',
        'all': 'all'
      };

      const mappedPackageType = packageTypeMap[selectedPackage.toLowerCase()] || selectedPackage;

      const response = await fetch('/api/reports/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          packageType: mappedPackageType,
          action: 'print',
          layoutOptions: {
            compactTables: true,
            optimizePageBreaks: true
          }
        })
      });

      console.log('API Request:', {
        date: formattedDate,
        packageType: mappedPackageType
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

      // Ensure we're using the correct date format (YYYY-MM-DD)
      const formattedDate = format(new Date(selectedDay), 'yyyy-MM-dd');

      const packageTypeMap: { [key: string]: string } = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink',
        'catering': 'Normal',
        'all': 'all'
      };

      const mappedPackageType = packageTypeMap[selectedPackage.toLowerCase()] || selectedPackage;

      const response = await fetch('/api/reports/day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: formattedDate,
          packageType: mappedPackageType,
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
      a.download = `day-report-${selectedDay}.pdf`;
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
    if (!data?.entries || data.entries.length === 0) {
      return null;
    }

    // Group entries by package type with normalization
    const packageGroups = data.entries.reduce((groups, entry) => {
      const normalizedType = normalizePackageType(entry.packageType);
      
      if (!groups[normalizedType]) {
        groups[normalizedType] = [];
      }
      groups[normalizedType].push(entry);
      return groups;
    }, {} as { [key: string]: DayReportEntry[] });

    // Filter package groups based on selected package
    const filteredPackageTypes = Object.keys(packageGroups).filter(type => {
      if (!selectedPackage || selectedPackage === 'all') return true;
      const normalizedSelected = normalizePackageType(selectedPackage);
      const normalizedType = normalizePackageType(type);
      return normalizedType === normalizedSelected;
    });

    if (filteredPackageTypes.length === 0) return null;

    // Sort package types according to defined order
    const sortedPackageTypes = filteredPackageTypes.sort((a, b) => {
      const orderA = PACKAGE_TYPE_ORDER.indexOf(normalizePackageType(a));
      const orderB = PACKAGE_TYPE_ORDER.indexOf(normalizePackageType(b));
      return orderA - orderB;
    });

    return (
      <div className="flex flex-col gap-6">
        {sortedPackageTypes.map((packageType, packageIndex) => {
          // Sort entries by product order for catering package, otherwise by name
          const sortedEntries = [...packageGroups[packageType]].sort((a, b) => {
            const orderA = getProductOrderIndex(a.productName, packageType);
            const orderB = getProductOrderIndex(b.productName, packageType);
            
            if (orderA !== -1 && orderB !== -1) {
              return orderA - orderB;
            }
            
            return a.productName.localeCompare(b.productName);
          });

          const packageTotal = sortedEntries.reduce((sum, entry) => sum + entry.total, 0);

          return (
            <div 
              key={`${packageType}-${packageIndex}`}
              className="w-full"
            >
              <div className="mb-2 p-3 bg-white">
                <div className="flex justify-center items-center bg-gray-50 p-6 border border-gray-200 rounded-t-lg">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {PACKAGE_TYPE_DISPLAY[packageType as keyof typeof PACKAGE_TYPE_DISPLAY] || packageType.toUpperCase()} 
                  </h3>
                </div>
              </div>

              <div className="relative overflow-x-auto shadow-sm rounded-lg">
                <div className="border border-gray-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 font-medium text-gray-700 text-left border-r border-b border-gray-200 w-[40%]">
                          Product Name
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-center border-r border-b border-gray-200 w-[20%]">
                          Total Quantity
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-right border-r border-b border-gray-200 w-[20%]">
                          Rate
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-right border-b border-gray-200 w-[20%]">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {sortedEntries.map((entry, entryIndex) => (
                        <tr 
                          key={`${entry.productName}-${entryIndex}`}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 text-gray-900 border-r border-gray-200">
                            {entry.productName}
                          </td>
                          <td className="px-4 py-3 text-gray-900 text-center border-r border-gray-200">
                            {entry.quantity}
                          </td>
                          <td className="px-4 py-3 text-gray-900 text-right border-r border-gray-200">
                            ₹{entry.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-gray-900 text-right">
                            ₹{entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-medium">
                        <td colSpan={3} className="px-4 py-3 text-gray-900 text-right border-r border-gray-200">
                          Package Total
                        </td>
                        <td className="px-4 py-3 text-gray-900 text-right">
                          ₹{packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}

        {/* Grand Total */}
        <div className="w-full mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex justify-end">
            <div className="text-right">
              <span className="font-semibold mr-4">Grand Total:</span>
              <span className="text-amber-900">
                ₹{data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasEntries = data.entries && data.entries.length > 0;

  return (
    <div className="bg-white w-full">
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden max-w-5xl mx-auto">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !hasEntries}
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
          disabled={isGeneratingPDF || !hasEntries}
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

        {hasEntries ? (
          <>
            {/* Report Header */}
            <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900">
                Day Report - {format(new Date(selectedDay), 'dd/MM/yyyy')}
              </h2>
            </div>
            {renderPackageTables()}
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No entries found for {format(new Date(selectedDay), 'dd/MM/yyyy')}
              {selectedPackage !== 'all' ? ` in ${selectedPackage} package` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayReport; 
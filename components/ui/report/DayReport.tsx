import { format } from "date-fns";
import React, { useState } from "react";
import { RiDownloadLine, RiPrinterLine } from "react-icons/ri";
import { toast } from "react-hot-toast";

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
  'normal': 'CATERING',
  'Normal': 'CATERING',
  'catering': 'CATERING',
  'extra': 'EXTRA CATERING',
  'Extra': 'EXTRA CATERING',
  'cold drink': 'COLD DRINKS',
  'Cold Drink': 'COLD DRINKS',
  'cold': 'COLD DRINKS'
} as const;

const PACKAGE_TYPE_ORDER = ['normal', 'Normal', 'extra', 'Extra', 'cold drink', 'Cold Drink'];

const DayReport = ({ data, selectedDay, selectedPackage = 'all' }: DayReportProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = async () => {
    try {
      toast.loading('Preparing document for print...');
      setIsGeneratingPDF(true);

      // Ensure we're using the correct date format (YYYY-MM-DD)
      const formattedDate = format(new Date(selectedDay), 'yyyy-MM-dd');
      console.log('Sending request with date:', formattedDate);

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
          action: 'print'
        }),
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

      toast.dismiss();
      toast.success('Document ready for printing');
    } catch (error) {
      console.error('Error preparing print:', error);
      toast.dismiss();
      toast.error('Failed to prepare document for printing');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating PDF...');
      setIsGeneratingPDF(true);

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

      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const renderPackageTables = () => {
    if (!data?.entries || data.entries.length === 0) {
      return null;
    }

    console.log('Rendering entries:', data.entries); // Debug log

    // Group entries by package type
    const packageGroups = data.entries.reduce((groups, entry) => {
      const normalizedType = entry.packageType.toLowerCase();
      const groupKey = normalizedType === 'extra' ? 'Extra' : 
                      normalizedType === 'cold drink' || normalizedType === 'cold' ? 'Cold Drink' :
                      normalizedType === 'normal' || normalizedType === 'catering' ? 'Normal' : 
                      entry.packageType;
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
      return groups;
    }, {} as { [key: string]: DayReportEntry[] });

    console.log('Package groups:', packageGroups); // Debug log

    // Filter package groups based on selected package
    const filteredPackageTypes = Object.keys(packageGroups).filter(type => {
      if (!selectedPackage || selectedPackage === 'all') return true;
      const normalizedSelected = selectedPackage.toLowerCase();
      const normalizedType = type.toLowerCase();
      return normalizedType === normalizedSelected || 
             (normalizedSelected === 'cold drink' && normalizedType === 'cold') ||
             (normalizedType === 'normal' && normalizedSelected === 'catering');
    });

    console.log('Filtered package types:', filteredPackageTypes); // Debug log

    if (filteredPackageTypes.length === 0) return null;

    // Sort package types according to defined order
    const sortedPackageTypes = filteredPackageTypes.sort((a, b) => {
      const orderA = PACKAGE_TYPE_ORDER.indexOf(a) !== -1 ? PACKAGE_TYPE_ORDER.indexOf(a) : 999;
      const orderB = PACKAGE_TYPE_ORDER.indexOf(b) !== -1 ? PACKAGE_TYPE_ORDER.indexOf(b) : 999;
      return orderA - orderB;
    });

    console.log('Sorted package types:', sortedPackageTypes); // Debug log

    return (
      <div className="flex flex-col gap-6">
        {sortedPackageTypes.map((packageType, packageIndex) => {
          const sortedEntries = [...packageGroups[packageType]].sort((a, b) => 
            a.productName.localeCompare(b.productName)
          );

          const packageTotal = sortedEntries.reduce((sum, entry) => sum + entry.total, 0);

          return (
            <div 
              key={`${packageType}-${packageIndex}`}
              className="w-full"
            >
              <div className="mb-2 p-3 bg-white border-b">
                <div className="flex justify-center items-center bg-gray-50 p-4">
                  <h3 className="text-base font-semibold text-gray-900">
                    {PACKAGE_TYPE_DISPLAY[packageType as keyof typeof PACKAGE_TYPE_DISPLAY] || packageType.toUpperCase()}
                  </h3>
                </div>
              </div>

              <div className="relative overflow-x-auto">
                <div className="border border-gray-900 w-full">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="p-2 font-normal text-gray-900 text-left border-r border-b border-gray-900 w-[40%]">
                          Product Name
                        </th>
                        <th className="p-2 font-normal text-gray-900 text-center border-r border-b border-gray-900 w-[20%]">
                          Total Quantity
                        </th>
                        <th className="p-2 font-normal text-gray-900 text-right border-r border-b border-gray-900 w-[20%]">
                          Rate
                        </th>
                        <th className="p-2 font-normal text-gray-900 text-right border-b border-gray-900 w-[20%]">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry, entryIndex) => (
                        <tr 
                          key={`${entry.productName}-${entryIndex}`}
                          className="border-b border-gray-900"
                        >
                          <td className="p-2 text-gray-900 border-r border-gray-900">
                            {entry.productName}
                          </td>
                          <td className="p-2 text-gray-900 text-center border-r border-gray-900">
                            {entry.quantity}
                          </td>
                          <td className="p-2 text-gray-900 text-right border-r border-gray-900">
                            ₹{entry.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-2 text-gray-900 text-right">
                            ₹{entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td colSpan={3} className="p-2 text-gray-900 text-right border-r border-gray-900 font-semibold">
                          Package Total
                        </td>
                        <td className="p-2 text-gray-900 text-right font-semibold">
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
        <div className="w-full mt-4 p-4 bg-gray-100 border border-gray-900">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-900">Grand Total</span>
            <span className="font-semibold text-gray-900">
              ₹{data.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
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
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiPrinterLine className="w-5 h-5 mr-2" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !hasEntries}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiDownloadLine className="w-5 h-5 mr-2" />
          Download PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white max-w-5xl mx-auto px-4">
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
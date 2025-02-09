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
  program: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
  entries: DayReportEntry[];
}

interface DayReportProps {
  data: DayReportData[];
  selectedDay: string;
  selectedPackage?: string;
}

// Add package type mapping and order
const PACKAGE_TYPE_DISPLAY = {
  'normal': 'Catering Package',
  'extra': 'Extra Catering Package',
  'cold drink': 'Cold Drinks Package',
  'Normal': 'Catering Package',
  'Extra': 'Extra Catering Package',
  'Cold Drink': 'Cold Drinks Package'
} as const;

const PACKAGE_TYPE_ORDER = ['normal', 'Normal', 'extra', 'Extra', 'cold drink', 'Cold Drink'];

const DayReport = ({ data, selectedDay, selectedPackage = 'all' }: DayReportProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = async () => {
    try {
      toast.loading('Preparing document for print...');
      setIsGeneratingPDF(true);

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'day',
          data,
          selectedDay,
          selectedPackage,
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

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportType: 'day',
          data,
          selectedDay,
          selectedPackage,
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

  const renderProgramTable = (programData: DayReportData) => {
    if (!programData.entries || programData.entries.length === 0) {
      return null;
    }

    // Group entries by package type
    const packageGroups = programData.entries.reduce((groups, entry) => {
      const type = (entry.packageType || '').toLowerCase();
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(entry);
      return groups;
    }, {} as { [key: string]: DayReportEntry[] });

    // Filter package groups based on selected package
    const filteredPackageTypes = Object.keys(packageGroups).filter(type => {
      if (!selectedPackage || selectedPackage === 'all') return true;
      const normalizedType = type.toLowerCase();
      const normalizedSelected = selectedPackage.toLowerCase();
      return normalizedType === normalizedSelected || 
             (normalizedSelected === 'cold drink' && normalizedType === 'cold') ||
             (normalizedType === 'normal' && normalizedSelected === 'catering');
    });

    if (filteredPackageTypes.length === 0) return null;

    // Sort package types according to defined order
    const sortedPackageTypes = filteredPackageTypes.sort((a, b) => {
      const indexA = PACKAGE_TYPE_ORDER.indexOf(a);
      const indexB = PACKAGE_TYPE_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return (
      <div className="mb-8">
        {sortedPackageTypes.map((packageType, packageIndex) => (
          <div key={packageType} className={packageIndex > 0 ? 'mt-4' : ''}>
            {/* Header showing the mapped package type name and date */}
            <div className="mb-2 p-3 bg-white border-b">
              <div className="flex justify-center items-center bg-gray-50 p-8">
                <h3 className="text-base font-semibold text-gray-900">
                  {PACKAGE_TYPE_DISPLAY[packageType.toLowerCase() as keyof typeof PACKAGE_TYPE_DISPLAY] || packageType.toUpperCase()} for {format(new Date(selectedDay), 'dd/MM/yyyy')}
                </h3>

              </div>
            </div>

            <div className="relative overflow-x-auto">
              <div className="border border-gray-900 w-full">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 font-normal text-gray-900 text-left border-r border-b border-gray-900 print:p-1">
                        Product Name
                      </th>
                      <th className="p-2 font-normal text-gray-900 text-center border-r border-b border-gray-900 print:p-1">
                        Total Quantity
                      </th>
                      <th className="p-2 font-normal text-gray-900 text-right border-r border-b border-gray-900 print:p-1">
                        Rate
                      </th>
                      <th className="p-2 font-normal text-gray-900 text-right border-b border-gray-900 print:p-1">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Combine quantities for same products */}
                    {Object.values(packageGroups[packageType].reduce((acc, entry) => {
                      const productName = entry.productName || 'Unknown Product';
                      if (!acc[productName]) {
                        acc[productName] = {
                          productName,
                          quantity: 0,
                          rate: entry.rate || 0,
                          total: 0
                        };
                      }
                      acc[productName].quantity += entry.quantity || 0;
                      acc[productName].total += entry.total || 0;
                      return acc;
                    }, {} as { [key: string]: { productName: string; quantity: number; rate: number; total: number } }))
                    .map((entry, index) => (
                      <tr key={index} className="border-b border-gray-900">
                        <td className="p-2 text-gray-900 border-r border-gray-900 print:p-1">
                          {entry.productName}
                        </td>
                        <td className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1">
                          {entry.quantity}
                        </td>
                        <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                          {entry.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-gray-900 text-right print:p-1 border-r border-gray-900">
                          {entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1 font-semibold">
                        Package Total
                      </td>
                      <td className="p-2 text-gray-900 text-right print:p-1 font-semibold border-r border-gray-900">
                        {packageGroups[packageType].reduce((sum, entry) => sum + (entry.total || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Filter programs that have entries for the selected package type
  const filteredData = data.filter(program => {
    if (!program.entries || program.entries.length === 0) return false;
    if (!selectedPackage || selectedPackage === 'all') return true;
    
    return program.entries.some(entry => {
      const normalizedType = (entry.packageType || '').toLowerCase();
      const normalizedSelected = selectedPackage.toLowerCase();
      return normalizedType === normalizedSelected || 
             (normalizedSelected === 'cold drink' && normalizedType === 'cold') ||
             (normalizedType === 'normal' && normalizedSelected === 'catering');
    });
  });

  return (
    <div className="bg-white w-full">
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden max-w-5xl mx-auto">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !filteredData.length}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiPrinterLine className="w-5 h-5 mr-2" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !filteredData.length}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiDownloadLine className="w-5 h-5 mr-2" />
          Download PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white max-w-5xl mx-auto px-4">
        <style type="text/css" media="print">

          {`
            @media print {
              .page-break-before {
                page-break-before: always;
              }
              /* Ensure packages within a program stay together */
              #report-content > div > div {
                page-break-inside: avoid;
              }
              /* Allow packages to flow continuously */
              #report-content > div > div > div {
                page-break-inside: auto;
              }
            }
          `}
        </style>
        {filteredData.map((programData, index) => (
          <div key={index} className={`${index > 0 ? 'mt-8 page-break-before' : ''}`}>
            {renderProgramTable(programData)}
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No entries found for {format(new Date(selectedDay), 'dd/MM/yyyy')}{selectedPackage !== 'all' ? ` in ${selectedPackage} package` : ''}.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayReport; 
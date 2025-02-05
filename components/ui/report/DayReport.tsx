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
    // Group entries by package type
    const packageGroups = programData.entries.reduce((groups, entry) => {
      const type = entry.packageType.toLowerCase();
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(entry);
      return groups;
    }, {} as { [key: string]: DayReportEntry[] });

    // Filter package groups based on selected package
    const filteredPackageTypes = Object.keys(packageGroups).filter(type => {
      if (selectedPackage === 'all') return true;
      return type.toLowerCase() === selectedPackage.toLowerCase();
    });

    if (filteredPackageTypes.length === 0) return null;

    return (
      <div className="mb-8 page-break-before">
        {filteredPackageTypes.map((packageType) => (
          <div key={packageType} className="mb-6">
            {/* Simple header showing just the package type and date */}
            <div className="mb-4 p-4 bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-900">
                  {packageType.toUpperCase()} PACKAGE CONSUMPTION
                </h3>
                <span className="text-sm text-gray-600">
                  {format(new Date(selectedDay), 'dd/MM/yyyy')}
                </span>
              </div>
            </div>

            <div className="relative overflow-x-auto">
              <div className="border border-gray-900">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
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
                      if (!acc[entry.productName]) {
                        acc[entry.productName] = {
                          productName: entry.productName,
                          quantity: 0,
                          rate: entry.rate,
                          total: 0
                        };
                      }
                      acc[entry.productName].quantity += entry.quantity;
                      acc[entry.productName].total += entry.total;
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
                        <td className="p-2 text-gray-900 text-right print:p-1">
                          {entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50">
                      <td colSpan={3} className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1 font-semibold">
                        Package Total
                      </td>
                      <td className="p-2 text-gray-900 text-right print:p-1 font-semibold">
                        {packageGroups[packageType].reduce((sum, entry) => sum + entry.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
    if (selectedPackage === 'all') return true;
    return program.entries.some(entry => 
      entry.packageType.toLowerCase() === selectedPackage.toLowerCase()
    );
  });

  return (
    <div>
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
        >
          <RiPrinterLine className="w-5 h-5 mr-2" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors"
        >
          <RiDownloadLine className="w-5 h-5 mr-2" />
          Download PDF
        </button>
      </div>

      {/* Report Content */}
      <div id="report-content" className="bg-white">
        {filteredData.map((programData, index) => (
          <div key={index} className={index > 0 ? 'mt-8' : ''}>
            {renderProgramTable(programData)}
          </div>
        ))}

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No entries found for the selected criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayReport; 
'use client';

import { format } from "date-fns";
import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

interface ProductEntry {
  productName: string;
  quantity: number;
  rate: number;
  total: number;
}

interface PackageData {
  packageName: string;
  items: ProductEntry[];
  packageTotal: number;
}

interface ProgramReportProps {
  programName: string;
  customerName: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  selectedPackage: string;
  packages: {
    [key: string]: PackageData;
  };
  grandTotal: number;
}

// Update package order and names to match Supabase types
const PACKAGE_ORDER = ['Normal', 'Extra', 'Cold Drink'];
const PACKAGE_NAMES = {
  'Normal': 'Catering Package',
  'Extra': 'Extra Catering Package',
  'Cold Drink': 'Cold Drink Package'
};

const ProgramReport = ({
  programName,
  customerName,
  startDate,
  endDate,
  totalParticipants,
  selectedPackage,
  packages,
  grandTotal
}: ProgramReportProps) => {
  const handlePrint = async () => {
    try {
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
          packages,
          grandTotal,
          action: 'view'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          window.URL.revokeObjectURL(url);
        };
      }
    } catch (error) {
      console.error('Error printing report:', error);
      alert('Failed to print report. Please try again.');
    }
  };

  const handleDownload = async () => {
    try {
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
          packages,
          grandTotal,
          action: 'download'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `program-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Failed to download report. Please try again.');
    }
  };

  const renderPackageTable = (packageType: string, data: PackageData) => {
    return (
      <div className="mb-8 print:mb-6 page-break-inside-avoid" key={packageType}>
        <h3 className="text-xl font-semibold text-gray-900 print:text-base print:mb-3">
        • {PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES] || packageType}
        </h3>
        <div className="w-full flex justify-center">
          <div className="w-full print:w-full">
            <table className="w-full text-sm print:text-[11pt] border-collapse bg-white table-fixed">
              <thead className="break-inside-avoid">
                <tr>
                  <th scope="col" className="w-[55%] p-2 print:p-2 font-medium text-gray-900 text-left border border-gray-300 break-words">
                    Product Name
                  </th>
                  <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words">
                    Quantity
                  </th>
                  <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words">
                    Rate
                  </th>
                  <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm print:text-[10pt]">
                {data.items.map((item, index) => (
                  <tr key={index} className="break-inside-avoid">
                    <td className="p-2 print:p-2 text-gray-900 border border-gray-300 break-words">
                      {item.productName}
                    </td>
                    <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                      {item.quantity}
                    </td>
                    <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                      {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                      {item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="font-medium break-inside-avoid">
                  <td colSpan={3} className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                    TOTAL
                  </td>
                  <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                    {data.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const getFilteredPackages = () => {
    const allPackages = Object.entries(packages);
    
    // If a specific package is selected
    if (selectedPackage && selectedPackage !== 'all') {
      // Map package IDs to their types
      const packageTypeMap: { [key: string]: string } = {
        '3e46279d-c2ff-4bb6-ab0d-935e32ed7820': 'Normal',  // Catering Package
        '620e67e9-8d50-4505-930a-f571629147a2': 'Extra',   // Extra Package
        '752a6bcb-d6d6-43ba-ab5b-84a787182b41': 'Cold Drink'  // Cold Drink Package
      };

      const packageType = packageTypeMap[selectedPackage];
      
      if (!packageType) {
        return [];
      }

      const packageData = allPackages.find(([type]) => type === packageType);
      return packageData ? [packageData] : [];
    }

    // For all packages, sort them in the specified order
    return PACKAGE_ORDER
      .map(packageType => allPackages.find(([type]) => type === packageType))
      .filter((pkg): pkg is [string, PackageData] => pkg !== undefined);
  };

  const filteredPackages = getFilteredPackages();

  if (filteredPackages.length === 0) {
    return (
      <div id="report-content" className="container mx-auto p-6 print:p-4 bg-white print:w-full print:max-w-none">
        {/* Report Header */}
        <div className="mb-8 print:mb-6 break-inside-avoid">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 print:text-xl print:mb-4">
              {customerName}, {programName}
            </h2>
            <div className="flex gap-2 print:hidden">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <div className="space-y-1 text-center">
            <p className="text-gray-600">Duration: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}</p>
            <p className="text-gray-600">Total Participants: {totalParticipants}</p>
          </div>
        </div>

        {/* No Data Message */}
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Data Available</h3>
          <p className="mt-1 text-sm text-gray-500">No billing data found for the selected package.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="report-content" className="container mx-auto p-6 print:p-4 bg-white print:w-full print:max-w-none">
      {/* Report Header */}
      <div className="mb-8 print:mb-6 break-inside-avoid">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 print:text-xl print:mb-4">
            {customerName}, {programName}
          </h2>
          <div className="flex gap-2 print:hidden">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
        <div className="space-y-1 text-center">
          <p className="text-gray-600">Duration: {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}</p>
          <p className="text-gray-600">Total Participants: {totalParticipants}</p>
        </div>
      </div>

      {/* Package Tables */}
      <div className="space-y-8 print:space-y-6">
        {filteredPackages.map(([type, data]) => renderPackageTable(type, data))}
      </div>

      {/* Grand Total */}
      {(!selectedPackage || selectedPackage === 'all') && (
        <div className="mt-8 print:mt-6 break-inside-avoid">
          <div className="w-full flex justify-center">
            <div className="w-full">
              <table className="w-full text-sm print:text-[11pt] border-collapse bg-white table-fixed">
                <tbody>
                  <tr className="font-medium">
                    <td className="w-[85%] p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                      GRAND TOTAL
                    </td>
                    <td className="w-[15%] p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words">
                      {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProgramReport; 
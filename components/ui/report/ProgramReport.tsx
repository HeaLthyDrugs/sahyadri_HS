'use client';

import { format } from "date-fns";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Download, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ProductEntry {
  date: string;
  quantities: { [productId: string]: number };
  comment?: string;
  id?: string;
}

interface PackageData {
  packageName: string;
  products: {
    id: string;
    name: string;
    rate: number;
  }[];
  entries: ProductEntry[];
  totals: { [productId: string]: number };
  rates: { [productId: string]: number };
  totalAmounts: { [productId: string]: number };
  grandTotal: number;
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

// Add print styles
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 15mm;
    }

    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    #report-content {
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .print-avoid-break {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }

    .print-allow-break {
      break-inside: auto !important;
      page-break-inside: auto !important;
    }

    .print-header {
      font-size: 14pt !important;
    }

    .print-subheader {
      font-size: 12pt !important;
    }

    .print-text {
      font-size: 10pt !important;
    }

    .print-small-text {
      font-size: 9pt !important;
    }

    table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin-bottom: 0 !important;
    }

    th, td {
      padding: 4pt !important;
      font-size: 9pt !important;
    }

    .catering-package-table th,
    .catering-package-table td {
      font-size: 8pt !important;
      padding: 3pt !important;
    }

    .package-header {
      margin-top: 12pt !important;
      margin-bottom: 8pt !important;
    }

    .grand-total {
      margin-top: 12pt !important;
      padding: 8pt !important;
    }

    .package-section {
      break-after: auto !important;
      page-break-after: auto !important;
    }
  }
`;

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
  const [editingComment, setEditingComment] = useState<{ entryKey: string; comment: string } | null>(null);
  const [packagesState, setPackagesState] = useState(packages);

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
          packages: packagesState,
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
          packages: packagesState,
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

  // Helper function to split products into chunks for table pagination
  const chunkProducts = (products: PackageData['products'], packageType: string) => {
    // For Normal package, don't split the table
    if (packageType.toLowerCase() === 'normal') {
      return [products];
    }
    // For Extra and Cold Drinks packages, split after every 5 products
    const chunks = [];
    for (let i = 0; i < products.length; i += 7) {
      chunks.push(products.slice(i, i + 7));
    }
    return chunks;
  };

  const handleCommentChange = (entryKey: string, packageType: string, newComment: string) => {
    setPackagesState(prevPackages => {
      const updatedPackages = { ...prevPackages };
      const packageData = updatedPackages[packageType];
      
      if (packageData) {
        packageData.entries = packageData.entries.map((entry, index) => {
          const currentEntryKey = entry.id || `${packageType}-${index}`;
          if (currentEntryKey === entryKey) {
            return { ...entry, comment: newComment || undefined };
          }
          return entry;
        });
      }
      
      return updatedPackages;
    });
    setEditingComment(null);
  };

  // Package table component
  const PackageTable = ({ packageType, packageData }: { 
    packageType: string, 
    packageData: PackageData 
  }) => {
    if (!packageData?.products || packageData.products.length === 0) return null;

    const isCateringPackage = packageType.toLowerCase() === 'normal';
    const tableClassName = isCateringPackage ? 'catering-package-table print-avoid-break' : 'print-allow-break';
    const productChunks = chunkProducts(packageData.products, packageType);

    return (
      <div className={`package-section ${isCateringPackage ? 'print-avoid-break' : ''}`}>
        <h3 className="package-header text-xl font-semibold text-gray-900 print-subheader underline mb-6">
          • {PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES] || packageType}
        </h3>
        <div className="w-full space-y-8">
          {productChunks.map((productChunk, chunkIndex) => {
            const columnWidth = `${(100 - 27) / productChunk.length}%`;
            
            return (
              <div key={chunkIndex} className="w-full">
                <div className="border border-gray-200 rounded-lg">
                  <table className={`w-full ${tableClassName}`} style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '12%' }} />
                      {productChunk.map((_, index) => (
                        <col key={index} style={{ width: columnWidth }} />
                      ))}
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead className="bg-gray-50 print-avoid-break">
                      <tr>
                        <th className="p-3 font-semibold text-gray-900 text-center border-r border-gray-200 print-small-text bg-gray-100">
                          Date
                        </th>
                        {productChunk.map((product) => (
                          <th 
                            key={product.id}
                            className="p-3 font-semibold text-gray-900 text-center border-r border-gray-200 print-small-text bg-gray-100"
                          >
                            {product.name}
                          </th>
                        ))}
                        <th className="p-3 font-semibold text-gray-900 text-left border-r border-gray-200 print-small-text bg-gray-100">
                          Comment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {packageData.entries.map((entry, index) => {
                        const entryKey = entry.id || `${packageType}-${index}`;
                        return (
                          <tr key={entryKey} className="hover:bg-gray-50 relative group">
                            <td className="p-3 text-gray-900 text-center border-r border-gray-200 font-medium print-small-text whitespace-nowrap bg-gray-50">
                              {format(new Date(entry.date), 'dd/MM/yyyy')}
                            </td>
                            {productChunk.map((product) => (
                              <td key={product.id} className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text">
                                {entry.quantities[product.id] || 0}
                              </td>
                            ))}
                            <td className="p-3 text-gray-600 text-left border-l border-gray-200 print-small-text whitespace-nowrap relative">
                              {editingComment?.entryKey === entryKey ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingComment.comment}
                                    onChange={(e) => setEditingComment({ entryKey, comment: e.target.value })}
                                    className="h-8 text-sm"
                                    placeholder="Add comment..."
                                  />
                                  <div className="flex items-center gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 hover:bg-green-50 text-green-600"
                                      onClick={() => handleCommentChange(entryKey, packageType, editingComment.comment)}
                                    >
                                      Save
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 px-2 hover:bg-red-50 text-red-600"
                                      onClick={() => setEditingComment(null)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <span>{entry.comment || ''}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 print:hidden"
                                    onClick={() => setEditingComment({ entryKey, comment: entry.comment || '' })}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-medium bg-gray-50 print-avoid-break border-t-2 border-gray-300">
                        <td className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-semibold bg-gray-100">
                          Total
                        </td>
                        {productChunk.map((product) => (
                          <td key={product.id} className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-medium">
                            {packageData.totals[product.id] || 0}
                          </td>
                        ))}
                        <td className="border-r border-gray-200"></td>
                      </tr>
                      <tr className="bg-gray-50 print-avoid-break">
                        <td className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-semibold bg-gray-100">
                          Rate
                        </td>
                        {productChunk.map((product) => (
                          <td key={product.id} className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-medium">
                            {packageData.rates[product.id] || 0}
                          </td>
                        ))}
                        <td className="border-r border-gray-200"></td>
                      </tr>
                      <tr className="font-medium bg-gray-50 print-avoid-break">
                        <td className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-semibold bg-gray-100">
                          Amount
                        </td>
                        {productChunk.map((product) => (
                          <td key={product.id} className="p-3 text-gray-900 text-center border-r border-gray-200 print-small-text font-medium">
                            {(packageData.totalAmounts[product.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        ))}
                        <td className="border-r border-gray-200"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const getFilteredPackages = () => {
    if (!selectedPackage || selectedPackage === 'all') return Object.entries(packagesState);
    
    const packageTypeMap: { [key: string]: string } = {
      '3e46279d-c2ff-4bb6-ab0d-935e32ed7820': 'Normal',
      '620e67e9-8d50-4505-930a-f571629147a2': 'Extra',
      '752a6bcb-d6d6-43ba-ab5b-84a787182b41': 'Cold Drink'
    };
    
    const packageType = packageTypeMap[selectedPackage];
    if (!packageType) return [];

    const filteredPackages = Object.entries(packagesState).filter(([type]) => type === packageType);
    return filteredPackages;
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="w-full mx-auto bg-white shadow-lg p-4 md:p-6 print:w-full print:max-w-none print:shadow-none print:p-0">
        <style>{printStyles}</style>
        {/* Program Header */}
        <div className="mb-6 print-avoid-break border-b pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 print-header">
              {customerName}, {programName}
            </h2>
            <div className="flex gap-3 print:hidden">
              <Button onClick={handlePrint} variant="outline" size="sm" className="hover:bg-gray-100">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm" className="hover:bg-gray-100">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between text-sm text-gray-600">
            <p>Duration: {format(new Date(startDate), 'dd/MM/yyyy')}  to  {format(new Date(endDate), 'dd/MM/yyyy')}</p>
            <p>Total Participants: {totalParticipants}</p>
          </div>
        </div>

        {/* Package Tables */}
        <div className="space-y-8">
          {getFilteredPackages()
            .sort(([typeA], [typeB]) => {
              const indexA = PACKAGE_ORDER.indexOf(typeA);
              const indexB = PACKAGE_ORDER.indexOf(typeB);
              return indexA - indexB;
            })
            .map(([type, data]) => (
              <div key={type} className="w-full">
                <PackageTable packageType={type} packageData={data} />
              </div>
            ))}
        </div>

        {/* Grand Total */}
        {(!selectedPackage || selectedPackage === 'all') && (
          <div className="mt-8 print-avoid-break">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg grand-total">
              <p className="text-xl font-bold text-amber-900 text-right print-subheader">
                Grand Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgramReport; 
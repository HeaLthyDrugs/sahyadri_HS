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
  items: {
    productName: string;
    quantity: number;
    rate: number;
    total: number;
  }[];
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
  const chunkProducts = (products: PackageData['items'], packageType: string) => {
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
        packageData.items = packageData.items.map((item, index) => {
          const currentEntryKey = item.id || `${packageType}-${index}`;
          if (currentEntryKey === entryKey) {
            return { ...item, comment: newComment || undefined };
          }
          return item;
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
    if (!packageData?.items || packageData.items.length === 0) return null;

    const isCateringPackage = packageType.toLowerCase() === 'normal';
    const tableClassName = isCateringPackage ? 'catering-package-table print-avoid-break' : 'print-allow-break';
    const productChunks = chunkProducts(packageData.items, packageType);

    return (
      <div className={`package-section ${isCateringPackage ? 'print-avoid-break' : ''}`}>
        <div className="mb-2 p-3 bg-white border-b">
          <div className="flex justify-center items-center bg-gray-50 p-8">
            <h3 className="text-base font-semibold text-gray-900">
              {PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES] || packageType}
            </h3>
          </div>
        </div>

        <div className="w-full space-y-8">
          {productChunks.map((productChunk, chunkIndex) => {
            const columnWidth = `${(100 - 27) / productChunk.length}%`;
            
            return (
              <div key={chunkIndex} className="w-full">
                <div className="border border-gray-900">
                  <table className={`w-full ${tableClassName}`} style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: '12%' }} />
                      {productChunk.map((item) => (
                        <col key={item.id} style={{ width: columnWidth }} />
                      ))}
                      <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead className="bg-gray-100 print-avoid-break">
                      <tr>
                        <th className="p-2 font-normal text-gray-900 text-center border-r border-b border-gray-900 print:p-1">
                          Date
                        </th>
                        {productChunk.map((item) => (
                          <th 
                            key={item.id}
                            className="p-2 font-normal text-gray-900 text-center border-r border-b border-gray-900 print:p-1"
                          >
                            {item.productName}
                          </th>
                        ))}
                        <th className="p-2 font-normal text-gray-900 text-left border-b border-gray-900 print:p-1">
                          Comment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900">
                      {productChunk.map((item, index) => {
                        const entryKey = item.id || `${packageType}-${index}`;
                        return (
                          <tr key={entryKey} className="hover:bg-gray-50 relative group">
                            <td className="p-2 text-gray-900 text-center border-r border-gray-900 font-medium print:p-1 whitespace-nowrap bg-gray-50">
                              {format(new Date(item.date), 'dd/MM/yyyy')}
                            </td>
                            {productChunk.map((item) => (
                              <td key={item.id} className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1">
                                {item.quantity}
                              </td>
                            ))}
                            <td className="p-2 text-gray-600 text-left border-r border-gray-900 print:p-1 whitespace-nowrap relative">
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
                                  <span>{item.comment || ''}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 print:hidden"
                                    onClick={() => setEditingComment({ entryKey, comment: item.comment || '' })}
                                  >
                                    <MessageSquarePlus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-medium bg-gray-50 print-avoid-break border-t-2 border-gray-900">
                        <td className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-semibold bg-gray-100">
                          Total
                        </td>
                        {productChunk.map((item) => (
                          <td key={item.id} className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-medium">
                            {item.quantity}
                          </td>
                        ))}
                        <td className="border-r border-gray-900"></td>
                      </tr>
                      <tr className="bg-gray-50 print-avoid-break">
                        <td className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-semibold bg-gray-100">
                          Rate
                        </td>
                        {productChunk.map((item) => (
                          <td key={item.id} className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-medium">
                            {item.rate}
                          </td>
                        ))}
                        <td className="border-r border-gray-900"></td>
                      </tr>
                      <tr className="font-medium bg-gray-50 print-avoid-break">
                        <td className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-semibold bg-gray-100">
                          Amount
                        </td>
                        {productChunk.map((item) => (
                          <td key={item.id} className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1 font-medium">
                            {item.total}
                          </td>
                        ))}
                        <td className="border-r border-gray-900"></td>
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
    if (!selectedPackage || selectedPackage === 'all') return Object.keys(packagesState);
    return [selectedPackage];
  };

  const styles = `
    <style>
      body { 
        font-family: Arial, sans-serif; 
        margin: 0;
        padding: 0;
        font-size: 11px;
      }
      .report-header {
        text-align: center;
        margin: 0 0 12px 0;
        padding: 12px;
        background-color: #f8f9fa;
        border-bottom: 1px solid #dee2e6;
      }
      .report-header h2 {
        margin: 0;
        color: #1a1a1a;
        font-size: 16px;
      }
      .report-header p {
        margin: 6px 0 0;
        color: #4a5568;
        font-size: 12px;
      }
      .report-content {
        max-width: 5xl;
        margin: 0 auto;
        padding: 0 16px;
      }
      table { 
        width: 100%;
        border-collapse: collapse; 
        margin-bottom: 16px;
        border: 1px solid #dee2e6;
        font-size: 11px;
      }
      th, td { 
        border: 1px solid #dee2e6; 
        padding: 6px 8px;
        font-size: 11px;
      }
      th { 
        background-color: #f8f9fa;
        font-weight: normal;
        color: #1a1a1a;
      }
      .package-section { 
        margin-bottom: 24px;
        max-width: 5xl;
        margin-left: auto;
        margin-right: auto;
      }
      .package-header { 
        background-color: #f8f9fa;
        padding: 8px;
        margin: 12px 0 8px;
        text-align: center;
        border: 1px solid #dee2e6;
      }
      .package-header h4 {
        margin: 0;
        color: #1a1a1a;
        font-size: 13px;
      }
      .total-row { 
        background-color: #f8f9fa;
        font-weight: 600;
      }
      .rate-row {
        background-color: #f8f9fa;
      }
      .amount-row {
        font-weight: bold;
        background-color: #f8f9fa;
      }
      .grand-total {
        margin-top: 20px;
        padding: 10px;
        text-align: right;
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        max-width: 5xl;
        margin-left: auto;
        margin-right: auto;
      }
      .grand-total strong {
        font-size: 13px;
        color: #1a1a1a;
      }
      @page { 
        margin: 15mm;
        size: A4;
      }
      @media print {
        .page-break-before {
          page-break-before: always;
        }
        .no-break {
          page-break-inside: avoid;
        }
        .report-header {
          position: relative;
          top: 0;
        }
        .report-content {
          max-width: none;
          padding: 0;
        }
        .package-section {
          max-width: none;
        }
        .grand-total {
          max-width: none;
        }
      }
    </style>
  `;

  // Helper function to format currency
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  return (
    <div className="w-full bg-white">
      <div className="max-w-5xl mx-auto bg-white p-4 md:p-6 print:w-full print:max-w-none print:shadow-none print:p-0">
        <style>{printStyles}</style>

        <div className="flex justify-end gap-4 mb-4 print:hidden">
            <Button onClick={handlePrint} variant="secondary" size="sm" className="hover:bg-gray-200">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownload} variant="secondary" size="sm" className="hover:bg-gray-200">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        {/* Program Header */}
              <div className="flex justify-between items-center p-8 text-sm text-gray-600 bg-gray-50">
                <h3 className="text-base font-semibold text-gray-900">
                  {customerName}, {programName}
                </h3>
                <p>Duration : <strong>{format(new Date(startDate), 'dd/MM/yyyy')}</strong> - <strong>{format(new Date(endDate), 'dd/MM/yyyy')}</strong></p>
                <p>No. of People : <strong>{totalParticipants}</strong></p>
              </div>
        </div>

        {/* Package Tables */}
        <div className="space-y-8">
          {getFilteredPackages().map(packageType => (
            <div key={packageType} className="w-full">
              <PackageTable packageType={packageType} packageData={packagesState[packageType]} />
            </div>
          ))}
        </div>

        {/* Grand Total */}
        {(!selectedPackage || selectedPackage === 'all') && (
          <div className="mt-8 print-avoid-break">
            <div className="p-4 bg-gray-50 border border-gray-900 rounded-lg grand-total">
              <p className="text-xl font-bold text-gray-900 text-right print-subheader">
                Grand Total: {formatCurrency(grandTotal)}
              </p>
            </div>
          </div>
        )}
      </div>
  );
}

export default ProgramReport; 
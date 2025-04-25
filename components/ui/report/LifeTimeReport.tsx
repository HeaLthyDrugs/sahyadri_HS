'use client';

import React, { useState } from 'react';
import { format, parse } from 'date-fns';
import { RiDownloadLine, RiPrinterLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';

interface ProductConsumption {
  id: string;
  name: string;
  monthlyQuantities: { [month: string]: number };
  total: number;
}

interface PackageData {
  id: string;
  name: string;
  type: string;
  products: ProductConsumption[];
}

interface LifeTimeReportProps {
  startMonth: string;
  endMonth: string;
  packageData: PackageData;
  months: string[];
}

// Define product order for catering package
const CATERING_PRODUCT_ORDER = [
  'Morning Tea',
  'Breakfast',
  'Morning CRT',
  'LUNCH',
  'Afternoon CRT',
  'Hi-TEA',
  'DINNER'
];

// Helper function to normalize product names for comparison
const normalizeProductName = (name: string): string => {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Helper function to get product order index
const getProductOrderIndex = (productName: string, packageType: string): number => {
  // Check for both 'catering' and 'normal' package types
  if (packageType.toLowerCase() === 'catering' || packageType.toLowerCase() === 'normal' || packageType.toLowerCase().includes('catering package')) {
    // Try exact match first
    const directIndex = CATERING_PRODUCT_ORDER.findIndex(name => 
      name.toUpperCase() === productName.trim().toUpperCase()
    );
    if (directIndex !== -1) return directIndex;
    
    // Try normalized match
    const normalizedName = normalizeProductName(productName);
    for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
      const orderName = normalizeProductName(CATERING_PRODUCT_ORDER[i]);
      
      // Exact normalized match
      if (normalizedName === orderName) return i;
      
      // Contains match (for partial matches)
      if (normalizedName.includes(orderName) || orderName.includes(normalizedName)) {
        return i;
      }
    }
    
    return CATERING_PRODUCT_ORDER.length;
  }
  return -1;
};

const MONTHS_PER_TABLE = 6;

export default function LifeTimeReport({
  startMonth,
  endMonth,
  packageData,
  months
}: LifeTimeReportProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);

  // Filter out months with no consumption
  const monthsWithConsumption = months.filter(month => 
    packageData.products.some(product => 
      (product.monthlyQuantities[month] || 0) > 0
    )
  ).sort();

  // Split months into chunks for table pagination
  const monthChunks = [];
  for (let i = 0; i < monthsWithConsumption.length; i += MONTHS_PER_TABLE) {
    monthChunks.push(monthsWithConsumption.slice(i, i + MONTHS_PER_TABLE));
  }

  const handlePrint = async () => {
    try {
      setActionType('print');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Preparing document for print...');

      const response = await fetch('/api/reports/lifetime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startMonth,
          endMonth,
          packageId: packageData.id,
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

  const handleDownload = async () => {
    try {
      setActionType('download');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Generating PDF...');

      const response = await fetch('/api/reports/lifetime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startMonth,
          endMonth,
          packageId: packageData.id,
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
      a.download = `lifetime-report-${startMonth}-to-${endMonth}.pdf`;
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

  const hasData = packageData.products.some(product => product.total > 0);

  return (
    <div className="bg-white w-full">
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-6 print:hidden max-w-5xl mx-auto">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !hasData}
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
          onClick={handleDownload}
          disabled={isGeneratingPDF || !hasData}
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
        {/* Loading Overlay */}
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

        {/* Report Header */}
        <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-900">
            {packageData.name} Consumption Report
            <span className="text-sm text-gray-500 ml-2">
              ({format(parse(startMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')} - {format(parse(endMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')})
            </span>
          </h2>
        </div>

        {/* Report Tables */}
        {hasData ? (
          <div className="space-y-6">
            {monthChunks.map((chunk, chunkIndex) => (
              <div key={chunkIndex} className="relative overflow-x-auto mb-2">
                <div className="border border-gray-200">
                  <table className="w-full text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 border-b border-r border-gray-200 text-left font-medium text-gray-900 w-[20%]">
                          Product Name
                        </th>
                        {chunk.map(month => (
                          <th key={month} className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium text-gray-900">
                            {format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy')}
                          </th>
                        ))}
                        <th className="px-4 py-3 border-b border-gray-200 text-center font-medium text-gray-900">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {packageData.products
                        .filter(product => product.total > 0)
                        .sort((a, b) => {
                          const orderA = getProductOrderIndex(a.name, packageData.type);
                          const orderB = getProductOrderIndex(b.name, packageData.type);
                          
                          // If both products are in the catering order list
                          if (orderA !== -1 && orderB !== -1) {
                            return orderA - orderB;
                          }
                          // If only one product is in the list, prioritize it
                          if (orderA !== -1) return -1;
                          if (orderB !== -1) return 1;
                          // For products not in the list, maintain original order
                          return 0;
                        })
                        .map(product => (
                          <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3 border-r border-gray-200 text-gray-900">
                              {product.name}
                            </td>
                            {chunk.map(month => (
                              <td key={month} className="px-4 py-3 border-r border-gray-200 text-center text-gray-900">
                                {product.monthlyQuantities[month] || 0}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center text-gray-900">
                              {product.total}
                            </td>
                          </tr>
                        ))}
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-4 py-3 border-r border-gray-200 text-gray-900">
                          Monthly Total
                        </td>
                        {chunk.map(month => (
                          <td key={month} className="px-4 py-3 border-r border-gray-200 text-center text-gray-900">
                            {packageData.products.reduce((sum, product) => sum + (product.monthlyQuantities[month] || 0), 0)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center text-gray-900">
                          {packageData.products.reduce((sum, product) => sum + product.total, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No consumption data found for the selected period.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}


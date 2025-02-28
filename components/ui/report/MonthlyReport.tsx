'use client';

import { format } from "date-fns";
import React, { useState } from "react";
import { RiDownloadLine, RiPrinterLine } from "react-icons/ri";
import { toast } from "react-hot-toast";
import LoadingSpinner from '../LoadingSpinner';

interface CateringProduct {
  id: string;
  name: string;
  quantity: number;
}

interface CateringData {
  program: string;
  products: { [key: string]: number };
  total: number;
}

interface ReportData {
  date: string;
  program: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
}

interface MonthlyReportProps {
  data: ReportData[];
  month: string;
  type: 'all' | 'normal' | 'extra' | 'cold drink';
  cateringData?: CateringData[];
  products?: CateringProduct[];
}

// Package type mapping and order
const PACKAGE_TYPE_DISPLAY = {
  'normal': 'CATERING PACKAGE',
  'Normal': 'CATERING PACKAGE',
  'catering': 'CATERING PACKAGE',
  'extra': 'EXTRA CATERING PACKAGE',
  'Extra': 'EXTRA CATERING PACKAGE',
  'cold drink': 'COLD DRINKS PACKAGE',
  'Cold Drink': 'COLD DRINKS PACKAGE',
  'cold': 'COLD DRINKS PACKAGE',
  'all': 'ALL PACKAGES'
} as const;

const MonthlyReport = ({
  data,
  month,
  type,
  cateringData,
  products = []
}: MonthlyReportProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [actionType, setActionType] = useState<'print' | 'download' | null>(null);

  // Add debug logs
  console.log('MonthlyReport Props:', {
    type,
    dataLength: data.length,
    cateringDataLength: cateringData?.length,
    productsLength: products.length,
    month
  });

  console.log('Detailed Data:', {
    reportData: data,
    cateringData,
    products
  });

  const handlePrint = async () => {
    try {
      setActionType('print');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Preparing document for print...');

      const response = await fetch('/api/reports/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          type,
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

  const handleDownloadPDF = async () => {
    try {
      setActionType('download');
      setIsGeneratingPDF(true);
      const toastId = toast.loading('Generating PDF...');

      const response = await fetch('/api/reports/month', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          type,
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
      a.download = `monthly-report-${format(new Date(month), 'yyyy-MM')}.pdf`;
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

  const renderAllPackagesTable = () => (
    <div className="w-full print-avoid-break">
      <div className="mb-4 bg-white">
        <div className="flex justify-center items-center bg-gray-50 p-6 border border-gray-200 rounded-t-lg">
          <h3 className="text-lg font-semibold text-gray-900 print-subheader">
            ALL PACKAGES SUMMARY
          </h3>
        </div>
      </div>
      <div className="relative overflow-x-auto shadow-sm rounded-b-lg">
        <div className="border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[8%] print-text">
                  No.
                </th>
                <th className="p-4 font-medium text-gray-900 text-left border-b border-r border-gray-200 w-[32%] print-text">
                  Program Name
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[15%] print-text">
                  Catering
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[15%] print-text">
                  Extra Catering
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[15%] print-text">
                  Cold Drinks
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-gray-200 w-[15%] print-text">
                  Gr. Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.map((row, index) => (
                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-gray-900 text-center border-r border-gray-200 bg-gray-50 font-medium print-text">
                    {index + 1}
                  </td>
                  <td className="p-4 text-gray-900 border-r border-gray-200 print-text">
                    {row.program}
                  </td>
                  <td className="p-4 text-gray-900 text-right border-r border-gray-200 print-text">
                    ₹{row.cateringTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-gray-900 text-right border-r border-gray-200 print-text">
                    ₹{row.extraTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-gray-900 text-right border-r border-gray-200 print-text">
                    ₹{row.coldDrinkTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-gray-900 text-right print-text">
                    ₹{row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={5} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  TOTAL
                </td>
                <td className="p-4 text-gray-900 text-right font-semibold bg-gray-50 print-text">
                  ₹{data.reduce((sum, row) => sum + row.grandTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPackageTable = (title: string) => {
    if (!cateringData || !products.length) {
      console.log('No catering data or products:', { cateringData, products });
      return null;
    }

    // Add debug log to check data structure
    console.log('Package table data:', {
      title,
      cateringData,
      products,
      firstProgram: cateringData[0],
      firstProduct: products[0]
    });

    // Sort products by name
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

    // Filter out programs with no consumption
    const programsWithConsumption = cateringData.filter(program => 
      Object.values(program.products).some(quantity => quantity > 0)
    );

    // Add debug log for filtered programs
    console.log('Programs with consumption:', programsWithConsumption);

    if (programsWithConsumption.length === 0) {
      return (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">
            No consumption data found for {title.toLowerCase()} in {format(new Date(month), 'MMMM yyyy')}.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full print-avoid-break">
        <div className="mb-4 bg-white">
          <div className="flex justify-center items-center bg-gray-50 p-6 border border-gray-200 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              {title}
            </h3>
          </div>
        </div>
        <div className="relative overflow-x-auto shadow-sm rounded-lg mb-4">
          <div className="border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 border-b border-r border-gray-200 text-left font-medium text-gray-700 w-[20%]">
                    Program Name
                  </th>
                  {sortedProducts.map(product => (
                    <th key={product.id} className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium text-gray-700">
                      {product.name}
                    </th>
                  ))}
                  <th className="px-4 py-3 border-b border-gray-200 text-right font-medium text-gray-700 w-[10%]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {programsWithConsumption.map((program, index) => {
                  const rowTotal = sortedProducts.reduce((sum, product) => 
                    sum + (program.products[product.id] || 0), 0);
                  
                  return (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-900 font-medium">
                        {program.program}
                      </td>
                      {sortedProducts.map(product => (
                        <td key={product.id} className="px-4 py-3 border-r border-gray-200 text-center text-gray-700">
                          {program.products[product.id] || 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-gray-50 font-medium">
                  <td className="px-4 py-3 border-r border-gray-200 text-gray-900">
                    Total
                  </td>
                  {sortedProducts.map(product => {
                    const productTotal = programsWithConsumption.reduce(
                      (sum, program) => sum + (program.products[product.id] || 0), 
                      0
                    );
                    return (
                      <td key={product.id} className="px-4 py-3 border-r border-gray-200 text-center text-gray-900">
                        {productTotal}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right text-gray-900">
                    {programsWithConsumption.reduce(
                      (sum, program) => sum + sortedProducts.reduce(
                        (rowSum, product) => rowSum + (program.products[product.id] || 0), 
                        0
                      ), 
                      0
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPackageContent = () => {
    console.log('Rendering package content:', {
      type,
      hasData: type === 'all' ? data.length > 0 : cateringData && cateringData.length > 0,
      data,
      cateringData
    });

    switch (type.toLowerCase()) {
      case 'all':
        return renderAllPackagesTable();
      case 'normal':
      case 'extra':
      case 'cold drink':
        return renderPackageTable(
          type === 'normal' ? 'CATERING PACKAGE DETAILS' :
          type === 'extra' ? 'EXTRA CATERING PACKAGE DETAILS' :
          'COLD DRINKS PACKAGE DETAILS'
        );
      default:
        console.log('Unknown package type:', type);
        return null;
    }
  };

  const hasData = type === 'all' ? data.length > 0 : cateringData && cateringData.length > 0 && products.length > 0;

  // Add debug log for data presence
  console.log('Data presence check:', {
    type,
    hasData,
    dataLength: data.length,
    cateringDataLength: cateringData?.length,
    productsLength: products.length
  });

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

      .print-avoid-break {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .print-header {
        font-size: 14pt !important;
      }

      .print-text {
        font-size: 10pt !important;
      }

      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }

      th, td {
        padding: 8pt !important;
        font-size: 9pt !important;
      }

      .package-header {
        margin-top: 12pt !important;
        margin-bottom: 8pt !important;
        padding: 8pt !important;
      }
    }
  `;

  return (
    <div className="bg-white w-full">
      <style>{printStyles}</style>
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
          onClick={handleDownloadPDF}
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

        {hasData ? (
          <>
            {/* Report Header */}
            <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Monthly Report - {format(new Date(month), 'MMMM yyyy')}
              </h2>
              <p className="text-sm text-gray-600">
                {type === 'normal' ? 'CATERING PACKAGE' :
                 type === 'extra' ? 'EXTRA CATERING PACKAGE' :
                 type === 'cold drink' ? 'COLD DRINKS PACKAGE' :
                 'ALL PACKAGES'}
              </p>
            </div>
            {renderPackageContent()}
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No entries found for {format(new Date(month), 'MMMM yyyy')}
              {type !== 'all' ? ` in ${type === 'normal' ? 'Catering Package' :
                                   type === 'extra' ? 'Extra Catering Package' :
                                   'Cold Drinks Package'}` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
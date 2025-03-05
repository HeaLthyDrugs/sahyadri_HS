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
  program: string;
  start_date: string;
  end_date: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
}

interface PackageType {
  id: string;
  type: string;
  name: string;
}

interface MonthlyReportProps {
  data: ReportData[];
  month: string;
  type: 'all' | 'normal' | 'extra' | 'cold drink';
  cateringData?: CateringData[];
  products?: CateringProduct[];
  packageTypes?: PackageType[];
}

const MonthlyReport = ({
  data,
  month,
  type,
  cateringData,
  products = [],
  packageTypes = []
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
                <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[6%] print-text">
                  No.
                </th>
                <th className="p-4 font-medium text-gray-900 text-left border-b border-r border-gray-200 w-[25%] print-text">
                  Program Name
                </th>
                <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[12%] print-text">
                  From
                </th>
                <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[12%] print-text">
                  To
                </th>
                {packageTypes.map((pkg) => (
                  <th key={pkg.id} className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[11%] print-text">
                    {pkg.name}
                  </th>
                ))}
                <th className="p-4 font-medium text-gray-900 text-right border-b border-gray-200 w-[12%] print-text">
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
                  <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                    {format(new Date(row.start_date), 'dd MMM yyyy')}
                  </td>
                  <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                    {format(new Date(row.end_date), 'dd MMM yyyy')}
                  </td>
                  {packageTypes.map((pkg) => {
                    const total = pkg.type.toLowerCase() === 'normal' ? row.cateringTotal :
                                pkg.type.toLowerCase() === 'extra' ? row.extraTotal :
                                pkg.type.toLowerCase() === 'cold drink' ? row.coldDrinkTotal : 0;
                    return (
                      <td key={pkg.id} className="p-4 text-gray-900 text-right border-r border-gray-200 print-text">
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    );
                  })}
                  <td className="p-4 text-gray-900 text-right print-text">
                    ₹{row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  TOTAL
                </td>
                {packageTypes.map((pkg) => {
                  const total = data.reduce((sum, row) => {
                    const rowTotal = pkg.type.toLowerCase() === 'normal' ? row.cateringTotal :
                                   pkg.type.toLowerCase() === 'extra' ? row.extraTotal :
                                   pkg.type.toLowerCase() === 'cold drink' ? row.coldDrinkTotal : 0;
                    return sum + rowTotal;
                  }, 0);
                  return (
                    <td key={pkg.id} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                      ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  );
                })}
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

  const renderSpecificPackageTable = () => {
    if (!cateringData || !products.length) {
      console.log('No catering data or products:', { cateringData, products });
      return null;
    }

    // Sort products by name
    const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

    // Filter out programs with no consumption
    const programsWithConsumption = cateringData.filter(program => 
      Object.values(program.products).some(quantity => quantity > 0)
    );

    if (programsWithConsumption.length === 0) {
      return (
        <div className="text-center py-6 bg-white border border-gray-200">
          <p className="text-[9px] text-gray-900">
            No consumption data found for {type.toLowerCase()} in {format(new Date(month), 'MMMM yyyy')}.
          </p>
        </div>
      );
    }

    // Calculate chunks of products (7 per table)
    const PRODUCTS_PER_TABLE = 7;
    const productChunks = Array.from(
      { length: Math.ceil(sortedProducts.length / PRODUCTS_PER_TABLE) },
      (_, i) => sortedProducts.slice(i * PRODUCTS_PER_TABLE, (i + 1) * PRODUCTS_PER_TABLE)
    );

    return (
      <div className="w-full">
        {productChunks.map((chunk, chunkIndex) => {
          // Filter dates with consumption for this chunk
          const hasConsumption = programsWithConsumption.some(program =>
            chunk.some(product => program.products[product.id] > 0)
          );

          if (!hasConsumption) return null;

          return (
            <div key={chunkIndex} className={`print-avoid-break ${chunkIndex > 0 ? 'mt-8' : ''}`}>
              <div className="mb-4 bg-white">
                <div className="flex justify-center items-center bg-gray-50 p-6 border border-gray-200 rounded-t-lg">
                  <h3 className="text-lg font-semibold text-gray-900 print-subheader">
                    {type === 'normal' ? 'CATERING PACKAGE DETAILS' :
                     type === 'extra' ? 'EXTRA CATERING PACKAGE DETAILS' :
                     'COLD DRINKS PACKAGE DETAILS'}
                    {chunkIndex > 0 ? ` (Continued ${chunkIndex + 1})` : ''}
                  </h3>
                </div>
              </div>
              <div className="relative overflow-x-auto shadow-sm rounded-b-lg">
                <div className="border border-gray-200">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[6%] print-text">
                          No.
                        </th>
                        <th className="p-4 font-medium text-gray-900 text-left border-b border-r border-gray-200 w-[25%] print-text">
                          Program Name
                        </th>
                        <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[12%] print-text">
                          From
                        </th>
                        <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 w-[12%] print-text">
                          To
                        </th>
                        {chunk.map(product => (
                          <th key={product.id} className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 print-text">
                            {product.name}
                          </th>
                        ))}
                        <th className="p-4 font-medium text-gray-900 text-right border-b border-gray-200 w-[12%] print-text">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {programsWithConsumption.map((program, index) => {
                        const matchingReport = data.find(report => report.program === program.program);
                        if (!matchingReport) return null;

                        const rowTotal = chunk.reduce((sum, product) => 
                          sum + (program.products[product.id] || 0), 0
                        );

                        if (rowTotal === 0) return null;

                        return (
                          <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-gray-900 text-center border-r border-gray-200 bg-gray-50 font-medium print-text">
                              {index + 1}
                            </td>
                            <td className="p-4 text-gray-900 border-r border-gray-200 print-text">
                              {program.program}
                            </td>
                            <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                              {format(new Date(matchingReport.start_date), 'dd MMM yyyy')}
                            </td>
                            <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                              {format(new Date(matchingReport.end_date), 'dd MMM yyyy')}
                            </td>
                            {chunk.map(product => (
                              <td key={product.id} className="p-4 text-gray-900 text-right border-r border-gray-200 print-text">
                                {program.products[product.id] || '-'}
                              </td>
                            ))}
                            <td className="p-4 text-gray-900 text-right print-text">
                              {rowTotal}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={4} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                          TOTAL
                        </td>
                        {chunk.map(product => {
                          const productTotal = programsWithConsumption.reduce(
                            (sum, program) => sum + (program.products[product.id] || 0), 
                            0
                          );
                          return (
                            <td key={product.id} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                              {productTotal}
                            </td>
                          );
                        })}
                        <td className="p-4 text-gray-900 text-right font-semibold print-text">
                          {programsWithConsumption.reduce(
                            (sum, program) => sum + chunk.reduce(
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
        })}
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
        return renderSpecificPackageTable();
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
        margin: 10mm;
        size: A4;
      }
      body { 
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 8px;
        font-size: 9px;
      }
      .print-avoid-break {
        page-break-inside: avoid;
      }
      thead {
        display: table-header-group;
      }
      tbody {
        display: table-row-group;
      }
    }
  `;

  return (
    <div className="bg-white w-full">
      <style>{printStyles}</style>
      {/* Action Buttons */}
      <div className="flex justify-end gap-4 mb-4 print:hidden">
        <button
          onClick={handlePrint}
          disabled={isGeneratingPDF || !hasData}
          className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-900 text-sm rounded border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px] justify-center"
        >
          {isGeneratingPDF && actionType === 'print' ? (
            <LoadingSpinner size="sm" className="text-gray-600 mr-2" />
          ) : (
            <RiPrinterLine className="w-4 h-4 mr-2" />
          )}
          {isGeneratingPDF && actionType === 'print' ? 'Preparing...' : 'Print'}
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !hasData}
          className="inline-flex items-center px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-900 text-sm rounded border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] justify-center"
        >
          {isGeneratingPDF && actionType === 'download' ? (
            <LoadingSpinner size="sm" className="text-gray-600 mr-2" />
          ) : (
            <RiDownloadLine className="w-4 h-4 mr-2" />
          )}
          {isGeneratingPDF && actionType === 'download' ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white w-full px-2">
        {isGeneratingPDF && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-xl flex items-center space-x-3">
              <LoadingSpinner size="lg" className="text-gray-600" />
              <div className="text-sm text-gray-700">
                {actionType === 'print' ? 'Preparing document...' : 'Generating PDF...'}
              </div>
            </div>
          </div>
        )}

        {hasData ? (
          <>
            {/* Report Header */}
            <div className="text-center mb-4 p-3 bg-white border border-gray-200">
              <h2 className="text-[14px] font-semibold text-gray-900 mb-0">
                {format(new Date(month), 'MMMM yyyy')} {type === 'all' ? 'All Packages Report' : 
                  type === 'normal' ? 'Catering Package Report' :
                  type === 'extra' ? 'Extra Package Report' : 'Cold Drink Package Report'}
              </h2>
            </div>

            {renderPackageContent()}
          </>
        ) : (
          <div className="text-center py-6 bg-white border border-gray-200">
            <p className="text-[9px] text-gray-900">
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
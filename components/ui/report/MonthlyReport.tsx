'use client';

import { format, endOfMonth } from "date-fns";
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
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[12%] print-text">
                  Catering
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[12%] print-text">
                  Extra
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-r border-gray-200 w-[12%] print-text">
                  Cold Drink
                </th>
                <th className="p-4 font-medium text-gray-900 text-right border-b border-gray-200 w-[12%] print-text">
                  Gr. Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {data
                .sort((a, b) => {
                  // Staff row should always be last
                  if (a.program === 'Staff') return 1;
                  if (b.program === 'Staff') return -1;
                  return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                })
                .map((row, index) => {
                  // Calculate proper index excluding Staff rows for numbering
                  const sortedData = data.sort((a, b) => {
                    if (a.program === 'Staff') return 1;
                    if (b.program === 'Staff') return -1;
                    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
                  });
                  
                  const programsBeforeThisRow = sortedData
                    .slice(0, index)
                    .filter(r => r.program !== 'Staff').length;
                  
                  const displayIndex = row.program === 'Staff' ? '-' : (programsBeforeThisRow + 1);
                  
                  return (
                    <tr key={index} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${row.program === 'Staff' ? 'bg-blue-50' : ''}`}>
                      <td className="p-4 text-gray-900 text-center border-r border-gray-200 bg-gray-50 font-medium print-text">
                        {displayIndex}
                      </td>
                      <td className={`p-4 text-gray-900 border-r border-gray-200 print-text ${row.program === 'Staff' ? 'font-semibold' : ''}`}>
                        {row.program}
                      </td>
                      <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                        {format(new Date(row.start_date), 'dd MMM yyyy')}
                      </td>
                      <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                        {format(new Date(row.end_date), 'dd MMM yyyy')}
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
                  );
                })}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  TOTAL
                </td>
                <td className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  ₹{data.reduce((sum, row) => sum + row.cateringTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  ₹{data.reduce((sum, row) => sum + row.extraTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-4 text-gray-900 text-right border-r border-gray-200 font-semibold print-text">
                  ₹{data.reduce((sum, row) => sum + row.coldDrinkTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

    // Sort programs by start date and then by name, with Staff always last
    const sortedPrograms = [...programsWithConsumption].sort((a, b) => {
      // Staff should always be last
      if (a.program === 'Staff') return 1;
      if (b.program === 'Staff') return -1;
      
      const programA = data.find(r => r.program === a.program);
      const programB = data.find(r => r.program === b.program);
      
      if (programA && programB) {
        // Compare start dates first
        const dateComparison = new Date(programA.start_date).getTime() - new Date(programB.start_date).getTime();
        
        // If dates are equal, sort by program name
        if (dateComparison === 0) {
          return programA.program.localeCompare(programB.program);
        }
        
        return dateComparison;
      }
      
      return 0;
    });

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
          const hasConsumption = sortedPrograms.some(program =>
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
                        <th className="p-4 font-medium text-gray-900 text-left border-b border-r border-gray-200 w-[20%] print-text">
                          Program Name
                        </th>
                        {chunk.map(product => (
                          <th key={product.id} className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 print-text">
                            {product.name}
                          </th>
                        ))}
                        <th className="p-4 font-medium text-gray-900 text-center border-b border-gray-200 w-[10%] print-text">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {sortedPrograms.map((program, index) => {
                        const rowTotal = chunk.reduce((sum, product) => 
                          sum + (program.products[product.id] || 0), 0
                        );

                        if (rowTotal === 0) return null;

                        // Calculate proper index excluding Staff rows for numbering
                        const programsBeforeThisRow = sortedPrograms
                          .slice(0, index)
                          .filter(r => r.program !== 'Staff').length;
                        
                        const displayIndex = program.program === 'Staff' ? '-' : (programsBeforeThisRow + 1);

                        return (
                          <tr key={index} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${program.program === 'Staff' ? 'bg-blue-50' : ''}`}>
                            <td className="p-4 text-gray-900 text-center border-r border-gray-200 bg-gray-50 font-medium print-text">
                              {displayIndex}
                            </td>
                            <td className={`p-4 text-gray-900 border-r border-gray-200 print-text ${program.program === 'Staff' ? 'font-semibold' : ''}`}>
                              {program.program}
                            </td>
                            {chunk.map(product => (
                              <td key={product.id} className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                                {program.products[product.id] || 0}
                              </td>
                            ))}
                            <td className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                              {rowTotal}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="p-4 text-gray-900 text-center border-r border-gray-200 font-semibold print-text">
                          -
                        </td>
                        <td className="p-4 text-gray-900 text-left border-r border-gray-200 font-semibold print-text">
                          TOTAL
                        </td>
                        {chunk.map(product => (
                          <td key={product.id} className="p-4 text-gray-900 text-center border-r border-gray-200 font-semibold print-text">
                            {sortedPrograms.reduce((sum, program) => sum + (program.products[product.id] || 0), 0)}
                          </td>
                        ))}
                        <td className="p-4 text-gray-900 text-center font-semibold print-text">
                          {sortedPrograms.reduce(
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
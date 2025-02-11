'use client';

import { ReportData } from "@/components/admin/pages/billing/report";
import { format } from "date-fns";
import React, { useState } from "react";
import { RiDownloadLine, RiPrinterLine } from "react-icons/ri";
import { toast } from "react-hot-toast";

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

interface MonthlyReportProps {
  data: ReportData[];
  month: string;
  type: 'all' | 'normal' | 'extra' | 'cold drink';
  cateringData?: CateringData[];
  products?: CateringProduct[];
}

const MonthlyReport = ({
  data,
  month,
  type,
  cateringData,
  products = []
}: MonthlyReportProps) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = async () => {
    try {
      toast.loading('Preparing document for print...');
      setIsGeneratingPDF(true);

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

  const renderCateringTable = () => {
    if (!cateringData || !products.length) return null;

    const totals: { [key: string]: number } = {};
    products.forEach(product => {
      totals[product.id] = 0;
    });

    cateringData.forEach(row => {
      Object.entries(row.products).forEach(([productId, quantity]) => {
        totals[productId] = (totals[productId] || 0) + quantity;
      });
    });

    return (
      <div className="w-full print-avoid-break">
        <div className="mb-4 bg-white">
          <div className="flex justify-center items-center bg-gray-50 p-6 border border-gray-200 rounded-t-lg">
            <h3 className="text-lg font-semibold text-gray-900 print-subheader">
              CATERING PACKAGE DETAILS
            </h3>
          </div>
        </div>
        <div className="relative overflow-x-auto shadow-sm rounded-b-lg">
          <div className="border border-gray-200">
            <table className="w-full text-sm border-collapse">
              <colgroup>
                <col style={{ width: '12%' }} />
                {products.map(() => (
                  <col key={`col-${Math.random()}`} style={{ width: `${73 / products.length}%` }} />
                ))}
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 print-text">
                    Program Name
                  </th>
                  {products.map(product => (
                    <th key={product.id} className="p-4 font-medium text-gray-900 text-center border-b border-r border-gray-200 print-text">
                      {product.name}
                    </th>
                  ))}
                  <th className="p-4 font-medium text-gray-900 text-right border-b border-gray-200 print-text">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {cateringData.map((row, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-900 text-center border-r border-gray-200 bg-gray-50 font-medium print-text">
                      {row.program}
                    </td>
                    {products.map(product => (
                      <td key={product.id} className="p-4 text-gray-900 text-center border-r border-gray-200 print-text">
                        {row.products[product.id] || 0}
                      </td>
                    ))}
                    <td className="p-4 text-gray-900 text-right print-text">
                      {row.total}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="p-4 text-gray-900 text-center border-r border-gray-200 font-semibold print-text">
                    TOTAL
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="p-4 text-gray-900 text-center border-r border-gray-200 font-medium print-text">
                      {totals[product.id]}
                    </td>
                  ))}
                  <td className="p-4 text-gray-900 text-right font-semibold bg-gray-50 print-text">
                    {Object.values(totals).reduce((a, b) => a + b, 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderExtraPackageTable = () => {
    if (!cateringData || !products.length) return null;

    return (
      <div className="w-full">
        <div className="mb-2 p-3 bg-white border-b">
          <div className="flex justify-center items-center bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">
              EXTRA PACKAGE DETAILS
            </h3>
          </div>
        </div>
        {/* Similar table structure as renderCateringTable */}
      </div>
    );
  };

  const renderColdDrinkPackageTable = () => {
    if (!cateringData || !products.length) return null;

    return (
      <div className="w-full">
        <div className="mb-2 p-3 bg-white border-b">
          <div className="flex justify-center items-center bg-gray-50 p-4">
            <h3 className="text-base font-semibold text-gray-900">
              COLD DRINK PACKAGE DETAILS
            </h3>
          </div>
        </div>
        {/* Similar table structure as renderCateringTable */}
      </div>
    );
  };

  const hasData = type === 'all' ? data.length > 0 : cateringData && cateringData.length > 0;

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
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiPrinterLine className="w-5 h-5 mr-2" />
          Print
        </button>
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF || !hasData}
          className="inline-flex items-center px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RiDownloadLine className="w-5 h-5 mr-2" />
          Download PDF
        </button>
      </div>

      {/* Report Content */}
      <div className="bg-white max-w-5xl mx-auto px-4">
        {hasData ? (
          <>
            {/* Report Header */}
            <div className="text-center mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg print-header">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(new Date(month), 'MMMM yyyy')} {type === 'all' ? 'All Packages Report' : 
                  type === 'normal' ? 'Catering Report' :
                  type === 'extra' ? 'Extra Package Report' : 'Cold Drink Report'}
              </h2>
            </div>
            {type === 'all' && renderAllPackagesTable()}
            {type === 'normal' && renderCateringTable()}
            {type === 'extra' && renderExtraPackageTable()}
            {type === 'cold drink' && renderColdDrinkPackageTable()}
          </>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">
              No entries found for {format(new Date(month), 'MMMM yyyy')}
              {type !== 'all' ? ` in ${type} package` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyReport;
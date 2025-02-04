'use client';

import { ReportData } from "@/components/admin/pages/billing/report";
import { format } from "date-fns";
import React from "react";
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
  type: 'all' | 'normal';
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
  const totalAmount = data.reduce((sum, row) => sum + row.grandTotal, 0);

  const handlePrint = async () => {
    try {
      // Get the report content
      const reportElement = document.getElementById('report-content');
      if (!reportElement) return;

      // Create a clean copy of the HTML content for print
      const htmlContent = `
        <html>
          <head>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                font-size: 11px;
              }
              th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            ${reportElement.innerHTML}
          </body>
        </html>
      `;

      // Call the API to generate PDF for printing
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          action: 'print'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate printable PDF');
      }

      // Get the PDF blob and open in new window for printing
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);

      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          URL.revokeObjectURL(pdfUrl);
        };
      }
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to print. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.loading('Generating PDF...');

      // Get the report content
      const reportElement = document.getElementById('report-content');
      if (!reportElement) return;

      // Create a clean copy of the HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              @page {
                size: A4;
                margin: 20mm;
              }
              body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                font-size: 11px;
              }
              th {
                background-color: #f8f9fa;
                font-weight: bold;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
            </style>
          </head>
          <body>
            ${reportElement.innerHTML}
          </body>
        </html>
      `;

      // Call the API to generate PDF for download
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          htmlContent,
          action: 'download'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob and trigger download
      const pdfBlob = await response.blob();
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${format(new Date(month), 'yyyy-MM')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.dismiss();
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const renderAllPackagesTable = () => (
    <div className="w-full flex justify-center">
      <div className="w-[90%] max-w-5xl print:w-[100%] print:max-w-none">
        <table className="w-full text-[11px] print:text-[10pt] border-collapse bg-white">
          <thead>
            <tr className="print:bg-gray-50">
              <th scope="col" className="w-[8%] p-2 print:p-2 font-medium text-gray-900 text-center border border-gray-300 break-words print:border-gray-400">
                No.
              </th>
              <th scope="col" className="w-[32%] p-2 print:p-2 font-medium text-gray-900 text-left border border-gray-300 break-words print:border-gray-400">
                Program Name
              </th>
              <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                Catering
              </th>
              <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                Extra Catering
              </th>
              <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                Cold Drinks
              </th>
              <th scope="col" className="w-[15%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                Gr. Total
              </th>
            </tr>
          </thead>

          <tbody className="text-[10px] print:text-[9pt]">
            {data.map((row, index) => (
              <tr key={index} className="print:break-inside-avoid">
                <td className="p-2 print:p-2 text-gray-900 text-center border border-gray-300 break-words print:border-gray-400">
                  {index + 1}
                </td>
                <td className="p-2 print:p-2 text-gray-900 border border-gray-300 break-words print:border-gray-400">
                  {row.program}
                </td>
                <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  {row.cateringTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  {row.extraTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  {row.coldDrinkTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  {row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="font-medium print:break-inside-avoid print:border-t-2 print:border-gray-400">
              <td colSpan={5} className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                TOTAL
              </td>
              <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          </tbody>
        </table>
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
      <div className="w-full flex justify-center">
        <div className="w-[100%] max-w-5xl print:w-[100%] print:max-w-none">
          <table className="w-full text-[11px] print:text-[10pt] border-collapse bg-white">
            <thead>
              <tr className="print:bg-gray-50">
                <th scope="col" className="w-[10%] p-2 print:p-2 font-medium text-gray-900 text-center border border-gray-300 break-words print:border-gray-400">
                  No.
                </th>
                <th scope="col" className="w-[22%] p-2 print:p-2 font-medium text-gray-900 text-left border border-gray-300 break-words print:border-gray-400">
                  Program Name
                </th>
                {products.map(product => (
                  <th
                    key={product.id}
                    scope="col"
                    className="w-[20%] p-2 print:p-2 font-medium text-gray-900 text-center border border-gray-300 break-words print:border-gray-400"
                  >
                    {product.name}
                  </th>
                ))}
                <th scope="col" className="w-[20%] p-2 print:p-2 font-medium text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="text-[10px] print:text-[9pt]">
              {cateringData.map((row, index) => (
                <tr key={index} className="print:break-inside-avoid">
                  <td className="p-2 print:p-2 text-gray-900 text-center border border-gray-300 break-words print:border-gray-400">
                    {index + 1}
                  </td>
                  <td className="p-2 print:p-2 text-gray-900 border border-gray-300 break-words print:border-gray-400">
                    {row.program}
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                      {row.products[product.id] || 0}
                    </td>
                  ))}
                  <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                    {row.total}
                  </td>
                </tr>
              ))}
              <tr className="font-medium print:break-inside-avoid print:border-t-2 print:border-gray-400">
                <td colSpan={2} className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  TOTAL
                </td>
                {products.map(product => (
                  <td key={product.id} className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                    {totals[product.id]}
                  </td>
                ))}
                <td className="p-2 print:p-2 text-gray-900 text-right border border-gray-300 break-words print:border-gray-400">
                  {Object.values(totals).reduce((a, b) => a + b, 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-end space-x-4 mb-4 print:hidden p-10">
        <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center" onClick={handlePrint}>
          <RiPrinterLine className="w-5 h-5" />
          Print
        </button>

        <button className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded inline-flex items-center" onClick={handleDownloadPDF}>
          <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M13 8V2H7v6H2l8 8 8-8h-5zM0 18h20v2H0v-2z" /></svg>

          <span>Download</span>
        </button>
      </div>
      <div id="report-content" className="container mx-auto p-4 print:p-8 bg-white print:w-full print:max-w-none">
        {/* Report Header */}
        <div className="mb-6 print:mb-8 w-full text-center">
          <h2 className="text-lg font-bold mb-2 print:text-xl print:mb-4">
            {format(new Date(month), 'MMMM yyyy')} {type === 'all' ? 'All Packages Report' : 'Catering Report'}
          </h2>
        </div>

        {/* Report Content */}
        <div className="print:mt-4 w-full">
          {type === 'all' ? (
            data && data.length > 0 ? (
              renderAllPackagesTable()
            ) : (
              <p className="text-center text-gray-500">No data available for the selected month.</p>
            )
          ) : (
            cateringData && cateringData.length > 0 ? (
              renderCateringTable()
            ) : (
              <p className="text-center text-gray-500">No catering data available for the selected month.</p>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthlyReport;
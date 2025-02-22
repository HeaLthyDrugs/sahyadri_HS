'use client';

import React, { useState } from 'react';
import { format, parse } from 'date-fns';
import { RiDownloadLine, RiPrinterLine } from 'react-icons/ri';
import { toast } from 'react-hot-toast';

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

const MONTHS_PER_TABLE = 6;

export default function LifeTimeReport({
  startMonth,
  endMonth,
  packageData,
  months
}: LifeTimeReportProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
      toast.loading('Preparing document for print...');
      setIsGeneratingPDF(true);

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

  const handleDownload = async () => {
    try {
      toast.loading('Generating PDF...');
      setIsGeneratingPDF(true);

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Report Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {packageData.name} Consumption Report
          <span className="text-sm text-gray-500 ml-2">
            ({format(parse(startMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')} - {format(parse(endMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')})
          </span>
        </h2>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <RiPrinterLine className="w-5 h-5" />
            Print
          </button>
          <button
            onClick={handleDownload}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <RiDownloadLine className="w-5 h-5" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Report Tables */}
      <div className="space-y-6">
        {monthChunks.map((chunk, chunkIndex) => (
          <div key={chunkIndex} className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 border-b border-r border-gray-200 text-left font-medium text-gray-700 w-[20%]">
                    Product Name
                  </th>
                  {chunk.map(month => (
                    <th key={month} className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium text-gray-700">
                      {format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy')}
                    </th>
                  ))}
                  <th className="px-4 py-3 border-b border-gray-200 text-center font-medium text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {packageData.products
                  .filter(product => product.total > 0) // Only show products with consumption
                  .map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-r border-gray-200 font-medium text-gray-900">
                        {product.name}
                      </td>
                      {chunk.map(month => (
                        <td key={month} className="px-4 py-3 border-r border-gray-200 text-center text-gray-700">
                          {product.monthlyQuantities[month] || 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center font-medium text-gray-900">
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
        ))}
      </div>
    </div>
  );
}


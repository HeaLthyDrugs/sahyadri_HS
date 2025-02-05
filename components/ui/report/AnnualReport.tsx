import { format } from "date-fns";
import React from "react";

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

interface MonthlyData {
  month: string;
  packages: {
    [key: string]: PackageData;
  };
  total: number;
}

interface AnnualReportProps {
  startDate: string;
  endDate: string;
  selectedPackage: string;
  monthlyData: MonthlyData[];
}

const AnnualReport = ({
  startDate,
  endDate,
  selectedPackage,
  monthlyData
}: AnnualReportProps) => {
  const renderPackageTable = (packageType: string) => {
    const monthlyTotals = monthlyData.map(month => ({
      month: month.month,
      data: month.packages[packageType] || { packageTotal: 0, items: [] }
    }));

    const totalAmount = monthlyTotals.reduce((sum, month) => sum + month.data.packageTotal, 0);

    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 print:text-lg print:mb-2">
          {packageType.toUpperCase()} PACKAGE - SUMMARY
        </h3>
        <div className="relative overflow-x-auto">
          <div className="border border-gray-900">
            <table className="w-full text-sm print:text-[10pt] border-collapse">
              <thead>
                <tr>
                  <th className="p-2 font-normal text-gray-900 text-left border-r border-b border-gray-900 print:p-1">
                    Month
                  </th>
                  <th className="p-2 font-normal text-gray-900 text-right border-b border-gray-900 print:p-1">
                    Total Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {monthlyTotals.map(({ month, data }) => (
                  <tr key={month} className="border-b border-gray-900">
                    <td className="p-2 text-gray-900 border-r border-gray-900 print:p-1">
                      {format(new Date(month), 'MMMM yyyy')}
                    </td>
                    <td className="p-2 text-gray-900 text-right print:p-1">
                      {data.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1 font-semibold">
                    TOTAL
                  </td>
                  <td className="p-2 text-gray-900 text-right print:p-1 font-semibold">
                    {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const getAvailablePackages = () => {
    const packages = new Set<string>();
    monthlyData.forEach(month => {
      Object.keys(month.packages).forEach(pkg => packages.add(pkg));
    });
    return Array.from(packages);
  };

  const getFilteredPackages = () => {
    const packages = getAvailablePackages();
    if (!selectedPackage || selectedPackage === 'all') {
      return packages;
    }
    return packages.filter(pkg => pkg === selectedPackage);
  };

  const calculateGrandTotal = () => {
    return monthlyData.reduce((sum, month) => sum + month.total, 0);
  };

  return (
    <div id="report-content" className="p-8 print:p-4 bg-white">
      {/* Report Header */}
      <div className="mb-6 print:mb-4">
        <h2 className="text-2xl font-bold text-center mb-4 print:text-xl print:mb-2">
          Lifetime Billing Report
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-900 print:text-[10pt]">
          <div className="space-y-1">
            <p><span className="font-semibold">Period:</span> {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}</p>
            <p><span className="font-semibold">Report Type:</span> {selectedPackage ? selectedPackage.toUpperCase() : 'All Packages'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><span className="font-semibold">Report Generated:</span> {format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Package Tables */}
      <div className="space-y-6 print:space-y-4">
        {getFilteredPackages().map(packageType => renderPackageTable(packageType))}
      </div>

      {/* Grand Total */}
      {(!selectedPackage || selectedPackage === 'all') && (
        <div className="mt-6 print:mt-4">
          <div className="relative overflow-x-auto">
            <div className="border border-gray-900">
              <table className="w-full text-sm print:text-[10pt] border-collapse">
                <tbody>
                  <tr className="bg-amber-50">
                    <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1 font-bold">
                      LIFETIME GRAND TOTAL
                    </td>
                    <td className="p-2 text-gray-900 text-right w-48 print:p-1 font-bold">
                      {calculateGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

export default AnnualReport; 
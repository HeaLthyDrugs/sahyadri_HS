import { format } from "date-fns";

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
  year: number;
  selectedPackage: string;
  monthlyData: MonthlyData[];
}

const AnnualReport = ({ year, selectedPackage, monthlyData }: AnnualReportProps) => {
  const renderPackageTable = (packageType: string) => {
    const monthlyTotals = monthlyData.map(month => ({
      month: month.month,
      data: month.packages[packageType] || { packageTotal: 0, items: [] }
    }));

    const yearlyTotal = monthlyTotals.reduce((sum, month) => sum + month.data.packageTotal, 0);

    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          {packageType.toUpperCase()} PACKAGE - YEARLY SUMMARY
        </h3>
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Month
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthlyTotals.map(({ month, data }) => (
                <tr key={month} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(month), 'MMMM yyyy')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{data.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td className="px-4 py-3 text-sm text-gray-900">
                  Yearly Total
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ₹{yearlyTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

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
    <div id="report-content" className="p-8">
      {/* Report Header */}
      <div className="page-header mb-8">
        <h2 className="text-2xl font-bold text-center mb-2">Annual Billing Report</h2>
        <p className="text-center text-gray-600">
          Year {year}
        </p>
      </div>

      {/* Package Tables */}
      <div className="space-y-8">
        {getFilteredPackages().map(packageType => renderPackageTable(packageType))}
      </div>

      {/* Grand Total - Only show when viewing all packages */}
      {(!selectedPackage || selectedPackage === 'all') && (
        <div className="mt-8 text-right">
          <p className="text-xl font-bold text-gray-900">
            Annual Grand Total: ₹{calculateGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
};

export default AnnualReport; 
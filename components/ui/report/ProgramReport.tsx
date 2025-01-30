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

interface ProgramReportProps {
  programName: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  selectedPackage: string;
  packages: {
    [key: string]: PackageData;
  };
  grandTotal: number;
}

const ProgramReport = ({
  programName,
  startDate,
  endDate,
  totalParticipants,
  selectedPackage,
  packages,
  grandTotal
}: ProgramReportProps) => {
  const renderPackageTable = (packageType: string, data: PackageData) => {
    return (
      <div className="mb-8" key={packageType}>
        <h3 className="text-xl font-semibold mb-4 text-gray-900">
          {packageType.toUpperCase()} PACKAGE
        </h3>
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left">
                  Product Name
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Quantity
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Rate
                </th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.items.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {item.productName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-medium">
                <td colSpan={3} className="px-4 py-3 text-sm text-gray-900 text-right">
                  Package Total
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                  ₹{data.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const getFilteredPackages = () => {
    if (!selectedPackage || selectedPackage === 'all') {
      return Object.entries(packages);
    }
    return Object.entries(packages).filter(([type]) => type === selectedPackage);
  };

  return (
    <div id="report-content" className="p-8">
      {/* Report Header */}
      <div className="page-header mb-8">
        <h2 className="text-2xl font-bold text-center mb-2">Program Billing Report</h2>
        <div className="flex justify-between text-sm text-gray-600 mt-4">
          <div>
            <p><span className="font-medium">Program Name:</span> {programName}</p>
            <p><span className="font-medium">Duration:</span> {format(new Date(startDate), 'dd/MM/yyyy')} - {format(new Date(endDate), 'dd/MM/yyyy')}</p>
          </div>
          <div>
            <p><span className="font-medium">Total Participants:</span> {totalParticipants}</p>
          </div>
        </div>
      </div>

      {/* Package Tables */}
      <div className="space-y-8">
        {getFilteredPackages().map(([type, data]) => renderPackageTable(type, data))}
      </div>

      {/* Grand Total */}
      {(!selectedPackage || selectedPackage === 'all') && (
        <div className="mt-8 text-right">
          <p className="text-xl font-bold text-gray-900">
            Grand Total: ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgramReport; 
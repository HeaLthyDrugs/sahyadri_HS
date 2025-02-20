import { format } from "date-fns";
import React from "react";

interface BillingEntry {
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
  products: {
    id: string;
    name: string;
    rate: number;
  };
  packages: {
    id: string;
    name: string;
    type: string;
  };
}

interface AnnualReportProps {
  startMonth: string;
  endMonth: string;
  selectedPackage: string;
  data: BillingEntry[];
}

const AnnualReport = ({
  startMonth,
  endMonth,
  selectedPackage,
  data
}: AnnualReportProps) => {
  // Add console logging to check incoming data
  console.log('AnnualReport Props:', { startMonth, endMonth, selectedPackage });
  console.log('AnnualReport Data:', data);

  // Helper function to format currency
  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  // Group data by products and calculate totals
  const processData = () => {
    if (!data || data.length === 0) {
      console.log('No data to process');
      return { products: [], months: [] };
    }

    const productTotals = new Map<string, {
      productName: string;
      rate: number;
      quantities: { [month: string]: number };
      amounts: { [month: string]: number };
      totalQuantity: number;
      totalAmount: number;
    }>();

    // Sort data by date
    const sortedData = [...data].sort((a, b) => 
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    // Get all unique months in MMM-YY format
    const uniqueMonths = Array.from(new Set(
      sortedData.map(entry => format(new Date(entry.entry_date), 'MMM-yy'))
    )).sort((a, b) => {
      const [aMonth, aYear] = a.split('-');
      const [bMonth, bYear] = b.split('-');
      const dateA = new Date(`${aMonth} 20${aYear}`);
      const dateB = new Date(`${bMonth} 20${bYear}`);
      return dateA.getTime() - dateB.getTime();
    });

    console.log('Unique months:', uniqueMonths);

    // Process entries
    sortedData.forEach(entry => {
      const productId = entry.product_id;
      const productName = entry.products.name;
      const rate = entry.products.rate;
      const month = format(new Date(entry.entry_date), 'MMM-yy');
      const quantity = entry.quantity;
      const amount = quantity * rate;

      if (!productTotals.has(productId)) {
        productTotals.set(productId, {
          productName,
          rate,
          quantities: {},
          amounts: {},
          totalQuantity: 0,
          totalAmount: 0
        });
      }

      const productData = productTotals.get(productId)!;
      productData.quantities[month] = (productData.quantities[month] || 0) + quantity;
      productData.amounts[month] = (productData.amounts[month] || 0) + amount;
      productData.totalQuantity += quantity;
      productData.totalAmount += amount;
    });

    const result = {
      products: Array.from(productTotals.values()),
      months: uniqueMonths
    };

    console.log('Processed data:', result);
    return result;
  };

  const { products, months } = processData();

  // Calculate grand totals
  const grandTotals = months.reduce((acc, month) => {
    acc[month] = {
      quantity: products.reduce((sum, product) => sum + (product.quantities[month] || 0), 0),
      amount: products.reduce((sum, product) => sum + (product.amounts[month] || 0), 0)
    };
    return acc;
  }, {} as { [month: string]: { quantity: number; amount: number } });

  const overallTotal = products.reduce((sum, product) => sum + product.totalAmount, 0);

  // If no data, show a message
  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        No data available for the selected period
      </div>
    );
  }

  return (
    <div id="report-content" className="p-8 print:p-4 bg-white">
      {/* Report Header */}
      <div className="mb-6 print:mb-4">
        <h2 className="text-2xl font-bold text-center mb-4 print:text-xl print:mb-2">
          Monthly Billing Report
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-900 print:text-[10pt]">
          <div className="space-y-1">
            <p><span className="font-semibold">Period:</span> {format(new Date(startMonth), 'MMMM yyyy')} - {format(new Date(endMonth), 'MMMM yyyy')}</p>
            <p><span className="font-semibold">Package:</span> {data[0]?.packages.name || 'All Packages'}</p>
          </div>
          <div className="space-y-1 text-right">
            <p><span className="font-semibold">Report Generated:</span> {format(new Date(), 'dd/MM/yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="relative overflow-x-auto">
        <div className="border border-gray-900">
          <table className="w-full text-sm print:text-[10pt] border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 font-semibold text-gray-900 text-center border-r border-b border-gray-900 print:p-1">
                  Sr. No.
                </th>
                <th className="p-2 font-semibold text-gray-900 text-left border-r border-b border-gray-900 print:p-1">
                  Product
                </th>
                <th className="p-2 font-semibold text-gray-900 text-right border-r border-b border-gray-900 print:p-1">
                  Rate
                </th>
                {months.map(month => (
                  <th key={month} colSpan={2} className="p-2 font-semibold text-gray-900 text-center border-r border-b border-gray-900 print:p-1">
                    {month}
                  </th>
                ))}
                <th colSpan={2} className="p-2 font-semibold text-gray-900 text-center border-b border-gray-900 print:p-1">
                  Total
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th colSpan={3} className="border-r border-b border-gray-900"></th>
                {months.map(month => (
                  <React.Fragment key={month}>
                    <th className="p-2 font-semibold text-gray-900 text-right border-r border-b border-gray-900 print:p-1">
                      Qty
                    </th>
                    <th className="p-2 font-semibold text-gray-900 text-right border-r border-b border-gray-900 print:p-1">
                      Amount
                    </th>
                  </React.Fragment>
                ))}
                <th className="p-2 font-semibold text-gray-900 text-right border-r border-b border-gray-900 print:p-1">
                  Qty
                </th>
                <th className="p-2 font-semibold text-gray-900 text-right border-b border-gray-900 print:p-1">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <tr key={index} className="border-b border-gray-900">
                  <td className="p-2 text-gray-900 text-center border-r border-gray-900 print:p-1">
                    {index + 1}
                  </td>
                  <td className="p-2 text-gray-900 border-r border-gray-900 print:p-1">
                    {product.productName}
                  </td>
                  <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                    {formatCurrency(product.rate)}
                  </td>
                  {months.map(month => (
                    <React.Fragment key={month}>
                      <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                        {product.quantities[month] || 0}
                      </td>
                      <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                        {formatCurrency(product.amounts[month] || 0)}
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                    {product.totalQuantity}
                  </td>
                  <td className="p-2 text-gray-900 text-right print:p-1">
                    {formatCurrency(product.totalAmount)}
                  </td>
                </tr>
              ))}
              <tr className="bg-amber-50 font-bold">
                <td colSpan={3} className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                  GRAND TOTAL
                </td>
                {months.map(month => (
                  <React.Fragment key={month}>
                    <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                      {grandTotals[month].quantity}
                    </td>
                    <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                      {formatCurrency(grandTotals[month].amount)}
                    </td>
                  </React.Fragment>
                ))}
                <td className="p-2 text-gray-900 text-right border-r border-gray-900 print:p-1">
                  {Object.values(grandTotals).reduce((sum, total) => sum + total.quantity, 0)}
                </td>
                <td className="p-2 text-gray-900 text-right print:p-1">
                  {formatCurrency(overallTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnnualReport; 
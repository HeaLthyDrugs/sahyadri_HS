import { ReportData } from "@/components/admin/pages/billing/report";
import { format } from "date-fns";
import React from "react";

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

  const renderAllPackagesTable = () => (
    <div className="w-full flex justify-center">
      <div className="w-[90%] max-w-5xl print:w-[98%] print:max-w-none print:mx-auto print:transform print:scale-100 print:origin-center">
        <table className="w-full text-[11px] print:text-[9pt] border-collapse bg-white table-fixed">
          <thead>
            <tr>
              <th scope="col" className="w-[8%] p-1.5 print:p-1 font-medium text-gray-900 text-center border border-gray-300 break-words">
                No.
              </th>
              <th scope="col" className="w-[32%] p-1.5 print:p-1 font-medium text-gray-900 text-left border border-gray-300 break-words">
                Program Name
              </th>
              <th scope="col" className="w-[15%] p-1.5 print:p-1 font-medium text-gray-900 text-right border border-gray-300 break-words">
                Catering
              </th>
              <th scope="col" className="w-[15%] p-1.5 print:p-1 font-medium text-gray-900 text-right border border-gray-300 break-words">
                Extra Catering
              </th>
              <th scope="col" className="w-[15%] p-1.5 print:p-1 font-medium text-gray-900 text-right border border-gray-300 break-words">
                Cold Drinks
              </th>
              <th scope="col" className="w-[15%] p-1.5 print:p-1 font-medium text-gray-900 text-right border border-gray-300 break-words">
                Gr. Total
              </th>
            </tr>
          </thead>

          <tbody className="text-[10px] print:text-[7pt]">
            {data.map((row, index) => (
              <tr key={index}>
                <td className="p-1.5 print:p-1 text-gray-900 text-center border border-gray-300 break-words">
                  {index + 1}
                </td>
                <td className="p-1.5 print:p-1 text-gray-900 border border-gray-300 break-words">
                  {row.program}
                </td>
                <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                  {row.cateringTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                  {row.extraTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                  {row.coldDrinkTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                  {row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
            <tr className="font-medium">
              <td colSpan={5} className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                TOTAL
              </td>
              <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
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

    const totalProducts = products.length;
    const srNoWidth = 10;
    const programWidth = 22;
    const remainingWidth = 90; // 100 - srNoWidth - programWidth
    const productColumnWidth =20;


    return (
      <div className="w-full flex justify-center">
        <div className="w-[100%] max-w-5xl print:w-[100%] print:max-w-none print:mx-auto print:transform print:scale-200 print:origin-center">
          <table className="w-full text-[11px] print:text-[9pt] border-collapse bg-white table-fixed">
            <thead>
              <tr>
                <th scope="col" style={{ width: `${srNoWidth}%` }} className="p-1.5 print:p-1 font-medium text-gray-900 text-center border border-gray-300 break-words">
                  No.
                </th>

                <th scope="col" style={{ width: `${programWidth}%` }} className="p-1.5 print:p-1 font-medium text-gray-900 text-left border border-gray-300 break-words">
                  Program Name
                </th>
                {products.map(product => (
                  <th 
                    key={product.id} 
                    scope="col" 
                    style={{ width: `${productColumnWidth}%` }}
                    className="p-1.5 print:p-1 text-[10px] print:text-[7pt] text-gray-900 text-center border border-gray-300 break-words"
                  >
                    {product.name}
                  </th>
                ))}
                <th 
                  scope="col" 
                  style={{ width: `${productColumnWidth}%` }}
                  className="p-1.5 print:p-1 font-medium text-gray-900 text-right border border-gray-300 break-words"
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="text-[10px] print:text-[7pt]">
              {cateringData.map((row, index) => (
                <tr key={index}>
                  <td className="p-1.5 print:p-1 text-gray-900 text-center border border-gray-300 break-words">
                    {index + 1}
                  </td>
                  <td className="p-1.5 print:p-1 text-gray-900 border border-gray-300 break-words">
                    {row.program}
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                      {row.products[product.id] || 0}
                    </td>
                  ))}
                  <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                    {row.total}
                  </td>
                </tr>
              ))}
              <tr className="font-medium">
                <td colSpan={2} className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                  TOTAL
                </td>
                {products.map(product => (
                  <td key={product.id} className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
                    {totals[product.id]}
                  </td>
                ))}
                <td className="p-1.5 print:p-1 text-gray-900 text-right border border-gray-300 break-words">
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
    <div id="report-content" className="container mx-auto p-4 print:p-1 bg-white print:w-full print:max-w-none">
      {/* Report Header */}
      <div className="mb-4 print:mb-3 w-full text-center">
        <h2 className="text-sm font-bold mb-2 print:text-sm print:mb-2">
          {format(new Date(month), 'MMMM yyyy')} {type === 'all' ? 'All Packages Report' : 'Catering Report'}
        </h2>
      </div>


      {/* Report Content */}
      <div className="print:mt-0 w-full">
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
  );
};

export default MonthlyReport;
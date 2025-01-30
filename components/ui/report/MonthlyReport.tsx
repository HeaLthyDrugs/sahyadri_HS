import { ReportData } from "@/components/admin/pages/billing/report";
import { format } from "date-fns";
import { useState } from "react";
import { RiChat2Line, RiCloseLine } from "react-icons/ri";

interface CateringProduct {
  id: string;
  name: string;
  quantity: number;
}

interface CateringData {
  program: string;
  products: { [key: string]: number };
  total: number;
  comment?: string;
}

interface MonthlyReportProps {
  data: ReportData[];
  month: string;
  type: 'all' | 'normal';
  cateringData?: CateringData[];
  products?: CateringProduct[];
  onCommentChange?: (programName: string, comment: string) => void;
}

const MonthlyReport = ({ 
  data, 
  month, 
  type, 
  cateringData, 
  products = [],
  onCommentChange 
}: MonthlyReportProps) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const totalAmount = data.reduce((sum, row) => sum + row.grandTotal, 0);

  const handleCommentChange = (programName: string, comment: string) => {
    setComments(prev => ({ ...prev, [programName]: comment }));
    onCommentChange?.(programName, comment);
  };

  const renderAllPackagesTable = () => (
    <div className="relative">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
        >
          <RiChat2Line className="w-4 h-4" />
          {showComments ? 'Hide Comments' : 'Show Comments'}
        </button>
      </div>
      <div className={`grid ${showComments ? 'grid-cols-[1fr,300px]' : 'grid-cols-1'} gap-4`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 entries-table border border-gray-200">
            <thead>
              <tr className="divide-x divide-gray-200">
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center w-16 bg-gray-50 border-b">
                  Sr. No
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left bg-gray-50 border-b">
                  Program Name
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                  Catering Package
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                  Extra Catering
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                  Cold Drink Catering
                </th>
                <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                  Gr. Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50 divide-x divide-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-500 text-center">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {row.program}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{row.cateringTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{row.extraTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right">
                    ₹{row.coldDrinkTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    ₹{row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="divide-x divide-gray-200 bg-gray-50">
                <td colSpan={5} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {showComments && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700">Comments</h3>
            {data.map((row, index) => (
              <div key={index} className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  {row.program}
                </label>
                <textarea
                  value={comments[row.program] || ''}
                  onChange={(e) => handleCommentChange(row.program, e.target.value)}
                  className="w-full h-20 text-sm rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                  placeholder="Add a comment..."
                />
              </div>
            ))}
          </div>
        )}
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
      <div className="relative">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100"
          >
            <RiChat2Line className="w-4 h-4" />
            {showComments ? 'Hide Comments' : 'Show Comments'}
          </button>
        </div>
        <div className={`grid ${showComments ? 'grid-cols-[1fr,300px]' : 'grid-cols-1'} gap-4`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 entries-table border border-gray-200">
              <thead>
                <tr className="divide-x divide-gray-200">
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-center w-16 bg-gray-50 border-b">
                    Sr. No
                  </th>
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-left bg-gray-50 border-b">
                    Program Name
                  </th>
                  {products.map(product => (
                    <th key={product.id} scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                      {product.name}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 text-xs font-medium text-gray-500 uppercase text-right bg-gray-50 border-b">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cateringData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 divide-x divide-gray-200">
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {row.program}
                    </td>
                    {products.map(product => (
                      <td key={product.id} className="px-4 py-3 text-sm text-gray-900 text-right">
                        {row.products[product.id] || 0}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {row.total}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="divide-x divide-gray-200 bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    Total
                  </td>
                  {products.map(product => (
                    <td key={product.id} className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                      {totals[product.id]}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                    {Object.values(totals).reduce((a, b) => a + b, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          {showComments && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Comments</h3>
              {cateringData.map((row, index) => (
                <div key={index} className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">
                    {row.program}
                  </label>
                  <textarea
                    value={comments[row.program] || ''}
                    onChange={(e) => handleCommentChange(row.program, e.target.value)}
                    className="w-full h-20 text-sm rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
                    placeholder="Add a comment..."
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="report-content" className="p-8">
      {/* Report Header */}
      <div className="page-header">
        <h2 className="text-2xl font-bold text-center mb-2">Monthly Billing Report</h2>
        <p className="text-center text-gray-600 mb-8">
          {format(new Date(month), 'MMMM yyyy')}
        </p>
      </div>

      {/* Report Content */}
      <div className="mt-8">
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

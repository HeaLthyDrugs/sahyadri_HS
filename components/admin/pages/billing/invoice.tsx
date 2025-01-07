"use client";

import { useState, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { 
  RiFileTextLine, 
  RiDownloadLine, 
  RiPrinterLine,
  RiMailLine,
  RiEyeLine
} from "react-icons/ri";

interface InvoiceData {
  program_name: string;
  package_name: string;
  items: InvoiceItem[];
  summary: InvoiceSummary;
}

interface InvoiceItem {
  product_name: string;
  quantity: number;
  rate: number;
  amount: number;
  sgst: number;
  cgst: number;
  total: number;
}

interface InvoiceSummary {
  subtotal: number;
  sgstTotal: number;
  cgstTotal: number;
  grandTotal: number;
}

export function InvoicePage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Constants for tax rates
  const SGST_RATE = 0.09; // 9%
  const CGST_RATE = 0.09; // 9%

  useEffect(() => {
    if (selectedMonth) {
      fetchMonthlyInvoices();
    }
  }, [selectedMonth]);

  const fetchMonthlyInvoices = async () => {
    setIsLoading(true);
    try {
      const monthStart = format(startOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date(selectedMonth)), 'yyyy-MM-dd');

      // Fetch all billing entries for the month with related data
      const { data, error } = await supabase
        .from('billing_entries')
        .select(`
          quantity,
          programs (
            id,
            name
          ),
          packages (
            id,
            name
          ),
          products (
            id,
            name,
            rate
          )
        `)
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd);

      if (error) throw error;

      // Group data by program and package
      const invoiceMap = new Map<string, InvoiceData>();

      data.forEach(entry => {
        const key = `${entry.programs.id}-${entry.packages.id}`;
        
        if (!invoiceMap.has(key)) {
          invoiceMap.set(key, {
            program_name: entry.programs.name,
            package_name: entry.packages.name,
            items: [],
            summary: {
              subtotal: 0,
              sgstTotal: 0,
              cgstTotal: 0,
              grandTotal: 0
            }
          });
        }

        const invoice = invoiceMap.get(key)!;
        const existingItem = invoice.items.find(item => item.product_name === entry.products.name);

        if (existingItem) {
          existingItem.quantity += entry.quantity;
          existingItem.amount = existingItem.quantity * existingItem.rate;
          existingItem.sgst = existingItem.amount * SGST_RATE;
          existingItem.cgst = existingItem.amount * CGST_RATE;
          existingItem.total = existingItem.amount + existingItem.sgst + existingItem.cgst;
        } else {
          const newItem = {
            product_name: entry.products.name,
            quantity: entry.quantity,
            rate: entry.products.rate,
            amount: entry.quantity * entry.products.rate,
            sgst: entry.quantity * entry.products.rate * SGST_RATE,
            cgst: entry.quantity * entry.products.rate * CGST_RATE,
            total: entry.quantity * entry.products.rate * (1 + SGST_RATE + CGST_RATE)
          };
          invoice.items.push(newItem);
        }

        // Update summary
        invoice.summary = invoice.items.reduce((acc, item) => ({
          subtotal: acc.subtotal + item.amount,
          sgstTotal: acc.sgstTotal + item.sgst,
          cgstTotal: acc.cgstTotal + item.cgst,
          grandTotal: acc.grandTotal + item.total
        }), {
          subtotal: 0,
          sgstTotal: 0,
          cgstTotal: 0,
          grandTotal: 0
        });
      });

      setInvoices(Array.from(invoiceMap.values()));
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      toast.error('Failed to fetch invoice data');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4">
      {/* Filter Section */}
      <div className="flex flex-wrap gap-4 mb-6 items-center bg-white p-4 rounded-lg shadow print:hidden">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <div className="flex gap-2 ml-auto">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <RiPrinterLine /> Print
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {invoices.map((invoice, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-2">{invoice.program_name}</h3>
            <p className="text-gray-600 mb-4">{invoice.package_name}</p>
            <div className="flex justify-between items-center text-sm">
              <span>Total: ₹{invoice.summary.grandTotal.toFixed(2)}</span>
              <button
                onClick={() => setSelectedInvoice(invoice)}
                className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
              >
                <RiEyeLine /> View
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Invoice Preview */}
      {selectedInvoice && (
        <div className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
          {/* Invoice Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Sahyadri Hospitality Services</h1>
            <p className="text-gray-600">Tax Invoice</p>
            <p className="text-gray-600">
              Month: {format(new Date(selectedMonth), 'MMMM yyyy')}
            </p>
          </div>

          {/* Invoice Details */}
          <div className="mb-8 grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p>{selectedInvoice.program_name}</p>
              <p>{selectedInvoice.package_name}</p>
            </div>
            <div className="text-right">
              <p><strong>Invoice Date:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
              <p><strong>Invoice No:</strong> INV-{format(new Date(), 'yyyyMMdd')}-01</p>
            </div>
          </div>

          {/* Invoice Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="bg-gray-50">
                <th className="py-2 px-4 text-left">Item</th>
                <th className="py-2 px-4 text-right">Quantity</th>
                <th className="py-2 px-4 text-right">Rate</th>
                <th className="py-2 px-4 text-right">Amount</th>
                <th className="py-2 px-4 text-right">SGST</th>
                <th className="py-2 px-4 text-right">CGST</th>
                <th className="py-2 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedInvoice.items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-4">{item.product_name}</td>
                  <td className="py-2 px-4 text-right">{item.quantity}</td>
                  <td className="py-2 px-4 text-right">₹{item.rate.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">₹{item.amount.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">₹{item.sgst.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">₹{item.cgst.toFixed(2)}</td>
                  <td className="py-2 px-4 text-right">₹{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-semibold">
              <tr className="border-t-2">
                <td colSpan={3} className="py-2 px-4 text-right">Subtotal:</td>
                <td className="py-2 px-4 text-right">₹{selectedInvoice.summary.subtotal.toFixed(2)}</td>
                <td className="py-2 px-4 text-right">₹{selectedInvoice.summary.sgstTotal.toFixed(2)}</td>
                <td className="py-2 px-4 text-right">₹{selectedInvoice.summary.cgstTotal.toFixed(2)}</td>
                <td className="py-2 px-4 text-right">₹{selectedInvoice.summary.grandTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Terms and Notes */}
          <div className="text-sm text-gray-600">
            <p><strong>Terms & Conditions:</strong></p>
            <ul className="list-disc ml-5">
              <li>Payment is due within 30 days</li>
              <li>SGST Rate: 9%</li>
              <li>CGST Rate: 9%</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
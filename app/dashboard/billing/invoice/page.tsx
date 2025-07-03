'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import InvoiceForm from '@/components/admin/pages/billing/invoice-form';
import InvoicePreview from '@/components/admin/pages/billing/invoice-preview';
import { toast } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  rate: number;
  index: number;
}

interface Program {
  id: string;
  name: string;
  customer_name: string;
}

interface BillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

interface StaffBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  staff_id: number;
  products: Product;
}

interface Package {
  id: string;
  name: string;
  type: string;
}

interface InvoiceConfig {
  id: string;
  company_name: string;
  from_address: string[];
  bill_to_address: string[];
  address: string[];
  gstin: string;
  pan: string;
  footer_note: string;
  logo_url: string;
}

interface InvoiceData {
  packageDetails: Package;
  month: string;
  entries: BillingEntry[] | StaffBillingEntry[];
  totalAmount: number;
}

export default function InvoicePage() {
  const supabase = createClientComponentClient();
  const currentMonth = format(new Date(), 'yyyy-MM');

  // State management
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [dataSource, setDataSource] = useState<'program' | 'staff' | 'combined'>('combined');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig | null>(null);
  const [error, setError] = useState<string>('');

  // Fetch packages on component mount
  useEffect(() => {
    fetchPackages();
    fetchInvoiceConfig();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    }
  };

  const fetchInvoiceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_config')
        .select('*')
        .single();

      if (error) throw error;
      setInvoiceConfig(data);
    } catch (error) {
      console.error('Error fetching invoice config:', error);
      toast.error('Failed to fetch invoice configuration');
    }
  };

  const generateInvoice = async () => {
    if (!selectedPackage || !selectedMonth) {
      toast.error('Please select both package and month');
      return;
    }

    setIsLoading(true);
    setError('');
    setInvoiceData(null);

    try {
      const response = await fetch('/api/invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: selectedPackage,
          month: selectedMonth,
          type: dataSource
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate invoice');
      }

      const data = await response.json();

      setInvoiceData({
        packageDetails: data.packageDetails,
        month: selectedMonth,
        entries: data.entries,
        totalAmount: data.totalAmount
      });

      toast.success('Invoice generated successfully');
    } catch (error) {
      console.error('Error generating invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate invoice';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoice</h1>
            <p className="text-gray-600 mt-1">Generate invoices for billing Month</p>
          </div>
          
          {/* Data Source Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Data Source:</label>
            <select
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value as 'program' | 'staff' | 'combined')}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="combined">Combined (Program + Staff)</option>
              <option value="program">Program Only</option>
              <option value="staff">Staff Only</option>
            </select>
          </div>
        </div>

        {/* Invoice Form */}
        <InvoiceForm
          packages={packages}
          currentMonth={currentMonth}
          selectedPackage={selectedPackage}
          selectedMonth={selectedMonth}
          onPackageChange={setSelectedPackage}
          onMonthChange={setSelectedMonth}
          onGenerateInvoice={generateInvoice}
          isLoading={isLoading}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error generating invoice
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview */}
      {invoiceData && invoiceConfig && (
        <InvoicePreview
          invoiceData={invoiceData}
          invoiceConfig={invoiceConfig}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
              <span className="text-sm font-medium text-amber-700">
                Generating invoice...
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { RiLoader4Line, RiFileTextLine, RiAlertLine } from 'react-icons/ri';

interface Package {
  id: string;
  name: string;
  type: string;
}

interface InvoiceFormProps {
  packages: Package[];
  currentMonth: string;
  selectedPackage?: string;
  selectedMonth?: string;
}

export default function InvoiceForm({ 
  packages, 
  currentMonth,
  selectedPackage = '',
  selectedMonth
}: InvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    packageId?: string;
    month?: string;
  }>({});

  // Reset form state when URL params change
  useEffect(() => {
    setIsGenerating(false);
    setFormErrors({});
  }, [searchParams]);

  const validateForm = (packageId: string, month: string) => {
    const errors: {packageId?: string; month?: string} = {};
    
    if (!packageId) {
      errors.packageId = 'Please select a package';
    }
    
    if (!month) {
      errors.month = 'Please select a month';
    } else {
      // Check if selected month is in the future
      const selectedDate = new Date(month + '-01');
      const currentDate = new Date();
      if (selectedDate > currentDate) {
        errors.month = 'Cannot generate invoice for future months';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const packageId = formData.get('packageId') as string;
    const month = formData.get('month') as string;

    // Validate inputs
    if (!validateForm(packageId, month)) {
      // Show toast for each error
      Object.values(formErrors).forEach(error => {
        if (error) toast.error(error);
      });
      return;
    }

    // Show loading state
    setIsGenerating(true);
    const loadingToast = toast.loading('Generating invoice...', { id: 'invoice-generation' });

    // Update URL with new search params
    const params = new URLSearchParams(searchParams);
    params.set('packageId', packageId);
    params.set('month', month);
    router.push(`?${params.toString()}`);

    // Clear loading state after navigation
    setTimeout(() => {
      setIsGenerating(false);
      toast.dismiss(loadingToast);
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit} className="print:hidden flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow">
      <div className="flex-1 space-y-2">
        <label htmlFor="packageId" className="block text-sm font-medium text-gray-700">
          Select Package
        </label>
        <div className="relative">
          <select
            id="packageId"
            name="packageId"
            defaultValue={selectedPackage}
            className={`w-full rounded-md border ${formErrors.packageId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'} px-3 py-2`}
            disabled={isGenerating}
            onChange={() => setFormErrors(prev => ({ ...prev, packageId: undefined }))}
          >
            <option value="">Choose a package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} ({pkg.type})
              </option>
            ))}
          </select>
          {formErrors.packageId && (
            <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <RiAlertLine className="w-3 h-3" />
              {formErrors.packageId}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <label htmlFor="month" className="block text-sm font-medium text-gray-700">
          Select Month
        </label>
        <div className="relative">
          <input
            type="month"
            id="month"
            name="month"
            defaultValue={selectedMonth}
            max={currentMonth}
            className={`w-full rounded-md border ${formErrors.month ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'} px-3 py-2`}
            disabled={isGenerating}
            onChange={() => setFormErrors(prev => ({ ...prev, month: undefined }))}
          />
          {formErrors.month && (
            <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <RiAlertLine className="w-3 h-3" />
              {formErrors.month}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-end space-x-2">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all duration-200 ease-in-out"
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <RiLoader4Line className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <RiFileTextLine className="w-5 h-5" />
              Generate Invoice
            </>
          )}
        </button>
      </div>
    </form>
  );
} 
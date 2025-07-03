'use client';

import { useState } from 'react';
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
  selectedPackage: string;
  selectedMonth: string;
  onPackageChange: (packageId: string) => void;
  onMonthChange: (month: string) => void;
  onGenerateInvoice: () => void;
  isLoading: boolean;
}

export default function InvoiceForm({ 
  packages, 
  currentMonth,
  selectedPackage,
  selectedMonth,
  onPackageChange,
  onMonthChange,
  onGenerateInvoice,
  isLoading
}: InvoiceFormProps) {
  const [formErrors, setFormErrors] = useState<{
    packageId?: string;
    month?: string;
  }>({});

  const validateForm = (packageId: string, month: string) => {
    const errors: {packageId?: string; month?: string} = {};
    
    if (!packageId) {
      errors.packageId = 'Please select a package';
    }
    
    if (!month) { 
      errors.month = 'Please select a month';
    } else {
      const selectedDate = new Date(month + '-01');
      const currentDate = new Date();
      if (selectedDate > currentDate) {
        errors.month = 'Cannot generate invoice for future months';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm(selectedPackage, selectedMonth)) {
      Object.values(formErrors).forEach(error => {
        if (error) toast.error(error);
      });
      return;
    }

    onGenerateInvoice();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <label htmlFor="packageId" className="block text-sm font-medium text-gray-700">
            Select Package
          </label>
          <div className="relative">
            <select
              id="packageId"
              name="packageId"
              value={selectedPackage}
              onChange={(e) => {
                onPackageChange(e.target.value);
                setFormErrors(prev => ({ ...prev, packageId: undefined }));
              }}
              className={`w-full rounded-md border ${formErrors.packageId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'} px-3 py-2 pr-10`}
              disabled={isLoading}
            >
              <option value="">Select a Package</option>
              {packages.map(pkg => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.type})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <RiFileTextLine className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          {formErrors.packageId && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <RiAlertLine className="w-4 h-4" />
              {formErrors.packageId}
            </p>
          )}
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
              value={selectedMonth}
              onChange={(e) => {
                onMonthChange(e.target.value);
                setFormErrors(prev => ({ ...prev, month: undefined }));
              }}
              max={currentMonth}
              className={`w-full rounded-md border ${formErrors.month ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500'} px-3 py-2`}
              disabled={isLoading}
            />
          </div>
          {formErrors.month && (
            <p className="text-sm text-red-600 flex items-center gap-1">
              <RiAlertLine className="w-4 h-4" />
              {formErrors.month}
            </p>
          )}
        </div>

        <div className="flex items-end space-x-2">
          <button
            type="submit"
            disabled={isLoading || !selectedPackage || !selectedMonth}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <RiLoader4Line className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RiFileTextLine className="w-4 h-4" />
                Generate Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
} 
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const packageId = formData.get('packageId') as string;
    const month = formData.get('month') as string;

    // Validate inputs
    if (!packageId || !month) {
      alert('Please select both package and month');
      return;
    }

    // Check if selected month is in the future
    const selectedDate = new Date(month + '-01');
    const currentDate = new Date();
    if (selectedDate > currentDate) {
      alert('Cannot generate invoice for future months');
      return;
    }

    // Update URL with new search params
    const params = new URLSearchParams(searchParams);
    params.set('packageId', packageId);
    params.set('month', month);
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="print:hidden flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow">
      <div className="flex-1 space-y-2">
        <label htmlFor="packageId" className="block text-sm font-medium text-gray-700">
          Select Package
        </label>
        <select
          id="packageId"
          name="packageId"
          defaultValue={selectedPackage}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
        >
          <option value="">Choose a package</option>
          {packages.map((pkg) => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} ({pkg.type})
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 space-y-2">
        <label htmlFor="month" className="block text-sm font-medium text-gray-700">
          Select Month
        </label>
        <input
          type="month"
          id="month"
          name="month"
          defaultValue={selectedMonth}
          max={currentMonth}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
        />
      </div>

      <div className="flex items-end space-x-2">
        <button
          type="submit"
          className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-50"
        >
          Generate Invoice
        </button>
      </div>
    </form>
  );
} 
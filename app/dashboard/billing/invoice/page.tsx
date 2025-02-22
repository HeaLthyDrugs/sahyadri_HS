import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { format } from 'date-fns';
import InvoiceForm from '@/components/admin/pages/billing/invoice-form';
import InvoicePreview from '@/components/admin/pages/billing/invoice-preview';

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

interface PageProps {
  searchParams: {
    packageId?: string;
    month?: string;
  };
}

export default async function InvoicePage({ searchParams }: PageProps) {
  const supabase = createServerComponentClient({ cookies });
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Fetch packages for the form
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('name');

  // If no search params are provided, just render the form
  if (!searchParams.packageId || !searchParams.month) {
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
      </div>
    );
  }

  // Fetch invoice data if search params are provided
  const startDate = `${searchParams.month}-01`;
  const endDate = new Date(searchParams.month + '-01');
  endDate.setMonth(endDate.getMonth() + 1);
  endDate.setDate(endDate.getDate() - 1);
  const endDateStr = format(endDate, 'yyyy-MM-dd');

  // Get all required data in parallel
  const [packageResponse, configResponse, entriesResponse] = await Promise.all([
    supabase
      .from('packages')
      .select('*')
      .eq('id', searchParams.packageId)
      .single(),
    supabase
      .from('invoice_config')
      .select('*')
      .single(),
    supabase
      .from('billing_entries')
      .select(`
        id,
        entry_date,
        quantity,
        programs:program_id (
          id,
          name,
          customer_name
        ),
        products:product_id (
          id,
          name,
          rate,
          index
        )
      `)
      .eq('package_id', searchParams.packageId)
      .gte('entry_date', startDate)
      .lte('entry_date', endDateStr)
      .order('products(index)', { ascending: true })
  ]);

  const packageData = packageResponse.data;
  const invoiceConfig = configResponse.data;
  const entriesData = entriesResponse.data || [];

  // Show form with message if no entries found
  if (entriesData.length === 0) {
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          No entries found for this package and month.
        </div>
      </div>
    );
  }

  // Transform and aggregate entries
  const transformedEntries = entriesData.reduce((acc: BillingEntry[], entry: any) => {
    if (!entry.products || !entry.programs) return acc;

    const existingEntry = acc.find(e => e.products.id === entry.products.id);
    if (existingEntry) {
      existingEntry.quantity += entry.quantity || 0;
    } else {
      acc.push({
        id: entry.id,
        entry_date: entry.entry_date,
        quantity: entry.quantity || 0,
        programs: entry.programs,
        products: entry.products
      });
    }
    return acc;
  }, []);

  // Sort entries by product index
  transformedEntries.sort((a, b) => (a.products.index || 0) - (b.products.index || 0));

  // Calculate total
  const totalAmount = transformedEntries.reduce((sum, entry) => {
    const rate = entry.products.rate || 0;
    const quantity = entry.quantity || 0;
    return sum + (rate * quantity);
  }, 0);

  const invoiceData = {
    packageDetails: packageData,
    month: searchParams.month,
    entries: transformedEntries,
    totalAmount
  };

  return (
    <div className="space-y-6">
      <InvoiceForm
        packages={packages || []}
        currentMonth={currentMonth}
        selectedPackage={searchParams.packageId}
        selectedMonth={searchParams.month || currentMonth}
      />
      <InvoicePreview
        invoiceData={invoiceData}
        invoiceConfig={invoiceConfig}
      />
    </div>
  );
}
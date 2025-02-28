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
    type?: string;
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

  // Get all required data in parallel
  const [packageResponse, configResponse] = await Promise.all([
    supabase
      .from('packages')
      .select('*')
      .eq('id', searchParams.packageId)
      .single(),
    supabase
      .from('invoice_config')
      .select('*')
      .single()
  ]);

  const packageData = packageResponse.data;
  const invoiceConfig = configResponse.data;

  // Get programs that belong to this billing month
  const { data: programsData, error: programsError } = await supabase
    .from('program_month_mappings')
    .select(`
      program_id,
      programs:program_id (
        id,
        name,
        customer_name,
        start_date,
        end_date
      )
    `)
    .eq('billing_month', searchParams.month);

  if (programsError) {
    console.error('Error fetching programs:', programsError);
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Error fetching programs for this billing month.
        </div>
      </div>
    );
  }
  
  // If no programs found for this month, show an error
  if (!programsData || programsData.length === 0) {
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          No programs found for billing month {format(new Date(searchParams.month + '-01'), 'MMMM yyyy')}.
        </div>
      </div>
    );
  }
  
  // Extract program IDs
  const programIds = programsData.map(p => p.program_id);
  
  // Get all billing entries for these programs, regardless of entry date
  const { data: entriesData, error: entriesError } = await supabase
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
    .in('program_id', programIds)
    .order('products(index)', { ascending: true });

  if (entriesError) {
    console.error('Error fetching entries:', entriesError);
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          Error fetching billing entries.
        </div>
      </div>
    );
  }

  // Show form with message if no entries found
  if (!entriesData || entriesData.length === 0) {
    return (
      <div className="space-y-6">
        <InvoiceForm
          packages={packages || []}
          currentMonth={currentMonth}
          selectedPackage={searchParams.packageId}
          selectedMonth={searchParams.month || currentMonth}
        />
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          No entries found for package {packageData?.name} in billing month {format(new Date(searchParams.month + '-01'), 'MMMM yyyy')}.
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
    totalAmount,
    isStaffInvoice: searchParams.type === 'staff'
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
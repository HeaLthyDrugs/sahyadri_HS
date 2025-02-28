import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { packageId, month, type } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Format date range for the selected month
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    let entries;
    if (type === 'staff') {
      // Fetch staff billing entries
      const { data: staffEntries, error: staffError } = await supabase
        .from('staff_billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          staff:staff_id (
            id,
            name
          ),
          products:product_id (
            id,
            name,
            rate
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate.toISOString())
        .lte('entry_date', endDate.toISOString())
        .order('entry_date', { ascending: true });

      if (staffError) throw staffError;
      entries = staffEntries;
    } else {
      // Fetch program billing entries
      const { data: programEntries, error: programError } = await supabase
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
            rate
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate.toISOString())
        .lte('entry_date', endDate.toISOString())
        .order('entry_date', { ascending: true });

      if (programError) throw programError;
      entries = programEntries;
    }

    // Calculate total amount
    const totalAmount = entries.reduce((sum: number, entry: any) => {
      return sum + (entry.quantity * entry.products.rate);
    }, 0);

    return NextResponse.json({
      entries,
      totalAmount,
      packageDetails: {
        id: packageId,
        type
      }
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
} 
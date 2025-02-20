import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export async function POST(request: Request) {
  try {
    const { startMonth, endMonth, packageId } = await request.json();

    // Get start and end dates for the selected months
    const startDate = `${startMonth}-01`;
    const endDate = new Date(endMonth + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Build query for billing entries
    let query = supabase
      .from('billing_entries')
      .select(`
        entry_date,
        quantity,
        program_id,
        package_id,
        product_id,
        programs:programs!inner (
          id,
          name
        ),
        packages:packages!inner (
          id,
          name,
          type
        ),
        products:products!inner (
          id,
          name,
          rate
        )
      `)
      .gte('entry_date', startDate)
      .lte('entry_date', endDateStr)
      .order('entry_date', { ascending: true });

    // Add package filter if selected
    if (packageId) {
      query = query.eq('package_id', packageId);
    }

    const { data: entriesData, error } = await query;

    if (error) throw error;

    if (!entriesData || entriesData.length === 0) {
      return NextResponse.json({ error: 'No entries found for the selected period' }, { status: 404 });
    }

    // Return the raw entries data
    return NextResponse.json(entriesData);

  } catch (error) {
    console.error('Error generating lifetime report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
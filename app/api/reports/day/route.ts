import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';

interface BillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: {
    id: string;
    name: string;
  }[];
  packages: {
    id: string;
    name: string;
    type: string;
  }[];
  products: {
    id: string;
    name: string;
    rate: number;
  }[];
}

export async function POST(request: Request) {
  try {
    const { date, packageType } = await request.json();
    
    // Ensure date is in correct format
    const parsedDate = parseISO(date);
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    console.log('Request params:', { 
      originalDate: date,
      parsedDate: parsedDate.toISOString(),
      formattedDate,
      packageType 
    });
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // First do a raw check of entries
    const { data: rawCheck, error: rawError } = await supabase
      .from('billing_entries')
      .select('id, entry_date')
      .order('entry_date');

    console.log('Available dates in DB:', 
      rawCheck?.map(entry => ({
        id: entry.id,
        date: entry.entry_date
      }))
    );

    // Then check for specific date
    const { data: entriesCheck, error: checkError } = await supabase
      .from('billing_entries')
      .select('id, entry_date')
      .eq('entry_date', formattedDate);

    console.log('Initial check:', { 
      formattedDate,
      hasEntries: !!entriesCheck?.length,
      entriesCount: entriesCheck?.length,
      firstEntry: entriesCheck?.[0],
      error: checkError?.message 
    });

    if (checkError) {
      throw new Error(`Error checking entries: ${checkError.message}`);
    }

    if (!entriesCheck || entriesCheck.length === 0) {
      console.log('No entries found for date:', formattedDate);
      return NextResponse.json({ 
        data: [],
        debug: {
          requestDate: date,
          formattedDate,
          message: 'No entries found for this date'
        }
      });
    }

    // Build the main query with proper joins
    let query = supabase
      .from('billing_entries')
      .select(`
        *,
        programs!inner (
          id,
          name
        ),
        packages!inner (
          id,
          name,
          type
        ),
        products!inner (
          id,
          name,
          rate
        )
      `)
      .eq('entry_date', formattedDate);

    // Add package filter if specific package is selected
    if (packageType && packageType !== 'all') {
      query = query.eq('packages.type', packageType);
    }

    // Execute query
    const { data: entries, error } = await query;

    console.log('Main query response:', { 
      hasData: !!entries, 
      dataLength: entries?.length,
      error: error?.message,
      sampleEntry: entries?.[0] ? {
        id: entries[0].id,
        date: entries[0].entry_date,
        program: entries[0].programs?.name,
        package: entries[0].packages?.type,
        product: entries[0].products?.name,
        quantity: entries[0].quantity
      } : null
    });

    if (error) {
      throw error;
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        data: [],
        debug: {
          requestDate: date,
          formattedDate,
          message: 'Query returned no entries'
        }
      });
    }

    // Process and group data by program and package type
    const programGroups = new Map();

    entries.forEach((entry: any) => {
      const programId = entry.program_id;
      const programName = entry.programs?.name;
      const packageType = entry.packages?.type || '';
      const amount = entry.quantity * (entry.products?.rate || 0);

      if (!programId || !programName) {
        console.log('Skipping entry due to missing program data:', {
          entryId: entry.id,
          date: entry.entry_date,
          programId,
          programName
        });
        return;
      }

      if (!programGroups.has(programId)) {
        programGroups.set(programId, {
          date: entry.entry_date,
          program: programName,
          cateringTotal: 0,
          extraTotal: 0,
          coldDrinkTotal: 0,
          grandTotal: 0,
          entries: []
        });
      }

      const programData = programGroups.get(programId);

      // Update totals based on package type
      switch (packageType.toLowerCase()) {
        case 'normal':
          programData.cateringTotal += amount;
          break;
        case 'extra':
          programData.extraTotal += amount;
          break;
        case 'cold drink':
          programData.coldDrinkTotal += amount;
          break;
      }

      programData.grandTotal += amount;
      programData.entries.push({
        packageType: packageType,
        productName: entry.products?.name || 'Unknown Product',
        quantity: entry.quantity,
        rate: entry.products?.rate || 0,
        total: amount
      });
    });

    const result = Array.from(programGroups.values());
    console.log('Processed data:', { 
      groupCount: programGroups.size,
      resultLength: result.length,
      sampleProgram: result[0] ? {
        date: result[0].date,
        program: result[0].program,
        entries: result[0].entries.length,
        grandTotal: result[0].grandTotal
      } : null
    });

    return NextResponse.json({ 
      data: result,
      debug: {
        requestDate: date,
        formattedDate,
        entriesFound: entries.length,
        programsProcessed: result.length
      }
    });

  } catch (error) {
    console.error('Error generating day report:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate report',
        debug: { timestamp: new Date().toISOString() }
      },
      { status: 500 }
    );
  }
} 
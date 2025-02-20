import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import PDFDocument from 'pdfkit';

interface BillingEntry {
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
  programs: {
    id: string;
    name: string;
  };
  packages: {
    id: string;
    name: string;
    type: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
  };
}

type DatabaseBillingEntry = {
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
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
};

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

    // Transform the database response to match our expected structure
    const entries: BillingEntry[] = (entriesData as DatabaseBillingEntry[]).map(entry => ({
      ...entry,
      programs: entry.programs[0],
      packages: entry.packages[0],
      products: entry.products[0]
    }));

    // Process data
    const programTotals = new Map<string, {
      program: string;
      quantities: { [date: string]: number };
      total: number;
    }>();

    // Get all unique dates
    const uniqueDates = Array.from(new Set(
      entries.map(entry => format(new Date(entry.entry_date), 'dd/MM/yyyy'))
    )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Process entries
    entries.forEach(entry => {
      const programId = entry.program_id;
      const programName = entry.programs.name;
      const date = format(new Date(entry.entry_date), 'dd/MM/yyyy');
      const amount = entry.quantity * entry.products.rate;

      if (!programTotals.has(programId)) {
        programTotals.set(programId, {
          program: programName,
          quantities: {},
          total: 0
        });
      }

      const programData = programTotals.get(programId)!;
      programData.quantities[date] = (programData.quantities[date] || 0) + entry.quantity;
      programData.total += amount;
    });

    const programs = Array.from(programTotals.values());

    // Calculate column totals
    const columnTotals = uniqueDates.reduce((acc, date) => {
      acc[date] = programs.reduce((sum, program) => sum + (program.quantities[date] || 0), 0);
      return acc;
    }, {} as { [date: string]: number });

    // Calculate grand total
    const grandTotal = programs.reduce((sum, program) => sum + program.total, 0);

    // Generate PDF
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 30
    });

    // Set up PDF content
    const chunks: Uint8Array[] = [];
    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    
    // Return a promise that resolves when PDF generation is complete
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Add content to PDF
    doc
      .fontSize(16)
      .text('Monthly Billing Report', { align: 'center' })
      .moveDown();

    doc
      .fontSize(10)
      .text(`Period: ${format(new Date(startDate), 'MMMM yyyy')} - ${format(new Date(endDateStr), 'MMMM yyyy')}`)
      .text(`Package: ${entries[0]?.packages.name || 'All Packages'}`)
      .text(`Generated On: ${format(new Date(), 'dd/MM/yyyy')}`)
      .moveDown();

    // Calculate column widths
    const pageWidth = doc.page.width - 60;
    const columnWidths = {
      srNo: 30,
      program: 120,
      dates: Math.floor((pageWidth - 150 - 80) / uniqueDates.length),
      total: 80
    };

    let y = doc.y;
    let x = 30;

    // Draw headers
    doc
      .rect(x, y, columnWidths.srNo, 20)
      .stroke()
      .text('Sr.', x + 2, y + 5, { width: columnWidths.srNo - 4, align: 'center' });
    x += columnWidths.srNo;

    doc
      .rect(x, y, columnWidths.program, 20)
      .stroke()
      .text('Program', x + 5, y + 5, { width: columnWidths.program - 10 });
    x += columnWidths.program;

    uniqueDates.forEach(date => {
      doc
        .rect(x, y, columnWidths.dates, 20)
        .stroke()
        .text(date, x + 2, y + 5, { width: columnWidths.dates - 4, align: 'center' });
      x += columnWidths.dates;
    });

    doc
      .rect(x, y, columnWidths.total, 20)
      .stroke()
      .text('Total', x + 5, y + 5, { width: columnWidths.total - 10, align: 'right' });

    y += 20;

    // Draw data rows
    programs.forEach((program, index) => {
      x = 30;
      const rowHeight = 20;

      // Sr. No.
      doc
        .rect(x, y, columnWidths.srNo, rowHeight)
        .stroke()
        .text((index + 1).toString(), x + 2, y + 5, { width: columnWidths.srNo - 4, align: 'center' });
      x += columnWidths.srNo;

      // Program name
      doc
        .rect(x, y, columnWidths.program, rowHeight)
        .stroke()
        .text(program.program, x + 5, y + 5, { width: columnWidths.program - 10 });
      x += columnWidths.program;

      // Quantities by date
      uniqueDates.forEach(date => {
        doc
          .rect(x, y, columnWidths.dates, rowHeight)
          .stroke()
          .text((program.quantities[date] || 0).toString(), x + 2, y + 5, { 
            width: columnWidths.dates - 4, 
            align: 'center' 
          });
        x += columnWidths.dates;
      });

      // Total
      doc
        .rect(x, y, columnWidths.total, rowHeight)
        .stroke()
        .text(program.total.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
              x + 5, y + 5, 
              { width: columnWidths.total - 10, align: 'right' });

      y += rowHeight;
    });

    // Draw totals row
    x = 30;
    doc
      .rect(x, y, columnWidths.srNo + columnWidths.program, 20)
      .stroke()
      .text('GRAND TOTAL', x + 5, y + 5, { 
        width: columnWidths.srNo + columnWidths.program - 10,
        align: 'right'
      });
    x += columnWidths.srNo + columnWidths.program;

    uniqueDates.forEach(date => {
      doc
        .rect(x, y, columnWidths.dates, 20)
        .stroke()
        .text(columnTotals[date].toString(), x + 2, y + 5, { 
          width: columnWidths.dates - 4, 
          align: 'center' 
        });
      x += columnWidths.dates;
    });

    doc
      .rect(x, y, columnWidths.total, 20)
      .stroke()
      .text(grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }), 
            x + 5, y + 5, 
            { width: columnWidths.total - 10, align: 'right' });

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    const pdfBuffer = await pdfPromise;

    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=monthly-report-${format(new Date(startDate), 'yyyy-MM')}-${format(new Date(endDateStr), 'yyyy-MM')}.pdf`
      }
    });

  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF report' },
      { status: 500 }
    );
  }
} 
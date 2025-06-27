import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { generatePDF } from '@/lib/pdf-generator';

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

interface Staff {
  id: number;
  name: string;
}

interface StaffBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  staff_id: number;
  products: Product;
}

interface ProgramBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

type BillingEntry = StaffBillingEntry | ProgramBillingEntry;

interface StaffBillingResponse {
  id: string;
  entry_date: string;
  quantity: number;
  staff: Staff;
  products: Product;
}

interface ProgramBillingResponse {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { packageId, month, type = 'program', action = 'view' } = body;
    
    if (!packageId || !month) {
      return NextResponse.json({ 
        error: 'Package ID and month are required' 
      }, { status: 400 });
    }

    const supabase = createServerComponentClient({ cookies });

    // Get package and config data
    const [packageResponse, configResponse] = await Promise.all([
      supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single(),
      supabase
        .from('invoice_config')
        .select('*')
        .single()
    ]);

    const packageData = packageResponse.data;
    const invoiceConfig = configResponse.data;

    if (!packageData || !invoiceConfig) {
      return NextResponse.json({ 
        error: 'Failed to fetch required data' 
      }, { status: 500 });
    }

    let entries: BillingEntry[] = [];
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    if (type === 'staff') {
      // Fetch staff billing entries
      const { data: staffEntries, error: staffError } = await supabase
        .from('staff_billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          products:product_id (
            id,
            name,
            rate,
            index
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate.toISOString())
        .lte('entry_date', endDate.toISOString())
        .order('products(index)', { ascending: true });

      if (staffError) {
        return NextResponse.json({ 
          error: 'Failed to fetch staff billing entries' 
        }, { status: 500 });
      }

      if (!staffEntries || staffEntries.length === 0) {
        return NextResponse.json({ 
          error: `No staff entries found for package ${packageData.name} in month ${format(startDate, 'MMMM yyyy')}` 
        }, { status: 404 });
      }

      entries = (staffEntries as any[]).map(entry => ({
        id: entry.id,
        entry_date: entry.entry_date,
        quantity: entry.quantity || 0,
        staff_id: 1, // Default staff ID for aggregated entries
        products: entry.products
      })) as StaffBillingEntry[];
    } else {
      // Fetch program mappings for the month
      const { data: programMappings, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('program_id')
        .eq('billing_month', month);

      if (mappingsError) {
        return NextResponse.json({ 
          error: 'Failed to fetch program mappings' 
        }, { status: 500 });
      }

      if (!programMappings || programMappings.length === 0) {
        return NextResponse.json({ 
          error: `No programs found for billing month ${format(startDate, 'MMMM yyyy')}` 
        }, { status: 404 });
      }

      // Extract program IDs
      const programIds = programMappings.map(p => p.program_id);

      // Get billing entries for these programs
      const { data: programEntries, error: entriesError } = await supabase
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
        .eq('package_id', packageId)
        .in('program_id', programIds)
        .order('products(index)', { ascending: true });

      if (entriesError) {
        return NextResponse.json({ 
          error: 'Failed to fetch billing entries' 
        }, { status: 500 });
      }

      if (!programEntries || programEntries.length === 0) {
        return NextResponse.json({ 
          error: `No entries found for package ${packageData.name} in billing month ${format(startDate, 'MMMM yyyy')}` 
        }, { status: 404 });
      }

      entries = (programEntries as unknown as ProgramBillingResponse[]).map(entry => ({
        id: entry.id,
        entry_date: entry.entry_date,
        quantity: entry.quantity || 0,
        programs: entry.programs,
        products: entry.products
      }));
    }

    // Transform and aggregate entries
    const transformedEntries = entries.reduce((acc: BillingEntry[], entry) => {
      if (!entry.products) return acc;

      const existingEntry = acc.find(e => e.products.id === entry.products.id);
      if (existingEntry) {
        existingEntry.quantity += entry.quantity || 0;
      } else {
        acc.push(entry);
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

    // If action is view, return JSON data
    if (action === 'view') {
      return NextResponse.json({
        entries: transformedEntries,
        totalAmount,
        packageDetails: {
          ...packageData,
          type
        },
        month,
        isStaffInvoice: type === 'staff'
      });
    }

    // Generate HTML content for PDF
    const invoiceHtml = generateInvoiceHTML({
      packageDetails: packageData,
      month,
      entries: transformedEntries,
      totalAmount,
      config: invoiceConfig,
      type
    });

    try {
      // Generate PDF with a timeout
      const pdf = await Promise.race([
        generatePDF(invoiceHtml),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF generation timed out')), 25000)
        )
      ]) as Buffer;

      // Return response based on action
      const headers: Record<string, string> = {
        'Content-Type': 'application/pdf'
      };

      if (action === 'download') {
        headers['Content-Disposition'] = `attachment; filename=Invoice-${format(new Date(), 'yyyyMMdd')}-${packageData.name}.pdf`;
      }

      return new NextResponse(pdf, { headers });
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      return NextResponse.json({ 
        error: 'Failed to generate PDF. Please try again.' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

function generateInvoiceHTML({ packageDetails, month, entries, totalAmount, config, type }: any) {
  const styles = `
    <style>
      @media print {
        img {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #1f2937;
      }
      .company-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      .company-info {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .company-logo {
        width: 64px;
        height: 64px;
        object-fit: contain;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .company-details h1 {
        font-size: 24px;
        margin: 0 0 8px 0;
      }
      .company-details p {
        margin: 2px 0;
        font-size: 12px;
      }
      .invoice-title {
        font-size: 32px;
        color: #d97706;
        margin: 0;
        text-align: right;
      }
      .billing-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 16px 0;
      }
      .billing-details h3 {
        font-size: 16px;
        margin: 0 0 8px 0;
      }
      .billing-details p {
        margin: 2px 0;
        font-size: 12px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;
      }
      th, td {
        padding: 8px;
        text-align: left;
        border: 1px solid #e5e7eb;
      }
      th {
        background-color: #ffffff;
        font-weight: 600;
        font-size: 12px;
      }
      td {
        font-size: 12px;
      }
      .text-right {
        text-align: right;
      }
      .total-row {
        font-weight: bold;
          background-color: #ffffff;
      }
      .footer {
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
      }
      .footer-note {
        text-align: center;
        font-size: 11px;
        color: #6b7280;
        margin-top: 16px;
      }
      .signature-section {
        margin-top: 48px;
        text-align: right;
      }
      .signature-line {
        margin-top: 32px;
        border-top: 1px solid #e5e7eb;
        width: 200px;
        display: inline-block;
      }
      @page {
        margin: 20mm;
        size: A4;
      }
    </style>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        <div class="company-header">
          <div class="company-info">
            <img src="https://sahyadriservices.in/production/images/logo.png" alt="Company Logo" class="company-logo" />
            <div class="company-details">
              <h1>${config.company_name}</h1>
              ${Array.isArray(config.address) 
                ? config.address.map((line: string) => `<p>${line}</p>`).join('') 
                : config.address ? `<p>${config.address}</p>` : ''}
            </div>
          </div>
        </div>

        <div class="billing-details">
          <div>
            <h3>Ship to:</h3>
            ${config.from_address.map((line: string) => `<p>${line}</p>`).join('')}
          </div>
          <div>
            <h3>Bill to:</h3>
            ${config.bill_to_address.map((line: string) => `<p>${line}</p>`).join('')}
          </div>
        </div>

        <div style="background-color: #ffffff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0; font-size: 14px;">
            ● ${type === 'staff' ? 'STAFF ' : ''}INVOICE for ${format(new Date(month), 'MMMM yyyy')} - ${packageDetails.name}
          </h3>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%">Sr. No</th>
              <th style="width: 40%">Product Name</th>
              <th style="width: 15%">Quantity</th>
              <th style="width: 15%" class="text-right">Basic Rate</th>
              <th style="width: 20%" class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map((entry: BillingEntry, index: number) => {
              const rate = entry.products.rate || 0;
              const quantity = entry.quantity || 0;
              const lineTotal = rate * quantity;
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${entry.products.name}</td>
                  <td>${quantity}</td>
                  <td class="text-right">₹${rate.toFixed(2)}</td>
                  <td class="text-right">₹${lineTotal.toFixed(2)}</td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right">Total Amount:</td>
              <td class="text-right">₹${totalAmount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div style="display: flex; justify-content: space-between;">
            <div>
              <p style="margin: 4px 0;">PAN: ${config.pan}</p>
              <p style="margin: 4px 0;">GSTIN: ${config.gstin}</p>
            </div>
            <div class="signature-section">
              <p>Authorized Signatory</p>
              <div class="signature-line"></div>
            </div>
          </div>
          ${config.footer_note ? `<div class="footer-note">${config.footer_note}</div>` : ''}
        </div>
      </body>
    </html>
  `;
} 
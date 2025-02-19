import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
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

interface BillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  programs: Program;
  products: Product;
}

interface DatabaseBillingEntry {
  id: string;
  entry_date: string;
  quantity: number;
  program_id: string;
  package_id: string;
  product_id: string;
  programs: {
    id: string;
    name: string;
    customer_name: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
    index: number;
  };
}

export async function POST(request: Request) {
  try {
    const { packageId, month, action } = await request.json();
    
    if (!packageId || !month) {
      return NextResponse.json({ error: 'Package ID and month are required' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Get start and end dates for the selected month
    const startDate = `${month}-01`;
    const endDate = new Date(month + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(endDate.getDate() - 1);
    const endDateStr = format(endDate, 'yyyy-MM-dd');

    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError) throw packageError;

    // Get invoice configuration
    const { data: invoiceConfig, error: configError } = await supabase
      .from('invoice_config')
      .select('*')
      .single();

    if (configError) throw configError;

    // Get billing entries with proper joins
    const { data: entriesData, error: entriesError } = await supabase
      .from('billing_entries')
      .select(`
        id,
        entry_date,
        quantity,
        program_id,
        package_id,
        product_id,
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
      .gte('entry_date', startDate)
      .lte('entry_date', endDateStr)
      .order('products(index)', { ascending: true });

    if (entriesError) throw entriesError;

    if (!entriesData || entriesData.length === 0) {
      return NextResponse.json({ 
        error: `No entries found for package ${packageData.name} between ${format(new Date(startDate), 'dd/MM/yyyy')} and ${format(new Date(endDateStr), 'dd/MM/yyyy')}` 
      }, { status: 404 });
    }

    // Transform and aggregate entries
    const transformedEntries = (entriesData as unknown as DatabaseBillingEntry[]).reduce((acc: BillingEntry[], entry) => {
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

    console.log('Transformed Data:', {
      packageDetails: packageData,
      entries: transformedEntries,
      totalAmount,
      month
    });

    // Generate HTML content
    const invoiceHtml = generateInvoiceHTML({
      packageDetails: packageData,
      month,
      entries: transformedEntries,
      totalAmount,
      config: invoiceConfig
    });

    // Generate PDF
    const pdf = await generatePDF(invoiceHtml);

    // Return response based on action
    if (action === 'download') {
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename=Invoice-${format(new Date(), 'yyyyMMdd')}-${packageData.name}.pdf`
        }
      });
    } else {
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf'
        }
      });
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

function generateInvoiceHTML({ packageDetails, month, entries, totalAmount, config }: any) {
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
        background-color: #fff7ed;
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
        background-color: #f8f9fa;
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
              ${config.from_address.map((line: string) => `<p>${line}</p>`).join('')}
            </div>
          </div>
          <div>
            <h2 class="invoice-title">INVOICE</h2>
          </div>
        </div>

        <div class="billing-details">
          <div>
            <h3>Ship to:</h3>
            ${config.from_address.map((line: string) => `<p>${line}</p>`).join('')}
            <p>GSTIN: ${config.gstin}</p>
            <p>PAN: ${config.pan}</p>
          </div>
          <div>
            <h3>Bill to:</h3>
            ${config.bill_to_address.map((line: string) => `<p>${line}</p>`).join('')}
          </div>
        </div>

        <div style="background-color: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin: 0; font-size: 14px;">
            INVOICE for ${format(new Date(month), 'MMMM yyyy')} - ${packageDetails.name}
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
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
    const { packageId, month, type = 'combined', action = 'view' } = body;
    
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

    // Set up date range for staff entries
    const startDate = new Date(month + '-01');
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    console.log('Invoice debug - Fetching data with parameters:', {
      packageId,
      month,
      type,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Get the package information to determine the type
    const { data: selectedPackage, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (packageError || !selectedPackage) {
      return NextResponse.json({ 
        error: 'Invalid package ID' 
      }, { status: 400 });
    }

    console.log('Invoice debug - Selected package:', selectedPackage.name, selectedPackage.type);

    // Initialize aggregated product totals
    const productTotals: { [productId: string]: { product: Product, quantity: number } } = {};

    if (type === 'combined' || type === 'program') {
      // Use program_month_mappings to get the correct programs for this billing month
      // This matches exactly what the monthly report does
      const { data: programMappings, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('program_id')
        .eq('billing_month', month);

      if (mappingsError) {
        console.error('Error fetching program mappings:', mappingsError);
        return NextResponse.json({ 
          error: 'Failed to fetch program mappings' 
        }, { status: 500 });
      }

      console.log('Invoice debug - Program mappings found:', programMappings?.length || 0);

      // Extract program IDs
      const programIds = programMappings?.map(p => p.program_id) || [];

      // Get all packages of the same type as the selected package
      // This matches the monthly report's approach of aggregating by package type
      const { data: packagesOfSameType, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', selectedPackage.type);

      if (packagesError) {
        console.error('Error fetching packages of same type:', packagesError);
        return NextResponse.json({ 
          error: 'Failed to fetch packages' 
        }, { status: 500 });
      }

      const packageIds = packagesOfSameType?.map(p => p.id) || [packageId];
      console.log('Invoice debug - Packages of same type:', packageIds.length);

      // Fetch program billing entries using program IDs from billing month mapping
      // AND all packages of the same type - this matches monthly report logic
      if (programIds.length > 0) {
        const { data: programEntries, error: programError } = await supabase
          .from('billing_entries')
          .select(`
            id,
            entry_date,
            quantity,
            products!inner (
              id,
              name,
              rate,
              index
            )
          `)
          .in('package_id', packageIds)
          .in('program_id', programIds);

        if (programError) {
          console.error('Program billing entries error:', programError);
        } else {
          // Aggregate program entries by product
          for (const entry of programEntries || []) {
            const product = Array.isArray(entry.products) ? entry.products[0] : entry.products;
            if (product) {
              const amount = (entry.quantity || 0) * (product.rate || 0);
              console.log(`Invoice debug - Program entry: ${product.name}, quantity: ${entry.quantity}, rate: ${product.rate}, amount: ${amount}`);
              
              if (!productTotals[product.id]) {
                productTotals[product.id] = {
                  product,
                  quantity: 0
                };
              }
              productTotals[product.id].quantity += entry.quantity || 0;
            }
          }
          console.log('Invoice debug - Program entries processed:', programEntries?.length || 0);
        }
      }
    }

    if (type === 'combined' || type === 'staff') {
      // Get all packages of the same type for staff entries too
      const { data: packagesOfSameType, error: packagesError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', selectedPackage.type);

      if (packagesError) {
        console.error('Error fetching packages of same type for staff:', packagesError);
        return NextResponse.json({ 
          error: 'Failed to fetch packages for staff' 
        }, { status: 500 });
      }

      const packageIds = packagesOfSameType?.map(p => p.id) || [packageId];

      // Fetch staff billing entries using date range (not program mapping)
      const { data: staffEntries, error: staffError } = await supabase
        .from('staff_billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          products!inner (
            id,
            name,
            rate,
            index
          )
        `)
        .in('package_id', packageIds)
        .gte('entry_date', startDate.toISOString())
        .lte('entry_date', endDate.toISOString());

      if (staffError) {
        console.error('Staff billing entries error:', staffError);
      } else {
        // Aggregate staff entries by product
        for (const entry of staffEntries || []) {
          const product = Array.isArray(entry.products) ? entry.products[0] : entry.products;
          if (product) {
            const amount = (entry.quantity || 0) * (product.rate || 0);
            console.log(`Invoice debug - Staff entry: ${product.name}, quantity: ${entry.quantity}, rate: ${product.rate}, amount: ${amount}`);
            
            if (!productTotals[product.id]) {
              productTotals[product.id] = {
                product,
                quantity: 0
              };
            }
            productTotals[product.id].quantity += entry.quantity || 0;
          }
        }
        console.log('Invoice debug - Staff entries processed:', staffEntries?.length || 0);
      }
    }

    // Convert aggregated totals to the expected format
    const transformedEntries = Object.values(productTotals)
      .filter(item => item.quantity > 0)
      .map(item => ({
        id: `aggregated-${item.product.id}`,
        entry_date: new Date().toISOString(),
        quantity: item.quantity,
        products: item.product
      }));

    console.log('Invoice debug - Total aggregated products:', transformedEntries.length);

    if (transformedEntries.length === 0) {
      return NextResponse.json({ 
        error: `No entries found for package ${packageData.name} in billing month ${format(startDate, 'MMMM yyyy')} with ${type} data source` 
      }, { status: 404 });
    }

    // Sort entries by product index
    transformedEntries.sort((a, b) => (a.products.index || 0) - (b.products.index || 0));

    // Calculate total with detailed logging
    const totalAmount = transformedEntries.reduce((sum, entry) => {
      const rate = entry.products.rate || 0;
      const quantity = entry.quantity || 0;
      const entryTotal = rate * quantity;
      console.log(`Invoice debug - ${entry.products.name}: ${quantity} × ₹${rate} = ₹${entryTotal}`);
      return sum + entryTotal;
    }, 0);

    console.log('Invoice debug - Final total amount:', totalAmount);

    // If action is view, return JSON data
    if (action === 'view') {
      return NextResponse.json({
        entries: transformedEntries,
        totalAmount,
        packageDetails: {
          ...packageData,
          type
        },
        month
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
            ● COMBINED INVOICE for ${format(new Date(month), 'MMMM yyyy')} - ${packageDetails.name}
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
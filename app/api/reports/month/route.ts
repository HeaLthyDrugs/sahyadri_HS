import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO, parse, isValid, startOfMonth, endOfMonth } from 'date-fns';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

interface ReportData {
  program: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
}

interface CateringProduct {
  id: string;
  name: string;
  quantity: number;
}

interface CateringData {
  program: string;
  products: { [key: string]: number };
  total: number;
}

interface RequestBody {
  month: string;
  type: 'all' | 'normal' | 'extra' | 'cold drink';
  action?: 'print' | 'download';
}

interface DatabaseEntry {
  id: string;
  entry_date: string;
  quantity: number;
  package_id: number;
  packages: {
    id: number;
    name: string;
    type: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
  };
  programs: {
    id: number;
    name: string;
  };
}

interface DatabaseEntryWithoutPackages {
  id: string;
  entry_date: string;
  quantity: number;
  package_id: number;
  products: {
    id: string;
    name: string;
    rate: number;
  };
  programs: {
    id: number;
    name: string;
  };
}

interface ProductData {
  id: string;
  name: string;
}

const generatePDF = async (
  data: ReportData[],
  month: string,
  type: 'all' | 'normal' | 'extra' | 'cold drink',
  cateringData?: CateringData[],
  products?: CateringProduct[]
) => {
  let browser;
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar');
      browser = await puppeteerCore.launch({
        executablePath,
        args: chromium.args,
        headless: true as const,
        defaultViewport: chromium.defaultViewport
      });
    } else {
      browser = await puppeteer.launch({
        headless: true as const,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();

    const PRODUCTS_PER_TABLE = 7;
    const productChunks = products ? Array.from({ length: Math.ceil(products.length / PRODUCTS_PER_TABLE) }, (_, i) =>
      products.slice(i * PRODUCTS_PER_TABLE, (i + 1) * PRODUCTS_PER_TABLE)
    ) : [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Monthly Report - ${month}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 12px;
              font-size: 11px;
            }
            .report-header {
              text-align: center;
              margin-bottom: 20px;
              padding: 12px;
              background-color: #f8f9fa;
              border-bottom: 1px solid #dee2e6;
            }
            .report-header h2 {
              margin: 0;
              color: #1a1a1a;
              font-size: 16px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 16px;
              border: 1px solid #dee2e6;
            }
            th, td { 
              border: 1px solid #dee2e6; 
              padding: 6px 8px;
              font-size: 11px;
            }
            th { 
              background-color: #f8f9fa;
              font-weight: 600;
              color: #1a1a1a;
            }
            .total-row { 
              background-color: #f8f9fa;
              font-weight: 600;
            }
            .grand-total {
              margin-top: 20px;
              padding: 10px;
              text-align: right;
              background-color: #f8f9fa;
              border: 1px solid #dee2e6;
              border-radius: 3px;
              page-break-inside: avoid;
            }
            .grand-total strong {
              font-size: 13px;
              color: #1a1a1a;
            }
            @page { 
              margin: 15mm;
              size: A4;
            }
            @media print {
              .no-break {
                page-break-inside: avoid;
              }
              .page-break-before {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h2>${format(parseISO(month), 'MMMM yyyy')} ${type === 'all' ? 'All Packages Report' : 
              type === 'normal' ? 'Catering Package Report' :
              type === 'extra' ? 'Extra Package Report' : 'Cold Drink Package Report'}</h2>
          </div>

          ${type === 'all' ? `
            <div class="table-container no-break">
              <table>
                <thead>
                  <tr>
                    <th style="width: 8%; text-align: center">No.</th>
                    <th style="width: 32%; text-align: left">Program Name</th>
                    <th style="width: 15%; text-align: right">Catering</th>
                    <th style="width: 15%; text-align: right">Extra Catering</th>
                    <th style="width: 15%; text-align: right">Cold Drinks</th>
                    <th style="width: 15%; text-align: right">Gr. Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.map((row, index) => `
                    <tr>
                      <td style="text-align: center">${index + 1}</td>
                      <td>${row.program}</td>
                      <td style="text-align: right">₹${row.cateringTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right">₹${row.extraTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right">₹${row.coldDrinkTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style="text-align: right">₹${row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="5" style="text-align: right">TOTAL</td>
                    <td style="text-align: right">₹${data.reduce((sum, row) => sum + row.grandTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : cateringData && products ? `
            ${productChunks.map((chunk, chunkIndex) => `
              ${chunkIndex > 0 ? '<div class="page-break-before"></div>' : ''}
              <div class="table-container no-break">
                <table>
                  <thead>
                    <tr>
                      <th style="width: 12%; text-align: center">Program Name</th>
                      ${chunk.map(product => `
                        <th style="text-align: center">${product.name}</th>
                      `).join('')}
                      <th style="width: 15%; text-align: center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${cateringData.map(row => `
                      <tr>
                        <td style="text-align: center">${row.program}</td>
                        ${chunk.map(product => `
                          <td style="text-align: center">${row.products[product.id] || 0}</td>
                        `).join('')}
                        <td style="text-align: center">${chunk.reduce((sum, product) => sum + (row.products[product.id] || 0), 0)}</td>
                      </tr>
                    `).join('')}
                    <tr class="total-row">
                      <td style="text-align: center">TOTAL</td>
                      ${chunk.map(product => `
                        <td style="text-align: center">${cateringData.reduce((sum, row) => sum + (row.products[product.id] || 0), 0)}</td>
                      `).join('')}
                      <td style="text-align: center">${chunk.reduce((sum, product) => sum + cateringData.reduce((rowSum, row) => rowSum + (row.products[product.id] || 0), 0), 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `).join('')}
          ` : ''}
        </body>
      </html>
    `;

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json() as RequestBody;
    const { month, type, action } = body;

    // Validate month format
    const parsedDate = parse(month, 'yyyy-MM', new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });
    }

    const startDate = format(startOfMonth(parsedDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(parsedDate), 'yyyy-MM-dd');

    let reportData: ReportData[] = [];
    let cateringData: CateringData[] | undefined;
    let products: CateringProduct[] | undefined;

    // Add debug logging
    console.log('Processing monthly report:', {
      month,
      type,
      startDate,
      endDate,
      action
    });

    if (type === 'all') {
      // Fetch all entries for the month
      const { data: entries, error } = await supabase
        .from('billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          package_id,
          products!inner (
            id,
            name,
            rate
          ),
          programs!inner (
            id,
            name
          ),
          packages!inner (
            id,
            name,
            type
          )
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) {
        console.error('Database query error:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
      }

      // Process entries and group by program
      const programTotals = (entries as unknown as DatabaseEntry[]).reduce((acc: { [key: string]: ReportData }, entry) => {
        const programName = entry.programs.name;
        if (!acc[programName]) {
          acc[programName] = {
            program: programName,
            cateringTotal: 0,
            extraTotal: 0,
            coldDrinkTotal: 0,
            grandTotal: 0
          };
        }

        const amount = entry.quantity * entry.products.rate;
        const packageType = entry.packages.type.toLowerCase();

        switch (packageType) {
          case 'normal':
            acc[programName].cateringTotal += amount;
            break;
          case 'extra':
            acc[programName].extraTotal += amount;
            break;
          case 'cold drink':
            acc[programName].coldDrinkTotal += amount;
            break;
        }

        acc[programName].grandTotal += amount;
        return acc;
      }, {});

      reportData = Object.values(programTotals);
    } else {
      // Get package ID based on type
      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink'
      };

      const mappedType = packageTypeMap[type as keyof typeof packageTypeMap];
      
      console.log('Fetching specific package:', { type, mappedType });

      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', mappedType)
        .single();

      if (packageError) {
        console.error('Error fetching package:', packageError);
        return NextResponse.json({ error: 'Failed to fetch package details' }, { status: 500 });
      }

      if (!packageData) {
        return NextResponse.json({ error: `Package not found for type: ${type}` }, { status: 404 });
      }

      const packageId = packageData.id;

      // Fetch products for the selected package
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('package_id', packageId)
        .order('name');

      if (productError) {
        console.error('Error fetching products:', productError);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
      }

      products = (productData as ProductData[]).map(p => ({
        ...p,
        quantity: 0
      }));

      console.log('Fetched products:', products);

      // Fetch entries for the selected package
      const { data: entries, error } = await supabase
        .from('billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          package_id,
          products!inner (
            id,
            name,
            rate
          ),
          programs!inner (
            id,
            name
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) {
        console.error('Database query error:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
      }

      console.log('Fetched entries:', entries);

      // Process entries and group by program
      const programTotals = (entries as unknown as DatabaseEntryWithoutPackages[]).reduce((acc: { [key: string]: CateringData }, entry) => {
        const programName = entry.programs.name;
        if (!acc[programName]) {
          acc[programName] = {
            program: programName,
            products: {},
            total: 0
          };
        }

        const productId = entry.products.id;
        acc[programName].products[productId] = (acc[programName].products[productId] || 0) + entry.quantity;
        acc[programName].total += entry.quantity;
        return acc;
      }, {});

      cateringData = Object.values(programTotals);

      console.log('Processed catering data:', cateringData);
    }

    // Generate PDF if requested
    if (action === 'print' || action === 'download') {
      const pdf = await generatePDF(reportData, month, type, cateringData, products);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': action === 'download' 
            ? `attachment; filename=monthly-report-${format(parsedDate, 'yyyy-MM')}.pdf`
            : 'inline'
        }
      });
    }

    // Return JSON response with debug info
    return NextResponse.json({
      data: {
        month: format(parsedDate, 'yyyy-MM'),
        type,
        reportData,
        cateringData,
        products,
        debug: {
          hasReportData: reportData.length > 0,
          hasCateringData: cateringData ? cateringData.length > 0 : false,
          hasProducts: products ? products.length > 0 : false
        }
      }
    });

  } catch (error) {
    console.error('Error processing monthly report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
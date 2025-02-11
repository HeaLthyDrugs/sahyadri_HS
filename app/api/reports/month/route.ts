import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';
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
  type: 'all' | 'normal';
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
  type: 'all' | 'normal',
  cateringData?: CateringData[],
  products?: CateringProduct[]
) => {
  let browser;
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v123.0.0/chromium-v123.0.0-pack.tar');
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
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h2>${format(parseISO(month), 'MMMM yyyy')} ${type === 'all' ? 'All Packages Report' : 'Catering Report'}</h2>
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
            <div class="table-container no-break">
              <table>
                <thead>
                  <tr>
                    <th style="width: 8%; text-align: center">No.</th>
                    <th style="width: 25%; text-align: left">Program Name</th>
                    <th style="width: 10%; text-align: center">MT</th>
                    <th style="width: 10%; text-align: center">BF</th>
                    <th style="width: 10%; text-align: center">M-CRT</th>
                    <th style="width: 10%; text-align: center">LUNCH</th>
                    <th style="width: 7%; text-align: center">A-CRT</th>
                    <th style="width: 7%; text-align: center">HINER</th>
                    <th style="width: 13%; text-align: center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${cateringData.map((row, index) => {
                    const getProductQuantity = (productName: string) => {
                      const product = products?.find(p => p.name === productName);
                      return product ? (row.products[product.id] || 0) : 0;
                    };

                    const mt = getProductQuantity('MT');
                    const bf = getProductQuantity('BF');
                    const mcrt = getProductQuantity('M-CRT');
                    const lunch = getProductQuantity('LUNCH');
                    const acrt = getProductQuantity('A-CRT');
                    const hiner = getProductQuantity('HINER');
                    const total = mt + bf + mcrt + lunch + acrt + hiner;

                    return `
                      <tr>
                        <td style="text-align: center">${index + 1}</td>
                        <td>${row.program}</td>
                        <td style="text-align: center">${mt || ''}</td>
                        <td style="text-align: center">${bf || ''}</td>
                        <td style="text-align: center">${mcrt || ''}</td>
                        <td style="text-align: center">${lunch || ''}</td>
                        <td style="text-align: center">${acrt || ''}</td>
                        <td style="text-align: center">${hiner || ''}</td>
                        <td style="text-align: center">${total || ''}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr class="total-row">
                    <td colspan="2" style="text-align: right">TOTAL</td>
                    ${['MT', 'BF', 'M-CRT', 'LUNCH', 'A-CRT', 'HINER'].map(productName => {
                      const product = products?.find(p => p.name === productName);
                      const total = product ? cateringData.reduce((sum, row) => sum + (row.products[product.id] || 0), 0) : 0;
                      return `<td style="text-align: center">${total || ''}</td>`;
                    }).join('')}
                    <td style="text-align: center">${cateringData.reduce((sum, row) => sum + Object.values(row.products).reduce((a, b) => a + b, 0), 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
    const body: RequestBody = await request.json();
    const { month, type, action } = body;
    
    if (!month || typeof month !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid or missing month parameter'
      }, { status: 400 });
    }

    let parsedDate: Date;
    try {
      parsedDate = parseISO(month);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      return NextResponse.json({ 
        error: 'Invalid date format. Expected format: YYYY-MM'
      }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Fetch the report data based on the month and type
    const startDate = format(parsedDate, 'yyyy-MM-01');
    const endDate = format(parsedDate, 'yyyy-MM-dd');

    let reportData: ReportData[] = [];
    let cateringData: CateringData[] | undefined;
    let products: CateringProduct[] | undefined;

    if (type === 'all') {
      const { data: entries, error } = await supabase
        .from('billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          package_id,
          packages!inner (
            id,
            name,
            type
          ),
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

        if (packageType === 'normal' || packageType === 'catering') {
          acc[programName].cateringTotal += amount;
        } else if (packageType === 'extra') {
          acc[programName].extraTotal += amount;
        } else if (packageType === 'cold drink' || packageType === 'cold') {
          acc[programName].coldDrinkTotal += amount;
        }

        acc[programName].grandTotal += amount;
        return acc;
      }, {});

      reportData = Object.values(programTotals);
    } else {
      // Fetch catering products
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('package_id', 1); // Assuming 1 is the ID for normal/catering package

      if (productError) {
        console.error('Error fetching products:', productError);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
      }

      // Convert product data to match CateringProduct interface
      products = (productData as ProductData[]).map(p => ({
        ...p,
        quantity: 0 // Add required quantity field with default value
      }));

      // Fetch catering entries
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
        .eq('package_id', 1)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) {
        console.error('Database query error:', error);
        return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
      }

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

    // Return JSON response
    return NextResponse.json({
      data: {
        month: format(parsedDate, 'yyyy-MM'),
        type,
        reportData,
        cateringData,
        products
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
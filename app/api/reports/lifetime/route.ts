import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parse, isValid, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

interface RequestBody {
  startMonth: string;
  endMonth: string;
  packageId: string | null;
  action?: 'print' | 'download';
}

interface ProductConsumption {
  id: string;
  name: string;
  monthlyQuantities: { [month: string]: number };
  total: number;
}

interface PackageData {
  id: string;
  name: string;
  type: string;
  products: ProductConsumption[];
}

const MONTHS_PER_TABLE = 6;

const generatePDF = async (
  packageData: PackageData,
  startMonth: string,
  endMonth: string,
  months: string[]
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

    // Filter months with consumption
    const monthsWithConsumption = months.filter(month => 
      packageData.products.some(product => 
        (product.monthlyQuantities[month] || 0) > 0
      )
    ).sort();

    // Filter products with consumption
    const productsWithConsumption = packageData.products.filter(product => product.total > 0);

    // Split months into chunks for table pagination
    const monthChunks = [];
    for (let i = 0; i < monthsWithConsumption.length; i += MONTHS_PER_TABLE) {
      monthChunks.push(monthsWithConsumption.slice(i, i + MONTHS_PER_TABLE));
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Lifetime Report - ${startMonth} to ${endMonth}</title>
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
              text-align: center;
            }
            th { 
              background-color: #f8f9fa;
              font-weight: 600;
              color: #1a1a1a;
            }
            .product-name {
              text-align: left;
              font-weight: 500;
            }
            .total-row {
              background-color: #f8f9fa;
              font-weight: 600;
            }
            @page { 
              margin: 15mm;
              size: A4 landscape;
            }
            @media print {
              .page-break-before {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h2>${packageData.name} Consumption Report (${format(parse(startMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')} - ${format(parse(endMonth, 'yyyy-MM', new Date()), 'MMMM yyyy')})</h2>
          </div>

          ${monthChunks.map((chunk, chunkIndex) => `
            ${chunkIndex > 0 ? '<div class="page-break-before"></div>' : ''}
            <table>
              <thead>
                <tr>
                  <th style="width: 20%">Product Name</th>
                  ${chunk.map(month => `
                    <th>${format(parse(month, 'yyyy-MM', new Date()), 'MMM yyyy')}</th>
                  `).join('')}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${productsWithConsumption.map(product => `
                  <tr>
                    <td class="product-name">${product.name}</td>
                    ${chunk.map(month => `
                      <td>${product.monthlyQuantities[month] || 0}</td>
                    `).join('')}
                    <td>${product.total}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td>Monthly Total</td>
                  ${chunk.map(month => `
                    <td>${productsWithConsumption.reduce((sum, product) => sum + (product.monthlyQuantities[month] || 0), 0)}</td>
                  `).join('')}
                  <td>${productsWithConsumption.reduce((sum, product) => sum + product.total, 0)}</td>
                </tr>
              </tbody>
            </table>
          `).join('')}
        </body>
      </html>
    `;

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
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
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Validate request body
    const body = await request.json() as RequestBody;
    if (!body || !body.startMonth || !body.endMonth) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const { startMonth, endMonth, packageId, action } = body;

    // Validate date formats
    const startDate = parse(startMonth, 'yyyy-MM', new Date());
    const endDate = parse(endMonth, 'yyyy-MM', new Date());

    if (!isValid(startDate) || !isValid(endDate)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Get all months in the range
    const months = eachMonthOfInterval({
      start: startDate,
      end: endDate
    }).map(date => format(date, 'yyyy-MM'));

    // Fetch package details
    let packageData;
    if (packageId && packageId !== 'all') {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .single();

      if (error) {
        console.error('Error fetching package:', error);
        return NextResponse.json({ error: 'Failed to fetch package details' }, { status: 500 });
      }
      packageData = data;
    } else {
      // For 'all' packages, create a dummy package
      packageData = {
        id: 'all',
        name: 'All Packages',
        type: 'all'
      };
    }

    // Fetch products based on package
    let productsQuery = supabase.from('products').select('id, name');
    if (packageId && packageId !== 'all') {
      productsQuery = productsQuery.eq('package_id', packageId);
    }
    const { data: products, error: productsError } = await productsQuery;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    // Initialize product consumption data
    const productConsumption: ProductConsumption[] = products.map(product => ({
      id: product.id,
      name: product.name,
      monthlyQuantities: {},
      total: 0
    }));

    // Fetch billing entries
    let entriesQuery = supabase
      .from('billing_entries')
      .select(`
        entry_date,
        quantity,
        product_id
      `)
      .gte('entry_date', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('entry_date', format(endOfMonth(endDate), 'yyyy-MM-dd'));

    if (packageId && packageId !== 'all') {
      entriesQuery = entriesQuery.eq('package_id', packageId);
    }

    const { data: entries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    // Process entries
    entries.forEach(entry => {
      const month = format(new Date(entry.entry_date), 'yyyy-MM');
      const product = productConsumption.find(p => p.id === entry.product_id);
      if (product) {
        product.monthlyQuantities[month] = (product.monthlyQuantities[month] || 0) + entry.quantity;
        product.total += entry.quantity;
      }
    });

    const packageDataWithProducts: PackageData = {
      ...packageData,
      products: productConsumption
    };

    // Debug log
    console.log('Processed data:', {
      packageData: packageDataWithProducts,
      months,
      productCount: productConsumption.length,
      monthCount: months.length,
      sampleProduct: productConsumption[0]
    });

    // Generate PDF if requested
    if (action === 'print' || action === 'download') {
      const pdf = await generatePDF(packageDataWithProducts, startMonth, endMonth, months);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': action === 'download' 
            ? `attachment; filename=lifetime-report-${startMonth}-to-${endMonth}.pdf`
            : 'inline'
        }
      });
    }

    // Return JSON response with more detailed structure
    return NextResponse.json({
      data: {
        package: packageDataWithProducts,
        months,
        debug: {
          productCount: productConsumption.length,
          monthCount: months.length,
          entriesProcessed: entries.length
        }
      }
    });

  } catch (error) {
    console.error('Error processing lifetime report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
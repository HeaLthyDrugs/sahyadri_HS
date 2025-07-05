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

// Define product order for catering package
const CATERING_PRODUCT_ORDER = [
  'Morning Tea',
  'Breakfast',
  'Morning CRT',
  'LUNCH',
  'Afternoon CRT',
  'Hi-TEA',
  'DINNER'
];

// Helper function to normalize product names for comparison
const normalizeProductName = (name: string): string => {
  return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

// Helper function to get product order index
const getProductOrderIndex = (productName: string, packageType: string): number => {
  // Check for both 'catering' and 'normal' package types
  if (packageType.toLowerCase() === 'catering' || packageType.toLowerCase() === 'normal' || packageType.toLowerCase().includes('catering package')) {
    // Try exact match first
    const directIndex = CATERING_PRODUCT_ORDER.findIndex(name => 
      name.toUpperCase() === productName.trim().toUpperCase()
    );
    if (directIndex !== -1) return directIndex;
    
    // Try normalized match
    const normalizedName = normalizeProductName(productName);
    for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
      const orderName = normalizeProductName(CATERING_PRODUCT_ORDER[i]);
      
      // Exact normalized match
      if (normalizedName === orderName) return i;
      
      // Contains match (for partial matches)
      if (normalizedName.includes(orderName) || orderName.includes(normalizedName)) {
        return i;
      }
    }
    
    return CATERING_PRODUCT_ORDER.length;
  }
  return -1;
};

const generatePDF = async (
  packageData: PackageData,
  startMonth: string,
  endMonth: string,
  months: string[]
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

    // Filter months with consumption
    const monthsWithConsumption = months.filter(month => 
      packageData.products.some(product => 
        (product.monthlyQuantities[month] || 0) > 0
      )
    ).sort();

    // Filter products with consumption
    const productsWithConsumption = packageData.products
      .filter(product => product.total > 0)
      .sort((a, b) => {
        const orderA = getProductOrderIndex(a.name, packageData.type);
        const orderB = getProductOrderIndex(b.name, packageData.type);
        
        // If both products are in the catering order list
        if (orderA !== -1 && orderB !== -1) {
          return orderA - orderB;
        }
        // If only one product is in the list, prioritize it
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        // For products not in the list, maintain original order
        return 0;
      });

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
              background-color: #fff;
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
              background-color: #fff;
              font-weight: 600;
              color: #1a1a1a;
            }
            .product-name {
              text-align: left;
              font-weight: 500;
            }
            .total-row {
              background-color: #fff;
              font-weight: 600;
            }
            @page { 
              margin: 15mm;
              size: A4 portrait;
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
    if (packageId && packageId !== 'all' && packageId !== null) {
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
    let productsQuery = supabase.from('products').select('id, name, package_id');
    if (packageId && packageId !== 'all' && packageId !== null) {
      productsQuery = productsQuery.eq('package_id', packageId);
    } else {
      // For 'all' packages, only fetch products from the main package types
      // First get the package IDs for Normal, Extra, and Cold Drink types
      const { data: mainPackages, error: mainPackagesError } = await supabase
        .from('packages')
        .select('id, type')
        .in('type', ['Normal', 'Extra', 'Cold Drink']);
      
      if (mainPackagesError) {
        console.error('Error fetching main packages:', mainPackagesError);
        return NextResponse.json({ error: 'Failed to fetch main packages' }, { status: 500 });
      }
      
      const mainPackageIds = mainPackages.map(pkg => pkg.id);
      console.log('LifeTime Report - All packages mode:', {
        mainPackages: mainPackages.map(pkg => ({ id: pkg.id, type: pkg.type })),
        mainPackageIds,
        willQueryThesePackageIds: mainPackageIds
      });
      productsQuery = productsQuery.in('package_id', mainPackageIds);
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

    // Fetch billing entries from both tables
    let programEntriesQuery = supabase
      .from('billing_entries')
      .select(`
        entry_date,
        quantity,
        product_id
      `)
      .gte('entry_date', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('entry_date', format(endOfMonth(endDate), 'yyyy-MM-dd'));

    let staffEntriesQuery = supabase
      .from('staff_billing_entries')
      .select(`
        entry_date,
        quantity,
        product_id
      `)
      .gte('entry_date', format(startOfMonth(startDate), 'yyyy-MM-dd'))
      .lte('entry_date', format(endOfMonth(endDate), 'yyyy-MM-dd'));

    if (packageId && packageId !== 'all' && packageId !== null) {
      programEntriesQuery = programEntriesQuery.eq('package_id', packageId);
      staffEntriesQuery = staffEntriesQuery.eq('package_id', packageId);
    } else {
      // For 'all' packages, filter by the main package types
      const { data: mainPackages, error: mainPackagesError } = await supabase
        .from('packages')
        .select('id, type')
        .in('type', ['Normal', 'Extra', 'Cold Drink']);
      
      if (mainPackagesError) {
        console.error('Error fetching main packages for entries:', mainPackagesError);
        return NextResponse.json({ error: 'Failed to fetch main packages for entries' }, { status: 500 });
      }
      
      const mainPackageIds = mainPackages.map(pkg => pkg.id);
      programEntriesQuery = programEntriesQuery.in('package_id', mainPackageIds);
      staffEntriesQuery = staffEntriesQuery.in('package_id', mainPackageIds);
    }

    const [programEntriesResponse, staffEntriesResponse] = await Promise.all([
      programEntriesQuery,
      staffEntriesQuery
    ]);

    if (programEntriesResponse.error) {
      console.error('Error fetching program entries:', programEntriesResponse.error);
      return NextResponse.json({ error: 'Failed to fetch program entries' }, { status: 500 });
    }

    if (staffEntriesResponse.error) {
      console.error('Error fetching staff entries:', staffEntriesResponse.error);
      return NextResponse.json({ error: 'Failed to fetch staff entries' }, { status: 500 });
    }

    console.log('Lifetime Report data fetch:', {
      packageId,
      originalDateRange: { startMonth, endMonth },
      parsedDateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      actualQueryRange: { 
        start: format(startOfMonth(startDate), 'yyyy-MM-dd'), 
        end: format(endOfMonth(endDate), 'yyyy-MM-dd') 
      },
      programEntries: programEntriesResponse.data?.length || 0,
      staffEntries: staffEntriesResponse.data?.length || 0,
      monthsInRange: months,
      queryingAllPackages: packageId === 'all' || packageId === null,
      selectedPackageId: packageId
    });

    // Add detailed June 2025 raw data analysis
    const june2025ProgramEntries = programEntriesResponse.data?.filter(entry => 
      entry.entry_date.startsWith('2025-06')
    ) || [];
    const june2025StaffEntries = staffEntriesResponse.data?.filter(entry => 
      entry.entry_date.startsWith('2025-06')
    ) || [];

    console.log('LifeTime Report June 2025 Raw Data Analysis:', {
      june2025ProgramCount: june2025ProgramEntries.length,
      june2025StaffCount: june2025StaffEntries.length,
      june2025ProgramTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025StaffTotal: june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025CombinedTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0) + 
                            june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025ProgramDates: [...new Set(june2025ProgramEntries.map(e => e.entry_date))].sort(),
      june2025StaffDates: [...new Set(june2025StaffEntries.map(e => e.entry_date))].sort(),
      june2025ProductBreakdown: (() => {
        const breakdown: { [key: string]: number } = {};
        june2025ProgramEntries.forEach(entry => {
          breakdown[entry.product_id] = (breakdown[entry.product_id] || 0) + entry.quantity;
        });
        june2025StaffEntries.forEach(entry => {
          breakdown[entry.product_id] = (breakdown[entry.product_id] || 0) + entry.quantity;
        });
        return breakdown;
      })()
    });

    // Process program entries
    programEntriesResponse.data?.forEach(entry => {
      const month = format(new Date(entry.entry_date), 'yyyy-MM');
      const product = productConsumption.find(p => p.id === entry.product_id);
      if (product) {
        product.monthlyQuantities[month] = (product.monthlyQuantities[month] || 0) + entry.quantity;
        product.total += entry.quantity;
      }
    });

    // Process staff entries (add to existing quantities)
    staffEntriesResponse.data?.forEach(entry => {
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
      sampleProduct: productConsumption[0],
      totalConsumption: productConsumption.reduce((sum, p) => sum + p.total, 0),
      detailedBreakdown: {
        byProduct: productConsumption.filter(p => p.total > 0).map(p => ({
          id: p.id,
          name: p.name,
          total: p.total,
          monthlyQuantities: p.monthlyQuantities
        })),
        byMonth: months.reduce((acc, month) => {
          acc[month] = productConsumption.reduce((sum, p) => sum + (p.monthlyQuantities[month] || 0), 0);
          return acc;
        }, {} as { [key: string]: number })
      },
      // Add specific calculation verification for June 2025
      june2025Verification: {
        monthKey: '2025-06',
        june2025Total: productConsumption.reduce((sum, p) => sum + (p.monthlyQuantities['2025-06'] || 0), 0),
        productBreakdown: productConsumption.filter(p => (p.monthlyQuantities['2025-06'] || 0) > 0).map(p => ({
          name: p.name,
          june2025Quantity: p.monthlyQuantities['2025-06'] || 0
        })),
        dataSourceVerification: {
          programEntriesCount: programEntriesResponse.data?.length || 0,
          staffEntriesCount: staffEntriesResponse.data?.length || 0,
          combinedEntriesCount: (programEntriesResponse.data?.length || 0) + (staffEntriesResponse.data?.length || 0)
        }
      }
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
          programEntriesProcessed: programEntriesResponse.data?.length || 0,
          staffEntriesProcessed: staffEntriesResponse.data?.length || 0
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
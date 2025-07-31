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
  serve_item_no?: number;
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
                  <th style="width: 10%">Sr. No</th>
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
                    <td style="text-align: center;">${product.serve_item_no || '-'}</td>
                    <td class="product-name">${product.name}</td>
                    ${chunk.map(month => `
                      <td>${product.monthlyQuantities[month] || 0}</td>
                    `).join('')}
                    <td>${product.total}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td style="text-align: center;">-</td>
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
  /*
   * LIFETIME REPORT WITH PROGRAM_MONTH_MAPPINGS APPROACH - FIXED
   * 
   * This endpoint now uses the same data fetching methodology as the Invoice system:
   * 
   * 1. Program Entries: Uses program_month_mappings table to determine which programs
   *    belong to each billing month, rather than filtering by entry dates. This ensures
   *    only programs assigned to specific billing months are included.
   * 
   * 2. Staff Entries: Still uses date-based filtering (month start to end) as staff
   *    entries are not tied to program mappings.
   * 
   * 3. Monthly Processing: Processes each month individually to ensure accurate
   *    program-to-month mapping, then aggregates the results.
   * 
   * 4. CRITICAL FIX: After fetching the data correctly month by month, quantities
   *    are now assigned to the correct billing month (from program_month_mappings)
   *    rather than the entry_date. This ensures that:
   *    - Program entries appear in their assigned billing month
   *    - Staff entries appear in their actual calendar month
   *    - Total quantities match invoice calculations exactly
   * 
   * This approach matches the Invoice logic and ensures data consistency between
   * Invoice and Lifetime Report systems.
   */
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
    let productsQuery = supabase.from('products').select('id, name, package_id, serve_item_no');
    console.log('LifeTime Report - Fetching products with serve_item_no field');
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
      serve_item_no: product.serve_item_no,
      monthlyQuantities: {},
      total: 0
    }));
    
    console.log('LifeTime Report - Initial product data with serve_item_no:', {
      totalProducts: products.length,
      sampleProduct: products[0],
      productsWithServeItemNo: products.filter(p => p.serve_item_no).length,
      productConsumptionSample: productConsumption[0]
    });

    // Initialize tracking for monthly data aggregation
    const monthlyProgramData: { [month: string]: any[] } = {};
    const monthlyStaffData: { [month: string]: any[] } = {};

    // Process each month individually using program_month_mappings approach (like invoice)
    for (const month of months) {
      console.log(`Processing month: ${month}`);

      // Step 1: Get program mappings for this billing month
      const { data: programMappings, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('program_id')
        .eq('billing_month', month);

      if (mappingsError) {
        console.error(`Error fetching program mappings for ${month}:`, mappingsError);
        continue; // Skip this month if mapping fails
      }

      const programIds = programMappings?.map(p => p.program_id) || [];
      console.log(`Month ${month}: Found ${programIds.length} programs in mappings`);

      // Step 2: Fetch program billing entries using program IDs from billing month mapping
      if (programIds.length > 0) {
        let programEntriesQuery = supabase
          .from('billing_entries')
          .select(`
            entry_date,
            quantity,
            product_id,
            program_id,
            products!billing_entries_product_id_fkey(id, name, serve_item_no)
          `)
          .in('program_id', programIds);

        // Filter by package if specified
        if (packageId && packageId !== 'all' && packageId !== null) {
          programEntriesQuery = programEntriesQuery.eq('package_id', packageId);
        } else {
          // For 'all' packages, filter by the main package types
          const { data: mainPackages, error: mainPackagesError } = await supabase
            .from('packages')
            .select('id, type')
            .in('type', ['Normal', 'Extra', 'Cold Drink']);
          
          if (mainPackagesError) {
            console.error('Error fetching main packages for entries:', mainPackagesError);
            continue;
          }
          
          const mainPackageIds = mainPackages.map(pkg => pkg.id);
          programEntriesQuery = programEntriesQuery.in('package_id', mainPackageIds);
        }

        const { data: programEntries, error: programError } = await programEntriesQuery;

        if (programError) {
          console.error(`Error fetching program entries for ${month}:`, programError);
        } else {
          monthlyProgramData[month] = programEntries || [];
          console.log(`Month ${month}: Found ${programEntries?.length || 0} program entries`);
        }
      } else {
        monthlyProgramData[month] = [];
      }

      // Step 3: Fetch staff billing entries using date range for this month
      const monthStartDate = startOfMonth(parse(month, 'yyyy-MM', new Date()));
      const monthEndDate = endOfMonth(parse(month, 'yyyy-MM', new Date()));

      let staffEntriesQuery = supabase
        .from('staff_billing_entries')
        .select(`
          entry_date,
          quantity,
          product_id,
          products!staff_billing_entries_product_id_fkey(id, name, serve_item_no)
        `)
        .gte('entry_date', format(monthStartDate, 'yyyy-MM-dd'))
        .lte('entry_date', format(monthEndDate, 'yyyy-MM-dd'));

      // Filter by package if specified
      if (packageId && packageId !== 'all' && packageId !== null) {
        staffEntriesQuery = staffEntriesQuery.eq('package_id', packageId);
      } else {
        // For 'all' packages, filter by the main package types
        const { data: mainPackages, error: mainPackagesError } = await supabase
          .from('packages')
          .select('id, type')
          .in('type', ['Normal', 'Extra', 'Cold Drink']);
        
        if (mainPackagesError) {
          console.error('Error fetching main packages for staff entries:', mainPackagesError);
          continue;
        }
        
        const mainPackageIds = mainPackages.map(pkg => pkg.id);
        staffEntriesQuery = staffEntriesQuery.in('package_id', mainPackageIds);
      }

      const { data: staffEntries, error: staffError } = await staffEntriesQuery;

      if (staffError) {
        console.error(`Error fetching staff entries for ${month}:`, staffError);
        monthlyStaffData[month] = [];
      } else {
        monthlyStaffData[month] = staffEntries || [];
        console.log(`Month ${month}: Found ${staffEntries?.length || 0} staff entries`);
      }
    }

    // Combine all monthly data for backward compatibility with existing processing logic
    const allProgramEntries = Object.values(monthlyProgramData).flat();
    const allStaffEntries = Object.values(monthlyStaffData).flat();

    const programEntriesResponse = { data: allProgramEntries, error: null };
    const staffEntriesResponse = { data: allStaffEntries, error: null };

    if (programEntriesResponse.error) {
      console.error('Error fetching program entries:', programEntriesResponse.error);
      return NextResponse.json({ error: 'Failed to fetch program entries' }, { status: 500 });
    }

    if (staffEntriesResponse.error) {
      console.error('Error fetching staff entries:', staffEntriesResponse.error);
      return NextResponse.json({ error: 'Failed to fetch staff entries' }, { status: 500 });
    }

    console.log('Lifetime Report data fetch (program_month_mappings approach):', {
      packageId,
      originalDateRange: { startMonth, endMonth },
      parsedDateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
      monthsInRange: months,
      queryingAllPackages: packageId === 'all' || packageId === null,
      selectedPackageId: packageId,
      newApproach: {
        monthlyProgramDataBreakdown: Object.keys(monthlyProgramData).map(month => ({
          month,
          programEntries: monthlyProgramData[month]?.length || 0,
          staffEntries: monthlyStaffData[month]?.length || 0
        })),
        totalProgramEntries: allProgramEntries.length,
        totalStaffEntries: allStaffEntries.length,
        comparisonWithOldApproach: {
          programEntries: programEntriesResponse.data?.length || 0,
          staffEntries: staffEntriesResponse.data?.length || 0
        }
      }
    });

    // Add detailed June 2025 raw data analysis with new program_month_mappings approach
    const june2025ProgramEntries = monthlyProgramData['2025-06'] || [];
    const june2025StaffEntries = monthlyStaffData['2025-06'] || [];

    console.log('LifeTime Report June 2025 Raw Data Analysis (program_month_mappings approach - FIXED):', {
      june2025ProgramCount: june2025ProgramEntries.length,
      june2025StaffCount: june2025StaffEntries.length,
      june2025ProgramTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025StaffTotal: june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025CombinedTotal: june2025ProgramEntries.reduce((sum, entry) => sum + entry.quantity, 0) + 
                            june2025StaffEntries.reduce((sum, entry) => sum + entry.quantity, 0),
      june2025ProgramsByMapping: june2025ProgramEntries.length > 0 ? 
        [...new Set(june2025ProgramEntries.map(e => e.program_id))] : [],
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
      })(),
      fixNote: 'CRITICAL FIX APPLIED: Quantities now assigned to billing month 2025-06 regardless of entry_date',
      comparisonNote: 'Using program_month_mappings ensures only programs assigned to June 2025 billing month are included, and quantities appear in correct month'
    });

    // Process program entries by billing month (not entry_date) - this is the key fix!
    // Since we already fetched data month by month using program_month_mappings,
    // we need to assign quantities to the correct billing month
    Object.entries(monthlyProgramData).forEach(([billingMonth, entries]) => {
      entries.forEach(entry => {
        const product = productConsumption.find(p => p.id === entry.product_id);
        if (product && entry.products) {
          // Ensure serve_item_no is properly assigned from the fetched product data
          product.serve_item_no = entry.products.serve_item_no;
          product.monthlyQuantities[billingMonth] = (product.monthlyQuantities[billingMonth] || 0) + entry.quantity;
          product.total += entry.quantity;
        }
      });
    });
    
    console.log('LifeTime Report - Program entries processed, serve_item_no check:', {
      sampleProduct: productConsumption.find(p => p.total > 0),
      productsWithServeItemNo: productConsumption.filter(p => p.serve_item_no).length,
      totalProducts: productConsumption.length
    });

    // Process staff entries by billing month (not entry_date) - maintaining consistency
    Object.entries(monthlyStaffData).forEach(([billingMonth, entries]) => {
      entries.forEach(entry => {
        const product = productConsumption.find(p => p.id === entry.product_id);
        if (product && entry.products) {
          // Ensure serve_item_no is properly assigned from the fetched product data
          product.serve_item_no = entry.products.serve_item_no;
          product.monthlyQuantities[billingMonth] = (product.monthlyQuantities[billingMonth] || 0) + entry.quantity;
          product.total += entry.quantity;
        }
      });
    });
    
    console.log('LifeTime Report - Staff entries processed, serve_item_no check:', {
      sampleProduct: productConsumption.find(p => p.total > 0),
      productsWithServeItemNo: productConsumption.filter(p => p.serve_item_no).length,
      totalProducts: productConsumption.length
    });

    const packageDataWithProducts: PackageData = {
      ...packageData,
      products: productConsumption
    };

    // Debug log with enhanced program_month_mappings insights
    console.log('Processed data (program_month_mappings approach - FIXED):', {
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
          programEntriesCountViaMapping: june2025ProgramEntries.length,
          staffEntriesCountViaDateRange: june2025StaffEntries.length,
          combinedEntriesCount: june2025ProgramEntries.length + june2025StaffEntries.length,
          mappingApproachNote: 'Program entries assigned to billing month 2025-06 via program_month_mappings',
          expectedMatchWithInvoice: 'Should now match invoice quantity exactly for June 2025'
        }
      },
      fixApplied: {
        description: 'CRITICAL FIX: Now assigns quantities to billing month (from program_month_mappings) instead of entry_date',
        beforeFix: 'Quantities were assigned to months based on entry_date which could be different from billing month',
        afterFix: 'Quantities are assigned to correct billing months as determined by program_month_mappings table',
        invoiceConsistency: 'Now matches invoice logic exactly - both use program_month_mappings for program assignment'
      },
      newApproachSummary: {
        description: 'Now using program_month_mappings to determine which programs belong to each billing month AND assigning quantities correctly',
        benefit: 'Ensures only programs assigned to specific billing months are included AND quantities appear in correct months',
        monthlyDataBreakdown: Object.keys(monthlyProgramData).map(month => ({
          month,
          programEntriesViaMapping: monthlyProgramData[month]?.length || 0,
          staffEntriesViaDateRange: monthlyStaffData[month]?.length || 0,
          totalForMonth: productConsumption.reduce((sum, p) => sum + (p.monthlyQuantities[month] || 0), 0)
        }))
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

    // Return JSON response with more detailed structure and new approach info
    return NextResponse.json({
      data: {
        package: packageDataWithProducts,
        months,
        debug: {
          productCount: productConsumption.length,
          monthCount: months.length,
          programEntriesProcessed: allProgramEntries.length,
          staffEntriesProcessed: allStaffEntries.length,
          approach: 'program_month_mappings',
          monthlyBreakdown: Object.keys(monthlyProgramData).map(month => ({
            month,
            programEntries: monthlyProgramData[month]?.length || 0,
            staffEntries: monthlyStaffData[month]?.length || 0
          }))
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
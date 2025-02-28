import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

// Types matching the frontend component
interface DayReportEntry {
  packageType: string;
  productName: string;
  quantity: number;
  rate: number;
  total: number;
}

interface DayReportData {
  date: string;
  entries: DayReportEntry[];
  grandTotal: number;
}

interface RequestBody {
  date: string;
  packageType?: string;
  action?: 'print' | 'download';
}

// Update package type order and display names
const PACKAGE_TYPE_ORDER: Record<string, number> = {
  'Normal': 1,
  'Extra': 2,
  'Cold Drink': 3
};

// Define product order for catering package with full names
const CATERING_PRODUCT_ORDER = [
  { code: 'MT', name: 'Morning Tea' },
  { code: 'BF', name: 'Breakfast' },
  { code: 'M-CRT', name: 'Morning CRT' },
  { code: 'LUNCH', name: 'Afternoon Lunch' },
  { code: 'A-CRT', name: 'Afternoon CRT' },
  { code: 'HI TEA', name: 'Hi Tea' },
  { code: 'DINNER', name: 'Dinner' }
];

// Helper function to get product order index
const getProductOrderIndex = (productName: string, packageType: string): number => {
  if (normalizePackageType(packageType) === 'Normal') {
    // Check both code and full name
    const index = CATERING_PRODUCT_ORDER.findIndex(
      product => productName === product.code || productName === product.name
    );
    return index === -1 ? CATERING_PRODUCT_ORDER.length : index;
  }
  return -1;
};

type PackageTypeKey = 'Normal' | 'Extra' | 'Cold Drink';

const PACKAGE_NAMES: Record<PackageTypeKey, string> = {
  'Normal': 'Catering Package',
  'Extra': 'Extra Catering',
  'Cold Drink': 'Cold Drinks'
};

const normalizePackageType = (type: string): string => {
  const normalized = type.toLowerCase();
  if (normalized === 'extra') return 'Extra';
  if (normalized === 'cold drink' || normalized === 'cold') return 'Cold Drink';
  if (normalized === 'normal' || normalized === 'catering') return 'Normal';
  return type;
};

const PACKAGE_TYPE_DISPLAY: Record<PackageTypeKey, string> = {
  'Normal': 'CATERING',
  'Extra': 'EXTRA CATERING',
  'Cold Drink': 'COLD DRINKS'
};

const PACKAGE_ORDER = ['Normal', 'Extra', 'Cold Drink'];

const generatePDF = async (data: DayReportEntry[], date: string, packageType?: string, options?: { 
  compactTables?: boolean;
  optimizePageBreaks?: boolean;
}) => {
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
          <title>Day Report - ${date}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              font-size: 11px;
            }
            .report-header {
              text-align: center;
              margin-bottom: ${options?.compactTables ? '10px' : '20px'};
              padding: ${options?.compactTables ? '8px' : '12px'};
              background-color: #fff;
              border-bottom: 1px solid #dee2e6;
            }
            .report-header h2 {
              margin: 0;
              color: #1a1a1a;
              font-size: 16px;
            }
            .report-header p {
              margin: 6px 0 0;
              color: #4a5568;
              font-size: 12px;
            }
            .package-section {
              margin-bottom: ${options?.compactTables ? '10px' : '20px'};
              page-break-inside: avoid;
            }
            .package-header { 
              background-color: #fff;
              padding: 8px;
              margin: 12px 0 8px;
              text-align: center;
            }
            .package-header h4 {
              margin: 0;
              color: #1a1a1a;
              font-size: 14px;
              border: 1px solid #dee2e6;
              border-radius: 3px;
              padding: 4px;
            }
            .total-row { 
              background-color: #fff ;
              font-weight: 600;
            }
            .grand-total {
              margin-top: 20px;
              padding: 10px;
              text-align: right;
              background-color: #fff ;
              border: 1px solid #dee2e6;
              border-radius: 3px;
              page-break-inside: avoid;
            }
            .grand-total strong {
              font-size: 13px;
              color: #1a1a1a;
            }
            .table-container {
              width: 100%;
              margin: ${options?.compactTables ? '5px 0' : '10px 0'};
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: ${options?.compactTables ? '5px' : '10px'};
            }
            th, td {
              padding: ${options?.compactTables ? '4px' : '8px'};
              border: 1px solid #ddd;
            }
            .page-break-before {
              page-break-before: always;
            }
            @media print {
              .report-header {
                position: relative;
                top: 0;
                margin-top: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h2>Day Report - ${format(new Date(date), 'dd/MM/yyyy')}</h2>
          </div>

          ${Object.entries(
            data.reduce((groups, entry) => {
              const groupKey = entry.packageType === 'Extra' ? 'Extra' : 
                            entry.packageType === 'Cold Drink' || entry.packageType === 'cold' ? 'Cold Drink' :
                            'Normal';
              if (!groups[groupKey]) {
                groups[groupKey] = [];
              }
              groups[groupKey].push(entry);
              return groups;
            }, {} as { [key: string]: DayReportEntry[] })
          )
            .filter(([type]) => {
              if (!packageType || packageType === 'all') return true;
              return normalizePackageType(type) === normalizePackageType(packageType);
            })
            .sort(([typeA], [typeB]) => {
              const orderA = PACKAGE_ORDER.indexOf(typeA);
              const orderB = PACKAGE_ORDER.indexOf(typeB);
              return orderA - orderB;
            })
            .map(([type, entries], index) => {
              const packageTotal = entries.reduce((sum, entry) => sum + entry.total, 0);
              const needsPageBreak = type === 'Cold Drink' && 
                (entries.length > 10 || !options?.optimizePageBreaks);

              return `
                ${needsPageBreak ? '<div class="page-break-before"></div>' : ''}
                <div class="package-section">
                  <div class="package-header">
                    <h4>${PACKAGE_NAMES[type as keyof typeof PACKAGE_NAMES] || type}</h4>
                  </div>
                  <div class="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style="width: 40%; text-align: left">Product Name</th>
                          <th style="width: 15%; text-align: center">Quantity</th>
                          <th style="width: 20%; text-align: right">Rate</th>
                          <th style="width: 25%; text-align: right">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${[...entries]
                          .sort((a, b) => a.productName.localeCompare(b.productName))
                          .map(entry => `
                            <tr>
                              <td>${entry.productName}</td>
                              <td style="text-align: center">${entry.quantity}</td>
                              <td style="text-align: right">₹${entry.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style="text-align: right">₹${entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          `).join('')}
                        <tr class="total-row">
                          <td colspan="3" style="text-align: right">Package Total</td>
                          <td style="text-align: right">₹${packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}

          ${(!packageType || packageType === 'all') ? `
            <div class="grand-total">
              <strong>Grand Total: ₹${data.reduce((sum, entry) => sum + entry.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Add page numbers
    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = `
        .pageNumber:before {
          content: counter(page);
        }
        @media print {
          .pageNumber {
            position: fixed;
            bottom: 10px;
            right: 10px;
            font-size: 12px;
            color: #666;
          }
        }
      `;
      document.head.appendChild(style);
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
    const { date, packageType, action } = body;
    
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid or missing date parameter'
      }, { status: 400 });
    }

    let parsedDate: Date;
    try {
      parsedDate = parseISO(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      return NextResponse.json({ 
        error: 'Invalid date format. Expected format: YYYY-MM-DD'
      }, { status: 400 });
    }

    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Updated query to match the working SQL structure
    let query = supabase
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
        )
      `)
      .eq('entry_date', formattedDate);

    if (packageType && packageType !== 'all') {
      // First get the package ID for the selected type
      const { data: packageData } = await supabase
        .from('packages')
        .select('id, type')
        .ilike('type', `%${normalizePackageType(packageType)}%`)
        .single();

      if (packageData) {
        query = query.eq('package_id', packageData.id);
      }
    }

    const { data: entries, error } = await query;

    console.log('Query response:', { entries, error, formattedDate }); // Debug log

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        data: {
          date: formattedDate,
          entries: [],
          grandTotal: 0
        },
        meta: { 
          date: formattedDate, 
          entriesFound: 0,
          totalAmount: 0
        }
      });
    }

    // Process entries with proper type checking and debugging
    const processedEntries = entries
      .filter(entry => {
        const isValid = entry.packages && entry.products;
        if (!isValid) {
          console.log('Filtered out invalid entry:', entry);
        }
        return isValid;
      })
      .map((entry: any): DayReportEntry => {
        const normalizedType = normalizePackageType(entry.packages.type);
        return {
          packageType: normalizedType,
          productName: entry.products.name,
          quantity: entry.quantity,
          rate: entry.products.rate,
          total: entry.quantity * entry.products.rate
        };
      });

    // Group entries by package type to prevent duplicates
    const groupedEntries = processedEntries.reduce((acc, entry) => {
      const key = `${entry.packageType}-${entry.productName}`;
      if (!acc[key]) {
        acc[key] = { ...entry, quantity: 0 };
      }
      acc[key].quantity += entry.quantity;
      acc[key].total = acc[key].quantity * acc[key].rate;
      return acc;
    }, {} as Record<string, DayReportEntry>);

    // Convert back to array and sort by package type and product name
    const finalEntries = Object.values(groupedEntries).sort((a, b) => {
      // First sort by package type
      const packageOrderDiff = 
        (PACKAGE_TYPE_ORDER[a.packageType as PackageTypeKey] || 999) - 
        (PACKAGE_TYPE_ORDER[b.packageType as PackageTypeKey] || 999);
      
      if (packageOrderDiff !== 0) return packageOrderDiff;
      
      // For catering package, use the defined order
      if (normalizePackageType(a.packageType) === 'Normal') {
        const orderA = getProductOrderIndex(a.productName, a.packageType);
        const orderB = getProductOrderIndex(b.productName, b.packageType);
        return orderA - orderB;
      }
      
      // For other packages, sort alphabetically
      return a.productName.localeCompare(b.productName);
    });

    // Calculate grand total from final entries
    const grandTotal = finalEntries.reduce((sum, entry) => sum + entry.total, 0);

    // Generate PDF if requested
    if (action === 'print' || action === 'download') {
      const pdf = await generatePDF(finalEntries, formattedDate, packageType);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': action === 'download' 
            ? `attachment; filename=day-report-${formattedDate}.pdf`
            : 'inline'
        }
      });
    }

    // Return JSON response with proper structure
    const response = {
      data: {
        date: formattedDate,
        entries: finalEntries,
        grandTotal
      },
      meta: {
        date: formattedDate,
        entriesFound: finalEntries.length,
        totalAmount: grandTotal
      }
    };

    console.log('Final response:', response); // Debug log

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error processing day report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
} 
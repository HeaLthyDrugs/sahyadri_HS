import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  rate: number;
}

interface Entry {
  date: string;
  quantities: Record<string, number>;
}

interface PackageData {
  products: Product[];
  entries: Entry[];
  totals: Record<string, number>;
  rates: Record<string, number>;
  totalAmounts: Record<string, number>;
}

interface Packages {
  [key: string]: PackageData;
}

interface ProgramReport {
  packages: {
    [key: string]: PackageData;
  };
}

const PACKAGE_NAMES = {
  'Normal': 'Catering Package',
  'Extra': 'Extra Catering Package',
  'Cold Drink': 'Cold Drink Package'
} as const;

const PACKAGE_ORDER = ['Normal', 'Extra', 'Cold Drink'];

export async function POST(req: NextRequest) {
  try {
    const { programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages, action } = await req.json();

    let browser;
    try {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        // Configure chromium for production/Vercel environment
        const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v123.0.0/chromium-v123.0.0-pack.tar');
        browser = await puppeteerCore.launch({
          executablePath,
          args: chromium.args,
          headless: true as const,
          defaultViewport: chromium.defaultViewport
        });
      } else {
        // Local development environment
        browser = await puppeteer.launch({
          headless: true as const,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
      }

      const page = await browser.newPage();

      // Get all unique dates from all packages
      const allDates = new Set<string>();
      Object.values(packages).forEach((pkg: any) => {
        pkg.entries.forEach((entry: any) => allDates.add(entry.date));
      });

      // Filter dates with consumption
      const datesWithConsumption = Array.from(allDates).filter(date => 
        Object.values(packages).some((pkg: any) => 
          pkg.entries.some((entry: any) => 
            Object.values(entry.quantities).some(qty => (qty as number) > 0)
          )
        )
      ).sort();

      // Filter package types based on selection
      const filteredPackages = selectedPackage === 'all' 
        ? packages 
        : Object.entries(packages).reduce((acc: any, [type, data]: [string, any]) => {
            if (type.toLowerCase() === selectedPackage.toLowerCase()) {
              acc[type] = data;
            }
            return acc;
          }, {});

      const PRODUCTS_PER_TABLE = 7;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Program Report - ${programName}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0;
                padding: 8px;
                font-size: 9px;
              }
              .report-header {
                text-align: center;
                margin-bottom: 16px;
                padding: 8px;
                background-color: #fff;
                border-bottom: 1px solid #dee2e6;
              }
              .report-header h2 {
                margin: 0;
                color: #1a1a1a;
                font-size: 14px;
              }
              .program-details {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                margin-bottom: 16px;
                padding: 12px;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
              }
              .program-details div {
                text-align: center;
              }
              .program-details p {
                margin: 2px 0;
              }
              .program-details .label {
                color: #6b7280;
                font-size: 8px;
              }
              .program-details .value {
                color: #1f2937;
                font-weight: 500;
                font-size: 9px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 12px;
                border: 1px solid #dee2e6;
                table-layout: fixed;
              }
              th, td { 
                border: 1px solid #dee2e6; 
                padding: 4px;
                font-size: 9px;
                text-align: center;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
              th:first-child, td:first-child {
                width: 120px;
                text-align: left;
              }
              th:not(:first-child), td:not(:first-child) {
                width: 45px;
              }
              th:nth-last-child(-n+3), td:nth-last-child(-n+3) {
                width: 60px;
              }
              th { 
                background-color: #fff;
                font-weight: 600;
                color: #1a1a1a;
              }
              .package-header {
                text-align: center;
                margin: 12px 0;
                padding: 6px;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
              }
              .package-header h3 {
                font-size: 12px;
                margin: 0;
              }
              .package-total {
                text-align: right;
                margin: 6px 0 12px;
                padding: 6px;
                background-color: #fff;
                font-size: 10px;
              }
              .grand-total {
                text-align: right;
                margin-top: 12px;
                padding: 8px;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                font-weight: 600;
                font-size: 11px;
              }
              @page { 
                margin: 10mm;
                size: A4 landscape;
              }
              @media print {
                .page-break-before {
                  page-break-before: always;
                }
                .page-break-after {
                  page-break-after: always;
                }
              }
              
              /* Modified styles for better table continuity */
              .table-container {
                page-break-inside: avoid;
                margin-bottom: 12px;
              }
              
              .table-container table {
                margin-bottom: 0;
              }
              
              .package-section {
                break-inside: avoid;
                margin-bottom: 16px;
              }
              
              .package-header {
                margin: 8px 0;
                padding: 6px;
                break-inside: avoid;
              }
              
              .package-total {
                margin: 4px 0 8px;
                padding: 6px;
                break-inside: avoid;
              }

              /* Container for all packages */
              .packages-container {
                display: flex;
                flex-direction: column;
                gap: 16px;
              }

              /* Adjust spacing between packages */
              .package-section + .package-section {
                margin-top: 0;
                padding-top: 8px;
              }

              /* Ensure tables stay together */
              table {
                break-inside: avoid;
              }

              /* Keep headers with their content */
              thead {
                display: table-header-group;
              }

              tbody {
                display: table-row-group;
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h2>Program Report - ${programName}</h2>
            </div>

            <div class="program-details">
              <div>
                <p class="label">Customer Name</p>
                <p class="value">${customerName}</p>
              </div>
              <div>
                <p class="label">Start Date</p>
                <p class="value">${format(new Date(startDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p class="label">End Date</p>
                <p class="value">${format(new Date(endDate), 'dd/MM/yyyy')}</p>
              </div>
              <div>
                <p class="label">Total Participants</p>
                <p class="value">${totalParticipants}</p>
              </div>
            </div>

            <div class="packages-container">
              ${PACKAGE_ORDER
                .filter(pkgType => filteredPackages[pkgType])
                .map((packageType) => {
                  const packageData = filteredPackages[packageType];
                  const products = packageData.products || [];
                  const productChunks = [];
                  for (let i = 0; i < products.length; i += PRODUCTS_PER_TABLE) {
                    productChunks.push(products.slice(i, i + PRODUCTS_PER_TABLE));
                  }

                  return `
                    <div class="package-section">
                      <div class="package-header">
                        <h3 style="margin: 0;">${PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES]?.toUpperCase() || packageType.toUpperCase()}</h3>
                      </div>
                      ${productChunks.map((chunk: Product[], chunkIndex) => `
                        <div class="table-container">
                          <table>
                            <thead>
                              <tr>
                                <th>Product Name</th>
                                ${datesWithConsumption.map(date => `
                                  <th>${format(new Date(date), 'dd/MM/yyyy')}</th>
                                `).join('')}
                                <th>Total</th>
                                <th>Rate</th>
                                <th>Amount</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${chunk.map((product: Product) => {
                                const total = packageData.totals[product.id] || 0;
                                const rate = packageData.rates[product.id] || 0;
                                const amount = packageData.totalAmounts[product.id] || 0;
                                
                                return `
                                  <tr>
                                    <td>${product.name}</td>
                                    ${datesWithConsumption.map(date => {
                                      const entry = packageData.entries.find((e: Entry) => e.date === date);
                                      const quantity = entry ? entry.quantities[product.id] || 0 : 0;
                                      return `<td>${quantity}</td>`;
                                    }).join('')}
                                    <td style="font-weight: 500;">${total}</td>
                                    <td>₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                `;
                              }).join('')}
                            </tbody>
                          </table>
                        </div>
                      `).join('')}
                      <div class="package-total">
                        Package Total: ₹${Object.values(packageData.totalAmounts as Record<string, number>).reduce((sum: number, amount: number) => sum + amount, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>

            <div class="grand-total">
              Grand Total: ₹${PACKAGE_ORDER
                .filter(pkgType => filteredPackages[pkgType])
                .reduce((sum: number, pkgType) => 
                  sum + Object.values(filteredPackages[pkgType].totalAmounts as Record<string, number>).reduce((pkgSum: number, amount: number) => pkgSum + amount, 0), 
                  0
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </body>
        </html>
      `;

      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      const pdf = await page.pdf({
        format: 'A4',
        landscape: false,
        printBackground: true,
        margin: {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        }
      });

      await browser.close();

      // Return response based on action
      if (action === 'download') {
        return new NextResponse(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=program-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
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
      console.error('Error generating PDF:', error);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
} 
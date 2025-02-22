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
              .program-details {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 16px;
                margin-bottom: 24px;
                padding: 16px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
              }
              .program-details div {
                text-align: center;
              }
              .program-details p {
                margin: 4px 0;
              }
              .program-details .label {
                color: #6b7280;
                font-size: 10px;
              }
              .program-details .value {
                color: #1f2937;
                font-weight: 500;
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
              .package-header {
                text-align: center;
                margin: 16px 0;
                padding: 8px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
              }
              .package-total {
                text-align: right;
                margin: 8px 0 16px;
                padding: 8px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
              }
              .grand-total {
                text-align: right;
                margin-top: 16px;
                padding: 12px;
                background-color: #fff8e1;
                border: 1px solid #ffe57f;
                border-radius: 4px;
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
                .page-break-after {
                  page-break-after: always;
                }
              }
              
              /* Modified styles for better table continuity */
              .table-container {
                page-break-inside: avoid;
                margin-bottom: 16px;
              }
              
              .table-container table {
                margin-bottom: 0;
              }
              
              .package-section {
                page-break-inside: avoid;
              }
              
              .package-header {
                margin: 8px 0;
                padding: 6px;
              }
              
              .package-total {
                margin: 8px 0 16px;
                padding: 6px;
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
                      <h3 style="margin: 0;">${PACKAGE_NAMES[packageType].toUpperCase()}</h3>
                    </div>
                    ${productChunks.map((chunk: Product[], chunkIndex) => `
                      <div class="table-container">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              ${chunk.map((product: Product) => `
                                <th>${product.name}</th>
                              `).join('')}
                            </tr>
                          </thead>
                          <tbody>
                            ${datesWithConsumption.map(date => `
                              <tr>
                                <td>${format(new Date(date), 'dd/MM/yyyy')}</td>
                                ${chunk.map((product: Product) => {
                                  const entry = packageData.entries.find((e: Entry) => e.date === date);
                                  const quantity = entry ? entry.quantities[product.id] || 0 : 0;
                                  return `<td>${quantity}</td>`;
                                }).join('')}
                              </tr>
                            `).join('')}
                            <tr>
                              <td style="font-weight: 600;">Total</td>
                              ${chunk.map((product: Product) => `
                                <td>${packageData.totals[product.id] || 0}</td>
                              `).join('')}
                            </tr>
                            <tr>
                              <td style="font-weight: 600;">Rate</td>
                              ${chunk.map((product: Product) => `
                                <td>₹${(packageData.rates[product.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              `).join('')}
                            </tr>
                            <tr>
                              <td style="font-weight: 600;">Amount</td>
                              ${chunk.map((product: Product) => `
                                <td>₹${(packageData.totalAmounts[product.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              `).join('')}
                            </tr>
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
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
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
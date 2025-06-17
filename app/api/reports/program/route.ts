import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { format } from 'date-fns';

interface Product {
  id: string;
  name: string;
  rate: number;
  comment?: string;
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

// Add catering product order - EXACT MATCH with the image sequence
const CATERING_PRODUCT_ORDER = [
  'Morning Tea',
  'Breakfast',
  'Morning CRT',
  'LUNCH',
  'Afternoon CRT',
  'Hi-TEA',
  'DINNER'
];

export async function POST(req: NextRequest) {
  try {
    const { programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages, action } = await req.json();

    let browser;
    try {
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
        // Configure chromium for production/Vercel environment
        const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar');
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
            <title>${customerName} - ${programName}</title>
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
              .packages-container {
                display: flex;
                flex-direction: column;
                gap: 4px;
              }
              .package-section {
                // page-break-inside: avoid;
                margin-bottom: 4px;
              }
              .package-header {
                text-align: center;
                margin: 4px 0;
                padding: 6px;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                page-break-after: avoid;
              }
              .package-header h3 {
                margin: 0;
                font-size: 12px;
              }
              .table-container {
                // page-break-inside: avoid;
                margin-bottom: 4px;
              }
              table { 
                width: 100%; 
                border-collapse: collapse;
                margin-bottom: 4px;
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
              th:not(:first-child):not(:last-child), td:not(:first-child):not(:last-child) {
                width: 45px;
              }
              th:nth-last-child(-n+4):not(:last-child), td:nth-last-child(-n+4):not(:last-child) {
                width: 60px;
              }
              th:last-child, td:last-child {
                width: 150px;
              }
              th[style*="display: none;"], td[style*="display: none;"] {
                width: 0;
                padding: 0;
                border: none;
              }
              .comment-cell {
                text-align: center;
                white-space: normal;
                font-size: 8px;
                border-right: none;
              }
              th { 
                background-color: #fff;
                font-weight: 600;
                color: #1a1a1a;
              }
              .package-total {
                text-align: right;
                margin: 4px 0;
                padding: 6px;
                background-color: #fff;
                font-size: 10px;
                page-break-inside: avoid;
              }
              .grand-total {
                text-align: right;
                margin-top: 8px;
                padding: 8px;
                background-color: #fff;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                font-weight: 600;
                font-size: 11px;
                page-break-inside: avoid;
              }
              @page { 
                margin: 10mm;
                size: A4 landscape;
              }
              
              /* Keep headers with their content */
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }

              /* Ensure continuous flow between packages */
              .package-section + .package-section {
                margin-top: 4px;
              }

              /* Prevent page breaks between packages */
              .packages-container {
                page-break-inside: auto;
              }

              /* Force packages to stay together */
              .package-section:not(:first-child) {
                page-break-before: auto;
              }

              /* Keep package content together */
              .package-header + .table-container {
                page-break-before: avoid;
              }

              /* Keep package totals with their tables */
              .table-container + .package-total {
                page-break-before: avoid;
              }
            </style>
          </head>
          <body>
            <div class="report-header">
              <h2>${customerName} - ${programName}</h2>
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
                .map((packageType, index) => {
                  const packageData = filteredPackages[packageType];
                  
                  // Filter products with consumption
                  const products = (packageData.products || [])
                    .filter((product: Product) => {
                      const hasConsumption = datesWithConsumption.some(date => {
                        const entry = packageData.entries.find((e: Entry) => e.date === date);
                        return entry && (entry.quantities[product.id] || 0) > 0;
                      });
                      return hasConsumption;
                    });

                  if (products.length === 0) return '';

                  // Sort products based on package type
                  let sortedProducts = [...products];
                  if (packageType.toLowerCase() === 'normal') {
                    // Helper function to normalize product names
                    const normalizeProductName = (name: string): string => {
                      return name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
                    };
                    
                    // Create normalized versions of CATERING_PRODUCT_ORDER for comparison
                    const normalizedOrderMap = new Map();
                    CATERING_PRODUCT_ORDER.forEach((name, index) => {
                      normalizedOrderMap.set(normalizeProductName(name), index);
                    });
                    
                    sortedProducts = sortedProducts.sort((a, b) => {
                      // Exact matches first
                      const indexA = CATERING_PRODUCT_ORDER.indexOf(a.name);
                      const indexB = CATERING_PRODUCT_ORDER.indexOf(b.name);
                      
                      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                      if (indexA !== -1) return -1;
                      if (indexB !== -1) return 1;
                      
                      // Try normalized matching
                      const normA = normalizeProductName(a.name);
                      const normB = normalizeProductName(b.name);
                      
                      const normIndexA = normalizedOrderMap.get(normA);
                      const normIndexB = normalizedOrderMap.get(normB);
                      
                      if (normIndexA !== undefined && normIndexB !== undefined) return normIndexA - normIndexB;
                      if (normIndexA !== undefined) return -1;
                      if (normIndexB !== undefined) return 1;
                      
                      // Partial matching
                      for (let i = 0; i < CATERING_PRODUCT_ORDER.length; i++) {
                        const orderNorm = normalizeProductName(CATERING_PRODUCT_ORDER[i]);
                        
                        // A contains order name or order name contains A
                        const aContains = normA.includes(orderNorm) || orderNorm.includes(normA);
                        const bContains = normB.includes(orderNorm) || orderNorm.includes(normB);
                        
                        if (aContains && !bContains) return -1;
                        if (!aContains && bContains) return 1;
                      }
                      
                      // Fallback to alphabetical
                      return a.name.localeCompare(b.name);
                    });
                  }

                  // Only chunk normal package items
                  const shouldChunk = packageType.toLowerCase() === 'normal';
                  const productChunks = shouldChunk
                    ? sortedProducts.reduce((chunks: Product[][], product: Product, index: number) => {
                        if (index % PRODUCTS_PER_TABLE === 0) {
                          chunks.push([]);
                        }
                        chunks[chunks.length - 1].push(product);
                        return chunks;
                      }, [] as Product[][])
                    : [sortedProducts];

                  if (productChunks.length === 0) return '';

                  return `
                    <div class="package-section" ${index > 0 ? 'style="margin-top: 0;"' : ''}>
                      <div class="package-header">
                        <h3 style="margin: 0;">${PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES]?.toUpperCase() || packageType.toUpperCase()}</h3>
                      </div>
                      ${productChunks.map((chunk: Product[]) => {
                        // Filter dates with consumption for this chunk
                        const chunkDates = datesWithConsumption.filter(date => 
                          chunk.some((product: Product) => {
                            const entry = packageData.entries.find((e: Entry) => e.date === date);
                            return entry && (entry.quantities[product.id] || 0) > 0;
                          })
                        );

                        if (chunkDates.length === 0) return '';

                        return `
                          <div class="table-container">
                            <table>
                              <thead>
                                <tr>
                                  <th>Product Name</th>
                                  ${chunkDates.map(date => `
                                    <th>${format(new Date(date), 'dd')}</th>
                                  `).join('')}
                                  <th>Total</th>
                                  <th>Rate</th>
                                  <th>Amount</th>
                                  ${(() => {
                                    // Only show comment header if any product in current chunk has a comment
                                    const hasCommentsInChunk = chunk.some((p: Product) => p.comment);
                                    return hasCommentsInChunk 
                                      ? '<th class="comment-cell">Comments</th>'
                                      : '';
                                  })()}
                                </tr>
                              </thead>
                              <tbody>
                                ${chunk.map((product: Product) => {
                                  const total = packageData.totals[product.id] || 0;
                                  if (total === 0) return '';

                                  const rate = packageData.rates[product.id] || 0;
                                  const amount = packageData.totalAmounts[product.id] || 0;
                                  
                                  // Check if any product in the current chunk has a comment
                                  const hasCommentsInChunk = chunk.some((p: Product) => p.comment);
                                  
                                  return `
                                    <tr>
                                      <td>${product.name}</td>
                                      ${chunkDates.map(date => {
                                        const entry = packageData.entries.find((e: Entry) => e.date === date);
                                        const quantity = entry ? entry.quantities[product.id] || 0 : 0;
                                        return `<td>${quantity || '-'}</td>`;
                                      }).join('')}
                                      <td style="font-weight: 500;">${total}</td>
                                      <td>₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      <td>₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                      ${hasCommentsInChunk && product.comment 
                                        ? `<td class="comment-cell">${product.comment}</td>`
                                        : ''}
                                    </tr>
                                  `;
                                }).join('')}
                              </tbody>
                            </table>
                          </div>
                        `;
                      }).join('')}
                      <div class="package-total">
                        Package Total: ₹${Object.values(packageData.totalAmounts as Record<string, number>)
                          .reduce((sum: number, amount: number) => sum + amount, 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  `;
                }).join('')}
            </div>

            <div class="grand-total">
              Grand Total: ₹${PACKAGE_ORDER
                .filter(pkgType => filteredPackages[pkgType])
                .reduce((sum: number, pkgType) => 
                  sum + Object.values(filteredPackages[pkgType].totalAmounts as Record<string, number>)
                    .reduce((pkgSum: number, amount: number) => pkgSum + amount, 0), 
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
        },
        displayHeaderFooter: false
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
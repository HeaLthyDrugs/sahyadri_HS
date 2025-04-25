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

interface DailyEntry {
  [productId: string]: number;
}

interface ReportData {
  [date: string]: DailyEntry;
}

interface PackageData {
  type: string;
  name: string;
  products: Product[];
  reportData: ReportData;
  dates: string[];
}

const PACKAGE_TYPE_DISPLAY = {
  'Normal': 'CATERING PACKAGE',
  'Extra': 'EXTRA CATERING PACKAGE',
  'Cold Drink': 'COLD DRINKS PACKAGE'
} as const;

const PACKAGE_ORDER = ['Normal', 'Extra', 'Cold Drink'];
const PRODUCTS_PER_TABLE = 9;

// Product order for catering package
const PRODUCT_ORDER = ['Morning Tea', 'Breakfast', 'Morning CRT', 'LUNCH', 'Afternoon CRT', 'Hi-TEA', 'DINNER'];

export async function POST(req: NextRequest) {
  try {
    const { date, packageType, packages, action } = await req.json();

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

      // Function to generate table content for a package
      const generateTableContent = (packageData: PackageData) => {
        const { products, reportData, dates } = packageData;
        
        // Sort products based on package type
        const sortedProducts = [...products].sort((a, b) => {
          if (packageData.type === 'Normal') {
            const indexA = PRODUCT_ORDER.indexOf(a.name);
            const indexB = PRODUCT_ORDER.indexOf(b.name);
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
          }
          return 0;
        });

        // Filter out products with no consumption
        const activeProducts = sortedProducts.filter(product =>
          dates.some(date => (reportData[date]?.[product.id] || 0) > 0)
        );

        if (activeProducts.length === 0) return '';

        // Split products into chunks for Extra and Cold Drink packages
        const productChunks = packageData.type === 'Normal' 
          ? [activeProducts]
          : Array.from({ length: Math.ceil(activeProducts.length / PRODUCTS_PER_TABLE) }, (_, i) =>
              activeProducts.slice(i * PRODUCTS_PER_TABLE, (i + 1) * PRODUCTS_PER_TABLE)
            );

        // Filter dates with consumption for each chunk
        return productChunks.map((chunk, chunkIndex) => {
          // Get dates with consumption for this chunk
          const chunkDates = dates.filter(date =>
            chunk.some(product => (reportData[date]?.[product.id] || 0) > 0)
          );

          if (chunkDates.length === 0) return '';

          // Generate table header
          const header = `
            <tr>
              <th>Date</th>
              ${chunk.map(product => `<th>${product.name}</th>`).join('')}
              <th>Average</th>
            </tr>
          `;

          // Generate table rows
          const rows = chunkDates.map(date => `
            <tr>
              <td>${format(new Date(date), 'dd/MM/yyyy')}</td>
              ${chunk.map(product => {
                const quantity = reportData[date]?.[product.id] || 0;
                return `<td>${quantity || '-'}</td>`;
              }).join('')}
              <td>${(() => {
                const sum = chunk.reduce((acc, product) => 
                  acc + (reportData[date]?.[product.id] || 0), 0
                );
                const avg = sum / chunk.length;
                return avg > 0 ? avg.toFixed(1) : '-';
              })()}</td>
            </tr>
          `).join('');

          // Generate totals row
          const totals = `
            <tr class="total-row">
              <td>Total</td>
              ${chunk.map(product => {
                const total = chunkDates.reduce((sum, date) => sum + (reportData[date]?.[product.id] || 0), 0);
                return `<td>${total || '-'}</td>`;
              }).join('')}
              <td>${(() => {
                const totalSum = chunk.reduce((acc, product) => 
                  acc + chunkDates.reduce((sum, date) => 
                    sum + (reportData[date]?.[product.id] || 0), 0
                  ), 0
                );
                const totalAvg = totalSum / (chunk.length * chunkDates.length);
                return totalAvg > 0 ? totalAvg.toFixed(1) : '-';
              })()}</td>
            </tr>
          `;

          return `
            ${chunkIndex > 0 ? '<div class="table-spacer"></div>' : ''}
            <table>
              <thead>${header}</thead>
              <tbody>${rows}${totals}</tbody>
            </table>
          `;
        }).filter(Boolean).join('');
      };

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Day Report - ${format(new Date(date), 'MMMM yyyy')}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html {
                margin: 0;
                padding: 0;
                background-color: white;
              }
              body { 
                font-family: Arial, sans-serif; 
                font-size: 9px;
                color: black;
                padding: 0;
                margin: 0;
                width: 100%;
                min-height: 100%;
                background-color: white;
                position: relative;
              }
              .main-container {
                width: 100%;
                padding: 0;
                margin: 0;
                background-color: white;
              }
              .report-header {
                text-align: center;
                padding: 4px 0;
                margin-bottom: 8px;
                background-color: white;
                border-bottom: 1px solid #e5e7eb;
              }
              .report-header h2 {
                margin: 0;
                font-size: 14px;
                color: black;
                font-weight: 600;
              }
              table { 
                width: 100%; 
                border-collapse: collapse; 
                margin-bottom: 4px;
                background-color: white;
                border: 0.5px solid #d1d5db;
              }
              th, td { 
                border: 0.5px solid #d1d5db;
                padding: 4px;
                font-size: 9px;
                text-align: center;
                background-color: white;
                color: black;
              }
              th:first-child, td:first-child {
                width: 100px;
                text-align: left;
                position: sticky;
                left: 0;
                background-color: white;
                z-index: 1;
                border: 0.5px solid #d1d5db;
                border-right: 1px solid #d1d5db;
              }
              th { 
                font-weight: 600;
                background-color: #fff;
                border: 0.5px solid #d1d5db;
                border-bottom: 1px solid #d1d5db;
              }
              .package-header {
                text-align: center;
                margin: 2px 0;
                padding: 4px;
                background-color: white;
                border: 0.5px solid #d1d5db;
              }
              .package-header h3 {
                font-size: 12px;
                margin: 0;
                color: black;
                font-weight: 600;
              }
              .total-row {
                background-color: #fff;
                font-weight: 500;
              }
              .total-row td {
                border: 0.5px solid #d1d5db;
                border-top: 1px solid #d1d5db;
              }
              .table-spacer {
                height: 4px;
              }
              @page { 
                margin: 10mm;
                size: A4 portrait;
              }
              @media print {
                @page {
                  margin: 10mm;
                }
                html, body {
                  margin: 0;
                  padding: 0;
                  height: 100%;
                }
                .main-container {
                  margin: 0;
                  padding: 0;
                }
                .package-header {
                  break-after: avoid-page;
                }
                thead {
                  display: table-header-group;
                }
              }
              
              .table-container {
                margin-bottom: 8px;
              }
              
              .package-section {
                margin-bottom: 8px;
              }
              
              .packages-container {
                display: flex;
                flex-direction: column;
                width: 100%;
                margin: 0;
                padding: 0;
              }

              thead {
                display: table-header-group;
              }

              tbody {
                display: table-row-group;
              }

              .no-data {
                text-align: center;
                padding: 12px;
                color: black;
                background-color: white;
                border: 0.5px solid #d1d5db;
                margin: 8px 0;
              }
            </style>
          </head>
          <body>
            <div class="main-container">
              <div class="report-header">
                <h2>Day Report - ${format(new Date(date), 'MMMM yyyy')}</h2>
              </div>

              <div class="packages-container">
                ${Object.entries(packages)
                  .filter(([_, data]) => {
                    const packageData = data as PackageData;
                    return packageData.products.some(product =>
                      packageData.dates.some(date => (packageData.reportData[date]?.[product.id] || 0) > 0)
                    );
                  })
                  .map(([type, data]) => {
                    const content = generateTableContent(data as PackageData);
                    if (!content) return '';

                    let sectionClass = 'package-section';
                    if (type === 'Cold Drink') {
                      sectionClass += ' cold-drinks-section';
                    } else if (type === 'Extra') {
                      sectionClass += ' extra-section';
                    }
                    
                    return `
                      <div class="${sectionClass}">
                        <div class="package-header">
                          <h3>${PACKAGE_TYPE_DISPLAY[type as keyof typeof PACKAGE_TYPE_DISPLAY] || type.toUpperCase()}</h3>
                        </div>
                        <div class="table-container">
                          ${content}
                        </div>
                      </div>
                    `;
                  })
                  .filter(Boolean)
                  .join('')}
              </div>
            </div>
          </body>
        </html>
      `;

      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'load', 'domcontentloaded']
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
        displayHeaderFooter: false,
        preferCSSPageSize: true
      });

      await browser.close();

      // Return response based on action
      if (action === 'download') {
        return new NextResponse(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=day-report-${format(new Date(date), 'yyyy-MM')}.pdf`
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

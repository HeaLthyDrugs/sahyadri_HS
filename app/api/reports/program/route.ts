import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { format } from 'date-fns';

interface ProductEntry {
  date: string;
  quantities: { [productId: string]: number };
}

interface PackageData {
  products: {
    id: string;
    name: string;
    rate: number;
  }[];
  entries: ProductEntry[];
  totals: { [productId: string]: number };
  rates: { [productId: string]: number };
  totalAmounts: { [productId: string]: number };
  grandTotal: number;
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

      // Generate HTML content
      const htmlContent = generateProgramReportHTML({
        programName,
        customerName,
        startDate,
        endDate,
        totalParticipants,
        selectedPackage,
        packages
      });

      // Set content and wait for network idle
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0'
      });

      // Add page numbers
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = `
          @page {
            margin: 20mm;
            size: A4;
          }
          .page-break-before {
            page-break-before: always;
          }
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

      // Generate PDF
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

function generateProgramReportHTML({ programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages }: {
  programName: string;
  customerName: string;
  startDate: string;
  endDate: string;
  totalParticipants: number;
  selectedPackage?: string;
  packages: {
    [key: string]: {
      products: Array<{ id: string; name: string; }>;
      entries: Array<{ date: string; quantities: Record<string, number>; comment?: string; }>;
      totals: Record<string, number>;
      rates: Record<string, number>;
      totalAmounts: Record<string, number>;
    };
  };
}) {
  const styles = `
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
      .report-header p {
        margin: 6px 0 0;
        color: #4a5568;
        font-size: 12px;
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
      .package-section { 
        page-break-before: always;
        margin-bottom: 24px;
      }
      .package-section:first-of-type { 
        page-break-before: avoid;
      }
      .package-header { 
        background-color: #f8f9fa;
        padding: 8px;
        margin: 12px 0 8px;
        text-align: center;
        border: 1px solid #dee2e6;
        border-radius: 3px;
      }
      .package-header h4 {
        margin: 0;
        color: #1a1a1a;
        font-size: 13px;
      }
      .total-row { 
        background-color: #f8f9fa;
        font-weight: 600;
      }
      .rate-row {
        background-color: #f8f9fa;
      }
      .amount-row {
        font-weight: bold;
        background-color: #f8f9fa;
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
        .page-break-before {
          page-break-before: always;
        }
        .no-break {
          page-break-inside: avoid;
        }
      }
    </style>
  `;

  // Helper function to split products into chunks for table pagination
  const chunkProducts = (products: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < products.length; i += size) {
      chunks.push(products.slice(i, i + size));
    }
    return chunks;
  };

  // Helper function to generate table HTML for a package and product chunk
  const generateTableHTML = (packageType: string, packageData: any, products: any[], isFirstChunk: boolean = true) => `
    <div class="table-container no-break">
      ${isFirstChunk ? `
        <div class="package-header">
          <h4>${PACKAGE_NAMES[packageType as keyof typeof PACKAGE_NAMES] || packageType}</h4>
        </div>
      ` : ''}
      <table>
        <thead>
          <tr>
            <th style="width: 12%; text-align: center">Date</th>
            ${products.map(product => `
              <th style="text-align: center">${product.name}</th>
            `).join('')}
            <th style="width: 15%; text-align: left">Comment</th>
          </tr>
        </thead>
        <tbody>
          ${packageData.entries.map((entry: any) => `
            <tr>
              <td style="text-align: center; background-color: #f8f9fa; font-weight: 500">${format(new Date(entry.date), 'dd/MM/yyyy')}</td>
              ${products.map(product => `
                <td style="text-align: center">${entry.quantities[product.id] || 0}</td>
              `).join('')}
              <td style="text-align: left">${entry.comment || ''}</td>
            </tr>
          `).join('')}
          <tr class="total-row">
            <td style="text-align: center; background-color: #f8f9fa">Total</td>
            ${products.map(product => `
              <td style="text-align: center">${packageData.totals[product.id] || 0}</td>
            `).join('')}
            <td></td>
          </tr>
          <tr class="rate-row">
            <td style="text-align: center; background-color: #f8f9fa">Rate</td>
            ${products.map(product => `
              <td style="text-align: center">${packageData.rates[product.id] || 0}</td>
            `).join('')}
            <td></td>
          </tr>
          <tr class="amount-row">
            <td style="text-align: center; background-color: #f8f9fa">Amount</td>
            ${products.map(product => `
              <td style="text-align: center">₹${(packageData.totalAmounts[product.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            `).join('')}
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
        <div class="report-header">
          <h2>${customerName}, ${programName}</h2>
          <p>Duration: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}</p>
          <p>Total Participants: ${totalParticipants}</p>
        </div>

        ${Object.entries(packages)
          .filter(([type]) => {
            if (!selectedPackage || selectedPackage === 'all') return true;
            const packageTypeMap: { [key: string]: string } = {
              '3e46279d-c2ff-4bb6-ab0d-935e32ed7820': 'Normal',
              '620e67e9-8d50-4505-930a-f571629147a2': 'Extra',
              '752a6bcb-d6d6-43ba-ab5b-84a787182b41': 'Cold Drink'
            };
            const packageType = packageTypeMap[selectedPackage];
            return type === packageType;
          })
          .sort(([typeA], [typeB]) => {
            const indexA = PACKAGE_ORDER.indexOf(typeA);
            const indexB = PACKAGE_ORDER.indexOf(typeB);
            return indexA - indexB;
          })
          .map(([type, data], index) => {
            const productChunks = chunkProducts(data.products, 7);
            const needsPageBreak = type === 'Cold Drink' || (type === 'Extra' && data.products.length > 7);
            return `
              ${needsPageBreak ? '<div class="page-break-before"></div>' : ''}
              <div class="package-section">
                ${productChunks.map((chunk, chunkIndex) => 
                  generateTableHTML(type, data, chunk, chunkIndex === 0)
                ).join('')}
              </div>
            `;
          })
          .join('')}

        ${(!selectedPackage || selectedPackage === 'all') ? `
          <div class="grand-total">
            <strong>Grand Total: ₹${(Object.values(packages as Record<string, { totalAmounts: Record<string, number> }>)
              .reduce((total, pkg) => 
                total + Object.values(pkg.totalAmounts).reduce((sum, amount) => sum + amount, 0), 
                0
              )).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        ` : ''}
      </body>
    </html>
  `;
} 
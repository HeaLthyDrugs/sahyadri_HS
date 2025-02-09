import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
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

export async function POST(req: NextRequest) {
  try {
    const { programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages, action } = await req.json();

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true
    });
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
}

function generateProgramReportHTML({ programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages }: any) {
  const styles = `
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #1f2937;
      }
      .report-header {
        text-align: center;
        margin-bottom: 2rem;
      }
      .report-header h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1f2937;
        margin: 0 0 0.5rem 0;
      }
      .report-header p {
        margin: 0.25rem 0;
        font-size: 0.875rem;
        color: #4b5563;
      }
      .package-section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
      }
      .table-container {
        margin-bottom: 1.5rem;
      }
      h3 {
        color: #1f2937;
        margin-bottom: 1rem;
        page-break-after: avoid;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1rem;
        font-size: 11px;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 0.4rem;
        text-align: center;
      }
      th {
        background-color: #f9fafb;
        font-weight: 600;
      }
      .date-cell {
        text-align: center;
        font-weight: 500;
        background-color: #f9fafb;
      }
      .total-row {
        font-weight: bold;
        background-color: #f9fafb;
      }
      .rate-row {
        background-color: #f9fafb;
      }
      .amount-row {
        font-weight: bold;
        background-color: #f9fafb;
      }
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .page-break-before {
          page-break-before: always;
        }
        .no-break {
          page-break-inside: avoid;
        }
      }
    </style>
  `;

  // Define the fixed package order for the report
  const REPORT_PACKAGE_ORDER = ['Normal', 'Extra', 'Cold Drink'];
  const PACKAGE_DISPLAY_NAMES = {
    'Normal': 'Catering Package',
    'Extra': 'Extra Catering Package',
    'Cold Drink': 'Cold Drink Package'
  };

  // Helper function to split products into chunks for table pagination
  const chunkProducts = (products: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < products.length; i += size) {
      chunks.push(products.slice(i, i + size));
    }
    return chunks;
  };

  // Helper function to generate table HTML for a package and product chunk
  const generateTableHTML = (packageData: any, products: any[], isFirstChunk: boolean = true) => `
    <div class="table-container">
      ${isFirstChunk ? `<h3 style="text-decoration: underline">• ${packageData.packageName}</h3>` : ''}
      <table>
        <thead>
          <tr>
            <th style="width: 15%">Date</th>
            ${products.map(product => `
              <th style="width: ${85 / products.length}%">${product.name}</th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
          ${packageData.entries.map((entry: any) => `
            <tr>
              <td class="date-cell">${format(new Date(entry.date), 'dd/MM/yyyy')}</td>
              ${products.map(product => `
                <td>${entry.quantities[product.id] || 0}</td>
              `).join('')}
            </tr>
          `).join('')}
          <tr class="total-row">
            <td>Total</td>
            ${products.map(product => `
              <td>${packageData.totals[product.id] || 0}</td>
            `).join('')}
          </tr>
          <tr class="rate-row">
            <td>Rate</td>
            ${products.map(product => `
              <td>${packageData.rates[product.id] || 0}</td>
            `).join('')}
          </tr>
          <tr class="amount-row">
            <td>Amount</td>
            ${products.map(product => `
              <td>${(packageData.totalAmounts[product.id] || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            `).join('')}
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
          <h3>${customerName}, ${programName}</h3>
          <p>${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}</p>
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
            const indexA = REPORT_PACKAGE_ORDER.indexOf(typeA);
            const indexB = REPORT_PACKAGE_ORDER.indexOf(typeB);
            return indexA - indexB;
          })
          .map(([type, data], index) => {
            const productChunks = chunkProducts(data.products, 7);
            // Only add page break before Cold Drink package
            const needsPageBreak = type === 'Cold Drink';
            return `
              ${needsPageBreak ? '<div class="page-break-before"></div>' : ''}
              <div class="package-section">
                ${productChunks.map((chunk, index) => 
                  generateTableHTML(data, chunk, index === 0)
                ).join('')}
              </div>
            `;
          })
          .join('')}

        <div class="pageNumber"></div>
      </body>
    </html>
  `;
} 
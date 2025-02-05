import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { reportType, data, selectedDay, selectedPackage, action } = await req.json();

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true
    });
    const page = await browser.newPage();

    // Generate HTML content based on report type
    let htmlContent = '';
    if (reportType === 'day') {
      htmlContent = generateDayReportHTML(data, selectedDay, selectedPackage);
    } else if (reportType === 'monthly') {
      // ... existing monthly report generation
    }

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
          'Content-Disposition': `attachment; filename=report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
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

function generateDayReportHTML(data: any, selectedDay: string, selectedPackage: string) {
  const styles = `
    <style>
      body {
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 20px;
        color: #333;
      }
      .package-section {
        page-break-before: always;
        margin-bottom: 30px;
      }
      .package-header {
        background: #f8f9fa;
        padding: 15px;
        margin-bottom: 20px;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .package-header h3 {
        margin: 0;
        font-size: 16px;
        color: #333;
      }
      .package-header .date {
        font-size: 14px;
        color: #666;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #333;
        padding: 8px;
        text-align: left;
      }
      th {
        background-color: #f8f9fa;
        font-weight: normal;
      }
      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .total-row {
        background-color: #f8f9fa;
        font-weight: bold;
      }
      @media print {
        .package-section:first-child {
          page-break-before: avoid;
        }
      }
    </style>
  `;

  let content = `
    <html>
      <head>
        <meta charset="UTF-8">
        ${styles}
      </head>
      <body>
  `;

  // Combine all entries across programs
  const allEntries = data.flatMap((program: any) => program.entries);

  // Group entries by package type
  const packageGroups = allEntries.reduce((groups: any, entry: any) => {
    const type = entry.packageType.toLowerCase();
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(entry);
    return groups;
  }, {});

  // Filter package types based on selection
  const packageTypes = Object.keys(packageGroups).filter(type => {
    if (selectedPackage === 'all') return true;
    return type.toLowerCase() === selectedPackage.toLowerCase();
  });

  // Generate content for each package type
  packageTypes.forEach((packageType) => {
    // Combine quantities for same products
    const combinedProducts = packageGroups[packageType].reduce((acc: any, entry: any) => {
      if (!acc[entry.productName]) {
        acc[entry.productName] = {
          productName: entry.productName,
          quantity: 0,
          rate: entry.rate,
          total: 0
        };
      }
      acc[entry.productName].quantity += entry.quantity;
      acc[entry.productName].total += entry.total;
      return acc;
    }, {});

    content += `
      <div class="package-section">
        <div class="package-header">
          <h3>${packageType.toUpperCase()} PACKAGE CONSUMPTION</h3>
          <span class="date">${format(new Date(selectedDay), 'dd/MM/yyyy')}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th class="text-center">Total Quantity</th>
              <th class="text-right">Rate</th>
              <th class="text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
    `;

    Object.values(combinedProducts).forEach((product: any) => {
      content += `
        <tr>
          <td>${product.productName}</td>
          <td class="text-center">${product.quantity}</td>
          <td class="text-right">${product.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="text-right">${product.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    const packageTotal = Object.values(combinedProducts).reduce(
      (sum: number, product: any) => sum + product.total,
      0
    );

    content += `
          <tr class="total-row">
            <td colspan="3" class="text-right">Package Total</td>
            <td class="text-right">${packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tbody>
      </table>
    </div>
    `;
  });

  content += `
      <div class="pageNumber"></div>
    </body>
  </html>`;

  return content;
} 
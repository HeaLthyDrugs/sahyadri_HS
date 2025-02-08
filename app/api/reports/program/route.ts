import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';

export async function POST(req: NextRequest) {
  try {
    const { programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages, grandTotal, action } = await req.json();

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
      packages,
      grandTotal
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

function generateProgramReportHTML({ programName, customerName, startDate, endDate, totalParticipants, selectedPackage, packages, grandTotal }: any) {
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
      }
      h3 {
        color: #1f2937;
        margin-bottom: 1rem;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1.5rem;
        font-size: 12px;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 0.5rem;
      }
      th {
        background-color: #f9fafb;
        font-weight: 600;
        text-align: left;
      }
      .text-right {
        text-align: right;
      }
      .total-row {
        font-weight: bold;
        background-color: #f9fafb;
      }
      @media print {
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
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

        ${(Object.entries(packages) as Array<[string, { items: Array<{ productName: string; quantity: number; rate: number; total: number }>; packageTotal: number }]>)
          .filter(([type]) => {
            if (!selectedPackage || selectedPackage === 'all') return true;
            const packageTypeMap: { [key: string]: string } = {
              '3e46279d-c2ff-4bb6-ab0d-935e32ed7820': 'Normal',  // Catering Package
              '620e67e9-8d50-4505-930a-f571629147a2': 'Extra',   // Extra Package
              '752a6bcb-d6d6-43ba-ab5b-84a787182b41': 'Cold Drink'  // Cold Drink Package
            };
            const packageType = packageTypeMap[selectedPackage];
            return type === packageType;
          })
          .sort(([typeA], [typeB]) => {
            const indexA = REPORT_PACKAGE_ORDER.indexOf(typeA);
            const indexB = REPORT_PACKAGE_ORDER.indexOf(typeB);
            return indexA - indexB;
          })
          .map(([type, data]) => `
            <div class="package-section">
              <h3>• ${PACKAGE_DISPLAY_NAMES[type as keyof typeof PACKAGE_DISPLAY_NAMES] || type}</h3>
              <table>
                <thead>
                  <tr>
                    <th style="width: 55%">Product Name</th>
                    <th style="width: 15%" class="text-right">Quantity</th>
                    <th style="width: 15%" class="text-right">Rate</th>
                    <th style="width: 15%" class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map((item) => `
                    <tr>
                      <td>${item.productName}</td>
                      <td class="text-right">${item.quantity}</td>
                      <td class="text-right">${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td class="text-right">${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="3" class="text-right">TOTAL</td>
                    <td class="text-right">${data.packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `).join('')}

        ${(!selectedPackage || selectedPackage === 'all') ? `
          <table>
            <tbody>
              <tr class="total-row">
                <td style="width: 85%" class="text-right">GRAND TOTAL</td>
                <td style="width: 15%" class="text-right">${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="pageNumber"></div>
      </body>
    </html>
  `;
} 
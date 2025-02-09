import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { generatePDF } from '@/lib/pdf-generator';

export const maxDuration = 300; // Set max duration to 5 minutes
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { reportType, data, selectedDay, selectedPackage, action } = await req.json();

    // Generate HTML content based on report type
    let htmlContent = '';
    if (reportType === 'day') {
      htmlContent = generateDayReportHTML(data, selectedDay, selectedPackage);
    } else if (reportType === 'monthly') {
      // ... existing monthly report generation
    }

    // Generate PDF using the optimized generator
    const pdf = await generatePDF(htmlContent);

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
    
    // Improved error response
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: errorMessage,
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
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
        background-color: #ffffff;
      }
      .package-section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
      }
      .package-section:not(:first-child) {
        page-break-before: always;
      }
      .package-header {
        margin-bottom: 1rem;
      }
      .header-content {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #f9fafb;
        padding: 2rem;
        margin-bottom: 0.5rem;
      }
      .header-content h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
      }
      .table-container {
        position: relative;
        overflow-x: auto;
      }
      .table-wrapper {
        border: 1px solid #111827;
        width: 100%;
      }
      table {
        width: 100%;
        text-align: left;
        border-collapse: collapse;
        font-size: 0.875rem;
      }
      th {
        background-color: #f3f4f6;
        font-weight: normal;
        color: #111827;
        text-align: left;
        padding: 0.5rem;
        border-right: 1px solid #111827;
        border-bottom: 1px solid #111827;
      }
      td {
        padding: 0.5rem;
        color: #111827;
        border-right: 1px solid #111827;
        border-bottom: 1px solid #111827;
      }
      th:last-child,
      td:last-child {
        border-right: none;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .text-right {
        text-align: right;
      }
      .text-center {
        text-align: center;
      }
      .total-row {
        background-color: #f3f4f6;
        font-weight: 600;
      }
      .quantity-cell {
        text-align: center;
        border-right: 1px solid #111827;
      }
      .rate-cell {
        text-align: right;
        border-right: 1px solid #111827;
      }
      .amount-cell {
        text-align: right;
      }
      @media print {
        .package-section {
          page-break-inside: avoid;
        }
        .package-section:not(:first-child) {
          margin-top: 2rem;
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
    const type = entry.packageType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(entry);
    return groups;
  }, {});

  // Filter package types based on selection
  const packageTypes = Object.keys(packageGroups).filter(type => {
    if (selectedPackage === 'all') return true;
    return type === selectedPackage;
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
          <div class="header-content">
            <h3>${packageType} for ${format(new Date(selectedDay), 'dd/MM/yyyy')}</h3>
          </div>
        </div>

        <div class="table-container">
          <div class="table-wrapper">
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
          <td class="quantity-cell">${product.quantity}</td>
          <td class="rate-cell">${product.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="amount-cell">${product.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
                <td class="amount-cell">${packageTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    `;
  });

  content += `
      <div class="pageNumber"></div>
    </body>
  </html>`;

  return content;
} 
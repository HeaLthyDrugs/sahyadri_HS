import puppeteer from 'puppeteer';

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: 'new',
  });

  try {
    const page = await browser.newPage();
    
    // Set content and wait for network idle to ensure all resources are loaded
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Add custom styles for PDF generation
    await page.addStyleTag({
      content: `
        @page {
          margin: 20px;
          size: A4;
        }
        body {
          margin: 0;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          font-size: 11px;
        }
        th {
          background-color: #f8f9fa;
        }
      `
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>
      `,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '10mm',
        right: '10mm'
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
} 
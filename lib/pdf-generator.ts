import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function generatePDF(htmlContent: string): Promise<Buffer> {
  const browser = await puppeteerCore.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v132.0.0/chromium-v132.0.0-pack.tar'),
    headless: true,
    defaultViewport: chromium.defaultViewport
  });

  try {
    const page = await browser.newPage();
    
    // Set content and wait for network idle to ensure all resources are loaded
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000, // 30 second timeout
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

    // Generate PDF with optimized settings
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
      },
      timeout: 30000, // 30 second timeout
    });

    return Buffer.from(pdf);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
} 
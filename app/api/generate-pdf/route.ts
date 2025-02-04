import { generatePDF } from '@/lib/pdf-generator';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { htmlContent, action } = await req.json();

    if (!htmlContent) {
      return NextResponse.json(
        { error: 'HTML content is required' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generatePDF(htmlContent);

    // Set appropriate headers based on action
    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
    };

    // Add Content-Disposition header for downloads
    if (action === 'download') {
      headers['Content-Disposition'] = 'attachment; filename=report.pdf';
    } else {
      // For print, we want to display in browser
      headers['Content-Disposition'] = 'inline';
    }

    // Return PDF with appropriate headers
    return new NextResponse(pdfBuffer, { headers });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 
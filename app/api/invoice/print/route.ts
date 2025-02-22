import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { packageId, month } = body;

    // Forward the request to the main invoice API with print action
    const response = await fetch(new URL('/api/invoice', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        packageId,
        month,
        action: 'print'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const pdf = await response.blob();
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf'
      }
    });
  } catch (error) {
    console.error('Error in print route:', error);
    return NextResponse.json({ 
      error: 'Failed to generate printable invoice' 
    }, { status: 500 });
  }
} 
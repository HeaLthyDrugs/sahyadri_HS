import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO } from 'date-fns';
import puppeteer from 'puppeteer';

// Types matching the frontend component
interface DayReportEntry {
  packageType: string;
  productName: string;
  quantity: number;
  rate: number;
  total: number;
}

interface DayReportData {
  date: string;
  program: string;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
  entries: DayReportEntry[];
}

interface RequestBody {
  date: string;
  packageType?: string;
  action?: 'print' | 'download';
}

const generatePDF = async (data: DayReportData[], date: string, packageType?: string) => {
  const browser = await puppeteer.launch({
    headless: true
  });
  const page = await browser.newPage();

  // Standardize package type mapping based on database structure
  const packageTypeMap: { [key: string]: string[] } = {
    'normal': ['Normal'],
    'extra': ['Extra'],
    'cold drink': ['Cold Drink'],
    'all': [] // Empty array means no filtering
  };

  // Get display name for package type based on database names
  const getPackageDisplayName = (type: string): string => {
    const displayMap: { [key: string]: string } = {
      'Normal': 'CATERING',
      'Extra': 'EXTRA CATERING',
      'Cold Drink': 'COLD DRINKS',
      'normal': 'CATERING',
      'extra': 'EXTRA CATERING',
      'cold drink': 'COLD DRINKS',
      'catering': 'CATERING'
    };
    return displayMap[type] || type;
  };

  // Normalize the package type for filtering
  let effectivePackageType = packageType?.toLowerCase();
  
  // Special handling for catering package
  if (effectivePackageType === 'catering') {
    effectivePackageType = 'normal';
    packageTypeMap['normal'] = ['Normal']; // Ensure we're looking for exact database type
  }

  // Filter entries based on package type
  const filteredData = data.map(program => ({
    ...program,
    entries: program.entries.filter(entry => {
      if (!effectivePackageType || effectivePackageType === 'all') return true;
      
      // For catering package, we want entries with type 'Normal'
      if (packageType?.toLowerCase() === 'catering') {
        return entry.packageType === 'Normal';
      }
      
      const allowedTypes = packageTypeMap[effectivePackageType] || [effectivePackageType];
      return allowedTypes.includes(entry.packageType);
    })
  })).filter(program => program.entries.length > 0);

  // Calculate total for filtered data
  const totalAmount = filteredData.reduce((sum, program) => 
    sum + program.entries.reduce((pSum, entry) => pSum + entry.total, 0), 0
  );

  // Add debug logging
  console.log('Package Type:', packageType);
  console.log('Effective Package Type:', effectivePackageType);
  console.log('Filtered Data:', JSON.stringify(filteredData, null, 2));

  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Day Report - ${date}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 0;
            padding: 20px;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-bottom: 2px solid #dee2e6;
          }
          .report-header h2 {
            margin: 0;
            color: #1a1a1a;
            font-size: 24px;
          }
          .report-header p {
            margin: 10px 0 0;
            color: #4a5568;
            font-size: 16px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
          }
          th, td { 
            border: 1px solid #dee2e6; 
            padding: 12px;
          }
          th { 
            background-color: #f8f9fa;
            font-weight: 600;
            color: #1a1a1a;
          }
          .package-header { 
            background-color: #f8f9fa;
            padding: 15px;
            margin: 20px 0 10px;
            text-align: center;
            border: 1px solid #dee2e6;
            border-radius: 4px;
          }
          .package-header h4 {
            margin: 0;
            color: #1a1a1a;
            font-size: 18px;
          }
          .total-row { 
            background-color: #f8f9fa;
            font-weight: 600;
          }
          .program-section { 
            page-break-before: always;
            margin-bottom: 40px;
          }
          .program-section:first-of-type { 
            page-break-before: avoid;
          }
          .program-date {
            margin: 20px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 4px solid #4a5568;
            font-size: 18px;
            color: #1a1a1a;
          }
          .grand-total {
            margin-top: 30px;
            padding: 15px;
            text-align: right;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            page-break-inside: avoid;
          }
          .grand-total strong {
            font-size: 18px;
            color: #1a1a1a;
          }
          @page { 
            margin: 20px;
            size: A4;
          }
        </style>
      </head>
      <body>

        ${filteredData.map((program, index) => {
          // Group entries by package type
          const packageGroups = program.entries.reduce((groups: { [key: string]: any[] }, entry) => {
            const type = entry.packageType;
            if (!groups[type]) groups[type] = [];
            groups[type].push(entry);
            return groups;
          }, {});

          return `
            <div class="program-section">
              <div class="program-date">
                <strong>${format(parseISO(program.date), 'dd/MM/yyyy')}</strong>
              </div>
              ${Object.entries(packageGroups).map(([pkgType, entries]) => {
                // For catering package, always use 'CATERING' as display name
                const displayName = packageType?.toLowerCase() === 'catering' 
                  ? 'CATERING'
                  : getPackageDisplayName(pkgType);
                return `
                  <div class="package-header">
                    <h4>${displayName}</h4>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Product Name</th>
                        <th style="text-align: center">Quantity</th>
                        <th style="text-align: right">Rate</th>
                        <th style="text-align: right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${entries.map(entry => `
                        <tr>
                          <td>${entry.productName}</td>
                          <td style="text-align: center">${entry.quantity}</td>
                          <td style="text-align: right">₹${entry.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td style="text-align: right">₹${entry.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `).join('')}
                      <tr class="total-row">
                        <td colspan="3" style="text-align: right">Package Total</td>
                        <td style="text-align: right">₹${entries
                          .reduce((sum, entry) => sum + entry.total, 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                `;
              }).join('')}
              ${packageType === 'all' ? `
                <div class="grand-total">
                  <strong>Day Total: ₹${program.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
        ${packageType !== 'all' ? `
          <div class="grand-total">
            <strong>Total Amount: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
          </div>
        ` : ''}
      </body>
    </html>
  `;

  await page.setContent(htmlContent);
  const pdf = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20px',
      right: '20px',
      bottom: '20px',
      left: '20px'
    },
    displayHeaderFooter: false
  });

  await browser.close();
  return pdf;
};

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { date, packageType, action } = body;
    
    // Enhanced validation
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid or missing date parameter',
        meta: { receivedDate: date }
      }, { status: 400 });
    }

    let parsedDate: Date;
    try {
      parsedDate = parseISO(date);
      
      // Validate if the date is valid
      if (isNaN(parsedDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (err) {
      return NextResponse.json({ 
        error: 'Invalid date format. Expected format: YYYY-MM-DD',
        meta: { receivedDate: date }
      }, { status: 400 });
    }

    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    // Build the main query with proper joins
    let query = supabase
      .from('billing_entries')
      .select(`
        id,
        entry_date,
        quantity,
        programs:program_id (
          id,
          name
        ),
        packages:package_id (
          id,
          name,
          type
        ),
        products:product_id (
          id,
          name,
          rate
        )
      `)
      .eq('entry_date', formattedDate);

    if (packageType && packageType !== 'all') {
      const packageMapping: { [key: string]: string[] } = {
        'catering': ['normal', 'Normal'],
        'extra': ['extra', 'Extra'],
        'cold drink': ['cold drink', 'Cold Drink', 'cold']
      };

      const packageTypes = packageMapping[packageType.toLowerCase()] || [packageType];
      query = query.in('packages.type', packageTypes);
    }

    const { data: entries, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ 
        data: [],
        meta: {
          date: formattedDate,
          packageType,
          entriesFound: 0
        }
      });
    }

    // Process and group data by program
    const programGroups = new Map<string, DayReportData>();

    entries.forEach((entry: any) => {
      const programId = entry.programs?.id;
      const programName = entry.programs?.name;
      
      if (!programId || !programName) {
        console.warn('Skipping entry due to missing program data:', entry.id);
        return;
      }

      if (!programGroups.has(programId)) {
        programGroups.set(programId, {
          date: entry.entry_date,
          program: programName,
          cateringTotal: 0,
          extraTotal: 0,
          coldDrinkTotal: 0,
          grandTotal: 0,
          entries: []
        });
      }

      const programData = programGroups.get(programId)!;
      const packageType = entry.packages?.type || '';
      const amount = entry.quantity * (entry.products?.rate || 0);

      const reportEntry: DayReportEntry = {
        packageType: packageType,
        productName: entry.products?.name || 'Unknown Product',
        quantity: entry.quantity,
        rate: entry.products?.rate || 0,
        total: amount
      };

      switch (packageType.toLowerCase()) {
        case 'normal':
          programData.cateringTotal += amount;
          break;
        case 'extra':
          programData.extraTotal += amount;
          break;
        case 'cold drink':
        case 'cold':
          programData.coldDrinkTotal += amount;
          break;
      }

      programData.grandTotal += amount;
      programData.entries.push(reportEntry);
    });

    const result = Array.from(programGroups.values());
    result.sort((a, b) => a.program.localeCompare(b.program));

    // Generate PDF if action is print or download
    if (action === 'print' || action === 'download') {
      const pdf = await generatePDF(result, formattedDate, packageType);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': action === 'download' 
            ? `attachment; filename=day-report-${formattedDate}.pdf`
            : 'inline'
        }
      });
    }

    // Return JSON for normal requests
    return NextResponse.json({
      data: result,
      meta: {
        date: formattedDate,
        packageType,
        action,
        entriesFound: entries.length,
        programsProcessed: result.length,
        totalAmount: result.reduce((sum, prog) => sum + prog.grandTotal, 0)
      }
    });

  } catch (error) {
    console.error('Error processing day report:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate report',
        meta: { timestamp: new Date().toISOString() }
      },
      { status: 500 }
    );
  }
} 
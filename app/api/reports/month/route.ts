import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { format, parseISO, parse, isValid, startOfMonth, endOfMonth } from 'date-fns';
import puppeteer from 'puppeteer';
import puppeteerCore from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

interface ReportData {
  program: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  total_participants: number;
  cateringTotal: number;
  extraTotal: number;
  coldDrinkTotal: number;
  grandTotal: number;
}

interface CateringProduct {
  id: string;
  name: string;
  quantity: number;
}

interface CateringData {
  program: string;
  customer_name?: string;
  total_participants?: number;
  products: { [key: string]: number };
  total: number;
}

interface RequestBody {
  month: string;
  type: 'all' | 'normal' | 'extra' | 'cold drink';
  action?: 'print' | 'download';
}

interface DatabaseEntry {
  id: string;
  entry_date: string;
  quantity: number;
  package_id: number;
  packages: {
    id: number;
    name: string;
    type: string;
  };
  products: {
    id: string;
    name: string;
    rate: number;
  };
  programs: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    customer_name: string;
    total_participants: number;
  };
}

interface DatabaseEntryWithoutPackages {
  id: string;
  entry_date: string;
  quantity: number;
  package_id: number;
  products: {
    id: string;
    name: string;
    rate: number;
  };
  programs: {
    id: number;
    name: string;
    customer_name: string;
    total_participants: number;
  };
}

interface ProductData {
  id: string;
  name: string;
}

interface DatabaseStaffEntry {
  id: string;
  entry_date: string;
  quantity: number;
  package_id: string;
  products: {
    id: string;
    name: string;
    rate: number;
  };
  packages: {
    id: string;
    name: string;
    type: string;
  };
}

const generatePDF = async (
  data: ReportData[],
  month: string,
  type: 'all' | 'normal' | 'extra' | 'cold drink',
  cateringData?: CateringData[],
  products?: CateringProduct[],
  packageTypes?: { id: string; type: string; name: string }[]
) => {
  let browser;
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      const executablePath = await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar');
      browser = await puppeteerCore.launch({
        executablePath,
        args: chromium.args,
        headless: true as const,
        defaultViewport: chromium.defaultViewport
      });
    } else {
      browser = await puppeteer.launch({
        headless: true as const,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();

    const PRODUCTS_PER_TABLE = 7;
    const productChunks = products ? Array.from({ length: Math.ceil(products.length / PRODUCTS_PER_TABLE) }, (_, i) =>
      products.slice(i * PRODUCTS_PER_TABLE, (i + 1) * PRODUCTS_PER_TABLE)
    ) : [];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Monthly Report - ${month}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0;
              padding: 8px;
              font-size: 9px;
            }
            .report-header {
              text-align: center;
              margin-bottom: 16px;
              padding: 8px;
              background-color: #fff;
              border-bottom: 1px solid #dee2e6;
            }
            .report-header h2 {
              margin: 0;
              color: #1a1a1a;
              font-size: 14px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 4px;
              border: 1px solid #dee2e6;
              table-layout: fixed;
            }
            th, td { 
              border: 1px solid #dee2e6; 
              padding: 4px;
              font-size: 8px;
              text-align: center;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            th:first-child, td:first-child {
              width: 120px;
              text-align: left;
            }
            th:not(:first-child):not(:last-child), td:not(:first-child):not(:last-child) {
              width: 45px;
            }
            th:nth-last-child(-n+4):not(:last-child), td:nth-last-child(-n+4):not(:last-child) {
              width: 60px;
            }
            th:last-child, td:last-child {
              width: 150px;
            }
            th { 
              background-color: #fff;
              font-weight: 600;
              color: #1a1a1a;
              font-size: 8px;
            }
            .total-row { 
              background-color: #fff;
              font-weight: 600;
            }
            .table-container {
              margin-bottom: 4px;
            }
            .no-break {
              page-break-inside: avoid;
            }
            .page-break-before {
              page-break-before: always;
            }
            .package-header {
              text-align: center;
              margin: 4px 0;
              padding: 6px;
              background-color: #fff;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              page-break-after: avoid;
            }
            .package-header h3 {
              margin: 0;
              font-size: 12px;
            }
            .grand-total {
              text-align: right;
              margin-top: 8px;
              padding: 8px;
              background-color: #fff;
              border: 1px solid #dee2e6;
              border-radius: 4px;
              font-weight: 600;
              font-size: 11px;
              page-break-inside: avoid;
            }
            @page { 
              margin: 10mm;
              size: A4;
            }
            @media print {
              thead {
                display: table-header-group;
              }
              tbody {
                display: table-row-group;
              }
              .table-container + .table-container {
                margin-top: 4px;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <h2>${format(parseISO(month), 'MMMM yyyy')} ${type === 'all' ? 'All Packages Report' : 
              type === 'normal' ? 'Catering Package Report' :
              type === 'extra' ? 'Extra Package Report' : 'Cold Drink Package Report'}</h2>
          </div>

          ${type === 'all' && packageTypes ? `
            <div class="table-container no-break">
              <table>
                <thead>
                  <tr>
                    <th style="width: 4%; text-align: center">No.</th>
                    <th style="width: 16%; text-align: left">Customer Name</th>
                    <th style="width: 18%; text-align: left">Program Name</th>
                    <th style="width: 7%; text-align: center">Participants</th>
                    <th style="width: 7%; text-align: center">From</th>
                    <th style="width: 7%; text-align: center">To</th>
                    ${packageTypes.map(pkg => {
                      const shortName = pkg.type.toLowerCase() === 'normal' ? 'CATERING' :
                                      pkg.type.toLowerCase() === 'extra' ? 'EXTRA' :
                                      pkg.type.toLowerCase() === 'cold drink' ? 'COLD DRINKS' : pkg.name;
                      return `<th style="width: 10%; text-align: right; font-size: 8px;">${shortName}</th>`;
                    }).join('')}
                    <th style="width: 11%; text-align: right">Gr. Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data
                    .sort((a, b) => {
                      // Staff row should always be last
                      if (a.program === 'Staff') return 1;
                      if (b.program === 'Staff') return -1;
                      
                      // Extract sequence numbers from program names
                      const getSequenceNumber = (programName: string) => {
                        const match = programName.match(/^(\\d+)\\s/);
                        return match ? parseInt(match[1]) : 999; // Programs without numbers go to end
                      };
                      
                      const seqA = getSequenceNumber(a.program);
                      const seqB = getSequenceNumber(b.program);
                      
                      // Sort by sequence number first
                      if (seqA !== seqB) {
                        return seqA - seqB;
                      }
                      
                      // If no sequence numbers or same sequence numbers, sort by program name
                      return a.program.localeCompare(b.program);
                    })
                    .map((row, index, sortedArray) => {
                      // Calculate sequence numbers properly for non-Staff programs only
                      let sequenceNumber = 0;
                      for (let i = 0; i < index; i++) {
                        if (sortedArray[i].program !== 'Staff') {
                          sequenceNumber++;
                        }
                      }
                      
                      const displayIndex = row.program === 'Staff' ? '-' : (sequenceNumber + 1);
                      
                      return `
                        <tr>
                          <td style="text-align: center">${displayIndex}</td>
                          <td style="text-align: left">${row.program === 'Staff' ? '-' : (row.customer_name || '-')}</td>
                          <td style="text-align: left">${row.program}</td>
                          <td style="text-align: center">${row.program === 'Staff' ? '-' : (row.total_participants || 0)}</td>
                          <td style="text-align: center">${format(new Date(row.start_date), 'dd MMM')}</td>
                          <td style="text-align: center">${format(new Date(row.end_date), 'dd MMM')}</td>
                          ${packageTypes.map(pkg => {
                            const total = pkg.type.toLowerCase() === 'normal' ? row.cateringTotal :
                                        pkg.type.toLowerCase() === 'extra' ? row.extraTotal :
                                        pkg.type.toLowerCase() === 'cold drink' ? row.coldDrinkTotal : 0;
                            return `<td style="text-align: right">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
                          }).join('')}
                          <td style="text-align: right">₹${row.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      `;
                    }).join('')}
                  <tr class="total-row">
                    <td colspan="6" style="text-align: right">TOTAL</td>
                    ${packageTypes.map(pkg => {
                      const total = data.reduce((sum, row) => {
                        const rowTotal = pkg.type.toLowerCase() === 'normal' ? row.cateringTotal :
                                       pkg.type.toLowerCase() === 'extra' ? row.extraTotal :
                                       pkg.type.toLowerCase() === 'cold drink' ? row.coldDrinkTotal : 0;
                        return sum + rowTotal;
                      }, 0);
                      return `<td style="text-align: right">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>`;
                    }).join('')}
                    <td style="text-align: right">₹${data.reduce((sum, row) => sum + row.grandTotal, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ` : cateringData && products ? `
            ${productChunks.map((chunk, chunkIndex) => `
              ${chunkIndex > 0 ? '<div class="page-break-before"></div>' : ''}
              <div class="table-container no-break">
                <div class="package-header">
                  <h3>${type === 'normal' ? 'CATERING PACKAGE' : type === 'extra' ? 'EXTRA PACKAGE' : 'COLD DRINK PACKAGE'}</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 5%; text-align: center">No.</th>
                      <th style="width: 15%; text-align: left">Customer Name</th>
                      <th style="width: 18%; text-align: left">Program Name</th>
                      <th style="width: 7%; text-align: center">Participants</th>
                      ${chunk.map(product => `
                        <th style="text-align: center">${product.name}</th>
                      `).join('')}
                      <th style="width: 8%; text-align: center">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${(() => {
                      // Sort cateringData with Staff always last
                      const sortedCateringData = cateringData
                        .sort((a, b) => {
                          // Staff should always be last
                          if (a.program === 'Staff') return 1;
                          if (b.program === 'Staff') return -1;
                          
                          // Extract sequence numbers from program names
                          const getSequenceNumber = (programName: string) => {
                            const match = programName.match(/^(\\d+)\\s/);
                            return match ? parseInt(match[1]) : 999; // Programs without numbers go to end
                          };
                          
                          const seqA = getSequenceNumber(a.program);
                          const seqB = getSequenceNumber(b.program);
                          
                          // Sort by sequence number first
                          if (seqA !== seqB) {
                            return seqA - seqB;
                          }
                          
                          // If no sequence numbers or same sequence numbers, sort by program name
                          return a.program.localeCompare(b.program);
                        });
                      
                      return sortedCateringData
                        .map((row, index) => {
                          // Calculate sequence numbers properly for non-Staff programs only
                          let sequenceNumber = 0;
                          for (let i = 0; i < index; i++) {
                            if (sortedCateringData[i].program !== 'Staff') {
                              sequenceNumber++;
                            }
                          }
                          
                          const displayIndex = row.program === 'Staff' ? '-' : (sequenceNumber + 1);
                          
                          return `
                            <tr>
                              <td style="text-align: center">${displayIndex}</td>
                              <td style="text-align: left">${row.program === 'Staff' ? '-' : (row.customer_name || '-')}</td>
                              <td style="text-align: left">${row.program}</td>
                              <td style="text-align: center">${row.program === 'Staff' ? '-' : (row.total_participants || 0)}</td>
                              ${chunk.map(product => `
                                <td style="text-align: center">${row.products[product.id] || 0}</td>
                              `).join('')}
                              <td style="text-align: center">${chunk.reduce((sum, product) => sum + (row.products[product.id] || 0), 0)}</td>
                            </tr>
                          `;
                        }).join('');
                    })()}
                    <tr class="total-row">
                      <td style="text-align: center">-</td>
                      <td colspan="3" style="text-align: center">TOTAL</td>
                      ${chunk.map(product => `
                        <td style="text-align: center">${cateringData.reduce((sum, row) => sum + (row.products[product.id] || 0), 0)}</td>
                      `).join('')}
                      <td style="text-align: center">${chunk.reduce((sum, product) => sum + cateringData.reduce((rowSum, row) => rowSum + (row.products[product.id] || 0), 0), 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            `).join('')}
            <div class="grand-total">
              Total: ₹${cateringData.reduce((sum, row) => sum + row.total, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          ` : ''}
        </body>
      </html>
    `;

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

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
    return pdf;
  } catch (error) {
    console.error('Error generating PDF:', error);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
};

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json() as RequestBody;
    const { month, type, action } = body;

    // Validate month format
    const parsedDate = parse(month, 'yyyy-MM', new Date());
    if (!isValid(parsedDate)) {
      return NextResponse.json({ error: 'Invalid month format' }, { status: 400 });
    }

    const startDate = format(startOfMonth(parsedDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(parsedDate), 'yyyy-MM-dd');

    let reportData: ReportData[] = [];
    let cateringData: CateringData[] | undefined;
    let products: CateringProduct[] | undefined;
    let packageTypes: { id: string; type: string; name: string }[] = [];

    // Fetch package types
    const { data: packageTypesData, error: packageTypesError } = await supabase
      .from('packages')
      .select('id, type, name')
      .in('type', ['Normal', 'Extra', 'Cold Drink'])
      .order('type', { ascending: true });

    if (packageTypesError) {
      console.error('Error fetching package types:', packageTypesError);
      return NextResponse.json({ error: 'Failed to fetch package types' }, { status: 500 });
    }

    // Sort packages in the desired order
    const typeOrder = { 'Normal': 1, 'Extra': 2, 'Cold Drink': 3 };
    packageTypes = (packageTypesData || []).sort((a, b) => 
      (typeOrder[a.type as keyof typeof typeOrder] || 0) - (typeOrder[b.type as keyof typeof typeOrder] || 0)
    );

    // Add debug logging
    console.log('Processing monthly report:', {
      month,
      type,
      startDate,
      endDate,
      action
    });

    if (type === 'all') {
      // Use program_month_mappings to get the correct programs for this billing month
      const { data: programMappings, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('program_id')
        .eq('billing_month', month);

      if (mappingsError) {
        console.error('Error fetching program mappings:', mappingsError);
        return NextResponse.json({ error: 'Failed to fetch program mappings' }, { status: 500 });
      }

      console.log('Monthly report - Program mappings found:', programMappings?.length || 0);

      // Extract program IDs
      const programIds = programMappings?.map(p => p.program_id) || [];

      // Fetch program billing entries using program IDs from billing month mapping
      let entries: any[] = [];
      if (programIds.length > 0) {
        const { data: programEntries, error } = await supabase
          .from('billing_entries')
          .select(`
            id,
            entry_date,
            quantity,
            package_id,
            products!inner (
              id,
              name,
              rate
            ),
            programs!inner (
              id,
              name,
              start_date,
              end_date,
              customer_name,
              total_participants
            ),
            packages!inner (
              id,
              name,
              type
            )
          `)
          .in('program_id', programIds);

        if (error) {
          console.error('Database query error:', error);
          return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
        }

        entries = programEntries || [];
      }

      // Fetch staff billing entries
      const { data: staffEntries, error: staffError } = await supabase
        .from('staff_billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          package_id,
          products!inner (
            id,
            name,
            rate
          ),
          packages!inner (
            id,
            name,
            type
          )
        `)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (staffError) {
        console.error('Staff billing entries query error:', staffError);
        return NextResponse.json({ error: 'Failed to fetch staff entries' }, { status: 500 });
      }

      // Process entries and group by program
      const programTotals = (entries as unknown as DatabaseEntry[]).reduce((acc: { [key: string]: ReportData }, entry) => {
        const programName = entry.programs.name;
        if (!acc[programName]) {
          acc[programName] = {
            program: programName,
            customer_name: entry.programs.customer_name,
            start_date: entry.programs.start_date,
            end_date: entry.programs.end_date,
            total_participants: entry.programs.total_participants,
            cateringTotal: 0,
            extraTotal: 0,
            coldDrinkTotal: 0,
            grandTotal: 0
          };
        }

        const amount = entry.quantity * entry.products.rate;
        const packageType = entry.packages.type.toLowerCase();

        switch (packageType) {
          case 'normal':
            acc[programName].cateringTotal += amount;
            break;
          case 'extra':
            acc[programName].extraTotal += amount;
            break;
          case 'cold drink':
            acc[programName].coldDrinkTotal += amount;
            break;
        }

        acc[programName].grandTotal += amount;
        return acc;
      }, {});

      // Process staff entries
      const staffTotals = (staffEntries as unknown as DatabaseStaffEntry[]).reduce((acc: ReportData, entry) => {
        const amount = entry.quantity * entry.products.rate;
        const packageType = entry.packages.type.toLowerCase();

        switch (packageType) {
          case 'normal':
            acc.cateringTotal += amount;
            break;
          case 'extra':
            acc.extraTotal += amount;
            break;
          case 'cold drink':
            acc.coldDrinkTotal += amount;
            break;
        }

        acc.grandTotal += amount;
        return acc;
      }, {
        program: 'Staff',
        customer_name: '-',
        start_date: startDate,
        end_date: endDate,
        total_participants: 0,
        cateringTotal: 0,
        extraTotal: 0,
        coldDrinkTotal: 0,
        grandTotal: 0
      });

      reportData = Object.values(programTotals);
      
      // Add staff row at the end if there's any staff consumption
      if (staffTotals.grandTotal > 0) {
        reportData.push(staffTotals);
      }

    } else {
      // Get package ID based on type
      const packageTypeMap = {
        'normal': 'Normal',
        'extra': 'Extra',
        'cold drink': 'Cold Drink'
      };

      const mappedType = packageTypeMap[type as keyof typeof packageTypeMap];
      
      console.log('Fetching specific package:', { type, mappedType });

      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('id')
        .eq('type', mappedType)
        .single();

      if (packageError) {
        console.error('Error fetching package:', packageError);
        return NextResponse.json({ error: 'Failed to fetch package details' }, { status: 500 });
      }

      if (!packageData) {
        return NextResponse.json({ error: `Package not found for type: ${type}` }, { status: 404 });
      }

      const packageId = packageData.id;

      // Fetch products for the selected package
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('package_id', packageId)
        .order('name');

      if (productError) {
        console.error('Error fetching products:', productError);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
      }

      products = (productData as ProductData[]).map(p => ({
        ...p,
        quantity: 0
      }));

      console.log('Fetched products:', products);

      // Use program_month_mappings to get the correct programs for this billing month
      const { data: programMappings, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('program_id')
        .eq('billing_month', month);

      if (mappingsError) {
        console.error('Error fetching program mappings:', mappingsError);
        return NextResponse.json({ error: 'Failed to fetch program mappings' }, { status: 500 });
      }

      console.log('Monthly report - Program mappings found for specific package:', programMappings?.length || 0);

      // Extract program IDs
      const programIds = programMappings?.map(p => p.program_id) || [];

      // Fetch entries for the selected package using program IDs
      let entries: any[] = [];
      if (programIds.length > 0) {
        const { data: programEntries, error } = await supabase
          .from('billing_entries')
          .select(`
            id,
            entry_date,
            quantity,
            package_id,
            products!inner (
              id,
              name,
              rate
            ),
            programs!inner (
              id,
              name,
              customer_name,
              total_participants
            )
          `)
          .eq('package_id', packageId)
          .in('program_id', programIds);

        if (error) {
          console.error('Database query error:', error);
          return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
        }

        entries = programEntries || [];
      }

      console.log('Fetched entries:', entries);

      // Process entries and group by program
      const programTotals = (entries as unknown as DatabaseEntryWithoutPackages[]).reduce((acc: { [key: string]: CateringData }, entry) => {
        const programName = entry.programs.name;
        if (!acc[programName]) {
          acc[programName] = {
            program: programName,
            customer_name: entry.programs.customer_name,
            total_participants: entry.programs.total_participants,
            products: {},
            total: 0
          };
        }

        const productId = entry.products.id;
        acc[programName].products[productId] = (acc[programName].products[productId] || 0) + entry.quantity;
        acc[programName].total += entry.quantity;
        return acc;
      }, {});

      cateringData = Object.values(programTotals);

      // Fetch staff entries for the selected package
      const { data: staffEntries, error: staffError } = await supabase
        .from('staff_billing_entries')
        .select(`
          id,
          entry_date,
          quantity,
          package_id,
          products!inner (
            id,
            name,
            rate
          )
        `)
        .eq('package_id', packageId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (staffError) {
        console.error('Staff entries query error:', staffError);
        return NextResponse.json({ error: 'Failed to fetch staff entries' }, { status: 500 });
      }

      // Process staff entries
      if (staffEntries && staffEntries.length > 0) {
        const staffData: CateringData = {
          program: 'Staff',
          products: {},
          total: 0
        };

        staffEntries.forEach((entry: any) => {
          const productId = (entry.products as any).id;
          staffData.products[productId] = (staffData.products[productId] || 0) + entry.quantity;
          staffData.total += entry.quantity;
        });

        // Add staff data at the end if there's consumption
        if (staffData.total > 0) {
          cateringData.push(staffData);
        }
      }

      console.log('Processed catering data with staff:', cateringData);
    }

    // Sort reportData by start_date and program name
    reportData.sort((a, b) => {
      const dateComparison = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      
      // If dates are equal, sort by program name
      if (dateComparison === 0) {
        return a.program.localeCompare(b.program);
      }
      
      return dateComparison;
    });

    // Generate PDF if requested
    if (action === 'print' || action === 'download') {
      const pdf = await generatePDF(reportData, month, type, cateringData, products, packageTypes);
      
      return new NextResponse(pdf, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': action === 'download' 
            ? `attachment; filename=monthly-report-${format(parsedDate, 'yyyy-MM')}.pdf`
            : 'inline'
        }
      });
    }

    // Return JSON response with debug info
    return NextResponse.json({
      data: {
        month: format(parsedDate, 'yyyy-MM'),
        type,
        reportData,
        cateringData,
        products,
        packageTypes,
        debug: {
          hasReportData: reportData.length > 0,
          hasCateringData: cateringData ? cateringData.length > 0 : false,
          hasProducts: products ? products.length > 0 : false
        }
      }
    });

  } catch (error) {
    console.error('Error processing monthly report:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
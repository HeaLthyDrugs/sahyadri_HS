"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { 
  RiDownloadLine, 
  RiUploadLine, 
  RiCalendarLine,
  RiSearchLine,
  RiHistoryLine,
  RiFileExcelLine,
  RiSave3Line,
  RiFilterLine,
  RiCalculatorLine,
  RiArrowDownSLine
} from "react-icons/ri";
import Papa from 'papaparse';
import { calculateDuration, isDateInRange } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  package_id: string;
  status: string;
}

interface Product {
  id: string;
  name: string;
  category: 'Meals' | 'Drinks';
  rate: number;
  package_id: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
}

interface EntryData {
  [date: string]: {
    [productId: string]: number;
  };
}

interface EntrySummary {
  totalQuantity: number;
  averagePerDay: number;
  maxQuantity: number;
  minQuantity: number;
}

interface EntryHistory {
  id: string;
  action: 'create' | 'update' | 'delete';
  user: string;
  timestamp: string;
  details: string;
}

interface Participant {
  id: string;
  attendee_name: string;
  reception_checkin: string;
  reception_checkout: string;
  program_id: string;
}

const ProgramSelect = ({ 
  value, 
  onChange, 
  programs 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  programs: Program[]; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedProgram = programs.find(p => p.id === value);

  return (
    <div className="relative min-w-[300px]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border rounded px-3 py-2 bg-white hover:bg-gray-50"
      >
        {selectedProgram ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedProgram.name}</span>
            <span className="text-sm text-gray-500">
              {selectedProgram.customer_name} • {format(parseISO(selectedProgram.start_date), 'dd/MM/yyyy')} - {format(parseISO(selectedProgram.end_date), 'dd/MM/yyyy')}
              {selectedProgram.status === 'Completed' ? ' (Completed)' : ''}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">Select Program</span>
        )}
        <RiArrowDownSLine className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {programs.map(program => (
            <button
              key={program.id}
              type="button"
              onClick={() => {
                onChange(program.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${
                program.id === value ? 'bg-amber-50' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{program.name}</span>
                <span className="text-sm text-gray-500">
                  {program.customer_name} • {format(parseISO(program.start_date), 'dd/MM/yyyy')} - {format(parseISO(program.end_date), 'dd/MM/yyyy')}
                  {program.status === 'Completed' ? ' (Completed)' : ''}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export function BillingEntriesPage() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [programs, setPrograms] = useState<Program[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [entryData, setEntryData] = useState<EntryData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState<Date[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [productFilter, setProductFilter] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [entryHistory, setEntryHistory] = useState<EntryHistory[]>([]);
  const [bulkEntryMode, setBulkEntryMode] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [autoCalculateMode, setAutoCalculateMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Add ref for managing focus
  const tableRef = useRef<HTMLTableElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number
  ) => {
    const totalRows = products.length;
    const totalCols = dateRange.length;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          focusCell(rowIndex - 1, colIndex);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < totalRows - 1) {
          focusCell(rowIndex + 1, colIndex);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (colIndex > 0) {
          focusCell(rowIndex, colIndex - 1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (colIndex < totalCols - 1) {
          focusCell(rowIndex, colIndex + 1);
        }
        break;
      case 'Enter':
        // Move down on Enter
        if (rowIndex < totalRows - 1) {
          focusCell(rowIndex + 1, colIndex);
        }
        break;
      case 'Tab':
        // Don't prevent default Tab behavior
        // but update the focused cell state
        setFocusedCell({
          row: rowIndex,
          col: e.shiftKey ? colIndex - 1 : colIndex + 1
        });
        break;
    }
  };

  // Function to focus a specific cell
  const focusCell = (rowIndex: number, colIndex: number) => {
    const cell = tableRef.current?.querySelector(
      `input[data-row="${rowIndex}"][data-col="${colIndex}"]`
    ) as HTMLInputElement;
    
    if (cell) {
      cell.focus();
      setFocusedCell({ row: rowIndex, col: colIndex });
    }
  };

  // Fetch programs when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchProgramsByMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchProgramsByMonth = async (month: string) => {
    setIsLoading(true);
    try {
      const monthDate = new Date(month);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .or(
          `and(start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()})`
        )
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      // Filter programs that overlap with the selected month, but don't filter out completed programs
      const filteredPrograms = data?.filter(program => {
        const programStart = parseISO(program.start_date);
        const programEnd = parseISO(program.end_date);
        return (programStart <= monthEnd && programEnd >= monthStart);
      });

      setPrograms(filteredPrograms || []);
      setSelectedProgram(""); // Reset program selection
      setSelectedPackage(""); // Reset package selection
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackages = async (programId: string) => {
    try {
      // For now, fetch all packages since there's no direct relation to programs
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('package_id', selectedPackage)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  // Fetch packages when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchPackages(selectedProgram);
      const program = programs.find(p => p.id === selectedProgram);
      if (program) {
        // Set date range based on program dates and selected month
        const monthStart = startOfMonth(new Date(selectedMonth));
        const monthEnd = endOfMonth(new Date(selectedMonth));
        const programStart = new Date(program.start_date);
        const programEnd = new Date(program.end_date);

        const rangeStart = programStart > monthStart ? programStart : monthStart;
        const rangeEnd = programEnd < monthEnd ? programEnd : monthEnd;

        const dates = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
        setDateRange(dates);
      }
    }
  }, [selectedProgram, programs, selectedMonth]);

  // Fetch entries when package is selected
  useEffect(() => {
    if (selectedPackage && dateRange.length > 0) {
      fetchProducts();
      fetchEntries();
      if (selectedProgram) {
        fetchParticipants(selectedProgram);
      }
    }
  }, [selectedPackage, dateRange, selectedProgram]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_entries')
        .select('*')
        .eq('program_id', selectedProgram)
        .eq('package_id', selectedPackage)
        .gte('entry_date', format(dateRange[0], 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'));

      if (error) throw error;

      // Initialize empty data structure for all dates and products
      const transformedData: EntryData = {};
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        transformedData[dateStr] = {};
        products.forEach(product => {
          transformedData[dateStr][product.id] = 0;
        });
      });

      // Fill in actual values from database
      data?.forEach(entry => {
        if (!transformedData[entry.entry_date]) {
          transformedData[entry.entry_date] = {};
        }
        transformedData[entry.entry_date][entry.product_id] = entry.quantity;
      });

      setEntryData(transformedData);
    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to fetch entries');
    }
  };

  const handleQuantityChange = (date: string, productId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setEntryData(prev => ({
      ...prev,
      [date]: {
        ...prev[date],
        [productId]: quantity
      }
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Create entries array with only the fields that exist in the table
      const entries = Object.entries(entryData).flatMap(([date, products]) =>
        Object.entries(products)
          .filter(([_, quantity]) => quantity > 0) // Only include entries with quantity > 0
          .map(([productId, quantity]) => ({
            id: crypto.randomUUID(), // Generate UUID for new entries
            program_id: selectedProgram,
            package_id: selectedPackage,
            product_id: productId,
            entry_date: date,
            quantity: quantity
          }))
      );

      if (entries.length === 0) {
        toast.error('No entries to save');
        return;
      }

      // First, delete existing entries for this date range and program/package
      const { error: deleteError } = await supabase
        .from('billing_entries')
        .delete()
        .eq('program_id', selectedProgram)
        .eq('package_id', selectedPackage)
        .gte('entry_date', format(dateRange[0], 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'));

      if (deleteError) throw deleteError;

      // Then insert new entries
      const { error: insertError } = await supabase
        .from('billing_entries')
        .insert(entries);

      if (insertError) throw insertError;

      toast.success('Entries saved successfully');
      
      // Refresh entries after save
      fetchEntries();
    } catch (error: any) {
      console.error('Error saving entries:', error);
      toast.error(error.message || 'Failed to save entries');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to export entries as CSV
  const handleExport = () => {
    try {
      // Prepare data for CSV
      const csvData = products.map(product => {
        const row: any = {
          'Product Name': product.name,
          'Category': product.category
        };
        dateRange.forEach(date => {
          const dateStr = format(date, 'dd-MM-yyyy');
          row[dateStr] = entryData[format(date, 'yyyy-MM-dd')]?.[product.id] || 0;
        });
        return row;
      });

      // Convert to CSV
      const csv = Papa.unparse(csvData);
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('hidden', '');
      a.setAttribute('href', url);
      a.setAttribute('download', `entries_${selectedProgram}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  // Function to import entries from CSV
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const text = await file.text();
      Papa.parse(text, {
        header: true,
        complete: (results) => {
          const newEntryData = { ...entryData };
          
          results.data.forEach((row: any) => {
            const product = products.find(p => p.name === row['Product Name']);
            if (!product) return;

            dateRange.forEach(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const displayDate = format(date, 'dd-MM-yyyy');
              const quantity = parseInt(row[displayDate]) || 0;
              
              if (!newEntryData[dateStr]) {
                newEntryData[dateStr] = {};
              }
              newEntryData[dateStr][product.id] = quantity;
            });
          });

          setEntryData(newEntryData);
          toast.success('Data imported successfully');
        },
        error: (error: any) => {
          throw error;
        }
      });
    } catch (error) {
      toast.error('Failed to import data');
    }
  };

  // Function to copy previous day's entries
  const handleCopyPrevious = (date: Date) => {
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = format(prevDate, 'yyyy-MM-dd');
    const dateStr = format(date, 'yyyy-MM-dd');

    if (entryData[prevDateStr]) {
      setEntryData(prev => ({
        ...prev,
        [dateStr]: { ...prev[prevDateStr] }
      }));
      toast.success('Copied previous day\'s entries');
    } else {
      toast.error('No entries found for previous day');
    }
  };

  // Function to calculate summary statistics
  const calculateSummary = (productId: string): EntrySummary => {
    const quantities = Object.values(entryData)
      .map(dateData => dateData[productId] || 0)
      .filter(q => q > 0);

    return {
      totalQuantity: quantities.reduce((sum, q) => sum + q, 0),
      averagePerDay: quantities.length ? 
        Math.round(quantities.reduce((sum, q) => sum + q, 0) / quantities.length) : 0,
      maxQuantity: Math.max(0, ...quantities),
      minQuantity: quantities.length ? Math.min(...quantities) : 0
    };
  };

  const fetchParticipants = async (programId: string) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          attendee_name,
          reception_checkin,
          reception_checkout,
          program_id
        `)
        .eq('program_id', programId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants');
    }
  };

  const fetchProductRules = async () => {
    try {
      const { data, error } = await supabase
        .from('product_rules')
        .select('*')
        .eq('package_id', selectedPackage);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching product rules:', error);
      return [];
    }
  };

  const calculateEntriesFromParticipants = async () => {
    if (!selectedProgram || !selectedPackage || participants.length === 0) {
      toast.error('No participants found or program/package not selected');
      return;
    }

    try {
      // Fetch product rules first
      const { data: rules, error: rulesError } = await supabase
        .from('product_rules')
        .select('*')
        .eq('package_id', selectedPackage);

      if (rulesError) throw rulesError;

      const newEntryData: EntryData = {};

      // Initialize the structure
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        newEntryData[dateStr] = {};
        products.forEach(product => {
          newEntryData[dateStr][product.id] = 0;
        });
      });

      // Calculate quantities based on participants
      participants.forEach(participant => {
        const checkinDate = new Date(participant.reception_checkin);
        const checkoutDate = new Date(participant.reception_checkout);

        dateRange.forEach(date => {
          const currentDate = new Date(date);
          const dateStr = format(currentDate, 'yyyy-MM-dd');

          if (isDateInRange(currentDate, checkinDate, checkoutDate)) {
            products.forEach(product => {
              const rule = rules?.find(r => r.product_id === product.id);
              if (rule) {
                const duration = calculateDuration(checkinDate, checkoutDate);
                
                switch (rule.allocation_type) {
                  case 'per_day':
                    newEntryData[dateStr][product.id] += rule.quantity;
                    break;
                  case 'per_stay':
                    if (format(currentDate, 'yyyy-MM-dd') === format(checkinDate, 'yyyy-MM-dd')) {
                      newEntryData[dateStr][product.id] += rule.quantity;
                    }
                    break;
                  case 'per_hour':
                    const hoursInDay = 24;
                    newEntryData[dateStr][product.id] += Math.ceil(rule.quantity * (hoursInDay / duration.hours));
                    break;
                }
              } else {
                // Default behavior if no rule exists
                switch (product.category) {
                  case 'Meals':
                    newEntryData[dateStr][product.id] += 3; // 3 meals per day
                    break;
                  case 'Drinks':
                    newEntryData[dateStr][product.id] += 2; // 2 drinks per day
                    break;
                  default:
                    newEntryData[dateStr][product.id] += 1; // 1 for other items
                }
              }
            });
          }
        });
      });

      setEntryData(newEntryData);
      toast.success('Entries calculated based on participant data');
    } catch (error) {
      console.error('Error calculating entries:', error);
      toast.error('Failed to calculate entries');
    }
  };

  // Add a helper function to get program status style
  const getProgramStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      case 'Ongoing':
        return 'bg-green-100 text-green-800';
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPrograms = programs.filter(program => 
    statusFilter === 'all' || program.status === statusFilter
  );

  // Add this useEffect to fetch participants when program changes
  useEffect(() => {
    if (selectedProgram) {
      fetchParticipants(selectedProgram);
    } else {
      setParticipants([]); // Clear participants when no program is selected
    }
  }, [selectedProgram]);

  return (
    <div className="p-4">
      {/* Filter Section */}
      <div className="flex flex-wrap gap-4 mb-6 items-center bg-white p-4 rounded-lg shadow">
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border rounded px-3 py-2"
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="all">All Programs</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>

        <ProgramSelect
          value={selectedProgram}
          onChange={setSelectedProgram}
          programs={filteredPrograms}
        />

        <select
          value={selectedPackage}
          onChange={(e) => setSelectedPackage(e.target.value)}
          className="border rounded px-3 py-2 min-w-[200px]"
          disabled={!selectedProgram}
        >
          <option value="">Select Package</option>
          {packages.map(pkg => (
            <option key={pkg.id} value={pkg.id}>
              {pkg.name} ({pkg.type})
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      {selectedPackage && dateRange.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <RiDownloadLine /> Export CSV
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 cursor-pointer">
            <RiUploadLine /> Import CSV
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleImport}
            />
          </label>

          <button
            onClick={() => setBulkEntryMode(!bulkEntryMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              bulkEntryMode ? 'bg-amber-500' : 'bg-gray-500'
            } text-white hover:opacity-90`}
          >
            <RiFileExcelLine /> Bulk Entry Mode
          </button>

          <button
            onClick={() => setShowSummary(!showSummary)}
            className={`flex items-center gap-2 px-4 py-2 rounded ${
              showSummary ? 'bg-purple-500' : 'bg-gray-500'
            } text-white hover:opacity-90`}
          >
            <RiFilterLine /> Show Summary
          </button>
        </div>
      )}

      {/* Product Search */}
      {selectedPackage && (
        <div className="mb-4">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded w-full max-w-md"
            />
          </div>
        </div>
      )}

      {/* Entries Table */}
      {selectedPackage && dateRange.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table ref={tableRef} className="w-full">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-50 sticky left-0 z-10">Product Name</th>
                  {dateRange.map(date => (
                    <th key={date.toISOString()} className="border p-2 bg-gray-50 min-w-[100px]">
                      <div className="flex flex-col">
                        {format(date, 'dd-MM-yyyy')}
                        <button
                          onClick={() => handleCopyPrevious(date)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                          title="Copy previous day's entries"
                        >
                          <RiCalendarLine />
                        </button>
                      </div>
                    </th>
                  ))}
                  {showSummary && (
                    <>
                      <th className="border p-2 bg-gray-50">Total</th>
                      <th className="border p-2 bg-gray-50">Average</th>
                      <th className="border p-2 bg-gray-50">Max</th>
                      <th className="border p-2 bg-gray-50">Min</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {products
                  .filter(product => 
                    product.name.toLowerCase().includes(productFilter.toLowerCase())
                  )
                  .map((product, rowIndex) => (
                    <tr key={product.id}>
                      <td className="border p-2 bg-gray-50 font-medium sticky left-0 z-10">
                        {product.name}
                      </td>
                      {dateRange.map((date, colIndex) => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        return (
                          <td key={dateStr} className="border p-2">
                            <input
                              type="number"
                              value={entryData[dateStr]?.[product.id] || ''}
                              onChange={(e) => handleQuantityChange(dateStr, product.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                              data-row={rowIndex}
                              data-col={colIndex}
                              className={`w-full text-center border rounded p-1 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                                focusedCell?.row === rowIndex && focusedCell?.col === colIndex
                                  ? 'ring-2 ring-amber-500'
                                  : ''
                              }`}
                              min="0"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Save Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => {
            setAutoCalculateMode(!autoCalculateMode);
            if (!autoCalculateMode) {
              calculateEntriesFromParticipants();
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-md ${
            autoCalculateMode 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          <RiCalculatorLine className="w-5 h-5" />
          {autoCalculateMode ? 'Auto-Calculate On' : 'Auto-Calculate Off'}
        </button>

        {autoCalculateMode && (
          <div className="text-sm text-gray-500">
            Entries are being automatically calculated based on participant check-in/out times
          </div>
        )}
      </div>

      {/* Add a warning message when selecting a completed program */}
      {selectedProgram && programs.find(p => p.id === selectedProgram)?.status === 'Completed' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md mt-2">
          Note: You are viewing/editing entries for a completed program
        </div>
      )}
    </div>
  );
}
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
  RiArrowDownSLine,
  RiAddLine
} from "react-icons/ri";
import Papa from 'papaparse';
import { calculateDuration, isDateInRange } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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

interface ProductRule {
  id: string;
  package_id: string;
  product_id: string;
  allocation_type: 'per_day' | 'per_stay' | 'per_hour';
  quantity: number;
}

interface TimeSlot {
  start: string;
  end: string;
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
  const [productRules, setProductRules] = useState<ProductRule[]>([]);

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
      console.log('Fetching entries for:', {
        programId: selectedProgram,
        packageId: selectedPackage,
        dateRange: dateRange.map(d => format(d, 'yyyy-MM-dd'))
      });

      // Log participants
      const { data: participants } = await supabase
        .from('participants')
        .select('*')
        .eq('program_id', selectedProgram);
      console.log('Participants:', participants);

      // Log product rules
      const { data: rules } = await supabase
        .from('product_rules')
        .select('*')
        .eq('package_id', selectedPackage);
      console.log('Product rules:', rules);

      // First get all participants for this program
      const { data: participantsData, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('program_id', selectedProgram);

      if (participantError) throw participantError;

      // Then get all product rules for the package
      const { data: rulesData, error: rulesError } = await supabase
        .from('product_rules')
        .select(`
          *,
          products (
            id,
            name,
            category
          )
        `)
        .eq('package_id', selectedPackage);

      if (rulesError) throw rulesError;

      // Get existing entries
      const { data: existingEntries, error: entriesError } = await supabase
        .from('billing_entries')
        .select('*')
        .eq('program_id', selectedProgram)
        .eq('package_id', selectedPackage)
        .gte('entry_date', format(dateRange[0], 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'));

      if (entriesError) throw entriesError;

      // Initialize empty data structure for all dates and products
      const transformedData: EntryData = {};
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        transformedData[dateStr] = {};
        products.forEach(product => {
          // Calculate default quantity based on rules and participants
          const rule = rules?.find(r => r.product_id === product.id);
          const participantsForDate = participants?.filter(p => 
            isDateInRange(date, new Date(p.reception_checkin), new Date(p.reception_checkout))
          );
          
          let defaultQuantity = 0;
          if (rule && participantsForDate) {
            switch (rule.allocation_type) {
              case 'per_day':
                defaultQuantity = rule.quantity * participantsForDate.length;
                break;
              case 'per_stay':
                defaultQuantity = participantsForDate.filter(p => 
                  format(new Date(p.reception_checkin), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                ).length * rule.quantity;
                break;
              case 'per_hour':
                defaultQuantity = participantsForDate.reduce((sum, p) => {
                  const hours = calculateDuration(p.reception_checkin, p.reception_checkout, 'hours');
                  return sum + (rule.quantity * hours);
                }, 0);
                break;
            }
          }
          
          transformedData[dateStr][product.id] = defaultQuantity;
        });
      });

      // Fill in actual values from database
      existingEntries?.forEach(entry => {
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

  const isWithinTimeSlot = (checkTime: string, slot: TimeSlot): boolean => {
    const time = new Date(`1970-01-01T${checkTime}`);
    const start = new Date(`1970-01-01T${slot.start}`);
    const end = new Date(`1970-01-01T${slot.end}`);
    return time >= start && time <= end;
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

  const calculateDuration = (start: string, end: string, unit: 'hours' | 'days') => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diff = endDate.getTime() - startDate.getTime();
    
    if (unit === 'hours') {
      return Math.ceil(diff / (1000 * 60 * 60));
    }
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Add this to your useEffect that runs when package changes
  useEffect(() => {
    if (selectedPackage) {
      // Fetch product rules
      const fetchRules = async () => {
        const { data, error } = await supabase
          .from('product_rules')
          .select(`
            *,
            products (
              name
            )
          `)
          .eq('package_id', selectedPackage);

        if (error) {
          console.error('Error fetching rules:', error);
          return;
        }
        setProductRules(data || []);
      };

      fetchRules();
    }
  }, [selectedPackage]);

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
            onClick={async () => {
              try {
                // Call the recalculate function
                const { error } = await supabase.rpc('recalculate_program_entries', {
                  program_id_param: selectedProgram
                });
                
                if (error) throw error;
                
                // Refresh entries
                await fetchEntries();
                toast.success('Entries recalculated successfully');
              } catch (error) {
                console.error('Error recalculating entries:', error);
                toast.error('Failed to recalculate entries');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            <RiCalculatorLine /> Recalculate Entries
          </button>

          <button
            onClick={async () => {
              try {
                // Add a test participant
                const { error } = await supabase
                  .from('participants')
                  .insert([{
                    attendee_name: 'Test Participant',
                    program_id: selectedProgram,
                    reception_checkin: new Date().toISOString(),
                    reception_checkout: new Date(Date.now() + 24*60*60*1000).toISOString(), // Next day
                    type: 'participant'
                  }]);

                if (error) throw error;
                
                // Refresh entries after a short delay to allow trigger to complete
                setTimeout(() => {
                  fetchEntries();
                }, 1000);
                
                toast.success('Test participant added');
              } catch (error) {
                console.error('Error adding test participant:', error);
                toast.error('Failed to add test participant');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            <RiAddLine /> Add Test Participant
          </button>

          <button
            onClick={async () => {
              try {
                // Log current state
                console.log('Current State:', {
                  selectedProgram,
                  selectedPackage,
                  dateRange: dateRange.map(d => format(d, 'yyyy-MM-dd')),
                  participants,
                  products,
                  entryData
                });

                // Log database entries
                const { data: entries, error: entriesError } = await supabase
                  .from('billing_entries')
                  .select('*')
                  .eq('program_id', selectedProgram)
                  .eq('package_id', selectedPackage);

                if (entriesError) throw entriesError;
                console.log('Database Entries:', entries);

                // Log product rules
                const { data: rules, error: rulesError } = await supabase
                  .from('product_rules')
                  .select('*')
                  .eq('package_id', selectedPackage);

                if (rulesError) throw rulesError;
                console.log('Product Rules:', rules);

                toast.success('Debug info logged to console');
              } catch (error) {
                console.error('Error fetching debug info:', error);
                toast.error('Failed to fetch debug info');
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            <RiSearchLine /> Debug Info
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

      {/* Add a warning message when selecting a completed program */}
      {selectedProgram && programs.find(p => p.id === selectedProgram)?.status === 'Completed' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md mt-2">
          Note: You are viewing/editing entries for a completed program
        </div>
      )}

      {selectedPackage && productRules.length > 0 && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Current Product Rules:</h3>
          <div className="space-y-2">
            {productRules.map(rule => (
              <div key={rule.id} className="flex items-center gap-2 text-sm">
                <span className="font-medium">{rule.products?.name}:</span>
                <span>{rule.quantity} per {rule.allocation_type.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
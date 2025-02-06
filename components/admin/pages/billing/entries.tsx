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
  RiAddLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowLeftLine,
  RiArrowRightLine,
  RiKeyboardLine,
  RiCloseLine,
} from "react-icons/ri";
import Papa from 'papaparse';
import { CiEdit } from "react-icons/ci";
import { IoExitOutline } from "react-icons/io5";

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
  rate: number;
  package_id: string;
  category?: string;
  slot_start?: string;
  slot_end?: string;
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

// Add new interfaces for product search
interface ProductChip {
  id: string;
  name: string;
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
        <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {programs.map(program => (
            <button
              key={program.id}
              type="button"
              onClick={() => {
                onChange(program.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${program.id === value ? 'bg-amber-50' : ''
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

const ProductSearch = ({
  products,
  selectedProducts,
  onProductSelect,
  onProductRemove
}: {
  products: Product[];
  selectedProducts: ProductChip[];
  onProductSelect: (product: Product) => void;
  onProductRemove: (productId: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedProducts.some(sp => sp.id === product.id)
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredProducts.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredProducts.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredProducts[selectedIndex]) {
          onProductSelect(filteredProducts[selectedIndex]);
          setSearchQuery("");
          setShowSuggestions(false);
          setSelectedIndex(0);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(0);
        break;
    }
  };

  return (
    <div className="mb-6">
      {/* Search input with suggestions */}
      <div className="relative">
        <div className="relative">
          <RiSearchLine className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search and select products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            className="pl-10 pr-4 py-2 border rounded w-full max-w-md"
          />
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && searchQuery && (
          <div className="absolute z-[400] w-full max-w-md mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredProducts.map((product, index) => (
              <button
                key={product.id}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${index === selectedIndex ? 'bg-amber-50' : ''
                  }`}
                onClick={() => {
                  onProductSelect(product);
                  setSearchQuery("");
                  setShowSuggestions(false);
                  setSelectedIndex(0);
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {product.name}
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="px-4 py-2 text-gray-500">No products found</div>
            )}
          </div>
        )}
      </div>

      {/* Selected products chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {selectedProducts.map(product => (
          <div
            key={product.id}
            className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full"
          >
            <span>{product.name}</span>
            <button
              onClick={() => onProductRemove(product.id)}
              className="ml-1 text-amber-600 hover:text-amber-800"
            >
              ×
            </button>
          </div>
        ))}
      </div>
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
  const [selectedProducts, setSelectedProducts] = useState<ProductChip[]>([]);
  const [isFullScreenMode, setIsFullScreenMode] = useState(false);
  const [showKeyboardGuide, setShowKeyboardGuide] = useState(true);

  // Add ref for managing focus
  const tableRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // Add this function to handle keyboard navigation
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
    const totalRows = products.length;
    const totalCols = dateRange.length;
    let nextRow = rowIndex;
    let nextCol = colIndex;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        nextRow = Math.max(0, rowIndex - 1);
        focusCell(nextRow, colIndex);
        break;
      case 'ArrowDown':
        e.preventDefault();
        nextRow = Math.min(totalRows - 1, rowIndex + 1);
        focusCell(nextRow, colIndex);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        nextCol = Math.max(0, colIndex - 1);
        focusCell(rowIndex, nextCol);
        break;
      case 'ArrowRight':
      case 'Tab':
        e.preventDefault();
        nextCol = Math.min(totalCols - 1, colIndex + 1);
        if (nextCol === colIndex && rowIndex < totalRows - 1) {
          nextCol = 0;
          nextRow = rowIndex + 1;
        }
        focusCell(nextRow, nextCol);
        break;
      case 'Enter':
        e.preventDefault();
        // Save entries and maintain current focus
        const currentInput = e.currentTarget;
        try {
          await handleSave();
          toast.success('Entries saved successfully');
          // Restore focus to current cell
          setTimeout(() => {
            currentInput.focus();
            currentInput.select();
          }, 100);
        } catch (error) {
          console.error('Error saving entries:', error);
          toast.error('Failed to save entries');
        }
        break;
      default:
        return;
    }
  };

  // Add this function to handle cell focusing
  const focusCell = (rowIndex: number, colIndex: number) => {
    const cell = document.querySelector(
      `input[data-row="${rowIndex}"][data-col="${colIndex}"]`
    ) as HTMLInputElement;

    if (cell) {
      // Scroll cell into view if needed
      const cellRect = cell.getBoundingClientRect();
      const tableRect = tableRef.current?.getBoundingClientRect();

      if (tableRect) {
        if (cellRect.bottom > tableRect.bottom) {
          cell.scrollIntoView({ block: 'end', behavior: 'smooth' });
        } else if (cellRect.top < tableRect.top) {
          cell.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }
      }

      cell.focus();
      cell.select();
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
      console.log('Fetching packages for program:', programId);
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

      if (error) throw error;
      console.log('Fetched packages:', data);
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    }
  };

  const fetchProducts = async (packageId: string) => {
    try {
      console.log('Fetching products for package:', packageId);
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          rate,
          package_id,
          slot_start,
          slot_end
        `)
        .eq('package_id', packageId)
        .order('name');

      if (error) throw error;
      console.log('Fetched products:', data);
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
    if (selectedPackage) {
      fetchProducts(selectedPackage);
    } else {
      setProducts([]); // Clear products when no package is selected
    }
  }, [selectedPackage]);

  // Fetch entries when package is selected
  useEffect(() => {
    if (selectedProgram && selectedPackage && dateRange.length > 0 && products.length > 0) {
      fetchEntries();
    }
  }, [selectedProgram, selectedPackage, dateRange, products.length]);

  const calculateQuantityForSlot = (
    product: Product,
    date: Date,
    participants: Participant[]
  ): number => {
    // Convert slot times to Date objects for comparison
    const slotStart = new Date(date);
    const [startHours, startMinutes] = product.slot_start?.split(':') || ['00', '00'];
    slotStart.setHours(parseInt(startHours), parseInt(startMinutes), 0);

    const slotEnd = new Date(date);
    const [endHours, endMinutes] = product.slot_end?.split(':') || ['00', '00'];
    slotEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0);

    // Count participants present during this slot
    const count = participants.filter(participant => {
      const checkin = new Date(participant.reception_checkin);
      const checkout = new Date(participant.reception_checkout);

      // Check if participant was present during the slot
      const isPresent = (
        format(date, 'yyyy-MM-dd') === format(checkin, 'yyyy-MM-dd') &&
        checkin.getTime() <= slotEnd.getTime() &&
        checkout.getTime() >= slotStart.getTime()
      );

      // Debug logs
      console.log({
        product: product.name,
        date: format(date, 'yyyy-MM-dd'),
        participant: participant.attendee_name,
        checkin: format(checkin, 'yyyy-MM-dd HH:mm'),
        checkout: format(checkout, 'yyyy-MM-dd HH:mm'),
        slotStart: format(slotStart, 'yyyy-MM-dd HH:mm'),
        slotEnd: format(slotEnd, 'yyyy-MM-dd HH:mm'),
        isPresent
      });

      return isPresent;
    }).length;

    return count;
  };

  const fetchEntries = async () => {
    try {
      setIsLoading(true);

      // Debug logs
      console.log('Fetching entries with params:', {
        programId: selectedProgram,
        packageId: selectedPackage,
        dateRange: dateRange.map(d => format(d, 'yyyy-MM-dd'))
      });

      const { data: billingEntries, error: entriesError } = await supabase
        .from('billing_entries')
        .select(`
          *,
          products!billing_entries_product_id_fkey (
            id,
            name,
            rate,
            package_id
          )
        `)
        .eq('program_id', selectedProgram)
        .eq('package_id', selectedPackage)
        .gte('entry_date', format(dateRange[0], 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'));

      if (entriesError) throw entriesError;

      console.log('Fetched billing entries:', billingEntries);

      // Initialize entry data structure
      const newEntryData: EntryData = {};

      // Initialize all dates with 0 quantities for all products
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        newEntryData[dateStr] = {};
        products.forEach(product => {
          newEntryData[dateStr][product.id] = 0;
        });
      });

      // Fill in the actual quantities from billing entries
      billingEntries?.forEach(entry => {
        const dateStr = format(new Date(entry.entry_date), 'yyyy-MM-dd');
        if (newEntryData[dateStr] && entry.product_id) {
          newEntryData[dateStr][entry.product_id] = entry.quantity;
        }
      });

      console.log('Transformed entry data:', newEntryData);
      console.log('Current products:', products);
      console.log('Current date range:', dateRange);

      setEntryData(newEntryData);

    } catch (error) {
      console.error('Error fetching entries:', error);
      toast.error('Failed to fetch entries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (date: string, productId: string, value: string) => {
    // Remove the Normal package check to allow editing
    const newValue = value === '' ? '0' : value;
    const numericValue = parseInt(newValue, 10);

    if (isNaN(numericValue)) {
      return;
    }

    setEntryData(prev => ({
      ...prev,
      [date]: {
        ...(prev[date] || {}),
        [productId]: numericValue
      }
    }));
  };

  // Modify the keyboard shortcuts effect
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      if (isFullScreenMode && e.key === 'Escape') {
        e.preventDefault();
        setIsFullScreenMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [isFullScreenMode]);

  // Make handleSave return a promise
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Create entries array with only the fields that exist in the table
      const entries = Object.entries(entryData).flatMap(([date, products]) =>
        Object.entries(products)
          .filter(([_, quantity]) => quantity > 0)
          .map(([productId, quantity]) => ({
            id: crypto.randomUUID(),
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

      const { error: deleteError } = await supabase
        .from('billing_entries')
        .delete()
        .eq('program_id', selectedProgram)
        .eq('package_id', selectedPackage)
        .gte('entry_date', format(dateRange[0], 'yyyy-MM-dd'))
        .lte('entry_date', format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'));

      if (deleteError) throw deleteError;

      const { error: insertError } = await supabase
        .from('billing_entries')
        .insert(entries);

      if (insertError) throw insertError;

      toast.success('Entries saved successfully');

      // Don't fetch entries here as it will reset the form
      // await fetchEntries();
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

  // Add handlers for product selection
  const handleProductSelect = (product: Product) => {
    setSelectedProducts(prev => [...prev, { id: product.id, name: product.name }]);
  };

  const handleProductRemove = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Add this helper function near the top of the file
  const isNormalPackageProduct = (productId: string, products: Product[], packages: Package[]) => {
    const product = products.find(p => p.id === productId);
    const package_ = packages.find(p => p.id === product?.package_id);
    return package_?.type === 'Normal';
  };

  return (
    <div className={`${isFullScreenMode ? 'fixed inset-0 bg-white z-50' : 'p-2 sm:p-4'}`}>
      {/* Toggle Full Screen and Save Button Container */}
      <div className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 flex items-center gap-2 sm:gap-4">
        <button
          onClick={() => setIsFullScreenMode(!isFullScreenMode)}
          className="bg-amber-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg hover:bg-amber-600 flex items-center gap-2 text-sm sm:text-base"
        >
          {isFullScreenMode ? (
            <>Exit Edit Mode <IoExitOutline /></>
          ) : (
            <>Edit Mode <CiEdit /></>
          )}
        </button>
      </div>

      <div className={`${isFullScreenMode ? 'h-screen flex flex-col overflow-hidden' : ''}`}>
        {/* Filter Section - Hide in full screen mode */}
        {!isFullScreenMode && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 items-start sm:items-center bg-white p-2 sm:p-4 rounded-lg shadow">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full sm:w-auto border rounded px-2 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto border rounded px-2 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base"
            >
              <option value="all">All Programs</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>

            <div className="w-full sm:w-auto">
              <ProgramSelect
                value={selectedProgram}
                onChange={setSelectedProgram}
                programs={filteredPrograms}
              />
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full sm:w-auto border-none focus:ring-0 text-sm"
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
          </div>
        )}

        {/* Full Screen Mode Content */}
        {selectedPackage && (
          <div className={`
            ${isFullScreenMode ? 'flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4' : ''}
          `}>
            {/* Search Component - Sticky in full screen mode */}
            <div className={`
              ${isFullScreenMode ? 'sticky top-14 bg-white z-[300] py-2 sm:py-4 border-b' : ''}
            `}>
              <ProductSearch
                products={products}
                selectedProducts={selectedProducts}
                onProductSelect={handleProductSelect}
                onProductRemove={handleProductRemove}
              />
            </div>

            <div className="flex justify-end mb-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base"

              >
                <RiSave3Line className="w-4 h-4 sm:w-5 sm:h-5" />
                Save
              </button>
            </div>

            {/* Table Container */}
            {dateRange.length > 0 && (
              <div
                ref={tableRef}
                className="overflow-auto flex-1 border rounded-lg relative"
                style={{ maxHeight: isFullScreenMode ? 'calc(100vh - 180px)' : '70vh' }}
              >
                <table className="min-w-full table-auto border-collapse bg-white relative">
                  <thead>
                    <tr>
                      <th
                        className="border bg-gray-50 sticky top-0 left-0 z-[60] min-w-[160px] sm:min-w-[200px] max-w-[300px] text-sm sm:text-base shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.1)]"
                        style={{ minHeight: '64px' }}
                      >
                        <div className="truncate p-2">Product Name</div>
                      </th>
                      {dateRange.map(date => (
                        <th
                          key={date.toISOString()}
                          className="border bg-gray-50 sticky top-0 z-[50] min-w-[70px] sm:min-w-[80px] max-w-[100px] text-xs sm:text-sm whitespace-nowrap shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]"
                          style={{ minHeight: '64px' }}
                        >
                          <div className="flex flex-col items-center p-1 sm:p-2">
                            <span>{format(date, 'dd-MM-yyyy')}</span>
                            <button
                              onClick={() => handleCopyPrevious(date)}
                              className="text-xs text-blue-500 hover:text-blue-700 mt-1"
                              title="Copy previous day's entries"
                            >
                              <RiCalendarLine />
                            </button>
                          </div>
                        </th>
                      ))}
                      {showSummary && (
                        <>
                          <th className="border bg-gray-50 sticky top-0 z-40 p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Total</th>
                          <th className="border bg-gray-50 sticky top-0 z-40 p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Average</th>
                          <th className="border bg-gray-50 sticky top-0 z-40 p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Max</th>
                          <th className="border bg-gray-50 sticky top-0 z-40 p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Min</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedProducts.length > 0
                      ? selectedProducts.map(selectedProduct =>
                        products.find(p => p.id === selectedProduct.id)
                      ).filter((product): product is Product => product !== undefined)
                      : products)
                      .map((product, rowIndex) => (
                        <tr key={product.id}>
                          <td
                            className="border bg-gray-50 font-medium sticky left-0 z-30 text-sm sm:text-base shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                          >
                            <div className="truncate p-2" title={product.name}>
                              {product.name}
                            </div>
                          </td>
                          {dateRange.map((date, colIndex) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            return (
                              <td
                                key={`${date}-${product.id}`}
                                className="border text-center bg-white"
                              >
                                <div className="flex items-center justify-center p-1">
                                  <input
                                    type="number"
                                    value={entryData[dateStr]?.[product.id] || 0}
                                    onChange={(e) => handleQuantityChange(dateStr, product.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                    data-row={rowIndex}
                                    data-col={colIndex}
                                    className={`w-16 text-center border rounded py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${focusedCell?.row === rowIndex && focusedCell?.col === colIndex
                                      ? 'ring-2 ring-amber-500'
                                      : ''
                                      }`}
                                    min="0"
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator - Adjusted position */}
        {isLoading && (
          <div className="fixed bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white rounded-lg shadow-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 z-[1000] border border-amber-100">
            <div className="relative">
              <div className="w-4 h-4 sm:w-6 sm:h-6 border-3 sm:border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 border-2 border-amber-100 rounded-full animate-pulse"></div>
            </div>
            <span className="text-xs sm:text-sm font-medium text-amber-700">Saving entries...</span>
          </div>
        )}
      </div>
    </div>
  );
}
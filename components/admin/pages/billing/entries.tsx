"use client";

import { useState, useEffect, useRef } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from "date-fns";
import { supabase } from "@/lib/supabase";
import { toast, Toast } from "react-hot-toast";
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
  RiCheckLine,
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

// Add these interfaces after the existing interfaces
interface ParticipantConsumption {
  id: string;
  attendee_name: string;
  reception_checkin: string;
  reception_checkout: string;
  type: 'participant' | 'guest' | 'other' | 'driver' | 'staff' | 'vip';
}

// Add these interfaces at the top with other interfaces
interface StaffEntry {
  id: string;
  staff_id: number;
  package_id: string;
  product_id: string;
  entry_date: string;
  quantity: number;
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
  const STAFF_ID = 'staff'; // Fixed ID for staff option

  return (
    <div className="relative min-w-[300px]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border rounded px-3 py-2 bg-white hover:bg-gray-50"
      >
        {value === STAFF_ID ? (
          <div className="flex flex-col items-start">
            <span className="font-bold text-amber-700">STAFF</span>
          </div>
        ) : selectedProgram ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">{selectedProgram.name}</span>
            <span className="text-sm text-gray-500">
              {selectedProgram.customer_name} • {format(parseISO(selectedProgram.start_date), 'dd/MM/yyyy')} - {format(parseISO(selectedProgram.end_date), 'dd/MM/yyyy')}
              {selectedProgram.status === 'Completed' ? ' (Completed)' : ''}
            </span>
          </div>
        ) : (
          <span className="text-gray-500">Select Program</span>
        )
        }
        <RiArrowDownSLine className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Fixed Staff Option */}
          <button
            type="button"
            onClick={() => {
              onChange(STAFF_ID);
              setIsOpen(false);
            }}
            className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${STAFF_ID === value ? 'bg-amber-50' : ''}`}
          >
            <div className="flex flex-col">
              <span className="font-bold text-amber-700">STAFF</span>
            </div>
          </button>
          
          {/* Divider */}
          <div className="border-t border-gray-200 my-1"></div>

          {/* Regular Programs */}
          {programs.map(program => (
            <button
              key={program.id}
              type="button"
              onClick={() => {
                onChange(program.id);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${program.id === value ? 'bg-amber-50' : ''}`}
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
    <div className="mb-6 relative">
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
          <div className="absolute z-[600] w-full max-w-md mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredProducts.map((product, index) => (
              <button
                key={product.id}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 ${index === selectedIndex ? 'bg-amber-50' : ''}`}
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isStaffMode, setIsStaffMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add ref for managing focus
  const tableRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);

  // Add save queue management
  const saveQueueRef = useRef<Map<string, { date: string; productId: string; quantity: number }>>(new Map());
  const isSavingQueueRef = useRef(false);

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
        );

      if (error) throw error;

      // Filter programs that overlap with the selected month
      const filteredPrograms = data?.filter(program => {
        const programStart = parseISO(program.start_date);
        const programEnd = parseISO(program.end_date);
        return (programStart <= monthEnd && programEnd >= monthStart);
      });

      // Sort programs by name (considering numeric parts), status, and start date
      const sortedPrograms = filteredPrograms?.sort((a, b) => {
        // Extract numbers from program names for proper numeric sorting
        const aMatch = a.name.match(/\d+/);
        const bMatch = b.name.match(/\d+/);
        const aNum = aMatch ? parseInt(aMatch[0]) : 0;
        const bNum = bMatch ? parseInt(bMatch[0]) : 0;
        
        // First sort by numeric value in name
        if (aNum !== bNum) {
          return aNum - bNum;
        }
        
        // If numeric values are same or don't exist, sort by full name
        if (a.name !== b.name) {
          return a.name.localeCompare(b.name);
        }

        // Then sort by status priority
        const statusPriority = {
          'Ongoing': 0,
          'Upcoming': 1,
          'Completed': 2
        };
        
        const statusDiff = (statusPriority[a.status as keyof typeof statusPriority] || 0) - 
                          (statusPriority[b.status as keyof typeof statusPriority] || 0);
        
        if (statusDiff !== 0) return statusDiff;
        
        // Finally sort by start date if everything else is equal
        return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
      });

      setPrograms(sortedPrograms || []);
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
        .order('slot_start', { ascending: true });

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
        // Set date range based on program dates only, not limited by selected month
        const programStart = new Date(program.start_date);
        const programEnd = new Date(program.end_date);

        // Use the full program date range
        const dates = eachDayOfInterval({ start: programStart, end: programEnd });
        setDateRange(dates);
      }
      // Clear selected products when program changes
      setSelectedProducts([]);
    }
  }, [selectedProgram, programs]);

  // Fetch entries when package is selected
  useEffect(() => {
    if (selectedPackage) {
      fetchProducts(selectedPackage);
      // Clear selected products when package changes
      setSelectedProducts([]);
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

  // Update date range when both program and package are selected (to include early arrivals/late departures)
  useEffect(() => {
    if (selectedProgram && selectedPackage && !isStaffMode) {
      console.log('🔄 Updating date range for program + package selection');
      getActualDateRange(selectedProgram, selectedPackage).then(dates => {
        console.log('📅 Setting expanded date range with', dates.length, 'days');
        setDateRange(dates);
      });
    }
  }, [selectedProgram, selectedPackage, isStaffMode]);

  const handleEntryChange = (date: string, productId: string, value: string) => {
    const quantity = parseFloat(value) || 0;
    
    // Update local state immediately for UI responsiveness
    setEntryData(prev => {
      const newEntryData = {
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [productId]: quantity,
        },
      };
      return newEntryData;
    });

    // Add to save queue
    const entryKey = `${date}-${productId}`;
    saveQueueRef.current.set(entryKey, { date, productId, quantity });

    console.log('🔄 Entry queued for save:', { date, productId, quantity, queueSize: saveQueueRef.current.size });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set status to saving
    setIsSaving(true);
    setSaveStatus('saving');

    // Process queue after 500ms of no changes (reduced from 1000ms for faster response)
    saveTimeoutRef.current = setTimeout(() => {
      processSaveQueue();
    }, 500);
  };

  const processSaveQueue = async () => {
    if (isSavingQueueRef.current || saveQueueRef.current.size === 0) {
      return;
    }

    isSavingQueueRef.current = true;
    const entriesToSave = Array.from(saveQueueRef.current.values());
    saveQueueRef.current.clear();

    console.log('📦 Processing save queue:', entriesToSave.length, 'entries');

    try {
      // Save all entries in parallel for better performance
      const savePromises = entriesToSave.map(entry => 
        saveEntryToDatabase(entry.date, entry.productId, entry.quantity)
      );

      await Promise.all(savePromises);
      
      setSaveStatus('success');
      console.log('✅ All queued entries saved successfully');
    } catch (error) {
      console.error('❌ Error saving queued entries:', error);
      setSaveStatus('error');
      toast.error('Failed to save some entries. Please try again.');
    } finally {
      isSavingQueueRef.current = false;
      setIsSaving(false);
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }
  };

  const saveEntryToDatabase = async (date: string, productId: string, quantity: number) => {
    console.log('💾 Saving entry to database:', { date, productId, quantity, isStaffMode });

    try {
      if (isStaffMode) {
        // For staff mode, first delete existing entry, then insert new one if quantity > 0
        const { error: deleteError } = await supabase
          .from('staff_billing_entries')
          .delete()
          .eq('package_id', selectedPackage)
          .eq('product_id', productId)
          .eq('entry_date', date);

        if (deleteError) {
          console.error('❌ Staff delete error:', deleteError);
          throw deleteError;
        }

        // Only insert if quantity is greater than 0
        if (quantity > 0) {
          const staffEntry = {
            package_id: selectedPackage,
            product_id: productId,
            entry_date: date,
            quantity: quantity,
          };

          const { error: insertError } = await supabase
            .from('staff_billing_entries')
            .insert(staffEntry);

          if (insertError) {
            console.error('❌ Staff insert error:', insertError);
            throw insertError;
          }
        }
      } else {
        // For program mode
        if (quantity > 0) {
          // Get product rate from products array
          const product = products.find(p => p.id === productId);
          const productRate = product?.rate || 0;

          const programEntry = {
            program_id: selectedProgram,
            package_id: selectedPackage,
            product_id: productId,
            entry_date: date,
            quantity: quantity,
            product_rate: productRate,
          };

          const { error } = await supabase
            .from('billing_entries')
            .upsert(programEntry, { 
              onConflict: 'program_id,package_id,product_id,entry_date' 
            });

          if (error) {
            console.error('❌ Program upsert error:', error);
            throw error;
          }
        } else {
          // Delete entry if quantity is 0
          const { error } = await supabase
            .from('billing_entries')
            .delete()
            .eq('program_id', selectedProgram)
            .eq('package_id', selectedPackage)
            .eq('product_id', productId)
            .eq('entry_date', date);

          if (error) {
            console.error('❌ Program delete error:', error);
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('❌ Database save error:', error);
      throw error;
    }
  };

  // Keep the old saveEntry function for backward compatibility but mark it as deprecated
  const saveEntry = async (date: string, productId: string, quantity: number) => {
    console.warn('⚠️ Using deprecated saveEntry function. This should not be called anymore.');
    return saveEntryToDatabase(date, productId, quantity);
  };

  // Add the missing handleSave function
  const handleSave = async () => {
    console.log('🚀 Manual save triggered');
    console.log('📊 Current state:', {
      isStaffMode,
      selectedProgram,
      selectedPackage,
      entryDataKeys: Object.keys(entryData),
      entryDataSample: Object.entries(entryData).slice(0, 2)
    });

    setSaveStatus('saving');
    setIsLoading(true);
    
    try {
      // No participant checking - just save the entries

      if (isStaffMode) {
        console.log('📝 Processing staff mode bulk save...');
        
        // For staff mode - handle each entry individually due to lack of unique constraint
        const dateKeys = Object.keys(entryData);
        console.log('📅 Date range for staff entries:', dateKeys);
        
        if (dateKeys.length === 0) {
          console.warn('⚠️ No entry data found for staff mode');
          toast.error('No entries to save');
          setSaveStatus('error');
          setIsLoading(false);
          return;
        }

        const startDeleteDate = dateKeys[0];
        const endDeleteDate = dateKeys[dateKeys.length - 1];

        console.log('🗑️ Deleting existing staff entries from', startDeleteDate, 'to', endDeleteDate);

        // Delete all existing entries for the date range and package
        const { error: deleteError } = await supabase
          .from('staff_billing_entries')
          .delete()
          .eq('package_id', selectedPackage)
          .gte('entry_date', startDeleteDate)
          .lte('entry_date', endDeleteDate);

        if (deleteError) {
          console.error('❌ Staff bulk delete error:', deleteError);
          throw deleteError;
        }

        console.log('✅ Staff entries deleted successfully');

        // Prepare staff entries (only include entries with quantity > 0)
        const staffEntries = Object.entries(entryData).flatMap(([date, products]) =>
          Object.entries(products)
            .filter(([_, quantity]) => quantity > 0)
            .map(([productId, quantity]) => ({
              package_id: selectedPackage,
              product_id: productId,
              entry_date: date,
              quantity: quantity,
            }))
        );

        console.log('📦 Prepared staff entries for insert:', staffEntries.length, 'entries');
        console.log('📝 Sample staff entries:', staffEntries.slice(0, 3));

        // Insert new staff entries if any
        if (staffEntries.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from('staff_billing_entries')
            .insert(staffEntries)
            .select();

          if (insertError) {
            console.error('❌ Staff bulk insert error:', insertError);
            throw insertError;
          }

          console.log('✅ Staff entries inserted successfully:', insertData?.length || 0, 'entries');
        } else {
          console.log('⚪ No staff entries to insert (all quantities are 0)');
        }
      } else {
        console.log('👥 Processing program mode bulk save...');
        
        // For program mode - use the existing logic
        console.log('🗑️ Deleting existing program entries for program:', selectedProgram, 'package:', selectedPackage);
        
        // Delete all existing entries for this program and package
        const { error: deleteError } = await supabase
          .from('billing_entries')
          .delete()
          .eq('program_id', selectedProgram)
          .eq('package_id', selectedPackage);

        if (deleteError) {
          console.error('❌ Program bulk delete error:', deleteError);
          throw deleteError;
        }

        console.log('✅ Program entries deleted successfully');

        // Prepare program entries (only include entries with quantity > 0)
        const programEntries = Object.entries(entryData).flatMap(([date, productData]) =>
          Object.entries(productData)
            .filter(([_, quantity]) => quantity > 0)
            .map(([productId, quantity]) => {
              // Get product rate from products array
              const product = products.find(p => p.id === productId);
              const productRate = product?.rate || 0;
              
              return {
                program_id: selectedProgram,
                package_id: selectedPackage,
                product_id: productId,
                entry_date: date,
                quantity: quantity,
                product_rate: productRate,
              };
            })
        );

        console.log('📦 Prepared program entries for insert:', programEntries.length, 'entries');
        console.log('📝 Sample program entries:', programEntries.slice(0, 3));

        // Insert new program entries if any
        if (programEntries.length > 0) {
          const { data: insertData, error: insertError } = await supabase
            .from('billing_entries')
            .insert(programEntries)
            .select();

          if (insertError) {
            console.error('❌ Program bulk insert error:', insertError);
            throw insertError;
          }

          console.log('✅ Program entries inserted successfully:', insertData?.length || 0, 'entries');
        } else {
          console.log('⚪ No program entries to insert (all quantities are 0)');
        }
      }

      setSaveStatus('success');
      toast.success('Entries saved successfully');
      console.log('🎉 Manual save completed successfully');
      
      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (error: any) {
      console.error('❌ Manual save failed:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      toast.error(`Failed to save entries: ${error.message || 'Unknown error'}`);
      setSaveStatus('error');
      // Reset error status after 5 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 5000);
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

  // Add cleanup on unmount
  useEffect(() => {
    return () => {
      // Save any remaining entries in queue when component unmounts
      if (saveQueueRef.current.size > 0) {
        processSaveQueue();
      }
      // Clear timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Add effect to handle fast saving when leaving the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveQueueRef.current.size > 0) {
        // Force immediate save of remaining entries
        processSaveQueue();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Add this effect to show keyboard guide only once
  useEffect(() => {
    const showGuide = async () => {
      const hasShown = localStorage.getItem('keyboardGuideShown');
      if (!hasShown) {
        setShowKeyboardGuide(true);
        // Wait for 10 seconds before hiding the guide
        setTimeout(() => {
          setShowKeyboardGuide(false);
          localStorage.setItem('keyboardGuideShown', 'true');
        }, 10000);
      }
    };

    showGuide();
  }, []);

  // Add this function to handle keyboard shortcuts
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // Ctrl + S to save
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
    // Ctrl + Shift + S to export
    else if (e.ctrlKey && e.shiftKey && e.key === 's') {
      e.preventDefault();
      handleExport();
    }
    // Ctrl + I to import
    else if (e.ctrlKey && e.key === 'i') {
      e.preventDefault();
      document.getElementById('import-file-input')?.click();
    }
    // Ctrl + H to toggle history
    else if (e.ctrlKey && e.key === 'h') {
      e.preventDefault();
      setShowHistory(prev => !prev);
    }
    // Ctrl + Shift + C to calculate
    else if (e.ctrlKey && e.shiftKey && e.key === 'c') {
      e.preventDefault();
      // Trigger calculation for all entries
      Object.keys(entryData).forEach(date => {
        Object.keys(entryData[date]).forEach(productId => {
          handleEntryChange(date, productId, String(entryData[date][productId]));
        });
      });
    }
  };

  // Add this effect to listen for keyboard shortcuts
  useEffect(() => {
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [entryData]);

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
      const program = programs.find(p => p.id === programId);
      if (!program) return;

      const { data, error } = await supabase
        .from('participants')
        .select(`
          id,
          attendee_name,
          reception_checkin,
          reception_checkout,
          program_id
        `)
        .eq('program_id', programId)
        .not('reception_checkin', 'is', null)
        .not('reception_checkout', 'is', null);

      if (error) throw error;

      // Get the earliest check-in and latest check-out
      const earliestCheckin = data?.reduce((earliest, p) => {
        const checkin = new Date(p.reception_checkin);
        return earliest ? (checkin < earliest ? checkin : earliest) : checkin;
      }, null as Date | null);

      const latestCheckout = data?.reduce((latest, p) => {
        const checkout = new Date(p.reception_checkout);
        return latest ? (checkout > latest ? checkout : latest) : checkout;
      }, null as Date | null);

      // Update date range to include early arrivals and late departures
      if (earliestCheckin && latestCheckout) {
        const dates = eachDayOfInterval({ 
          start: earliestCheckin, 
          end: latestCheckout 
        });
        setDateRange(dates);
      }

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

  // Add this function inside the BillingEntriesPage component before the return statement
  const fetchParticipantConsumptions = async (programId: string, date: Date) => {
    try {
      const { data: participants, error } = await supabase
        .from('participants')
        .select(`
          id,
          attendee_name,
          reception_checkin,
          reception_checkout,
          type
        `)
        .eq('program_id', programId)
        .lte('reception_checkin', date.toISOString())
        .gte('reception_checkout', date.toISOString());

      if (error) throw error;
      return participants || [];
    } catch (error) {
      console.error('Error fetching participant consumptions:', error);
      return [];
    }
  };

  // Update the helper function to use consistent background color
  const getCellBackgroundColor = (date: Date) => {
    // Use consistent background color for all cells
    return 'bg-white';
  };

  // Modify the fetchStaffEntries function
  const fetchStaffEntries = async () => {
    if (!startDate || !endDate || !selectedPackage) {
      toast.error('Please select dates and package');
      return;
    }

    setIsLoading(true);
    try {
      // Create date range from selected dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      const newDateRange = eachDayOfInterval({ start, end });
      setDateRange(newDateRange);

      // Wait for products to be loaded if not already
      if (products.length === 0) {
        console.log('Products not loaded yet, waiting...');
        setIsLoading(false);
        return;
      }

      // Initialize entry data structure
      const newEntryData: EntryData = {};
      newDateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        newEntryData[dateStr] = {};
        products.forEach(product => {
          newEntryData[dateStr][product.id] = 0;
        });
      });

      // Fetch existing staff entries
      const { data: staffEntries, error } = await supabase
        .from('staff_billing_entries')
        .select('*')
        .eq('package_id', selectedPackage)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) throw error;

      console.log('Fetched staff entries for date range:', staffEntries);

      // Fill in the actual quantities from staff entries
      staffEntries?.forEach(entry => {
        const dateStr = format(new Date(entry.entry_date), 'yyyy-MM-dd');
        if (newEntryData[dateStr] && entry.product_id) {
          newEntryData[dateStr][entry.product_id] = entry.quantity;
        }
      });

      setEntryData(newEntryData);
    } catch (error) {
      console.error('Error fetching staff entries:', error);
      toast.error('Failed to fetch staff entries');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the useEffect for fetching entries when products are loaded
  useEffect(() => {
    if (selectedProgram && selectedPackage && dateRange.length > 0 && products.length > 0) {
      fetchEntries();
    }
  }, [selectedProgram, selectedPackage, dateRange, products.length]);

  // Add a separate useEffect for staff mode to refetch when products are loaded
  useEffect(() => {
    if (isStaffMode && selectedPackage && startDate && endDate && products.length > 0 && dateRange.length > 0) {
      fetchStaffEntries();
    }
  }, [isStaffMode, selectedPackage, startDate, endDate, products.length]);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);

      console.log('🔍 Fetching entries with params:', {
        programId: selectedProgram,
        packageId: selectedPackage,
        dateRange: dateRange.map(d => format(d, 'yyyy-MM-dd')),
        isStaffMode,
        productsCount: products.length
      });

      if (!dateRange.length || !products.length) {
        console.log('⚠️ Missing requirements - dateRange:', dateRange.length, 'products:', products.length);
        setEntryData({});
        setIsLoading(false);
        return;
      }

      // Get the full date range
      const startDate = format(dateRange[0], 'yyyy-MM-dd');
      const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

      console.log('📅 Date range for fetch:', startDate, 'to', endDate);

      // Initialize entry data structure with all zeros
      const newEntryData: EntryData = {};
      dateRange.forEach(date => {
        const dateStr = format(date, 'yyyy-MM-dd');
        newEntryData[dateStr] = {};
        products.forEach(product => {
          newEntryData[dateStr][product.id] = 0;
        });
      });

      console.log('📊 Initialized entry data structure for', Object.keys(newEntryData).length, 'dates and', products.length, 'products');

      // Fetch entries based on mode
      if (isStaffMode) {
        console.log('📝 Fetching staff entries...');
        
        const { data: staffEntries, error: entriesError } = await supabase
          .from('staff_billing_entries')
          .select('*')
          .eq('package_id', selectedPackage)
          .gte('entry_date', startDate)
          .lte('entry_date', endDate);

        if (entriesError) {
          console.error('❌ Staff entries fetch error:', entriesError);
          throw entriesError;
        }

        console.log('📝 Fetched staff entries:', staffEntries?.length || 0);

        // Fill in the actual quantities from staff entries
        staffEntries?.forEach(entry => {
          const dateStr = format(new Date(entry.entry_date), 'yyyy-MM-dd');
          if (newEntryData[dateStr] && entry.product_id) {
            newEntryData[dateStr][entry.product_id] = entry.quantity;
          }
        });
      } else {
        console.log('👥 Fetching program entries...');
        
        // Fetch ALL billing entries for this program/package combination
        // Don't filter by date range since we want to capture early arrivals and late departures
        const { data: billingEntries, error: entriesError } = await supabase
          .from('billing_entries')
          .select('*')
          .eq('program_id', selectedProgram)
          .eq('package_id', selectedPackage);

        if (entriesError) {
          console.error('❌ Program entries fetch error:', entriesError);
          throw entriesError;
        }

        console.log('👥 Fetched program entries:', billingEntries?.length || 0);

        // Fill in the actual quantities from billing entries
        billingEntries?.forEach(entry => {
          const dateStr = format(new Date(entry.entry_date), 'yyyy-MM-dd');
          // Only add to entry data if the date is within our current date range
          if (newEntryData[dateStr] && entry.product_id) {
            newEntryData[dateStr][entry.product_id] = entry.quantity;
            console.log('📅 Added entry for date:', dateStr, 'product:', entry.product_id, 'quantity:', entry.quantity);
          } else if (!newEntryData[dateStr]) {
            console.log('⚠️ Entry date', dateStr, 'not in current date range, skipping');
          }
        });
      }

      console.log('✅ Entry data populated successfully');
      setEntryData(newEntryData);
    } catch (error) {
      console.error('❌ Fetch entries failed:', error);
      toast.error('Failed to fetch entries');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get the actual date range including early arrivals and late departures
  const getActualDateRange = async (programId: string, packageId: string) => {
    try {
      console.log('🔍 Fetching actual date range for program entries...');
      
      // Fetch all billing entries for this program/package to see what dates have data
      const { data: billingEntries, error } = await supabase
        .from('billing_entries')
        .select('entry_date')
        .eq('program_id', programId)
        .eq('package_id', packageId);

      if (error) {
        console.error('❌ Error fetching billing entries for date range:', error);
        throw error;
      }

      console.log('📊 Found billing entries for', billingEntries?.length || 0, 'entries');

      if (!billingEntries || billingEntries.length === 0) {
        // If no entries exist, use program dates as fallback
        const program = programs.find(p => p.id === programId);
        if (program) {
          console.log('📅 No entries found, using program dates as fallback');
          return eachDayOfInterval({
            start: new Date(program.start_date),
            end: new Date(program.end_date)
          });
        }
        return [];
      }

      // Get all unique dates from billing entries
      const entryDates = billingEntries.map(entry => new Date(entry.entry_date));
      const minDate = new Date(Math.min(...entryDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...entryDates.map(d => d.getTime())));

      console.log('📅 Actual date range from entries:', format(minDate, 'yyyy-MM-dd'), 'to', format(maxDate, 'yyyy-MM-dd'));

      // Create date range including all days between min and max dates
      return eachDayOfInterval({ start: minDate, end: maxDate });
    } catch (error) {
      console.error('❌ Error getting actual date range:', error);
      // Fallback to program dates
      const program = programs.find(p => p.id === programId);
      if (program) {
        return eachDayOfInterval({
          start: new Date(program.start_date),
          end: new Date(program.end_date)
        });
      }
      return [];
    }
  };

  // Modify the useEffect that handles program selection
  useEffect(() => {
    console.log('🔄 Program selection changed:', selectedProgram);
    
    if (selectedProgram === 'staff') {
      console.log('📝 Switching to staff mode');
      setIsStaffMode(true);
      setStartDate('');
      setEndDate('');
      setDateRange([]);
      setEntryData({});
    } else {
      console.log('👥 Switching to program mode');
      setIsStaffMode(false);
      if (selectedProgram && selectedPackage) {
        // Get actual date range including early arrivals and late departures
        getActualDateRange(selectedProgram, selectedPackage).then(dates => {
          console.log('📅 Setting actual date range with', dates.length, 'days');
          setDateRange(dates);
        });
      } else if (selectedProgram) {
        // If package not selected yet, use program dates as initial range
        const program = programs.find(p => p.id === selectedProgram);
        if (program) {
          console.log('📅 Setting initial date range for program:', program.name);
          const dates = eachDayOfInterval({
            start: new Date(program.start_date),
            end: new Date(program.end_date)
          });
          setDateRange(dates);
        }
      }
    }
  }, [selectedProgram, selectedPackage, programs]);

  // Add this function to handle quantity changes
  const handleQuantityChange = async (date: string, productId: string, value: string) => {
    try {
      const newValue = value === '' ? '0' : value;
      const numericValue = parseInt(newValue, 10);

      if (isNaN(numericValue)) {
        return;
      }

      // Update local state for immediate feedback
      setEntryData(prev => ({
        ...prev,
        [date]: {
          ...(prev[date] || {}),
          [productId]: numericValue
        }
      }));
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  // Modify showParticipantDetails to do nothing when cell is clicked
  const showParticipantDetails = async (date: string, productId: string) => {
    // Remove the participant details display functionality
    return;
  };

  // Helper function to check if a date is outside program dates
  const isExtraDate = (date: Date, program: Program | undefined): boolean => {
    if (!program) return false;
    
    // Convert program dates for proper comparison
    const programStart = new Date(program.start_date);
    programStart.setHours(0, 0, 0, 0);
    
    const programEnd = new Date(program.end_date);
    programEnd.setHours(23, 59, 59, 999);
    
    // Convert input date to start of day for proper comparison
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    // A date is "extra" if it's outside the program dates
    // This will work regardless of whether entryData is populated yet
    const isOutsideProgramDates = compareDate < programStart || compareDate > programEnd;
    
    // If entryData is available, also check if it has billing data
    const dateStr = format(date, 'yyyy-MM-dd');
    if (entryData[dateStr]) {
      const hasBillingData = Object.values(entryData[dateStr]).some(value => value > 0);
      return isOutsideProgramDates && hasBillingData;
    }
    
    // If entryData is not available yet, just return true for dates outside program range
    // that are in our dateRange (meaning they have billing data)
    return isOutsideProgramDates;
  };

  // Add this function to check if a column should be shown (has non-zero values)
  const shouldShowColumn = (date: Date): boolean => {
    const dateStr = format(date, 'yyyy-MM-dd');
    // If we don't have entry data for this date, don't show the column
    if (!entryData[dateStr]) return false;
    
    // Check if any product has a value greater than 0 for this date
    return Object.values(entryData[dateStr]).some(value => value > 0);
  };

  // Add this function to filter the date range to only dates with data
  const getFilteredDateRange = (): Date[] => {
    // If no date range, return empty array
    if (!dateRange.length) return [];
    
    // For staff mode, show all dates in the selected range
    if (isStaffMode) {
      return dateRange;
    }
    
    // For program mode, we need to determine if we should show all dates or only dates with data
    const currentPackage = packages.find(pkg => pkg.id === selectedPackage);
    
    if (!currentPackage) {
      // If package not found, show all dates as fallback
      return dateRange;
    }
    
    // Determine if this package requires showing all dates for manual entry
    const isManualEntryPackage = (
      // Check package type - Extra, Additional, Manual, etc.
      currentPackage.type.toLowerCase().includes('extra') ||
      currentPackage.type.toLowerCase().includes('additional') ||
      currentPackage.type.toLowerCase().includes('manual') ||
      currentPackage.type.toLowerCase().includes('supplement') ||
      
      // Check package name - Extra catering, Cold drinks, Additional items, etc.
      currentPackage.name.toLowerCase().includes('extra') ||
      currentPackage.name.toLowerCase().includes('cold') ||
      currentPackage.name.toLowerCase().includes('drinks') ||
      currentPackage.name.toLowerCase().includes('additional') ||
      currentPackage.name.toLowerCase().includes('supplement') ||
      currentPackage.name.toLowerCase().includes('beverage') ||
      currentPackage.name.toLowerCase().includes('snack') ||
      
      // Any package that is not the main "Normal" or "Catering" type
      (!currentPackage.type.toLowerCase().includes('normal') && 
       !currentPackage.type.toLowerCase().includes('catering') &&
       !currentPackage.type.toLowerCase().includes('main'))
    );
    
    if (isManualEntryPackage) {
      console.log('📅 Showing all dates for manual entry package:', currentPackage.name, 'type:', currentPackage.type);
      return dateRange;
    }
    
    console.log('📅 Filtering dates with data for main package:', currentPackage.name, 'type:', currentPackage.type);
    
    // For main catering packages, show only dates that have billing data
    return dateRange.filter(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      // Show date if it has any billing data (non-zero values)
      return entryData[dateStr] && Object.values(entryData[dateStr]).some(value => value > 0);
    });
  };

  return (
    <div className={`${isFullScreenMode ? 'fixed inset-0 bg-white z-50' : 'p-2 sm:p-4'}`}>
      {/* Toggle Full Screen and Save Button Container */}
      <div className={`${isFullScreenMode ? 'h-screen flex flex-col overflow-hidden' : ''}`}>
        {/* Filter Section - Hide in full screen mode */}
        {!isFullScreenMode && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 mb-4 sm:mb-6 items-start sm:items-center bg-white p-2 sm:p-4 rounded-lg shadow">
            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Filter Programs by Month
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-auto border rounded px-2 py-1.5 sm:px-3 sm:py-2 text-sm sm:text-base"
                title="Select month to filter programs that occur during this month"
              />
            </div>

            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Program Status
              </label>
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
            </div>

            <div className="w-full sm:w-auto">
              <label className="block text-xs text-gray-500 mb-1">
                Select Program
              </label>
              <ProgramSelect
                value={selectedProgram}
                onChange={setSelectedProgram}
                programs={filteredPrograms}
              />
            </div>

            <div className="relative">
              <label className="block text-xs text-gray-500 mb-1">
                Select Package
              </label>
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
          </div>
        )}

        {/* Full Screen Mode Content */}
        {selectedPackage && (
          <div className={`
            ${isFullScreenMode ? 'flex-1 flex flex-col h-full overflow-hidden p-2 sm:p-4' : ''}
          `}>
            {/* Search Component - Sticky in full screen mode */}
            <div            className={`
              ${isFullScreenMode ? 'sticky top-0 bg-white z-[60] py-2 sm:py-4 border-b' : ''}
              relative
            `}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <ProductSearch
                    products={products}
                    selectedProducts={selectedProducts}
                    onProductSelect={handleProductSelect}
                    onProductRemove={handleProductRemove}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={handleSave}
                    className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg hover:bg-green-700 flex items-center gap-2 text-sm sm:text-base whitespace-nowrap"
                  >
                    <RiSave3Line className="w-4 h-4 sm:w-5 sm:h-5" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsFullScreenMode(!isFullScreenMode)}
                    className="bg-amber-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-lg hover:bg-amber-600 flex items-center gap-2 text-sm sm:text-base whitespace-nowrap"
                  >
                    {isFullScreenMode ? (
                      <>Exit Edit Mode <IoExitOutline /></>
                    ) : (
                      <>Edit Mode <CiEdit /></>
                    )}
                  </button>
                </div>
              </div>
                {/* Status Indicator */}
              <div className="flex items-center justify-between text-sm mb-2">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  {(() => {
                    const program = programs.find(p => p.id === selectedProgram);
                    if (!program || !dateRange.length) return null;
                    
                    const earlyArrivalDays = getFilteredDateRange().filter(date => 
                      isExtraDate(date, program) && date < new Date(program.start_date)
                    ).length;
                    
                    const lateDepartureDays = getFilteredDateRange().filter(date => 
                      isExtraDate(date, program) && date > new Date(program.end_date)
                    ).length;
                    
                    const regularDays = getFilteredDateRange().length - earlyArrivalDays - lateDepartureDays;
                    
                    return (
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          📅 <strong>{regularDays}</strong> regular days
                        </span>
                        {earlyArrivalDays > 0 && (
                          <span className="flex items-center gap-1 text-blue-700">
                            🔵 <strong>{earlyArrivalDays}</strong> early arrival days
                          </span>
                        )}
                        {lateDepartureDays > 0 && (
                          <span className="flex items-center gap-1 text-orange-700">
                            🟠 <strong>{lateDepartureDays}</strong> late departure days
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  {saveStatus === 'saving' && (
                    <span className="text-amber-600 flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                      Saving...
                    </span>
                  )}
                  {saveStatus === 'success' && (
                    <span className="text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      Saved
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-red-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                      Error
                    </span>
                  )}
                  {saveStatus === 'idle' && !isSaving && (
                    <span className="text-green-500 flex items-center gap-1 font-bold">
                      <RiCheckLine className="w-5 h-5" />
                      Synced accurately
                    </span>
                  )}
                </div>
              </div>
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
                        className="border bg-gray-50 sticky top-0 left-0 z-[80] min-w-[160px] sm:min-w-[200px] max-w-[300px] text-sm sm:text-base shadow-[2px_2px_4px_-2px_rgba(0,0,0,0.1)]"
                        style={{ minHeight: '64px' }}
                      >
                        <div className="truncate p-2">Product Name</div>
                      </th>
                      {getFilteredDateRange().map(date => {
                        // Determine if this is the first date of a month
                        const isFirstOfMonth = date.getDate() === 1;
                        // Get month name for the first date of each month
                        const monthName = isFirstOfMonth ? format(date, 'MMMM yyyy') : '';
                        // Check if date is outside program duration
                        const program = programs.find(p => p.id === selectedProgram);
                        const isExtra = isExtraDate(date, program);
                        
                        return (
                          <th
                            key={date.toISOString()}
                            className={`border sticky top-0 z-[70] min-w-[70px] sm:min-w-[80px] max-w-[100px] text-xs sm:text-sm whitespace-nowrap shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)] ${
                              isExtra && program
                                ? date < new Date(program.start_date) 
                                  ? 'bg-blue-50 border-blue-200' // Early arrival - blue theme
                                  : 'bg-orange-50 border-orange-200' // Late departure - orange theme
                                : 'bg-gray-50'
                            }`}
                            style={{ minHeight: '64px' }}
                          >
                            {isFirstOfMonth && (
                              <div className="text-xs font-medium text-gray-700 border-b pb-1 mb-1">
                                {monthName}
                              </div>
                            )}
                            <div className={`flex flex-col items-center p-1 sm:p-2 ${
                              isExtra && program
                                ? date < new Date(program.start_date)
                                  ? 'text-blue-700 font-medium' // Early arrival - blue text
                                  : 'text-orange-700 font-medium' // Late departure - orange text
                                : ''
                            }`}>
                              <span className="font-medium">{format(date, 'dd-MM-yyyy')}</span>
                              {isExtra && program && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 ${
                                  date < new Date(program.start_date)
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200' // Early arrival styling
                                    : 'bg-orange-100 text-orange-700 border border-orange-200' // Late departure styling
                                }`}>
                                  {date < new Date(program.start_date) ? '🔵 Early Arrival' : '🟠 Late Departure'}
                                </span>
                              )}
                            </div>
                          </th>
                        );
                      })}
                      {showSummary && (
                        <>
                          <th className="border bg-gray-50 sticky top-0 z-[70] p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Total</th>
                          <th className="border bg-gray-50 sticky top-0 z-[70] p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Average</th>
                          <th className="border bg-gray-50 sticky top-0 z-[70] p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Max</th>
                          <th className="border bg-gray-50 sticky top-0 z-[70] p-1 sm:p-2 text-xs sm:text-sm shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)]">Min</th>
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
                            className="border bg-gray-50 font-medium sticky left-0 z-[65] text-sm sm:text-base shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]"
                          >
                            <div className="truncate p-2" title={product.name}>
                              {product.name}
                            </div>
                          </td>
                          {getFilteredDateRange().map((date, colIndex) => {
                            const dateStr = format(date, 'yyyy-MM-dd');
                            // Check if date is outside program duration
                            const program = programs.find(p => p.id === selectedProgram);
                            const isExtra = isExtraDate(date, program);
                            
                            // Determine cell background color based on date type
                            let bgColor = 'bg-white';
                            let borderColor = '';
                            let inputBg = 'bg-white';
                            
                            if (isExtra && program) {
                              if (date < new Date(program.start_date)) {
                                // Early arrival - blue theme
                                bgColor = 'bg-blue-50';
                                borderColor = 'border-blue-100';
                                inputBg = 'bg-blue-50';
                              } else {
                                // Late departure - orange theme
                                bgColor = 'bg-orange-50';
                                borderColor = 'border-orange-100';
                                inputBg = 'bg-orange-50';
                              }
                            }
                            
                            return (
                              <td
                                key={`${date}-${product.id}`}
                                className={`border text-center ${bgColor} ${borderColor}`}
                              >
                                <div className="flex items-center justify-center p-1">
                                  <input
                                    type="number"
                                    value={entryData[dateStr]?.[product.id] || ''}
                                    onChange={(e) => handleEntryChange(dateStr, product.id, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                                    onClick={() => showParticipantDetails(dateStr, product.id)}
                                    data-row={rowIndex}
                                    data-col={colIndex}
                                    className={`w-16 text-center border rounded py-1.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-pointer ${
                                      focusedCell?.row === rowIndex && focusedCell?.col === colIndex
                                        ? 'ring-2 ring-amber-500'
                                        : ''
                                    } ${inputBg} ${
                                      isExtra && program
                                        ? date < new Date(program.start_date)
                                          ? 'border-blue-300' // Early arrival border
                                          : 'border-orange-300' // Late departure border
                                        : 'border-gray-300'
                                    }`}
                                    min="0"
                                    title={
                                      isExtra && program
                                        ? date < new Date(program.start_date)
                                          ? "Early arrival entry - before program start date"
                                          : "Late departure entry - after program end date"
                                        : "Click to view participant details"
                                    }
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

            {/* Add this JSX after the package selection dropdown and before the table */}
            {isStaffMode && (
              <div className="flex flex-wrap gap-4 items-end mb-4 bg-white p-4 rounded-lg shadow">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <button
                  onClick={fetchStaffEntries}
                  disabled={!startDate || !endDate || !selectedPackage}
                  className="bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RiCalculatorLine className="w-5 h-5" />
                  Generate Table
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading indicator - Adjusted position */}
        {saveStatus !== 'idle' && (
          <div className={`fixed bottom-2 sm:bottom-4 right-2 sm:right-4 bg-white rounded-lg shadow-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 sm:gap-3 z-[1000] border ${
            saveStatus === 'saving' ? 'border-amber-100' :
            saveStatus === 'success' ? 'border-green-100' :
            'border-red-100'
          }`}>
            <div className="relative">
              {saveStatus === 'saving' && (
                <>
                  <div className="w-4 h-4 sm:w-6 sm:h-6 border-3 sm:border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 border-2 border-amber-100 rounded-full animate-pulse"></div>
                </>
              )}
              {saveStatus === 'success' && (
                <div className="w-4 h-4 sm:w-6 sm:h-6 text-green-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="w-4 h-4 sm:w-6 sm:h-6 text-red-500">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <span className={`text-xs sm:text-sm font-medium ${
              saveStatus === 'saving' ? 'text-amber-700' :
              saveStatus === 'success' ? 'text-green-700' :
              'text-red-700'
            }`}>
              {saveStatus === 'saving' ? 'Saving entries...' :
               saveStatus === 'success' ? 'Entries saved successfully!' :
               'Failed to save entries'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
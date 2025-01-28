"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiDownloadLine,
  RiUploadLine,
  RiAlertLine,
  RiEditLine,
  RiFileTextLine
} from "react-icons/ri";
import { toast } from "react-hot-toast";
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { parse, unparse } from 'papaparse';
import { supabase } from "@/lib/supabase";

interface Participant {
  id: string;
  program_id?: string;
  program?: Program;
  attendee_name: string;
  security_checkin?: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout?: string;
  created_at: string;
}

interface FormData {
  attendee_name: string;
  program_id?: string;
  security_checkin?: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout?: string;
}

interface TimeValidationResult {
  isValid: boolean;
  message: string;
}

interface ImportRow {
  'No.': string | null;
  'Attendee Name': string | null;
  'Security Check-In': string | null;
  'Reception Check-In': string | null;
  'Reception Check-Out': string | null;
  'Security Check-Out': string | null;
}

interface Program {
  id: string;
  name: string;
  customer_name: string;
  start_date: string;
  end_date: string;
}

export function ParticipantsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);
  const [formData, setFormData] = useState<FormData>({
    attendee_name: "",
    program_id: "all",
    security_checkin: "",
    reception_checkin: "",
    reception_checkout: "",
    security_checkout: "",
  });
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

  const calculateDuration = (checkin: string, checkout: string): string => {
    try {
      const start = new Date(checkin);
      const end = new Date(checkout);
      const diff = end.getTime() - start.getTime();
      
      // Calculate days and remaining hours
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const remainingHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      // Format the duration string
      if (days > 0) {
        return `${days}d ${remainingHours}h`;
      }
      return `${remainingHours}h`;
    } catch {
      return '-';
    }
  };

  const fetchPrograms = async () => {
    setIsLoading(true);
    try {
      const monthDate = new Date(selectedMonth);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from('programs')
        .select('id, name, customer_name, start_date, end_date')
        .or(
          `and(start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()})`
        )
        .order('start_date', { ascending: false });

      if (error) throw error;
      
      // Filter programs that overlap with the selected month
      const filteredPrograms = data?.filter(program => {
        const programStart = new Date(program.start_date);
        const programEnd = new Date(program.end_date);
        return (programStart <= monthEnd && programEnd >= monthStart);
      });

      setPrograms(filteredPrograms || []);
      
      // Reset program selection when month changes
      setSelectedProgramId('all');
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const monthDate = new Date(selectedMonth);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // First, get all programs that overlap with the selected month
      const { data: monthPrograms, error: programError } = await supabase
        .from('programs')
        .select('id')
        .or(
          `and(start_date.lte.${monthEnd.toISOString()},end_date.gte.${monthStart.toISOString()})`
        );

      if (programError) throw programError;

      // Get program IDs for the selected month
      const programIds = monthPrograms?.map(p => p.id) || [];

      let query = supabase
        .from('participants')
        .select(`
          *,
          programs:program_id (
            id,
            name,
            customer_name,
            start_date,
            end_date
          )
        `)
        .order('created_at', { ascending: false });

      // Add program filter
      if (selectedProgramId !== 'all') {
        // If specific program selected, only show participants from that program
        query = query.eq('program_id', selectedProgramId);
      } else if (programIds.length > 0) {
        // For "All Programs", show participants from all programs in the selected month
        query = query.in('program_id', programIds);
      }

      // Add month filter only if check-in/out dates exist
      // This complex filter includes:
      // 1. Participants with missing check-in/out times (linked to programs in the month)
      // 2. Participants who checked in or out during the month
      // 3. Participants whose stay overlaps with the month
      query = query.or(
        `reception_checkin.is.null,` +
        `reception_checkout.is.null,` +
        `and(reception_checkin.gte.${monthStart.toISOString()},reception_checkin.lte.${monthEnd.toISOString()}),` +
        `and(reception_checkout.gte.${monthStart.toISOString()},reception_checkout.lte.${monthEnd.toISOString()}),` +
        `and(reception_checkin.lte.${monthEnd.toISOString()},reception_checkout.gte.${monthStart.toISOString()})`
      );

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform the data to maintain program information
      const transformedData = data?.map(participant => {
        const { programs: programInfo, ...rest } = participant;
        return {
          ...rest,
          program: programInfo
        };
      }) || [];

      setParticipants(transformedData);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants');
    }
  };

  // Update useEffect to fetch programs when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchPrograms();
    }
  }, [selectedMonth]);

  // Update useEffect to fetch participants when month or program changes
  useEffect(() => {
    fetchParticipants();
  }, [selectedMonth, selectedProgramId]);

  // Update search suggestions when search query changes
  useEffect(() => {
    if (searchQuery.length > 0) {
      const suggestions = participants
        .map(p => p.attendee_name)
        .filter(name => 
          name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5); // Limit to 5 suggestions
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery, participants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const participantData: Partial<Participant> = {
        attendee_name: formData.attendee_name,
        program_id: formData.program_id === 'all' ? undefined : formData.program_id,
      };

      // Only add dates if they are provided
      if (formData.security_checkin) {
        participantData.security_checkin = new Date(formData.security_checkin).toISOString();
      }
      if (formData.reception_checkin) {
        participantData.reception_checkin = new Date(formData.reception_checkin).toISOString();
      }
      if (formData.reception_checkout) {
        participantData.reception_checkout = new Date(formData.reception_checkout).toISOString();
      }
      if (formData.security_checkout) {
        participantData.security_checkout = new Date(formData.security_checkout).toISOString();
      }

      // Validate check-in/out sequence if both dates are present
      if (participantData.reception_checkin && participantData.reception_checkout) {
        const checkinDate = new Date(participantData.reception_checkin);
        const checkoutDate = new Date(participantData.reception_checkout);

        if (checkinDate > checkoutDate) {
          toast.error('Check-in time cannot be later than check-out time');
          setIsLoading(false);
          return;
        }
      }

      if (editingParticipant) {
        const { error } = await supabase
          .from('participants')
          .update(participantData)
          .eq('id', editingParticipant.id);

        if (error) throw error;
        toast.success('Participant updated successfully');
      } else {
        const { error } = await supabase
          .from('participants')
          .insert([participantData]);

        if (error) throw error;
        toast.success('Participant added successfully');
      }

      setFormData({
        attendee_name: "",
        program_id: "all",
        security_checkin: "",
        reception_checkin: "",
        reception_checkout: "",
        security_checkout: "",
      });
      setEditingParticipant(null);
      setIsModalOpen(false);
      fetchParticipants();
    } catch (error) {
      console.error('Error saving participant:', error);
      toast.error('Failed to save participant');
    } finally {
      setIsLoading(false);
    }
  };

  const formatExcelDate = (dateString: string) => {
    try {
      if (!dateString || dateString === '&nbsp;') return null;

      // Remove any HTML entities and trim
      dateString = dateString.replace(/&nbsp;/g, '').trim();
      if (!dateString) return null;

      // Parse the date string (format: DD/MM/YYYY HH:mmAM/PM)
      const [datePart, timePart] = dateString.split(/\s+/); // Split by any number of spaces
      if (!datePart || !timePart) {
        console.warn('Invalid date format:', dateString);
        return null;
      }

      // Parse date part (DD/MM/YYYY)
      const [day, month, year] = datePart.split('/');
      if (!day || !month || !year) {
        console.warn('Invalid date parts:', datePart);
        return null;
      }

      // Parse time part (HH:mmAM/PM)
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(AM|PM)/i);
      if (!timeMatch) {
        console.warn('Invalid time format:', timePart);
        return null;
      }

      let [_, hours, minutes, period] = timeMatch;
      
      // Convert 12-hour format to 24-hour format
      let hourNum = parseInt(hours);
      if (isNaN(hourNum)) {
        console.warn('Invalid hour:', hours);
        return null;
      }

      if (period.toUpperCase() === 'PM' && hourNum !== 12) {
        hourNum += 12;
      } else if (period.toUpperCase() === 'AM' && hourNum === 12) {
        hourNum = 0;
      }

      // Create ISO date string
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${String(hourNum).padStart(2, '0')}:${minutes}:00`;
      
      // Validate the date
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date created:', isoDate);
        return null;
      }
      
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return null;
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if a specific program is selected
    if (selectedProgramId === 'all') {
      toast.error('Please select a specific program before importing participants');
      event.target.value = '';
      return;
    }

    event.target.value = '';
    setIsImporting(true);

    // Function to extract table data from HTML content
    const extractTableData = (htmlContent: string): ImportRow[] => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const rows = doc.querySelectorAll('tr');
      const data: ImportRow[] = [];

      // Skip the header row (index 0)
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        if (cells.length >= 6) { // Ensure we have all required columns
          const rowData: ImportRow = {
            'No.': cells[0].textContent?.trim() || null,
            'Attendee Name': cells[1].textContent?.trim() || null,
            'Security Check-In': cells[2].textContent?.trim() || null,
            'Reception Check-In': cells[3].textContent?.trim() || null,
            'Reception Check-Out': cells[4].textContent?.trim() || null,
            'Security Check-Out': cells[5].textContent?.trim() || null,
          };
          data.push(rowData);
        }
      }
      return data;
    };

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const tableData = extractTableData(content);
        const importData = tableData
        .map((row: ImportRow) => {
          try {
            const attendeeName = row['Attendee Name']?.trim();
            const receptionCheckin = formatExcelDate(row['Reception Check-In'] || '');
            const receptionCheckout = formatExcelDate(row['Reception Check-Out'] || '');
            const securityCheckin = formatExcelDate(row['Security Check-In'] || '');
            const securityCheckout = formatExcelDate(row['Security Check-Out'] || '');
      
            const participantData: Partial<Participant> = {
              attendee_name: attendeeName || 'Unknown Participant',
              program_id: selectedProgramId
            };

            // Only add timing fields if they exist
            if (receptionCheckin) {
              participantData.reception_checkin = receptionCheckin;
            }
            if (receptionCheckout) {
              participantData.reception_checkout = receptionCheckout;
            }
            if (securityCheckin) {
              participantData.security_checkin = securityCheckin;
            }
            if (securityCheckout) {
              participantData.security_checkout = securityCheckout;
            }

            return participantData;
          } catch (error) {
            console.error('Error processing row:', row, error);
            return null;
          }
        })
        .filter((item: Partial<Participant> | null): item is Partial<Participant> => item !== null);

        if (importData.length === 0) {
          throw new Error('No valid data found in file');
        }

        // Split the data into smaller chunks of 20 records
        const chunkSize = 20;
        const chunks = [];
        for (let i = 0; i < importData.length; i += chunkSize) {
          chunks.push(importData.slice(i, i + chunkSize));
        }

        let insertedCount = 0;
        
        // Process each chunk in sequence with a delay between chunks
        for (const chunk of chunks) {
          try {
            const { error } = await supabase
              .from('participants')
              .insert(chunk);

            if (error) {
              console.error('Chunk insert error:', error);
              throw error;
            }
            
            insertedCount += chunk.length;
            // Show progress
            toast.success(`Imported ${insertedCount} of ${importData.length} participants...`, {
              duration: 1000,
            });

            // Add a small delay between chunks to prevent overload
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (error: any) {
            console.error('Error processing chunk:', error);
            throw new Error(`Failed to import chunk: ${error.message}`);
          }
        }

        toast.success(`Successfully imported ${importData.length} participants to ${programs.find(p => p.id === selectedProgramId)?.name}`);
        fetchParticipants();
      } catch (error: any) {
        console.error('Error importing file:', error);
        if (error.message?.includes('timeout') || error.code === '40P01') {
          toast.error('Import process failed. Please try with a smaller file or contact support.');
        } else {
          toast.error(`Failed to import participants: ${error.message}`);
        }
      } finally {
        setIsImporting(false);
      }
    };

    reader.readAsText(file);
  };

  // Filter participants based on search query and selected program
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.attendee_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProgram = selectedProgramId === 'all' || participant.program_id === selectedProgramId;
    return matchesSearch && matchesProgram;
  });

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      attendee_name: participant.attendee_name,
      program_id: participant.program_id || 'all',
      security_checkin: participant.security_checkin 
        ? format(new Date(participant.security_checkin), "yyyy-MM-dd'T'HH:mm") 
        : "",
      reception_checkin: participant.reception_checkin 
        ? format(new Date(participant.reception_checkin), "yyyy-MM-dd'T'HH:mm")
        : "",
      reception_checkout: participant.reception_checkout 
        ? format(new Date(participant.reception_checkout), "yyyy-MM-dd'T'HH:mm")
        : "",
      security_checkout: participant.security_checkout 
        ? format(new Date(participant.security_checkout), "yyyy-MM-dd'T'HH:mm")
        : "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this participant?")) {
      try {
        const { error } = await supabase
          .from('participants')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setParticipants(prev => prev.filter(p => p.id !== id));
        toast.success('Participant deleted successfully');
      } catch (error) {
        console.error('Error deleting participant:', error);
        toast.error('Failed to delete participant');
      }
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsLoading(true);
      
      // First check if there are any participants to delete
      const { count, error: countError } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      if (!count || count === 0) {
        toast.error('No participants to delete');
        setIsDeleteAllModalOpen(false);
        return;
      }

      // Delete all participants without using a where clause
      const { error } = await supabase
        .from('participants')
        .delete()
        .not('id', 'is', null); // This will delete all records

      if (error) throw error;

      setParticipants([]); // Clear the local state
      toast.success('All participants deleted successfully');
      setIsDeleteAllModalOpen(false);
    } catch (error) {
      console.error('Error deleting all participants:', error);
      toast.error('Failed to delete all participants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const exportData = participants.map(participant => ({
        'No.': participant.id,
        'Attendee Name': participant.attendee_name,
        'Check In': format(new Date(participant.reception_checkin), 'dd-MMM-yyyy h:mm a'),
        'Check Out': format(new Date(participant.reception_checkout), 'dd-MMM-yyyy h:mm a')
      }));

      const csv = unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 'attendee_checkin.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${exportData.length} participants`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export participants');
    }
  };

  // Add function to check if participant arrived early or departed late
  const getAttendanceStatus = (participant: Participant, program?: Program) => {
    if (!program || !participant.reception_checkin || !participant.reception_checkout) return null;

    const programStart = new Date(program.start_date);
    const programEnd = new Date(program.end_date);
    const checkinDate = new Date(participant.reception_checkin);
    const checkoutDate = new Date(participant.reception_checkout);

    // Reset time part for date comparison
    programStart.setHours(0, 0, 0, 0);
    programEnd.setHours(23, 59, 59, 999);
    checkinDate.setHours(0, 0, 0, 0);
    checkoutDate.setHours(23, 59, 59, 999);

    const tags = [];

    if (checkinDate < programStart) {
      const daysEarly = Math.round((programStart.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      tags.push({
        type: 'early-arrival',
        message: `Arrived ${daysEarly} day${daysEarly > 1 ? 's' : ''} early`
      });
    }

    if (checkoutDate > programEnd) {
      const daysLate = Math.round((checkoutDate.getTime() - programEnd.getTime()) / (1000 * 60 * 60 * 24));
      tags.push({
        type: 'late-departure',
        message: `Left ${daysLate} day${daysLate > 1 ? 's' : ''} after program end`
      });
    }

    return tags;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Manage Participants</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-sm"
            >
              <RiDownloadLine className="w-4 h-4" />
              Export
            </button>

            <div className="relative">
              <input
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleImportCSV}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer text-sm"
              >
                <RiUploadLine className="w-4 h-4" />
                Import
              </label>
            </div>

            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm"
            >
              <RiDeleteBinLine className="w-4 h-4" />
              Delete All
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Add Participant
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-96">
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:ring-0 text-sm"
            />
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-48">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                // If cleared, set to current month
                const newValue = e.target.value || format(new Date(), 'yyyy-MM');
                setSelectedMonth(newValue);
                setCurrentPage(1); // Reset to first page when changing filter
              }}
              className="w-full border-none focus:ring-0 text-sm"
            />
          </div>

          {/* Program Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-96">
            <select
              value={selectedProgramId}
              onChange={(e) => {
                setSelectedProgramId(e.target.value);
                setCurrentPage(1); // Reset to first page when changing filter
              }}
              className="w-full border-none focus:ring-0 text-sm"
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} - {program.customer_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* No Data Message */}
        {programs.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <div className="flex items-center gap-2 text-amber-700">
              <RiAlertLine className="w-5 h-5" />
              <p>No programs found for {format(new Date(selectedMonth), 'MMMM yyyy')}. Please select a different month or add programs for this period.</p>
            </div>
          </div>
        )}

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isImporting ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
              <p className="mt-4 text-gray-600">Importing participants...</p>
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <RiFileTextLine className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">No participants found</p>
              <p className="text-sm mt-2">
                {selectedProgramId === 'all' 
                  ? `No participants found for ${format(new Date(selectedMonth), 'MMMM yyyy')}`
                  : `No participants found in ${programs.find(p => p.id === selectedProgramId)?.name || 'this program'} for ${format(new Date(selectedMonth), 'MMMM yyyy')}`
                }
              </p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different month or program</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendee Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reception Check-In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reception Check-Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedParticipants.map((participant, index) => (
                    <tr key={participant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {participant.attendee_name}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {!participant.reception_checkin && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Missing Reception Check-In
                              </span>
                            )}
                            {!participant.reception_checkout && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                Missing Reception Check-Out
                              </span>
                            )}
                            {participant.program_id && participant.reception_checkin && participant.reception_checkout && (
                              <>
                                {getAttendanceStatus(
                                  participant,
                                  programs.find(p => p.id === participant.program_id)
                                )?.map((tag, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      tag.type === 'early-arrival'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {tag.message}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {participant.program?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {participant.reception_checkin ? (
                          <div className="text-sm text-gray-500">
                            <div>{format(new Date(participant.reception_checkin), 'dd MMM yyyy')}</div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(participant.reception_checkin), 'h:mm a')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                            Not Checked In
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {participant.reception_checkout ? (
                          <div className="text-sm text-gray-500">
                            <div>{format(new Date(participant.reception_checkout), 'dd MMM yyyy')}</div>
                            <div className="text-xs text-gray-400">
                              {format(new Date(participant.reception_checkout), 'h:mm a')}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                            Not Checked Out
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {participant.reception_checkin && participant.reception_checkout ? (
                          <div className="text-sm text-gray-500">
                            {calculateDuration(participant.reception_checkin, participant.reception_checkout)}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            Not Available
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(participant)}
                          className="text-amber-600 hover:text-amber-900"
                          title="Edit participant"
                        >
                          <RiEditLine className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(participant.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete participant"
                        >
                          <RiDeleteBinLine className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4 bg-white rounded-lg shadow px-4 py-3">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredParticipants.length)} of {filteredParticipants.length} participants
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {editingParticipant ? 'Edit Participant' : 'Add New Participant'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingParticipant(null);
                    setFormData({
                      attendee_name: "",
                      program_id: "all",
                      reception_checkin: "",
                      reception_checkout: "",
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <RiCloseLine className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Attendee Name
                  </label>
                  <input
                    type="text"
                    value={formData.attendee_name}
                    onChange={(e) => setFormData({ ...formData, attendee_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Program
                  </label>
                  <select
                    value={formData.program_id}
                    onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  >
                    <option value="all">No Program</option>
                    {programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} - {program.customer_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reception Check-In
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.reception_checkin}
                    onChange={(e) => setFormData({ ...formData, reception_checkin: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reception Check-Out
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.reception_checkout}
                    onChange={(e) => setFormData({ ...formData, reception_checkout: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingParticipant(null);
                      setFormData({
                        attendee_name: "",
                        program_id: "all",
                        reception_checkin: "",
                        reception_checkout: "",
                      });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : editingParticipant ? 'Update' : 'Add'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {isDeleteAllModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <RiAlertLine className="w-6 h-6 text-red-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Delete All Participants</h2>
              </div>
              
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete all participants? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsDeleteAllModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAll}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isLoading ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
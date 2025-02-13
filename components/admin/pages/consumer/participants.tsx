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
  RiFileTextLine,
  RiFilterLine,
  RiCalendarLine,
  RiSearchLine
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
  type: 'participant' | 'guest' | 'other' | 'driver';
  has_date_error?: boolean;
  date_error_message?: string;
}

interface FormData {
  attendee_name: string;
  program_id?: string;
  security_checkin?: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout?: string;
  type: 'participant' | 'guest' | 'other' | 'driver';
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedType, setSelectedType] = useState<'all' | Participant['type']>('all');
  const [formData, setFormData] = useState<FormData>({
    attendee_name: "",
    program_id: "all",
    security_checkin: "",
    reception_checkin: "",
    reception_checkout: "",
    security_checkout: "",
    type: "participant",
  });
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const entriesOptions = [10, 25, 50, 100];

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

      // First fetch programs for the selected month
      const { data: monthPrograms, error: programError } = await supabase
        .from('programs')
        .select('id')
        .lte('start_date', monthEnd.toISOString())
        .gte('end_date', monthStart.toISOString());

      if (programError) throw programError;

      // Get program IDs for the selected month
      const programIds = monthPrograms?.map(p => p.id) || [];

      let query = supabase
        .from('participants')
        .select(`
          *,
          program:program_id (
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
        query = query.eq('program_id', selectedProgramId);
      } else if (programIds.length > 0) {
        query = query.in('program_id', programIds);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform and filter the data
      const transformedData = (data || []).map(participant => {
        const transformed = {
          ...participant,
          program: participant.program
        };

        // Check for missing check-in/out
        if (!transformed.reception_checkin || !transformed.reception_checkout) {
          transformed.has_date_error = true;
          transformed.date_error_message = !transformed.reception_checkin && !transformed.reception_checkout 
            ? "Missing both Check-In and Check-Out"
            : !transformed.reception_checkin 
              ? "Missing Check-In" 
              : "Missing Check-Out";
          return transformed;
        }

        // Check for invalid dates (checkout before checkin)
        const checkinDate = new Date(transformed.reception_checkin);
        const checkoutDate = new Date(transformed.reception_checkout);
        
        if (checkoutDate < checkinDate) {
          transformed.has_date_error = true;
          transformed.date_error_message = `Check-out date (${format(checkoutDate, 'dd MMM yyyy')}) is before check-in date (${format(checkinDate, 'dd MMM yyyy')})`;
          return transformed;
        }

        // If participant has a program, check for early arrival/late departure
        if (transformed.program) {
          const attendanceStatus = getAttendanceStatus(transformed, transformed.program);
          if (attendanceStatus && attendanceStatus.length > 0) {
            transformed.has_date_error = true;
            transformed.date_error_message = attendanceStatus.map(status => status.message).join(', ');
          }
        }

        return transformed;
      });

      // Filter participants to only show those relevant to the selected month
      const filteredData = transformedData.filter(participant => {
        if (!participant.reception_checkin || !participant.reception_checkout) {
          // For participants with missing dates, only show if they belong to a program in this month
          return programIds.includes(participant.program_id || '');
        }

        const checkinDate = new Date(participant.reception_checkin);
        const checkoutDate = new Date(participant.reception_checkout);

        // For participants with dates, check if their stay overlaps with the month
        const stayOverlapsMonth = (
          (checkinDate >= monthStart && checkinDate <= monthEnd) ||
          (checkoutDate >= monthStart && checkoutDate <= monthEnd) ||
          (checkinDate <= monthEnd && checkoutDate >= monthStart)
        );

        return stayOverlapsMonth;
      });

      setParticipants(filteredData);
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

  // Add new function to validate dates
  const validateDates = (checkin: string, checkout: string): TimeValidationResult => {
    try {
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);

      if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
        return {
          isValid: false,
          message: "Invalid date format"
        };
      }

      if (checkoutDate < checkinDate) {
        return {
          isValid: false,
          message: `Check-out date (${format(checkoutDate, 'dd MMM yyyy')}) is before check-in date (${format(checkinDate, 'dd MMM yyyy')})`
        };
      }

      return {
        isValid: true,
        message: ""
      };
    } catch (error) {
      return {
        isValid: false,
        message: "Error validating dates"
      };
    }
  };

  // Add function to count errors in a program
  const getProgramErrors = (programId: string): number => {
    return participants.filter(p => 
      p.program_id === programId && 
      p.has_date_error
    ).length;
  };

  // Modify handleSubmit to include type and date validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dateValidation = validateDates(formData.reception_checkin, formData.reception_checkout);
      
      const participantData: Partial<Participant> = {
        attendee_name: formData.attendee_name,
        program_id: formData.program_id === 'all' ? undefined : formData.program_id,
        type: formData.type,
        has_date_error: !dateValidation.isValid,
        date_error_message: dateValidation.isValid ? undefined : dateValidation.message
      };

      // Add dates if provided
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
        type: "participant",
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

  // Modify formatExcelDate to include date validation
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

  // Modify handleImportCSV to include type and date validation
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
      
              // Validate dates if both exist
              let hasDateError = false;
              let dateErrorMessage = '';
              
              if (receptionCheckin && receptionCheckout) {
                const validation = validateDates(receptionCheckin, receptionCheckout);
                hasDateError = !validation.isValid;
                dateErrorMessage = validation.message;
              }
        
              const participantData: Partial<Participant> = {
                attendee_name: attendeeName || 'Unknown Participant',
                program_id: selectedProgramId,
                type: 'participant', // Default type for imported participants
                has_date_error: hasDateError,
                date_error_message: dateErrorMessage
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

  // Add new function to sort participants by type
  const sortParticipantsByType = (a: Participant, b: Participant) => {
    const typeOrder = {
      participant: 1,
      guest: 2,
      driver: 3,
      other: 4
    };
    return typeOrder[a.type] - typeOrder[b.type];
  };

  // Modify the filteredParticipants to include type filtering and sorting
  const filteredParticipants = participants
    .filter(participant => {
      const matchesSearch = participant.attendee_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProgram = selectedProgramId === 'all' || participant.program_id === selectedProgramId;
      const matchesType = selectedType === 'all' || participant.type === selectedType;
      return matchesSearch && matchesProgram && matchesType;
    })
    .sort(sortParticipantsByType);

  // Add new function to get count by type
  const getTypeCount = (type: Participant['type']) => {
    return participants.filter(p => p.type === type).length;
  };

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
      type: participant.type,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!participantToDelete) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantToDelete.id);

      if (error) throw error;

      toast.success('Participant and their billing entries deleted successfully');
      setParticipants(prev => prev.filter(p => p.id !== participantToDelete.id));
      setIsDeleteModalOpen(false);
      setParticipantToDelete(null);
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast.error('Failed to delete participant');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteModal = (participant: Participant) => {
    setParticipantToDelete(participant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAll = async () => {
    try {
      setIsLoading(true);
      
      const monthDate = new Date(selectedMonth);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      let query = supabase
        .from('participants')
        .delete();

      // Add program filter if specific program selected
      if (selectedProgramId !== 'all') {
        query = query.eq('program_id', selectedProgramId);
      } else {
        // If no specific program selected, delete based on month
        query = query.or(
          `and(reception_checkin.gte.${monthStart.toISOString()},reception_checkin.lte.${monthEnd.toISOString()}),` +
          `and(reception_checkout.gte.${monthStart.toISOString()},reception_checkout.lte.${monthEnd.toISOString()}),` +
          `and(reception_checkin.lte.${monthEnd.toISOString()},reception_checkout.gte.${monthStart.toISOString()})`
        );
      }

      const { error } = await query;

      if (error) throw error;

      // Refresh participants list
      fetchParticipants();
      toast.success(selectedProgramId === 'all' 
        ? `Successfully deleted all participants and their billing entries for ${format(new Date(selectedMonth), 'MMMM yyyy')}`
        : `Successfully deleted all participants and their billing entries from ${programs.find(p => p.id === selectedProgramId)?.name}`
      );
      setIsDeleteAllModalOpen(false);
    } catch (error) {
      console.error('Error deleting participants:', error);
      toast.error('Failed to delete participants');
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

  // Add function to get error summary for all programs
  const getAllProgramsErrorSummary = () => {
    const errorSummary: { [key: string]: number } = {};
    let totalErrors = 0;

    participants.forEach(participant => {
      // Only count actual validation errors (wrong dates)
      if (participant.has_date_error && participant.program) {
        const programName = participant.program.name;
        errorSummary[programName] = (errorSummary[programName] || 0) + 1;
        totalErrors++;
      }
    });

    return { errorSummary, totalErrors };
  };

  // Modify the getAttendanceStatus function to not override existing error messages
  const getAttendanceStatus = (participant: Participant, program?: Program) => {
    if (!program || !participant.reception_checkin || !participant.reception_checkout) return null;

    // If there's already a date validation error, don't check for early/late status
    if (participant.has_date_error && participant.date_error_message?.includes('before check-in')) {
      return null;
    }

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

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
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
                accept=".csv"
                onChange={handleImportCSV}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer text-sm"
              >
                <RiUploadLine className="w-4 h-4" />
                Import
              </label>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors ml-2 text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Add Participant
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Program Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <RiFilterLine className="text-gray-500" />
            <select
              value={selectedProgramId}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="w-full border-none focus:ring-0 text-sm"
            >
              <option value="all">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.customer_name})
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 w-full sm:w-auto">
            <RiCalendarLine className="text-gray-500" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none focus:ring-0 text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-48">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as 'all' | Participant['type']);
                setCurrentPage(1);
              }}
              className="w-full border-none focus:ring-0 text-sm"
            >
              <option value="all">All Types ({participants.length})</option>
              <option value="participant">Participants ({getTypeCount('participant')})</option>
              <option value="guest">Guests ({getTypeCount('guest')})</option>
              <option value="driver">Drivers ({getTypeCount('driver')})</option>
              <option value="other">Others ({getTypeCount('other')})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search and Entries Row */}
      <div className="flex justify-between items-center mb-4">
        {/* Search */}
        <div className="relative w-[300px]">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rounded-lg border border-gray-300 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        {/* Entries Selector */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={handleEntriesChange}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {entriesOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span>entries</span>
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

      {/* Error Messages */}
      <div className="mt-4">
        {selectedProgramId === 'all' ? (
          // Show summary for all programs
          (() => {
            const { errorSummary, totalErrors } = getAllProgramsErrorSummary();
            return totalErrors > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex flex-col gap-2 text-red-700">
                  <div className="flex items-center gap-2">
                    <RiAlertLine className="w-5 h-5" />
                    <p>
                      Found {totalErrors} participant{totalErrors === 1 ? '' : 's'} with date validation errors:
                    </p>
                  </div>
                  <ul className="ml-5 list-disc">
                    {Object.entries(errorSummary).map(([program, count]) => (
                      <li key={program}>
                        {program}: {count} participant{count === 1 ? '' : 's'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null;
          })()
        ) : (
          // Show message for specific program
          getProgramErrors(selectedProgramId) > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <RiAlertLine className="w-5 h-5" />
                <p>
                  This program has {getProgramErrors(selectedProgramId)} participant{getProgramErrors(selectedProgramId) === 1 ? '' : 's'} with date validation errors that need attention.
                </p>
              </div>
            </div>
          )
        )}
      </div>

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
          <>
            {/* Desktop Table View - Hidden on Mobile */}
            <div className="hidden md:block overflow-x-auto">
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
                    Type
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
                  <tr key={participant.id} className={`hover:bg-gray-50 ${participant.has_date_error ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 text-wrap">
                        {participant.attendee_name}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {/* Show error only for actual validation errors (wrong dates) */}
                          {participant.has_date_error && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 text-wrap">
                              {participant.date_error_message}
                            </span>
                          )}
                          {/* Show missing check-in/out warnings */}
                          {!participant.reception_checkin && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Missing Check-In
                            </span>
                          )}
                          {!participant.reception_checkout && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Missing Check-Out
                            </span>
                          )}
                          {/* Show early/late warning message if exists and no validation error */}
                          {!participant.has_date_error && participant.date_error_message && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              {participant.date_error_message}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-wrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium
                        ${participant.type === 'participant' ? 'bg-blue-100 text-blue-800' :
                          participant.type === 'guest' ? 'bg-green-100 text-green-800' :
                          participant.type === 'driver' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-wrap">
                      <div className="text-sm text-gray-500">
                        {participant.program?.name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-wrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-wrap">
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
                    <td className="px-6 py-4 whitespace-nowrap text-wrap">
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
                        onClick={() => openDeleteModal(participant)}
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

          {/* Mobile Card View - Shown only on Mobile */}
          <div className="md:hidden">
            {paginatedParticipants.map((participant, index) => (
              <div 
                key={participant.id}
                className={`bg-white rounded-lg shadow-sm mb-4 p-4 ${participant.has_date_error ? 'bg-red-50' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {participant.attendee_name}
                    </h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium mt-1
                      ${participant.type === 'participant' ? 'bg-blue-100 text-blue-800' :
                        participant.type === 'guest' ? 'bg-green-100 text-green-800' :
                        participant.type === 'driver' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'}`}>
                      {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(participant)}
                      className="text-amber-600 hover:text-amber-900"
                      title="Edit participant"
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(participant)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete participant"
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {participant.program?.name && (
                  <div className="text-xs text-gray-500 mb-2">
                    Program: {participant.program.name}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Check In</div>
                    {participant.reception_checkin ? (
                      <div className="text-sm text-gray-700">
                        {format(new Date(participant.reception_checkin), 'dd MMM yyyy')}
                        <div className="text-xs text-gray-500">
                          {format(new Date(participant.reception_checkin), 'h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Not Checked In
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Check Out</div>
                    {participant.reception_checkout ? (
                      <div className="text-sm text-gray-700">
                        {format(new Date(participant.reception_checkout), 'dd MMM yyyy')}
                        <div className="text-xs text-gray-500">
                          {format(new Date(participant.reception_checkout), 'h:mm a')}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
                        Not Checked Out
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration */}
                {participant.reception_checkin && participant.reception_checkout && (
                  <div className="mt-2 text-xs text-gray-500">
                    Duration: {calculateDuration(participant.reception_checkin, participant.reception_checkout)}
                  </div>
                )}

                {/* Status Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {/* Show error only for actual validation errors (wrong dates) */}
                  {participant.has_date_error && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 text-wrap">
                      {participant.date_error_message}
                    </span>
                  )}
                  {/* Show early/late warning message if exists and no validation error */}
                  {!participant.has_date_error && participant.date_error_message && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      {participant.date_error_message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
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
                  type: "participant",
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Participant['type'] })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
              >
                <option value="participant">Participant</option>
                <option value="guest">Guest</option>
                <option value="other">Other</option>
                <option value="driver">Driver</option>
              </select>
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
                    type: "participant",
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
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedProgramId === 'all' 
                ? `Delete All Participants - ${format(new Date(selectedMonth), 'MMMM yyyy')}`
                : `Delete All Participants - ${programs.find(p => p.id === selectedProgramId)?.name}`
              }
            </h2>
          </div>
          
          <p className="text-gray-500 mb-2">
            {selectedProgramId === 'all'
              ? `Are you sure you want to delete all participants for ${format(new Date(selectedMonth), 'MMMM yyyy')}?`
              : `Are you sure you want to delete all participants from ${programs.find(p => p.id === selectedProgramId)?.name}`
            }
          </p>
          
          <p className="text-red-600 text-sm mb-6">
            This will also delete all billing entries associated with these participants. This action cannot be undone.
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

    {/* Single Delete Confirmation Modal */}
    {isDeleteModalOpen && participantToDelete && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center mb-4">
            <RiAlertLine className="w-6 h-6 text-red-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">
              Delete Participant
            </h2>
          </div>
          
          <p className="text-gray-500 mb-2">
            Are you sure you want to delete <span className="font-medium">{participantToDelete.attendee_name}</span>?
          </p>
          
          <p className="text-red-600 text-sm mb-6">
            This will also delete all billing entries associated with this participant. This action cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setParticipantToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
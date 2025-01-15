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
import { format } from 'date-fns';
import { parse, unparse } from 'papaparse';
import { supabase } from "@/lib/supabase";

interface Participant {
  id: string;
  attendee_name: string;
  type: string;
  security_checkin?: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout?: string;
  created_at: string;
  program_id: string;
}

interface FormData {
  attendee_name: string;
  type: string;
  security_checkin: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout: string;
}

interface Program {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'completed' | 'ongoing' | 'upcoming';
}

interface ParticipantWithProgramStatus extends Participant {
  programStatus: 'in_program' | 'early_arrival' | 'late_departure' | 'no_program';
  daysEarly?: number;
  daysLate?: number;
}

interface TimeValidationResult {
  isValid: boolean;
  message: string;
}

export function ParticipantsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    attendee_name: "",
    type: "participant",
    security_checkin: "",
    reception_checkin: "",
    reception_checkout: "",
    security_checkout: "",
  });

  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), 'yyyy-MM')
  );
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const fetchParticipants = async () => {
    try {
      let query = supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedProgramId) {
        // Get the selected program's dates
        const selectedProgram = programs.find(p => p.id === selectedProgramId);
        if (selectedProgram) {
          const programStart = new Date(selectedProgram.start_date);
          const programEnd = new Date(selectedProgram.end_date);

          // Filter participants whose check-in/check-out dates fall within the program duration
          query = query.filter('reception_checkin', 'gte', programStart.toISOString())
            .filter('reception_checkout', 'lte', programEnd.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants');
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [selectedProgramId]);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
      
      // Filter programs for the selected month
      filterProgramsByMonth(data || [], selectedMonth);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    }
  };

  const getProgramStatus = (startDate: string, endDate: string): 'completed' | 'ongoing' | 'upcoming' => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < now) return 'completed';
    if (start > now) return 'upcoming';
    return 'ongoing';
  };

  const filterProgramsByMonth = (programsList: Program[], monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const startOfMonth = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0); // Last day of month

    const filtered = programsList.filter(program => {
      const programStart = new Date(program.start_date);
      const programEnd = new Date(program.end_date);

      // Show program if it overlaps with selected month
      return (
        (programStart <= endOfMonth && programEnd >= startOfMonth) ||
        format(programStart, 'yyyy-MM') === monthYear ||
        format(programEnd, 'yyyy-MM') === monthYear
      );
    });

    // Sort programs by start date
    const sorted = filtered.sort((a, b) => 
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );

    setFilteredPrograms(sorted);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    filterProgramsByMonth(programs, selectedMonth);
    setSelectedProgramId(""); // Reset program selection when month changes
  }, [selectedMonth, programs]);

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      attendee_name: participant.attendee_name,
      type: participant.type,
      security_checkin: participant.security_checkin ? format(new Date(participant.security_checkin), "yyyy-MM-dd'T'HH:mm") : "",
      reception_checkin: format(new Date(participant.reception_checkin), "yyyy-MM-dd'T'HH:mm"),
      reception_checkout: format(new Date(participant.reception_checkout), "yyyy-MM-dd'T'HH:mm"),
      security_checkout: participant.security_checkout ? format(new Date(participant.security_checkout), "yyyy-MM-dd'T'HH:mm") : "",
    });
    setIsModalOpen(true);
  };

  const findMatchingProgram = (checkinDate: Date, checkoutDate: Date, programsList: Program[]): string | null => {
    for (const program of programsList) {
      const programStart = new Date(program.start_date);
      const programEnd = new Date(program.end_date);

      // Check if the participant's check-in/out period overlaps with the program
      if (checkinDate <= programEnd && checkoutDate >= programStart) {
        return program.id;
      }
    }
    return null;
  };

  const validateCheckInOutTimes = (checkin: Date, checkout: Date): TimeValidationResult => {
    if (checkin > checkout) {
      return {
        isValid: false,
        message: 'Check-in time cannot be later than check-out time'
      };
    }

    const diffInHours = (checkout.getTime() - checkin.getTime()) / (1000 * 60 * 60);
    if (diffInHours > 24 * 30) { // More than 30 days
      return {
        isValid: false,
        message: 'Stay duration cannot exceed 30 days'
      };
    }

    return { isValid: true, message: '' };
  };

  const findProgramWithBuffer = (
    checkinDate: Date, 
    checkoutDate: Date, 
    programsList: Program[]
  ): { programId: string | null; status: 'in_program' | 'early_arrival' | 'late_departure' | 'no_program'; daysEarly?: number; daysLate?: number } => {
    for (const program of programsList) {
      const programStart = new Date(program.start_date);
      const programEnd = new Date(program.end_date);
      
      // Allow buffer periods
      const bufferStart = new Date(programStart);
      bufferStart.setDate(bufferStart.getDate() - 5); // 5 days before
      
      const bufferEnd = new Date(programEnd);
      bufferEnd.setDate(bufferEnd.getDate() + 5); // 5 days after

      if (checkinDate <= bufferEnd && checkoutDate >= bufferStart) {
        const daysEarly = checkinDate < programStart ? 
          Math.ceil((programStart.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        const daysLate = checkoutDate > programEnd ?
          Math.ceil((checkoutDate.getTime() - programEnd.getTime()) / (1000 * 60 * 60 * 24)) : 0;

        if (checkinDate >= programStart && checkoutDate <= programEnd) {
          return { programId: program.id, status: 'in_program' };
        }
        
        if (daysEarly > 0) {
          return { programId: program.id, status: 'early_arrival', daysEarly };
        }
        
        if (daysLate > 0) {
          return { programId: program.id, status: 'late_departure', daysLate };
        }
      }
    }
    
    return { programId: null, status: 'no_program' };
  };

  const handleQuickAddDriver = async (date: string) => {
    try {
      const currentDate = new Date(date);
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const driverData = {
        attendee_name: "Driver", // You might want to add a number or identifier
        type: "driver",
        reception_checkin: currentDate.toISOString(),
        reception_checkout: nextDay.toISOString()
      };

      // Find matching program
      const { programId, status } = findProgramWithBuffer(currentDate, nextDay, programs);
      
      if (programId) {
        const { error } = await supabase
          .from('participants')
          .insert([{ ...driverData, program_id: programId }]);

        if (error) throw error;
        toast.success('Driver added successfully');
        fetchParticipants();
      } else {
        toast.error('No matching program found for driver');
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      toast.error('Failed to add driver');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const checkinDate = new Date(formData.reception_checkin);
      const checkoutDate = new Date(formData.reception_checkout);

      // Validate check-in/out times
      const timeValidation = validateCheckInOutTimes(checkinDate, checkoutDate);
      if (!timeValidation.isValid) {
        toast.error(timeValidation.message);
        setIsLoading(false);
        return;
      }

      // Find matching program with buffer period
      const { programId, status, daysEarly, daysLate } = findProgramWithBuffer(checkinDate, checkoutDate, programs);

      if (!programId) {
        toast.error('No matching program found for these dates');
        setIsLoading(false);
        return;
      }

      // Show warnings for early arrival or late departure
      if (status === 'early_arrival') {
        toast(`Participant arriving ${daysEarly} days before program starts`, {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E'
          }
        });
      }
      if (status === 'late_departure') {
        toast(`Participant leaving ${daysLate} days after program ends`, {
          icon: '⚠️',
          style: {
            background: '#FEF3C7',
            color: '#92400E'
          }
        });
      }

      const participantData = {
        attendee_name: formData.attendee_name,
        type: formData.type,
        program_id: programId,
        ...(formData.security_checkin && {
          security_checkin: new Date(formData.security_checkin).toISOString()
        }),
        reception_checkin: checkinDate.toISOString(),
        reception_checkout: checkoutDate.toISOString(),
        ...(formData.security_checkout && {
          security_checkout: new Date(formData.security_checkout).toISOString()
        })
      };

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

      // Reset form
      setFormData({
        attendee_name: "",
        type: "participant",
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
        'Role': participant.type,
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

  const getDefaultProgramId = async () => {
    const { data, error } = await supabase
      .from('programs')
      .select('id')
      .order('start_date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error getting default program:', error);
      return null;
    }
    return data?.id;
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          setIsLoading(true);

          const importData = results.data
            .filter((row: any) => {
              const hasData = Object.entries(row).some(([key, value]) => {
                return key !== 'No.' && value && String(value).trim() !== '';
              });
              return hasData;
            })
            .map((row: any) => {
              try {
                if (!row['Attendee Name'] || !row['Reception Check-In'] || !row['Reception Check-Out']) {
                  console.error('Missing required fields in row:', row);
                  return null;
                }

                const checkinDate = new Date(formatDate(row['Reception Check-In']));
                const checkoutDate = new Date(formatDate(row['Reception Check-Out']));
                
                // Find matching program with buffer
                const { programId, status } = findProgramWithBuffer(checkinDate, checkoutDate, programs);
                
                if (!programId) {
                  console.error('No matching program found for:', row);
                  return null;
                }

                return {
                  attendee_name: row['Attendee Name'].trim(),
                  type: row['Type']?.toLowerCase() === 'driver' ? 'driver' : 'participant',
                  program_id: programId,
                  reception_checkin: checkinDate.toISOString(),
                  reception_checkout: checkoutDate.toISOString(),
                  ...(row['Security Check-In'] && {
                    security_checkin: formatDate(row['Security Check-In'])
                  }),
                  ...(row['Security Check-Out'] && {
                    security_checkout: formatDate(row['Security Check-Out'])
                  })
                };
              } catch (error) {
                console.error('Error processing row:', row, error);
                return null;
              }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          if (importData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          const { error } = await supabase
            .from('participants')
            .insert(importData);

          if (error) throw error;

          toast.success(`Successfully imported ${importData.length} participants`);
          fetchParticipants();
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast.error('Failed to import participants');
        } finally {
          setIsLoading(false);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        toast.error('Failed to parse CSV file');
      }
    });
  };

  // Helper function to format date strings
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) throw new Error('Date string is required');

      // Remove any potential spaces around the date string
      dateString = dateString.trim();
      
      // Split the date and time parts
      const [datePart, timePart] = dateString.split(' ');
      
      // Split the date into components
      const [day, month, year] = datePart.split('-');
      
      // Ensure month and day have leading zeros if needed
      const paddedMonth = month.length === 1 ? `0${month}` : month;
      const paddedDay = day.length === 1 ? `0${day}` : day;
      
      // Create the ISO formatted date string
      const isoDate = `${year}-${paddedMonth}-${paddedDay}T${timePart}:00`;
      
      // Validate the date by creating a new Date object
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${dateString}`);
      }
      
      return date.toISOString();
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      throw new Error(`Invalid date format: ${dateString}`);
    }
  };

  // Filter participants
  const filteredParticipants = participants.filter(participant => {
    return participant.attendee_name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleProgramChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedProgramId(e.target.value);
  };

  const checkParticipantsWithoutProgram = () => {
    const participantsWithoutProgram = participants.filter(p => !p.program_id);
    if (participantsWithoutProgram.length > 0) {
      toast.error(`${participantsWithoutProgram.length} participants are not assigned to any program`);
      console.warn('Participants without program:', participantsWithoutProgram);
    }
  };

  useEffect(() => {
    if (participants.length > 0) {
      checkParticipantsWithoutProgram();
    }
  }, [participants]);

  return (
    <div>
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-sm font-light text-gray-500">Manage Participants</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-sm"
            >
              <RiDownloadLine className="w-4 h-4" />
              Export
            </button>

            {/* Import Button */}
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

            {/* Delete All Button */}
            <button
              onClick={() => setIsDeleteAllModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm ml-2"
            >
              <RiDeleteBinLine className="w-4 h-4" />
              Delete All
            </button>

            {/* Add Participant Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors ml-2 text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Add Participant
            </button>

            <button
              onClick={() => handleQuickAddDriver(new Date().toISOString())}
              className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Quick Add Driver
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-none focus:ring-0 text-sm"
          />
        </div>

        {/* Filters Section */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            />
          </div>

          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program
            </label>
            <select
              value={selectedProgramId}
              onChange={handleProgramChange}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500"
            >
              <option value="">All Programs</option>
              {filteredPrograms.length > 0 ? (
                filteredPrograms.map(program => (
                  <option key={program.id} value={program.id}>
                    {program.name} ({format(new Date(program.start_date), 'dd/MM/yyyy')} - {format(new Date(program.end_date), 'dd/MM/yyyy')})
                  </option>
                ))
              ) : (
                <option value="" disabled>No programs found for this month</option>
              )}
            </select>
          </div>
        </div>

        {/* Participants Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check Out
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
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${participant.type === 'admin' ? 'bg-purple-100 text-purple-800' : 
                          participant.type === 'staff' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}`}>
                        {participant.type.charAt(0).toUpperCase() + participant.type.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>{format(new Date(participant.reception_checkin), 'dd MMM yyyy')}</div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(participant.reception_checkin), 'h:mm a')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        <div>{format(new Date(participant.reception_checkout), 'dd MMM yyyy')}</div>
                        <div className="text-xs text-gray-400">
                          {format(new Date(participant.reception_checkout), 'h:mm a')}
                        </div>
                      </div>
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
                  Add New Participant
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({
                      attendee_name: "",
                      type: "participant",
                      security_checkin: "",
                      reception_checkin: "",
                      reception_checkout: "",
                      security_checkout: "",
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
                    Role
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  >
                    <option value="participant">Participant</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check In Time
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
                    Check Out Time
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
                        type: "participant",
                        security_checkin: "",
                        reception_checkin: "",
                        reception_checkout: "",
                        security_checkout: "",
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
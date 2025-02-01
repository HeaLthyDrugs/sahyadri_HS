"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiCalendarLine,
  RiTimeLine,
  RiGroupLine,
  RiFilterLine,
  RiSearchLine,
  RiTableLine,
  RiGridLine,
  RiSortAsc,
  RiSortDesc,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDownloadLine,
  RiUploadLine,
  RiUserLine
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { format, addDays } from 'date-fns';
import { parse, unparse } from 'papaparse';

interface Program {
  id: string;
  program_number: number;
  name: string;
  customer_name: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  days: number;
  total_participants: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  created_at: string;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  handlePageChange: (page: number) => void;
}

function Pagination({ 
  currentPage, 
  totalPages, 
  itemsPerPage, 
  totalItems, 
  handlePageChange 
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <RiArrowLeftSLine className="h-5 w-5" />
            </button>
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => handlePageChange(index + 1)}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  currentPage === index + 1
                    ? 'z-10 bg-amber-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                }`}
              >
                {index + 1}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
            >
              <RiArrowRightSLine className="h-5 w-5" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

export function ProgramsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<Program | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    customer_name: "",
    start_date: "",
    start_time: "09:00",
    end_date: "",
    end_time: "17:00",
    total_participants: ""
  });
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Program['status'] | 'all'>('all');
  const [sortField, setSortField] = useState<'start_date' | 'name' | 'total_participants' | 'program_number'>('start_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [monthFilter, setMonthFilter] = useState<string>('all');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    }
  };

  const calculateDays = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatus = (startDate: string, endDate: string): Program['status'] => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now < start) return 'Upcoming';
    if (now > end) return 'Completed';
    return 'Ongoing';
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const days = calculateDays(formData.start_date, formData.end_date);
      const status = getStatus(formData.start_date, formData.end_date);

      const programData = {
        name: formData.name,
        customer_name: formData.customer_name,
        start_date: formData.start_date,
        start_time: formData.start_time,
        end_date: formData.end_date,
        end_time: formData.end_time,
        days,
        total_participants: parseInt(formData.total_participants),
        status
      };

      if (editingProgram) {
        const { error } = await supabase
          .from('programs')
          .update(programData)
          .eq('id', editingProgram.id);

        if (error) throw error;
        toast.success('Program updated successfully');
      } else {
        const { error } = await supabase
          .from('programs')
          .insert([programData]);

        if (error) throw error;
        toast.success('Program created successfully');
      }

      setFormData({
        name: "",
        customer_name: "",
        start_date: "",
        start_time: "09:00",
        end_date: "",
        end_time: "17:00",
        total_participants: ""
      });
      setEditingProgram(null);
      setIsModalOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error('Error saving program:', error);
      toast.error('Failed to save program');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Program deleted successfully');
      fetchPrograms();
      setIsDeleteModalOpen(false);
      setProgramToDelete(null);
    } catch (error) {
      console.error('Error deleting program:', error);
      toast.error('Failed to delete program');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: Program['status']) => {
    switch (status) {
      case 'Upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'Ongoing':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMonthOptions = () => {
    const months = new Set<string>();
    programs.forEach(program => {
      const startMonth = format(new Date(program.start_date), 'yyyy-MM');
      const endMonth = format(new Date(program.end_date), 'yyyy-MM');
      months.add(startMonth);
      if (startMonth !== endMonth) {
        months.add(endMonth);
      }
    });
    return Array.from(months).sort();
  };

  const filteredAndSortedPrograms = () => {
    return programs
      .filter(program => {
        const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || program.status === statusFilter;
        
        const matchesMonth = monthFilter === 'all' || (() => {
          const programStart = format(new Date(program.start_date), 'yyyy-MM');
          const programEnd = format(new Date(program.end_date), 'yyyy-MM');
          return programStart === monthFilter || programEnd === monthFilter;
        })();

        return matchesSearch && matchesStatus && matchesMonth;
      })
      .sort((a, b) => {
        if (sortField === 'start_date') {
          return sortDirection === 'asc' 
            ? new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
            : new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
        }
        if (sortField === 'total_participants') {
          return sortDirection === 'asc'
            ? a.total_participants - b.total_participants
            : b.total_participants - a.total_participants;
        }
        if (sortField === 'program_number') {
          return sortDirection === 'asc'
            ? (a.program_number || 0) - (b.program_number || 0)
            : (b.program_number || 0) - (a.program_number || 0);
        }
        return sortDirection === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      });
  };

  const paginatedPrograms = () => {
    const filtered = filteredAndSortedPrograms();
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredAndSortedPrograms().length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, monthFilter, sortField, sortDirection]);

  const handleExportCSV = () => {
    try {
      const exportData = filteredAndSortedPrograms().map(program => ({
        'Program No.': program.program_number || 0,
        Name: program.name,
        'Start Date': program.start_date,
        'Start Time': program.start_time,
        'End Date': program.end_date,
        'End Time': program.end_time,
        Days: program.days,
        'Total Participants': program.total_participants,
        Status: program.status
      }));

      let filename = 'programs';
      if (statusFilter !== 'all') filename += `_${statusFilter}`;
      if (monthFilter !== 'all') {
        const monthName = format(new Date(monthFilter), 'MMM-yyyy');
        filename += `_${monthName}`;
      }
      filename += '.csv';

      const csv = unparse(exportData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${exportData.length} programs`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export programs');
    }
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    parse(file, {
      header: true,
      complete: async (results) => {
        try {
          setIsLoading(true);
          const importData = results.data.map((row: any) => {
            const startDate = row['Start Date'];
            const endDate = row['End Date'];
            const days = calculateDays(startDate, endDate);
            const status = getStatus(startDate, endDate);

            return {
              name: row.Name,
              start_date: startDate,
              start_time: row['Start Time'],
              end_date: endDate,
              end_time: row['End Time'],
              days,
              total_participants: parseInt(row['Total Participants']),
              status
            };
          }).filter(item => 
            item.name && 
            item.start_date && 
            item.start_time && 
            item.end_date && 
            item.end_time && 
            !isNaN(item.total_participants)
          );

          if (importData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          const { error } = await supabase
            .from('programs')
            .insert(importData);

          if (error) throw error;

          toast.success(`Successfully imported ${importData.length} programs`);
          fetchPrograms();
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast.error('Failed to import programs');
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

  return (
    <div>
      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-sm font-light text-gray-500">Manage Programs</h1>
          <div className="flex flex-wrap items-center gap-2">
            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-sm"
            >
              <RiUploadLine className="w-4 h-4" />
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
                <RiDownloadLine className="w-4 h-4" />
                Import
              </label>
            </div>

            {/* Add Program Button */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors ml-2 text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Add Program
            </button>
          </div>
        </div>

        {/* Filters Section - Make it more responsive */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search - Full width on mobile */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
            <RiSearchLine className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:ring-0 text-sm"
            />
          </div>

          {/* View Toggle - Stack on mobile */}
          <div className="flex items-center bg-white rounded-lg shadow order-first sm:order-none">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${
                viewMode === 'table'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <RiTableLine className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <RiGridLine className="w-5 h-5" />
            </button>
          </div>

          {/* Status Filter - Full width on mobile */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <RiFilterLine className="text-gray-500 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Program['status'] | 'all')}
              className="text-sm border-none focus:ring-0 w-full"
            >
              <option value="all">All Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Month Filter - Full width on mobile */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <RiCalendarLine className="text-gray-500 flex-shrink-0" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="text-sm border-none focus:ring-0 w-full"
            >
              <option value="all">All Months</option>
              {getMonthOptions().map(month => (
                <option key={month} value={month}>
                  {format(new Date(month), 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Options - Full width on mobile */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as typeof sortField)}
              className="text-sm border-none focus:ring-0 w-full"
            >
              <option value="start_date">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="total_participants">Sort by Participants</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="text-gray-500 hover:text-amber-600 flex-shrink-0"
            >
              {sortDirection === 'asc' ? (
                <RiSortAsc className="w-5 h-5" />
              ) : (
                <RiSortDesc className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Clear Filters */}
          {(searchQuery || statusFilter !== 'all' || monthFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setMonthFilter('all');
              }}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <RiCloseLine className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        // Existing Grid View with pagination
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPrograms().map((program) => (
              <div key={program.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">
                      {program.program_number || 0}
                    </div>
                    <h3 className="font-medium text-gray-900">{program.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getStatusColor(program.status)}`}>
                      {program.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingProgram(program);
                        setFormData({
                          name: program.name,
                          customer_name: program.customer_name,
                          start_date: program.start_date,
                          start_time: program.start_time,
                          end_date: program.end_date,
                          end_time: program.end_time,
                          total_participants: program.total_participants.toString()
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-amber-600 hover:text-amber-900"
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => {
                        setProgramToDelete(program);
                        setIsDeleteModalOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <RiDeleteBinLine className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <RiUserLine className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-500">Customer:</span>
                    <span className="ml-auto font-medium">{program.customer_name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <RiCalendarLine className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-500">Program:</span>
                    <span className="ml-auto font-medium">{program.name}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <RiTimeLine className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-500">Time:</span>
                    <span className="ml-auto font-medium">
                      {formatTime(program.start_time)} - {formatTime(program.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <RiCalendarLine className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-auto font-medium">{program.days} days</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <RiGroupLine className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-500">Participants:</span>
                    <span className="ml-auto font-medium">{program.total_participants}</span>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t">
                    {new Date(program.start_date).toLocaleDateString()} - {new Date(program.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAndSortedPrograms().length}
            handlePageChange={setCurrentPage}
          />
        </>
      ) : (
        // New Table View
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-auto min-w-full divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-1/6 min-w-[10px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSortField('program_number');
                            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                          }}
                          className="text-gray-500 hover:text-amber-600 flex items-center gap-1"
                        >
                          No.
                          {sortField === 'program_number' && (
                            sortDirection === 'asc' ? (
                              <RiSortAsc className="w-4 h-4" />
                            ) : (
                              <RiSortDesc className="w-4 h-4" />
                            )
                          )}
                        </button>
                      </div>
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program Name
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participants
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-1/4 min-w-[200px] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedPrograms().map((program) => (
                    <tr key={program.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.program_number || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {program.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(program.start_date), 'MMM dd, yyyy')} - {format(new Date(program.end_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.days} days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTime(program.start_time)} - {formatTime(program.end_time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {program.total_participants}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(program.status)}`}>
                          {program.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setEditingProgram(program);
                            setFormData({
                              name: program.name,
                              customer_name: program.customer_name,
                              start_date: program.start_date,
                              start_time: program.start_time,
                              end_date: program.end_date,
                              end_time: program.end_time,
                              total_participants: program.total_participants.toString()
                            });
                            setIsModalOpen(true);
                          }}
                          className="text-amber-600 hover:text-amber-900 mr-4"
                        >
                          <RiEditLine className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setProgramToDelete(program);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
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
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredAndSortedPrograms().length}
            handlePageChange={setCurrentPage}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingProgram ? "Edit Program" : "Add New Program"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProgram(null);
                  setFormData({
                    name: "",
                    customer_name: "",
                    start_date: "",
                    start_time: "09:00",
                    end_date: "",
                    end_time: "17:00",
                    total_participants: ""
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
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Program Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Total Participants
                </label>
                <input
                  type="number"
                  value={formData.total_participants}
                  onChange={(e) => setFormData({ ...formData, total_participants: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                  min="1"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProgram(null);
                    setFormData({
                      name: "",
                      customer_name: "",
                      start_date: "",
                      start_time: "09:00",
                      end_date: "",
                      end_time: "17:00",
                      total_participants: ""
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
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && programToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Delete Program</h2>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProgramToDelete(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete the program "{programToDelete.name}"? This action cannot be undone.
              </p>
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-amber-700">
                      This will also delete all related:
                    </p>
                    <ul className="mt-2 text-sm text-amber-700 list-disc list-inside">
                      <li>Participants</li>
                      <li>Billing entries</li>
                      <li>Invoices</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setProgramToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(programToDelete.id)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? "Deleting..." : "Delete Program"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
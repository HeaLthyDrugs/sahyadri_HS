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
  end_date: string;
  days: number;
  total_participants: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  created_at: string;
  billing_month: string;
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
    end_date: "",
    total_participants: "",
    billing_month: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Program['status'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const entriesOptions = [10, 25, 50, 100];

  // Add this useEffect to ensure modal is closed when loading is complete
  useEffect(() => {
    if (!isLoading && isModalOpen) {
      // If we're not loading and the form was submitted (handleSubmit sets isLoading to true)
      // then we can safely close the modal
      const timer = setTimeout(() => {
        if (!isLoading) {
          setIsModalOpen(false);
          setEditingProgram(null);
          setFormData({
            name: "",
            customer_name: "",
            start_date: "",
            end_date: "",
            total_participants: "",
            billing_month: ""
          });
        }
      }, 500); // Small delay to ensure any success/error messages are seen
      
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Add a new useEffect hook for initialization
  useEffect(() => {
    // Initialize the component
    const initializeComponent = async () => {
      // First fetch programs
      await fetchPrograms();
      
      // Then check for and fix duplicate mappings
      await checkForDuplicateMappings();
    };
    
    initializeComponent();
  }, []);

  // Add this new function to fix programs without mappings
  const fixProgramsWithoutMappings = async (programsWithoutMappings: Program[]) => {
    if (!programsWithoutMappings || programsWithoutMappings.length === 0) return;
    
    console.log(`Attempting to fix ${programsWithoutMappings.length} programs without mappings`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const program of programsWithoutMappings) {
      try {
        // Check if mapping already exists (double-check)
        const hasMapping = await checkProgramMapping(program.id);
        
        if (hasMapping === true) {
          // Mapping exists, no need to create
          console.log(`Program ${program.id} already has a mapping`);
          continue;
        }
        
        if (hasMapping === null) {
          // Error checking, skip this program
          console.error(`Error checking mapping for program ${program.id}`);
          errorCount++;
          continue;
        }
        
        // Create mapping
        const billingMonth = calculateBillingMonth(program.end_date);
        const { error } = await supabase
          .from('program_month_mappings')
          .insert({
            program_id: program.id,
            billing_month: billingMonth
          });
        
        if (error) {
          if (error.code === '23505') { // Duplicate key error
            console.log(`Program ${program.id} already has a mapping (detected during insert)`);
          } else {
            console.error(`Error creating mapping for program ${program.id}:`, error);
            errorCount++;
          }
        } else {
          console.log(`Created mapping for program ${program.id} with billing month ${billingMonth}`);
          successCount++;
        }
      } catch (err) {
        console.error(`Error fixing mapping for program ${program.id}:`, err);
        errorCount++;
      }
    }
    
    console.log(`Fixed ${successCount} programs, ${errorCount} errors`);
    return { successCount, errorCount };
  };

  const fetchPrograms = async () => {
    try {
      // First, get all programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('*')
        .order('program_number', { ascending: true });

      if (programsError) {
        console.error('Error fetching programs:', programsError);
        toast.error('Failed to fetch programs');
        return;
      }
      
      if (!programsData || programsData.length === 0) {
        setPrograms([]);
        return;
      }

      // Then, get all program_month_mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('*');

      if (mappingsError) {
        console.error('Error fetching program mappings:', mappingsError);
        // Continue with programs but without mappings
        const transformedData = programsData.map(program => ({
          ...program,
          billing_month: calculateBillingMonth(program.end_date)
        }));
        
        setPrograms(transformedData);
        return;
      }

      // Create a mapping of program_id to billing_month for quick lookup
      const mappingsMap = (mappingsData || []).reduce((acc, mapping) => {
        acc[mapping.program_id] = mapping.billing_month;
        return acc;
      }, {} as Record<string, string>);
      
      // Transform the data to include billing_month directly in the program object
      const transformedData = programsData.map(program => {
        // Check if this program has a mapping
        const billingMonth = mappingsMap[program.id];
        
        // If not, calculate it based on end date
        const calculatedBillingMonth = billingMonth || calculateBillingMonth(program.end_date);
        
        return {
          ...program,
          billing_month: calculatedBillingMonth
        };
      });
      
      setPrograms(transformedData);
      
      // Check for programs without mappings and try to fix them
      const programsWithoutMappings = programsData.filter(program => !mappingsMap[program.id]);
      if (programsWithoutMappings.length > 0) {
        console.log(`Found ${programsWithoutMappings.length} programs without mappings:`, 
          programsWithoutMappings.map(p => ({ id: p.id, name: p.name })));
        
        // Try to fix programs without mappings
        fixProgramsWithoutMappings(programsWithoutMappings);
      }
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

  const calculateBillingMonth = (endDate: string): string => {
    const date = new Date(endDate);
    const day = date.getDate();
    
    // If end date is > 4th of the month, use that month
    // Otherwise, use the previous month
    if (day > 4) {
      return format(date, 'yyyy-MM');
    } else {
      // Go to previous month
      const prevMonth = new Date(date);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      return format(prevMonth, 'yyyy-MM');
    }
  };

  const formatBillingMonth = (billingMonth: string): string => {
    return format(new Date(billingMonth + '-01'), 'MMMM yyyy');
  };

  // Improve the checkProgramMapping function to be more reliable
  const checkProgramMapping = async (programId: string) => {
    try {
      // Use count instead of select to be more efficient
      const { count, error } = await supabase
        .from('program_month_mappings')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId);
      
      if (error) {
        console.error('Error checking program mapping:', error);
        return null;
      }
      
      return count && count > 0;
    } catch (error) {
      console.error('Error in checkProgramMapping:', error);
      return null; // Return null to indicate an error occurred
    }
  };

  // Update the handleSubmit function to better handle existing mappings
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.name.trim()) {
      toast.error('Program name is required');
      return;
    }
    
    if (!formData.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!formData.start_date) {
      toast.error('Start date is required');
      return;
    }
    
    if (!formData.end_date) {
      toast.error('End date is required');
      return;
    }
    
    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      toast.error('Start date cannot be after end date');
      return;
    }
    
    if (!formData.total_participants || parseInt(formData.total_participants) <= 0) {
      toast.error('Total participants must be greater than 0');
      return;
    }
    
    setIsLoading(true);

    try {
      const days = calculateDays(formData.start_date, formData.end_date);
      const status = getStatus(formData.start_date, formData.end_date);
      const defaultBillingMonth = calculateBillingMonth(formData.end_date);
      const finalBillingMonth = formData.billing_month || defaultBillingMonth;

      // Prepare program data without billing_month
      const programData = {
        name: formData.name,
        customer_name: formData.customer_name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days,
        total_participants: parseInt(formData.total_participants),
        status
      };

      let updatedProgram;

      if (editingProgram) {
        // Update program
        const { data: updated, error: programError } = await supabase
          .from('programs')
          .update(programData)
          .eq('id', editingProgram.id)
          .select()
          .single();

        if (programError) throw programError;
        updatedProgram = updated;

        // Check if mapping exists
        const hasMapping = await checkProgramMapping(editingProgram.id);
        
        if (hasMapping === true) {
          // Update existing mapping
          const { error: updateError } = await supabase
            .from('program_month_mappings')
            .update({ billing_month: finalBillingMonth })
            .eq('program_id', editingProgram.id);
          
          if (updateError) {
            console.error('Error updating program mapping:', updateError);
            toast.error('Program updated but billing month could not be updated');
          }
        } else if (hasMapping === false) {
          // Create new mapping
          const { error: insertError } = await supabase
            .from('program_month_mappings')
            .insert({ program_id: editingProgram.id, billing_month: finalBillingMonth });
          
          if (insertError) {
            console.error('Error creating program mapping:', insertError);
            toast.error('Program updated but billing month could not be set');
          }
        } else {
          // Error occurred during check
          toast.error('Program updated but there was an issue with the billing month');
        }
        
        toast.success('Program updated successfully');
      } else {
        // Insert new program
        const { data: newProgram, error: programError } = await supabase
          .from('programs')
          .insert([programData])
          .select()
          .single();

        if (programError) throw programError;
        if (!newProgram) throw new Error('Failed to create program');
        
        updatedProgram = newProgram;

        // First check if a mapping already exists (this should not happen for new programs, but just in case)
        const hasMapping = await checkProgramMapping(newProgram.id);
        
        if (hasMapping === true) {
          // Update existing mapping instead of creating a new one
          const { error: updateError } = await supabase
            .from('program_month_mappings')
            .update({ billing_month: finalBillingMonth })
            .eq('program_id', newProgram.id);
          
          if (updateError) {
            console.error('Error updating program mapping:', updateError);
            toast.error('Program created but billing month could not be updated');
          }
        } else if (hasMapping === false) {
          // Create new mapping
          const { error: insertError } = await supabase
            .from('program_month_mappings')
            .insert({
              program_id: newProgram.id,
              billing_month: finalBillingMonth
            });
          
          if (insertError) {
            console.error('Error creating program mapping:', insertError);
            toast.error('Program created but billing month could not be set');
          }
        } else {
          // Error occurred during check
          toast.error('Program created but there was an issue with the billing month');
        }

        toast.success('Program created successfully');
      }

      // Update local state with the new/updated program
      setPrograms(prevPrograms => {
        const newPrograms = editingProgram
          ? prevPrograms.map(p => p.id === editingProgram.id ? { ...updatedProgram, billing_month: finalBillingMonth } : p)
          : [...prevPrograms, { ...updatedProgram, billing_month: finalBillingMonth }];
        return newPrograms;
      });

      // Reset form and close modal
      setFormData({
        name: "",
        customer_name: "",
        start_date: "",
        end_date: "",
        total_participants: "",
        billing_month: ""
      });
      setEditingProgram(null);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error saving program:', error);
      let errorMessage = 'Failed to save program';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Delete the program (this will cascade to delete the mapping due to the foreign key constraint)
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting program:', error);
        throw error;
      }

      // Check if this was the last program
      const { data: remainingPrograms, error: countError } = await supabase
        .from('programs')
        .select('id');

      if (countError) {
        console.error('Error checking remaining programs:', countError);
        throw countError;
      }

      // If no programs left, reset the sequence
      if (remainingPrograms.length === 0) {
        const { error: resetError } = await supabase.rpc('reset_program_number_sequence');
        if (resetError) {
          console.error('Error resetting program number sequence:', resetError);
          throw resetError;
        }
      }

      // Update local state
      setPrograms(prevPrograms => prevPrograms.filter(program => program.id !== id));
      
      toast.success('Program deleted successfully');
      setIsDeleteModalOpen(false);
      setProgramToDelete(null);
    } catch (error: any) {
      console.error('Error in handleDelete:', error);
      let errorMessage = 'Failed to delete program';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
  }, [searchQuery, statusFilter, monthFilter]);

  const handleExportCSV = () => {
    try {
      const exportData = filteredAndSortedPrograms().map(program => ({
        'Program No.': program.program_number || 0,
        Name: program.name,
        'Start Date': program.start_date,
        'End Date': program.end_date,
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

  // Update the handleImportCSV function to better handle existing mappings
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
              customer_name: row.Customer || '',
              start_date: startDate,
              end_date: endDate,
              days,
              total_participants: parseInt(row['Total Participants']),
              status
            };
          }).filter(item => 
            item.name && 
            item.start_date && 
            item.end_date && 
            !isNaN(item.total_participants)
          );

          if (importData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          // Insert programs and get the inserted records
          const { data: newPrograms, error } = await supabase
            .from('programs')
            .insert(importData)
            .select();

          if (error) throw error;
          if (!newPrograms || newPrograms.length === 0) throw new Error('Failed to create programs');

          // Process each program individually to handle potential errors better
          let successCount = 0;
          let mappingErrorCount = 0;

          for (const program of newPrograms) {
            try {
              // Check if mapping already exists
              const hasMapping = await checkProgramMapping(program.id);
              const billingMonth = calculateBillingMonth(program.end_date);
              
              if (hasMapping === true) {
                // Update existing mapping
                const { error: updateError } = await supabase
                  .from('program_month_mappings')
                  .update({ billing_month: billingMonth })
                  .eq('program_id', program.id);
                
                if (updateError) {
                  console.error(`Error updating mapping for program ${program.id}:`, updateError);
                  mappingErrorCount++;
                } else {
                  successCount++;
                }
              } else if (hasMapping === false) {
                // Create new mapping
                const { error: insertError } = await supabase
                  .from('program_month_mappings')
                  .insert({ 
                    program_id: program.id, 
                    billing_month: billingMonth 
                  });
                
                if (insertError) {
                  console.error(`Error creating mapping for program ${program.id}:`, insertError);
                  mappingErrorCount++;
                } else {
                  successCount++;
                }
              } else {
                // Error occurred during check
                console.error(`Error checking mapping for program ${program.id}`);
                mappingErrorCount++;
              }
            } catch (err) {
              console.error(`Error processing program ${program.id}:`, err);
              mappingErrorCount++;
            }
          }

          if (mappingErrorCount > 0) {
            toast.error(`${mappingErrorCount} program mappings could not be created/updated`);
          }

          toast.success(`Successfully imported ${newPrograms.length} programs (${successCount} with billing months)`);
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

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  // Add this new function to check for duplicate mappings
  const checkForDuplicateMappings = async () => {
    try {
      // Get all program_month_mappings
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('program_month_mappings')
        .select('*');

      if (mappingsError) {
        console.error('Error fetching program mappings:', mappingsError);
        return;
      }

      if (!mappingsData || mappingsData.length === 0) {
        console.log('No mappings found');
        return;
      }

      // Check for duplicate program_id values
      const programIdCounts: Record<string, number> = {};
      const duplicateProgramIds: string[] = [];

      mappingsData.forEach(mapping => {
        programIdCounts[mapping.program_id] = (programIdCounts[mapping.program_id] || 0) + 1;
        if (programIdCounts[mapping.program_id] > 1) {
          duplicateProgramIds.push(mapping.program_id);
        }
      });

      // Remove duplicates from the array
      const uniqueDuplicateProgramIds = [...new Set(duplicateProgramIds)];

      if (uniqueDuplicateProgramIds.length === 0) {
        console.log('No duplicate mappings found');
        return;
      }

      console.log(`Found ${uniqueDuplicateProgramIds.length} programs with duplicate mappings:`, uniqueDuplicateProgramIds);

      // For each program with duplicate mappings, keep only the most recent one
      for (const programId of uniqueDuplicateProgramIds) {
        // Get all mappings for this program
        const programMappings = mappingsData.filter(mapping => mapping.program_id === programId);
        
        // Sort by created_at in descending order (most recent first)
        programMappings.sort((a, b) => {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        // Keep the most recent one and delete the rest
        const [mostRecent, ...duplicates] = programMappings;
        
        console.log(`For program ${programId}, keeping mapping ${mostRecent.id} and deleting ${duplicates.length} duplicates`);
        
        // Delete duplicates
        for (const duplicate of duplicates) {
          const { error } = await supabase
            .from('program_month_mappings')
            .delete()
            .eq('id', duplicate.id);
          
          if (error) {
            console.error(`Error deleting duplicate mapping ${duplicate.id}:`, error);
          } else {
            console.log(`Deleted duplicate mapping ${duplicate.id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for duplicate mappings:', error);
    }
  };

  return (
    <div>
      {/* Header with Search and Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-end">
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

        {/* Filters Section */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
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

          {/* Month Filter */}
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

      {/* Search and Entries Row */}
      <div className="flex justify-between items-center mb-4">
        {/* Search */}
        <div className="relative w-[300px]">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs..."
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

      {/* Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto min-w-full divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-[100px] min-w-[80px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
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
                <th className="w-1/4 min-w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="w-1/4 min-w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Billing Month
                </th>
                <th className="w-1/4 min-w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-1/4 min-w-[120px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedPrograms().map((program, index) => (
                <tr key={program.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(currentPage - 1) * itemsPerPage + index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-wrap">
                    {program.customer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 text-wrap">
                      {program.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-wrap">
                    {format(new Date(program.start_date), 'MMM dd, yyyy')} - {format(new Date(program.end_date), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.days} days
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.total_participants}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {program.billing_month ? formatBillingMonth(program.billing_month) : '-'}
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
                          end_date: program.end_date,
                          total_participants: program.total_participants.toString(),
                          billing_month: program.billing_month
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
                    end_date: "",
                    total_participants: "",
                    billing_month: ""
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billing Month
                </label>
                <input
                  type="month"
                  value={formData.billing_month}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_month: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to automatically set based on end date
                </p>
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
                      end_date: "",
                      total_participants: "",
                      billing_month: ""
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
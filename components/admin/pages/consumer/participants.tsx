"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiFilterLine,
  RiSearchLine,
  RiDownloadLine,
  RiUploadLine,
  RiCalendarLine,
  RiUserLine,
  RiAlertLine
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { format, addDays } from 'date-fns';
import { parse, unparse } from 'papaparse';

type ParticipantType = 'Participant' | 'Admin' | 'Senior' | 'Junior' | 'Guest' | 'Staff';

interface Participant {
  id: string;
  name: string;
  type: ParticipantType;
  program_id: string;
  checkin_date: string;
  checkin_time: string;
  checkout_date: string;
  checkout_time: string;
  status: 'Active' | 'Checked Out' | 'No Show';
  notes?: string;
  created_at: string;
}

interface Program {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

const isInvalidDateRange = (
  checkinDate: string,
  checkinTime: string,
  checkoutDate: string,
  checkoutTime: string
): boolean => {
  if (!checkinDate || !checkinTime || !checkoutDate || !checkoutTime) return false;
  
  const checkin = new Date(`${checkinDate}T${checkinTime}`);
  const checkout = new Date(`${checkoutDate}T${checkoutTime}`);
  return checkout < checkin;
};

export function ParticipantsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Participant['status'] | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    program_id: "",
    checkin_date: "",
    checkin_time: "",
    checkout_date: "",
    checkout_time: "",
    status: "Active" as Participant['status'],
    notes: ""
  });

  useEffect(() => {
    fetchParticipants();
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, start_date, end_date')
        .order('start_date', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error fetching programs:', error);
      toast.error('Failed to fetch programs');
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select(`
          *,
          programs:program_id (
            name,
            start_date,
            end_date
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipants(data || []);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to fetch participants');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isInvalidDateRange(
      formData.checkin_date,
      formData.checkin_time,
      formData.checkout_date,
      formData.checkout_time
    )) {
      toast.error('Check-out date/time cannot be before check-in date/time');
      return;
    }

    setIsLoading(true);

    try {
      const participantData = {
        name: formData.name,
        type: formData.type,
        program_id: formData.program_id,
        checkin_date: formData.checkin_date,
        checkin_time: formData.checkin_time,
        checkout_date: formData.checkout_date,
        checkout_time: formData.checkout_time,
        status: formData.status,
        notes: formData.notes
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

      setFormData({
        name: "",
        type: "",
        program_id: "",
        checkin_date: "",
        checkin_time: "",
        checkout_date: "",
        checkout_time: "",
        status: "Active",
        notes: ""
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
        toast.success('Participant deleted successfully');
        fetchParticipants();
      } catch (error) {
        console.error('Error deleting participant:', error);
        toast.error('Failed to delete participant');
      }
    }
  };

  const handleDeleteAll = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('participants')
        .delete()
        .not('id', 'is', null); // Deletes all records

      if (error) throw error;
      toast.success('All participants deleted successfully');
      fetchParticipants();
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
      const exportData = filteredParticipants.map(participant => ({
        Name: participant.name,
        Type: participant.type,
        Program: (participant as any).programs?.name || '',
        'Check-in Date': participant.checkin_date,
        'Check-in Time': participant.checkin_time,
        'Check-out Date': participant.checkout_date,
        'Check-out Time': participant.checkout_time,
        Status: participant.status,
        Notes: participant.notes || ''
      }));

      let filename = 'participants';
      if (programFilter !== 'all') {
        const programName = programs.find(p => p.id === programFilter)?.name;
        if (programName) filename += `_${programName}`;
      }
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

      toast.success(`Exported ${exportData.length} participants`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export participants');
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
          const importData = results.data.map((row: any) => ({
            name: row.Name,
            type: row.Type,
            program_id: programs.find(p => p.name === row.Program)?.id,
            checkin_date: row['Check-in Date'],
            checkin_time: row['Check-in Time'],
            checkout_date: row['Check-out Date'],
            checkout_time: row['Check-out Time'],
            status: row.Status || 'Active',
            notes: row.Notes
          })).filter(item => 
            item.name && 
            item.type && 
            item.program_id && 
            item.checkin_date && 
            item.checkin_time && 
            item.checkout_date && 
            item.checkout_time
          );

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

  const downloadTemplate = () => {
    const template = [
      {
        Name: 'Sample Participant',
        Type: 'Regular',
        Program: 'Program Name',
        'Check-in Date': format(new Date(), 'yyyy-MM-dd'),
        'Check-in Time': '09:00',
        'Check-out Date': format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        'Check-out Time': '17:00',
        Status: 'Active',
        Notes: 'Sample notes'
      }
    ];

    const csv = unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'participants_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter participants
  const filteredParticipants = participants.filter(participant => {
    const matchesSearch = participant.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProgram = programFilter === "all" || participant.program_id === programFilter;
    const matchesStatus = statusFilter === "all" || participant.status === statusFilter;
    
    const matchesMonth = monthFilter === "all" || (() => {
      const checkinMonth = format(new Date(participant.checkin_date), 'yyyy-MM');
      return checkinMonth === monthFilter;
    })();

    return matchesSearch && matchesProgram && matchesStatus && matchesMonth;
  });

  // Pagination
  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = filteredParticipants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

            {/* Template Download */}
            <button
              onClick={downloadTemplate}
              className="text-xs text-amber-600 hover:text-amber-700"
            >
              Download Template
            </button>

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
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto sm:flex-1 sm:max-w-md">
            <RiSearchLine className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:ring-0 text-sm"
            />
          </div>

          {/* Program Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <RiFilterLine className="text-gray-500 flex-shrink-0" />
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="text-sm border-none focus:ring-0 w-full"
            >
              <option value="all">All Programs</option>
              {programs.map(program => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
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
              {Array.from(new Set(participants.map(p => 
                format(new Date(p.checkin_date), 'yyyy-MM')
              ))).sort().map(month => (
                <option key={month} value={month}>
                  {format(new Date(month), 'MMMM yyyy')}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-auto">
            <RiUserLine className="text-gray-500 flex-shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Participant['status'] | 'all')}
              className="text-sm border-none focus:ring-0 w-full"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Checked Out">Checked Out</option>
              <option value="No Show">No Show</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(searchQuery || programFilter !== 'all' || monthFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setProgramFilter('all');
                setMonthFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <RiCloseLine className="w-4 h-4" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Participant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-in
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check-out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {participant.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {participant.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-amber-600">
                      {(participant as any).programs?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.checkin_date), 'MMM d, yyyy')}
                    <br />
                    {participant.checkin_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.checkout_date), 'MMM d, yyyy')}
                    <br />
                    {participant.checkout_time}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      participant.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : participant.status === 'Checked Out'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {participant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setEditingParticipant(participant);
                        setFormData({
                          name: participant.name,
                          type: participant.type,
                          program_id: participant.program_id,
                          checkin_date: participant.checkin_date,
                          checkin_time: participant.checkin_time,
                          checkout_date: participant.checkout_date,
                          checkout_time: participant.checkout_time,
                          status: participant.status,
                          notes: participant.notes || ""
                        });
                        setIsModalOpen(true);
                      }}
                      className="text-amber-600 hover:text-amber-900 mr-4"
                    >
                      <RiEditLine className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(participant.id)}
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

      {/* Pagination Component */}
      {/* ... Add your existing Pagination component here ... */}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingParticipant ? "Edit Participant" : "Add New Participant"}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingParticipant(null);
                  setFormData({
                    name: "",
                    type: "",
                    program_id: "",
                    checkin_date: "",
                    checkin_time: "",
                    checkout_date: "",
                    checkout_time: "",
                    status: "Active",
                    notes: ""
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
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ParticipantType })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a type</option>
                  <option value="Participant">Participant</option>
                  <option value="Admin">Admin</option>
                  <option value="Senior">Senior</option>
                  <option value="Junior">Junior</option>
                  <option value="Guest">Guest</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Program
                </label>
                <select
                  value={formData.program_id}
                  onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a program</option>
                  {programs.map((program) => (
                    <option key={program.id} value={program.id}>
                      {program.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in Date
                  </label>
                  <input
                    type="date"
                    value={formData.checkin_date}
                    onChange={(e) => setFormData({ ...formData, checkin_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={formData.checkin_time}
                    onChange={(e) => setFormData({ ...formData, checkin_time: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out Date
                  </label>
                  <input
                    type="date"
                    value={formData.checkout_date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, checkout_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={formData.checkout_time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, checkout_time: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as Participant['status'] })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="Active">Active</option>
                  <option value="Checked Out">Checked Out</option>
                  <option value="No Show">No Show</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                />
              </div>

              {isInvalidDateRange(
                formData.checkin_date,
                formData.checkin_time,
                formData.checkout_date,
                formData.checkout_time
              ) && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <RiAlertLine className="w-4 h-4" />
                  Check-out date/time cannot be before check-in date/time
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingParticipant(null);
                    setFormData({
                      name: "",
                      type: "",
                      program_id: "",
                      checkin_date: "",
                      checkin_time: "",
                      checkout_date: "",
                      checkout_time: "",
                      status: "Active",
                      notes: ""
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
    </div>
  );
}
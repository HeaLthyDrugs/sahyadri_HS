"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiDownloadLine,
  RiUploadLine,
  RiAlertLine
} from "react-icons/ri";
import { toast } from "react-hot-toast";
import { format } from 'date-fns';
import { parse, unparse } from 'papaparse';
import { supabase } from "@/lib/supabase";

interface Participant {
  id: string;
  attendee_name: string;
  security_checkin: string;
  reception_checkin: string;
  reception_checkout: string;
  security_checkout: string;
  created_at: string;
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
    security_checkin: "",
    reception_checkin: "",
    reception_checkout: "",
    security_checkout: "",
  });

  useEffect(() => {
    // Fetch participants from Supabase
    const fetchParticipants = async () => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching participants:', error);
        toast.error('Failed to fetch participants');
      } else {
        setParticipants(data || []);
      }
    };

    fetchParticipants();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const participantData = {
        id: String(Date.now()),
        attendee_name: formData.attendee_name,
        security_checkin: new Date(formData.security_checkin).toISOString(),
        reception_checkin: new Date(formData.reception_checkin).toISOString(),
        reception_checkout: new Date(formData.reception_checkout).toISOString(),
        security_checkout: new Date(formData.security_checkout).toISOString(),
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('participants')
        .insert([participantData]);

      if (error) throw error;

      setParticipants(prev => [...prev, participantData]);
      toast.success('Participant added successfully');

      setFormData({
        attendee_name: "",
        security_checkin: "",
        reception_checkin: "",
        reception_checkout: "",
        security_checkout: "",
      });
      setIsModalOpen(false);
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
      const { error } = await supabase
        .from('participants')
        .delete();

      if (error) throw error;

      setParticipants([]);
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
        'Security Check-In': format(new Date(participant.security_checkin), 'dd-M-yyyy HH:mm'),
        'Reception Check-In': format(new Date(participant.reception_checkin), 'dd-M-yyyy HH:mm'),
        'Reception Check-Out': format(new Date(participant.reception_checkout), 'dd-M-yyyy HH:mm'),
        'Security Check-Out': format(new Date(participant.security_checkout), 'dd-M-yyyy HH:mm')
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
            try {
              return {
                attendee_name: row['Attendee Name'],
                security_checkin: formatDate(row['Security Check-In']),
                reception_checkin: formatDate(row['Reception Check-In']),
                reception_checkout: formatDate(row['Reception Check-Out']),
                security_checkout: formatDate(row['Security Check-Out']),
              };
            } catch (error) {
              console.error('Error processing row:', row, error);
              return null;
            }
          }).filter((item): item is NonNullable<typeof item> => 
            item !== null && 
            item.attendee_name && 
            item.security_checkin &&
            item.reception_checkin &&
            item.reception_checkout &&
            item.security_checkout
          );

          if (importData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          const { error } = await supabase
            .from('participants')
            .insert(importData);

          if (error) throw error;

          toast.success(`Successfully imported ${importData.length} participants`);
          const { data: newParticipants } = await supabase
            .from('participants')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (newParticipants) {
            setParticipants(newParticipants);
          }
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
      // Remove any potential spaces around the date string
      dateString = dateString.trim();
      
      // Split the date and time parts
      const [datePart, timePart] = dateString.split(' ');
      
      // Split the date into components
      const [day, month, year] = datePart.split('-');
      
      // Ensure month has leading zero if needed
      const paddedMonth = month.length === 1 ? `0${month}` : month;
      
      // Ensure day has leading zero if needed
      const paddedDay = day.length === 1 ? `0${day}` : day;
      
      // Create the ISO formatted date string
      const isoDate = `${year}-${paddedMonth}-${paddedDay}T${timePart}`;
      
      // Validate the date by creating a new Date object
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date');
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
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attendee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security Check-In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reception Check-In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reception Check-Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Security Check-Out
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
                      {participant.attendee_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.security_checkin), 'dd-M-yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.reception_checkin), 'dd-M-yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.reception_checkout), 'dd-M-yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(participant.security_checkout), 'dd-M-yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
                  Security Check-In
                </label>
                <input
                  type="datetime-local"
                  value={formData.security_checkin}
                  onChange={(e) => setFormData({ ...formData, security_checkin: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
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
                  Security Check-Out
                </label>
                <input
                  type="datetime-local"
                  value={formData.security_checkout}
                  onChange={(e) => setFormData({ ...formData, security_checkout: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({
                      attendee_name: "",
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
                  {isLoading ? 'Saving...' : 'Add'}
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
  );
}
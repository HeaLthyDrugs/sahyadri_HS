"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiEditLine,
  RiFileTextLine,
  RiMessageLine,
  RiAlertLine,
  RiSearchLine
} from "react-icons/ri";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { toast } from "@/hooks/use-toast";
import { format } from 'date-fns';

interface StaffType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Staff {
  id: number;
  name: string;
  type_id: string;
  organisation: string;
  created_at: string;
  updated_at: string;
  comments?: StaffComment[];
  staff_type: StaffType;
}

interface StaffComment {
  id: number;
  staff_id: number;
  comment: string;
  created_at: string;
  created_by: string;
}

interface SupabaseStaffResponse {
  id: number;
  name: string;
  type_id: string;
  organisation: string;
  created_at: string;
  updated_at: string;
  staff_type: StaffType[];
  comments: StaffComment[];
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffTypes, setStaffTypes] = useState<StaffType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const entriesOptions = [10, 25, 50, 100];
  const [selectedType, setSelectedType] = useState<'all' | string>('all');
  const [newStaff, setNewStaff] = useState({
    name: "",
    type_id: "",
    organisation: "",
  });
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const supabase = createClientComponentClient();

  // Fetch staff types with proper error handling
  const fetchStaffTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_types')
        .select('*')
        .order('name');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        toast({
          title: "Warning",
          description: "No staff types found. Please add staff types first.",
          variant: "destructive",
        });
        return;
      }
      
      setStaffTypes(data);
      
      // If no type_id is selected and we have staff types, select the first one
      if (!newStaff.type_id && data.length > 0) {
        setNewStaff(prev => ({ ...prev, type_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching staff types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch staff types. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch staff with proper error handling and type checking
  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          staff_type:staff_types!inner(*),
          comments:staff_comments(*)
        `)
        .order("name");

      if (error) throw error;

      if (!data) {
        setStaff([]);
        return;
      }

      // Transform the response data to match our Staff interface
      const transformedData: Staff[] = data.map(item => ({
        ...item,
        staff_type: item.staff_type,
        comments: item.comments || []
      }));

      setStaff(transformedData);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Modify useEffect to fetch staff types as well
  useEffect(() => {
    fetchStaffTypes();
    fetchStaff();
  }, []);

  // Update the getTypeCount function
  const getTypeCount = (typeId: string) => {
    return staff.filter(s => s.type_id === typeId).length;
  };

  // Add/Update staff with proper validation
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newStaff.name.trim() || !newStaff.type_id || !newStaff.organisation.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedStaff) {
        // Update existing staff
        const { data, error } = await supabase
          .from("staff")
          .update({
            name: newStaff.name.trim(),
            type_id: newStaff.type_id,
            organisation: newStaff.organisation.trim(),
          })
          .eq('id', selectedStaff.id)
          .select(`
            *,
            staff_type:staff_types!inner(*)
          `)
          .single();

        if (error) throw error;

        setStaff((prev) => prev.map(s => 
          s.id === selectedStaff.id ? data : s
        ));
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        // Add new staff
        const { data, error } = await supabase
          .from("staff")
          .insert([{
            name: newStaff.name.trim(),
            type_id: newStaff.type_id,
            organisation: newStaff.organisation.trim(),
          }])
          .select(`
            *,
            staff_type:staff_types!inner(*)
          `)
          .single();

        if (error) throw error;

        setStaff((prev) => [...prev, data]);
        toast({
          title: "Success",
          description: "Staff member added successfully",
        });
      }

      setIsAddingStaff(false);
      setSelectedStaff(null);
      setNewStaff({ 
        name: "", 
        type_id: staffTypes[0]?.id || "",
        organisation: "" 
      });
    } catch (error: any) {
      console.error("Error saving staff:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save staff member",
        variant: "destructive",
      });
    }
  };

  // Add comment to staff member
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newComment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: commentData, error: commentError } = await supabase
        .from("staff_comments")
        .insert([
          {
            staff_id: selectedStaff.id,
            comment: newComment.trim(),
          },
        ])
        .select(`
          id,
          staff_id,
          comment,
          created_at,
          created_by
        `)
        .single();

      if (commentError) throw commentError;

      if (!commentData) {
        throw new Error("No data returned from comment insertion");
      }

      setStaff((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id
            ? {
                ...s,
                comments: [...(s.comments || []), commentData],
              }
            : s
        )
      );
      
      setNewComment("");
      setIsCommentModalOpen(false);
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    
    try {
      setIsLoading(true);
      
      // First delete all comments associated with this staff member
      const { error: commentsError } = await supabase
        .from('staff_comments')
        .delete()
        .eq('staff_id', staffToDelete.id);

      if (commentsError) throw commentsError;

      // Then delete all billing entries associated with this staff member
      const { error: billingError } = await supabase
        .from('staff_billing_entries')
        .delete()
        .eq('staff_id', staffToDelete.id);

      if (billingError) throw billingError;

      // Finally delete the staff member
      const { error: staffError } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete.id);

      if (staffError) throw staffError;

      toast({
        title: "Success",
        description: "Staff member and all associated data deleted successfully",
      });
      setStaff(prev => prev.filter(s => s.id !== staffToDelete.id));
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member and associated data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!selectedStaff) return;

    // Optimistically update both staff and selectedStaff states
    const updatedComments = selectedStaff.comments?.filter((c) => c.id !== commentId) || [];
    
    setSelectedStaff(prev => prev ? { ...prev, comments: updatedComments } : null);
    setStaff((prev) =>
      prev.map((s) =>
        s.id === selectedStaff.id
          ? {
              ...s,
              comments: updatedComments,
            }
          : s
      )
    );

    try {
      const { error } = await supabase
        .from("staff_comments")
        .delete()
        .eq('id', commentId);

      if (error) {
        // Revert changes if deletion fails
        throw error;
      }

      toast({
        title: "Success",
        description: "Comment deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      // Revert the optimistic update for both states
      const originalStaff = staff.find(s => s.id === selectedStaff.id);
      if (originalStaff) {
        setSelectedStaff(originalStaff);
        setStaff((prev) =>
          prev.map(s =>
            s.id === selectedStaff.id
              ? originalStaff
              : s
          )
        );
      }
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  // Filter and pagination logic
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.organisation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || member.type_id === selectedType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button
            onClick={() => setIsAddingStaff(true)}
            className="flex items-center gap-2 bg-amber-600 text-white hover:bg-amber-700"
          >
            <RiAddLine className="w-4 h-4" />
            Add Staff Member
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-64">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full border-none focus:ring-0 text-sm"
            >
              <option value="all">All Types ({staff.length})</option>
              {staffTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} ({getTypeCount(type.id)})
                </option>
              ))}
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
            placeholder="Search staff..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // Reset to first page when searching
            }}
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

      {/* Staff Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RiFileTextLine className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No staff members found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[80px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </TableHead>
                    <TableHead className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </TableHead>
                    <TableHead className="w-1/6 min-w-[150px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="w-1/4 min-w-[200px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organisation
                    </TableHead>
                    <TableHead className="w-[120px] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Comments
                    </TableHead>
                    <TableHead className="w-[100px] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200">
                  {paginatedStaff.map((member, index) => (
                    <TableRow 
                      key={member.id} 
                      className="hover:bg-gray-50"
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {member.staff_type?.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </span>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.organisation}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 h-8"
                          onClick={() => {
                            setSelectedStaff(member);
                            setIsCommentModalOpen(true);
                          }}
                        >
                          <RiMessageLine className="w-4 h-4" />
                          <span>{member.comments?.length || 0}</span>
                        </Button>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedStaff(member);
                              setNewStaff({
                                name: member.name,
                                type_id: member.type_id,
                                organisation: member.organisation,
                              });
                              setIsAddingStaff(true);
                            }}
                          >
                            <RiEditLine className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setStaffToDelete(member);
                              setIsDeleteModalOpen(true);
                            }}
                          >
                            <RiDeleteBinLine className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
              {paginatedStaff.map((member) => (
                <div key={member.id} className="p-4 border-b">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-500">{member.organisation}</p>
                    </div>
                    <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                      {member.staff_type?.name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      onClick={() => {
                        setSelectedStaff(member);
                        setIsCommentModalOpen(true);
                      }}
                    >
                      <RiMessageLine className="w-4 h-4" />
                      {member.comments?.length || 0} Comments
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setSelectedStaff(member);
                          setNewStaff({
                            name: member.name,
                            type_id: member.type_id,
                            organisation: member.organisation,
                          });
                          setIsAddingStaff(true);
                        }}
                      >
                        <RiEditLine className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setStaffToDelete(member);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Update the pagination section */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-lg shadow px-4 py-3 gap-4">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length} entries
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Page {currentPage} of {totalPages}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddingStaff && (
        <Dialog open={isAddingStaff} onOpenChange={(open) => {
          if (!open) {
            setIsAddingStaff(false);
            setSelectedStaff(null);
            setNewStaff({
              name: "",
              type_id: staffTypes[0]?.id || "",
              organisation: "",
            });
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={newStaff.name}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, name: e.target.value })
                  }
                  placeholder="Enter staff name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={newStaff.type_id}
                  onValueChange={(value) =>
                    setNewStaff({ ...newStaff, type_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff type" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffTypes.length === 0 ? (
                      <SelectItem value="" disabled>
                        No staff types available
                      </SelectItem>
                    ) : (
                      staffTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation *</Label>
                <Input
                  id="organisation"
                  value={newStaff.organisation}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, organisation: e.target.value })
                  }
                  placeholder="Enter organisation"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddingStaff(false);
                    setSelectedStaff(null);
                    setNewStaff({
                      name: "",
                      type_id: staffTypes[0]?.id || "",
                      organisation: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-amber-600 hover:bg-amber-700"
                  disabled={staffTypes.length === 0}
                >
                  {selectedStaff ? 'Update Staff' : 'Add Staff'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Comments Modal */}
      {isCommentModalOpen && selectedStaff && (
        <Dialog open={isCommentModalOpen} onOpenChange={setIsCommentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Comments for {selectedStaff.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {selectedStaff.comments?.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 rounded-lg relative group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-sm">{comment.comment}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(comment.created_at), 'dd MMM yyyy, h:mm a')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <RiDeleteBinLine className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!selectedStaff.comments || selectedStaff.comments.length === 0) && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No comments yet
                  </p>
                )}
              </div>
              <form onSubmit={handleAddComment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Add Comment</Label>
                  <Input
                    id="comment"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Enter your comment"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCommentModalOpen(false);
                      setNewComment("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                    Add Comment
                  </Button>
                </div>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && staffToDelete && (
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RiAlertLine className="w-5 h-5 text-red-600" />
                Delete Staff Member
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-500">
                Are you sure you want to delete <span className="font-medium">{staffToDelete.name}</span>?
              </p>
              <p className="text-sm text-red-600">
                This action cannot be undone. All associated comments will also be deleted.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setStaffToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
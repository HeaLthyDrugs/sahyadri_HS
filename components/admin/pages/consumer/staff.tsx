"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiEditLine,
  RiFileTextLine,
  RiMessageLine,
  RiAlertLine
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

interface Staff {
  id: number;
  name: string;
  type: "full_time" | "part_time" | "contractor" | "volunteer";
  organisation: string;
  created_at: string;
  updated_at: string;
  comments?: StaffComment[];
}

interface StaffComment {
  id: number;
  staff_id: number;
  comment: string;
  created_at: string;
  created_by: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedType, setSelectedType] = useState<'all' | Staff['type']>('all');
  const [newStaff, setNewStaff] = useState({
    name: "",
    type: "full_time" as "full_time" | "part_time" | "contractor" | "volunteer",
    organisation: "",
  });
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

  const supabase = createClientComponentClient();

  // Fetch staff data
  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from("staff")
        .select(`
          *,
          comments:staff_comments(
            id,
            comment,
            created_at,
            created_by
          )
        `)
        .order("name");

      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error("Error fetching staff:", error);
      toast({
        title: "Error",
        description: "Failed to fetch staff data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add new staff member
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from("staff")
        .insert([newStaff])
        .select()
        .single();

      if (error) throw error;

      setStaff((prev) => [...prev, { ...data, comments: [] }]);
      setIsAddingStaff(false);
      setNewStaff({ name: "", type: "full_time", organisation: "" });
      toast({
        title: "Success",
        description: "Staff member added successfully",
      });
    } catch (error) {
      console.error("Error adding staff:", error);
      toast({
        title: "Error",
        description: "Failed to add staff member",
        variant: "destructive",
      });
    }
  };

  // Add comment to staff member
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    try {
      const { data, error } = await supabase
        .from("staff_comments")
        .insert([
          {
            staff_id: selectedStaff.id,
            comment: newComment,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setStaff((prev) =>
        prev.map((s) =>
          s.id === selectedStaff.id
            ? {
                ...s,
                comments: [...(s.comments || []), data],
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
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member deleted successfully",
      });
      setStaff(prev => prev.filter(s => s.id !== staffToDelete.id));
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast({
        title: "Error",
        description: "Failed to delete staff member",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchStaff();
  }, []);

  // Filter and pagination logic
  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.organisation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || member.type === selectedType;
    return matchesSearch && matchesType;
  });

  const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
  const paginatedStaff = filteredStaff.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get count by type
  const getTypeCount = (type: Staff['type']) => {
    return staff.filter(s => s.type === type).length;
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">Manage Staff</h1>
          <Button
            onClick={() => setIsAddingStaff(true)}
            className="flex items-center gap-2 bg-amber-600 text-white hover:bg-amber-700"
          >
            <RiAddLine className="w-4 h-4" />
            Add Staff Member
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-96">
            <input
              type="text"
              placeholder="Search staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-none focus:ring-0 text-sm"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2 w-full sm:w-64">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | Staff['type'])}
              className="w-full border-none focus:ring-0 text-sm"
            >
              <option value="all">All Types ({staff.length})</option>
              <option value="full_time">Full Time ({getTypeCount('full_time')})</option>
              <option value="part_time">Part Time ({getTypeCount('part_time')})</option>
              <option value="contractor">Contractor ({getTypeCount('contractor')})</option>
              <option value="volunteer">Volunteer ({getTypeCount('volunteer')})</option>
            </select>
          </div>
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
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium
                          ${member.type === 'full_time' ? 'bg-blue-100 text-blue-800' :
                            member.type === 'part_time' ? 'bg-green-100 text-green-800' :
                            member.type === 'contractor' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'}`}>
                          {member.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
                                type: member.type,
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
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium
                      ${member.type === 'full_time' ? 'bg-blue-100 text-blue-800' :
                        member.type === 'part_time' ? 'bg-green-100 text-green-800' :
                        member.type === 'contractor' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'}`}>
                      {member.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
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
                            type: member.type,
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredStaff.length)} of {filteredStaff.length} staff members
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isAddingStaff && (
        <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
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
                <Label htmlFor="type">Type</Label>
                <Select
                  value={newStaff.type}
                  onValueChange={(value: Staff['type']) =>
                    setNewStaff({ ...newStaff, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contractor">Contractor</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="organisation">Organisation</Label>
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
                      type: "full_time",
                      organisation: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                  {selectedStaff ? 'Update' : 'Add'} Staff
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
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <p className="text-sm">{comment.comment}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(comment.created_at), 'dd MMM yyyy, h:mm a')}
                    </p>
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
"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiEditLine,
  RiSearchLine,
  RiAlertLine,
  RiCheckLine,
  RiEyeLine,
  RiEyeOffLine,
} from "react-icons/ri";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface AuthUser {
  id: string;
  email: string;
}

interface ProfileData {
  id: string;
  full_name: string;
  roles: {
    id: string;
    name: string;
  };
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    password: "",
    role_id: "",
    is_active: true,
  });

  const fetchUsers = async () => {
    try {
      // Get profiles with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          roles (
            id,
            name
          ),
          is_active,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Profile fetch error:', profilesError);
        throw new Error('Failed to fetch profiles');
      }

      // Get emails from auth.users using the API endpoint
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (!response.ok) {
        console.error('Auth users fetch error:', data.error);
        throw new Error(data.error || 'Failed to fetch auth users');
      }

      if (!data.users) {
        console.error('No users data received');
        throw new Error('Invalid response format');
      }

      // Transform the data to match the User interface
      const transformedData: User[] = (profilesData || []).map(profile => {
        const authUser = data.users?.find((u: AuthUser) => u.id === profile.id);
        const profileWithRoles = profile as unknown as { 
          id: string; 
          full_name: string; 
          roles: { id: string; name: string; }[]; 
          is_active: boolean; 
          created_at: string; 
        };
        
        return {
          id: profileWithRoles.id,
          email: authUser?.email || '',
          full_name: profileWithRoles.full_name,
          role: {
            id: profileWithRoles.roles?.[0]?.id || '',
            name: profileWithRoles.roles?.[0]?.name || '',
          },
          is_active: profileWithRoles.is_active,
          created_at: profileWithRoles.created_at,
        };
      });

      setUsers(transformedData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch roles",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingUser) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            role_id: formData.role_id,
            is_active: formData.is_active,
          })
          .eq('id', editingUser.id);

        if (updateError) throw updateError;

        toast({
          title: "Success",
          description: "User updated successfully",
        });
      } else {
        // Create new user using admin API
        const response = await fetch('/api/admin/users/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role_id: formData.role_id,
            is_active: formData.is_active,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create user');
        }

        toast({
          title: "Success",
          description: "User created successfully",
        });
      }

      setFormData({
        email: "",
        full_name: "",
        password: "",
        role_id: "",
        is_active: true,
      });
      setEditingUser(null);
      setIsModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setIsLoading(true);
      
      // Delete user from Supabase Auth (this will cascade to profiles)
      const { error } = await supabase.auth.admin.deleteUser(userToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users Management</h2>
          <p className="text-muted-foreground">
            Create and manage users and their roles
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
        >
          <RiAddLine className="w-4 h-4" />
          Add New User
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-[300px]">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 rounded-lg border border-gray-300 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {[10, 25, 50, 100].map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span>entries</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <RiAlertLine className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No users found</p>
            <p className="text-sm mt-2">
              {searchQuery ? "No users match your search criteria" : "Start by adding your first user"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.role.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setFormData({
                            email: user.email,
                            full_name: user.full_name,
                            password: "",
                            role_id: user.role.id,
                            is_active: user.is_active,
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-amber-600 hover:text-amber-900"
                        title="Edit user"
                      >
                        <RiEditLine className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setUserToDelete(user);
                          setIsDeleteModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete user"
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

      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 bg-white rounded-lg shadow px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                  setFormData({
                    email: "",
                    full_name: "",
                    password: "",
                    role_id: "",
                    is_active: true,
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  placeholder="Enter email address"
                  required
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  placeholder="Enter full name"
                  required
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500 pr-10"
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                    >
                      {showPassword ? (
                        <RiEyeOffLine className="h-5 w-5" />
                      ) : (
                        <RiEyeLine className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                    setFormData({
                      email: "",
                      full_name: "",
                      password: "",
                      role_id: "",
                      is_active: true,
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
                  {isLoading ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <RiAlertLine className="w-6 h-6 text-red-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">
                Delete User
              </h2>
            </div>
            
            <p className="text-gray-500 mb-2">
              Are you sure you want to delete <span className="font-medium">{userToDelete.full_name}</span>?
            </p>
            
            <p className="text-red-600 text-sm mb-6">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
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
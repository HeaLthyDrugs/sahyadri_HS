"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiAlertLine,
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

interface InvoiceConfig {
  id: string;
  company_name: string;
  from_address: string[];
  bill_to_address: string[];
  address: string[];
  gstin: string;
  pan: string;
  footer_note: string;
  logo_url: string;
}

interface StaffType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const Config = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    id: '',
    company_name: '',
    from_address: [],
    bill_to_address: [],
    address: [],
    gstin: '',
    pan: '',
    footer_note: '',
    logo_url: ''
  });
  const [staffTypes, setStaffTypes] = useState<StaffType[]>([]);
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType | null>(null);
  const [newStaffType, setNewStaffType] = useState<Partial<StaffType>>({
    name: "",
    description: ""
  });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffTypeToDelete, setStaffTypeToDelete] = useState<StaffType | null>(null);

  useEffect(() => {
    fetchInvoiceConfig();
  }, []);

  useEffect(() => {
    fetchStaffTypes();
  }, []);

  const fetchInvoiceConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_config')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setInvoiceConfig({
          ...data,
          from_address: Array.isArray(data.from_address) 
            ? data.from_address 
            : (data.from_address as string)?.split('\n').filter(Boolean) || [],
          bill_to_address: Array.isArray(data.bill_to_address)
            ? data.bill_to_address
            : (data.bill_to_address as string)?.split('\n').filter(Boolean) || [],
          address: Array.isArray(data.address)
            ? data.address
            : typeof data.address === 'string' 
              ? data.address.split('\n').filter(Boolean) 
              : []
        });
      }
    } catch (error) {
      console.error('Error fetching invoice config:', error);
      toast.error('Failed to fetch invoice configuration');
    }
  };

  const fetchStaffTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_types')
        .select('*')
        .order('name');

      if (error) throw error;
      setStaffTypes(data || []);
    } catch (error) {
      console.error('Error fetching staff types:', error);
      toast.error('Failed to fetch staff types');
    }
  };

  const saveInvoiceConfig = async () => {
    try {
      setIsLoading(true);
      
      // Create a clean config object
      const cleanConfig = {
        ...invoiceConfig,
        // Ensure arrays are properly formatted
        from_address: Array.isArray(invoiceConfig.from_address) 
          ? invoiceConfig.from_address 
          : (invoiceConfig.from_address as string)?.split('\n').filter(Boolean) || [],
        bill_to_address: Array.isArray(invoiceConfig.bill_to_address)
          ? invoiceConfig.bill_to_address
          : (invoiceConfig.bill_to_address as string)?.split('\n').filter(Boolean) || [],
        address: Array.isArray(invoiceConfig.address)
          ? invoiceConfig.address
          : typeof invoiceConfig.address === 'string' 
            ? (invoiceConfig.address as string).split('\n').filter(Boolean) 
            : []
      };

      console.log('Saving config:', cleanConfig);

      const { error } = await supabase
        .from('invoice_config')
        .upsert([cleanConfig], {
          onConflict: 'id'
        });

      if (error) throw error;

      toast.success('Invoice configuration saved successfully');
      
      // Refresh the data
      await fetchInvoiceConfig();
    } catch (error) {
      console.error('Error saving invoice config:', error);
      toast.error('Failed to save invoice configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveStaffType = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (selectedStaffType) {
        // Update existing staff type
        const { error } = await supabase
          .from('staff_types')
          .update({
            name: newStaffType.name,
            description: newStaffType.description
          })
          .eq('id', selectedStaffType.id);

        if (error) throw error;
        toast.success("Staff type updated successfully");
      } else {
        // Add new staff type
        const { error } = await supabase
          .from('staff_types')
          .insert([newStaffType]);

        if (error) throw error;
        toast.success("Staff type added successfully");
      }

      setIsModalOpen(false);
      setSelectedStaffType(null);
      setNewStaffType({
        name: "",
        description: ""
      });
      fetchStaffTypes();
    } catch (error) {
      console.error('Error saving staff type:', error);
      toast.error("Failed to save staff type");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStaffType = async () => {
    if (!staffTypeToDelete) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('staff_types')
        .delete()
        .eq('id', staffTypeToDelete.id);

      if (error) throw error;

      toast.success("Staff type deleted successfully");
      setIsDeleteModalOpen(false);
      setStaffTypeToDelete(null);
      fetchStaffTypes();
    } catch (error) {
      console.error('Error deleting staff type:', error);
      toast.error("Failed to delete staff type");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="staff-types" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="staff-types">Staff Types</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
        </TabsList>

        {/* Staff Types Tab */}
        <TabsContent value="staff-types" className="mt-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Staff Types</h2>
                <p className="text-sm text-gray-500">Manage staff type configurations</p>
              </div>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
              >
                <RiAddLine className="w-4 h-4" />
                Add Staff Type
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              setSelectedStaffType(type);
                              setNewStaffType({
                                name: type.name,
                                description: type.description
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            <RiEditLine className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setStaffTypeToDelete(type);
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
          </div>
        </TabsContent>

        {/* Invoice Settings Tab */}
        <TabsContent value="invoice" className="mt-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Invoice Settings</h2>
                <p className="text-sm text-gray-500">Configure your invoice details</p>
              </div>
              <Button
                onClick={saveInvoiceConfig}
                disabled={isLoading}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <Input
                  value={invoiceConfig.company_name}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, company_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address (one line per entry)
                </label>
                <textarea
                  value={(invoiceConfig.address || []).join('\n')}
                  onChange={(e) => setInvoiceConfig({ 
                    ...invoiceConfig, 
                    address: e.target.value.split('\n') 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[100px]"
                  placeholder="Enter your company address here"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ship To Address (one line per entry)
                </label>
                <textarea
                  value={(invoiceConfig.from_address || []).join('\n')}
                  onChange={(e) => setInvoiceConfig({ 
                    ...invoiceConfig, 
                    from_address: e.target.value.split('\n') 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[100px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill To Address (one line per entry)
                </label>
                <textarea
                  value={(invoiceConfig.bill_to_address || []).join('\n')}
                  onChange={(e) => setInvoiceConfig({ 
                    ...invoiceConfig, 
                    bill_to_address: e.target.value.split('\n') 
                  })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GSTIN
                  </label>
                  <Input
                    value={invoiceConfig.gstin}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, gstin: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PAN
                  </label>
                  <Input
                    value={invoiceConfig.pan}
                    onChange={(e) => setInvoiceConfig({ ...invoiceConfig, pan: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Footer Note
                </label>
                <Input
                  value={invoiceConfig.footer_note}
                  onChange={(e) => setInvoiceConfig({ ...invoiceConfig, footer_note: e.target.value })}
                  placeholder="e.g., This is a computer-generated invoice"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Staff Type Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStaffType ? 'Edit Staff Type' : 'Add New Staff Type'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveStaffType} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={newStaffType.name}
                onChange={(e) =>
                  setNewStaffType({ ...newStaffType, name: e.target.value })
                }
                placeholder="Enter type name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newStaffType.description}
                onChange={(e) =>
                  setNewStaffType({ ...newStaffType, description: e.target.value })
                }
                placeholder="Enter description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setSelectedStaffType(null);
                  setNewStaffType({
                    name: "",
                    description: ""
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700">
                {selectedStaffType ? 'Update' : 'Add'} Staff Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RiAlertLine className="w-5 h-5 text-red-600" />
              Delete Staff Type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-500">
              Are you sure you want to delete <span className="font-medium">{staffTypeToDelete?.name}</span>?
            </p>
            <p className="text-sm text-red-600">
              This action cannot be undone. Staff members using this type will need to be reassigned.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setStaffTypeToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteStaffType}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Config;
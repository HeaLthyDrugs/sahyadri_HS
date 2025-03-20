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

type ParticipantType = 'participant' | 'guest' | 'other' | 'driver';

interface ProductRule {
  id: string;
  participant_type: ParticipantType;
  product_id: string;
  allowed: boolean;
}

interface Product {
  id: string;
  name: string;
  package_id: string;
  rate: number;
  slot_start: string;
  slot_end: string;
  index: number;
  package?: {
    name: string;
    type: string;
  };
}

interface StaffType {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface NewStaffType {
  name: string;
  description: string;
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
  
  // New state variables for product rules
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedParticipantType, setSelectedParticipantType] = useState<ParticipantType | ''>('');
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [staffTypes, setStaffTypes] = useState<StaffType[]>([]);
  const [selectedStaffType, setSelectedStaffType] = useState<StaffType | null>(null);
  const [newStaffType, setNewStaffType] = useState<NewStaffType>({
    name: "",
    description: ""
  });
  const [staffTypeToDelete, setStaffTypeToDelete] = useState<StaffType | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const participantTypes: ParticipantType[] = ['participant', 'guest', 'driver', 'other'];

  useEffect(() => {
    fetchInvoiceConfig();
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          package_id,
          rate,
          slot_start,
          slot_end,
          index,
          packages:package_id (
            name,
            type
          )
        `)
        .eq('package_id', '3e46279d-c2ff-4bb6-ab0d-935e32ed7820')  // Filter by specific catering package ID
        .order('index');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchProductRules = async (type: ParticipantType) => {
    try {
      setIsLoading(true);
      
      // Clear any previous data first
      setSelectedProducts([]);
      setProductRules([]);
      
      const { data, error } = await supabase
        .from('product_rules')
        .select('*')
        .eq('participant_type', type);

      if (error) {
        console.error('Error fetching product rules:', error);
        throw error;
      }

      // Set the product rules
      setProductRules(data || []);
      
      // If we have existing rules, use them to determine allowed products
      if (data && data.length > 0) {
        // Extract the IDs of allowed products
        const allowedProductIds = data
          .filter(rule => rule.allowed)
          .map(rule => rule.product_id);
        
        setSelectedProducts(allowedProductIds);
      } else {
        // First-time setup: pre-select all products by default
        setSelectedProducts(products.map(p => p.id));
      }
    } catch (error) {
      console.error('Error fetching product rules:', error);
      toast.error('Failed to fetch product rules');
      // Reset states on error
      setSelectedProducts([]);
      setProductRules([]);
    } finally {
      setIsLoading(false);
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

  const handleSaveProductRules = async () => {
    if (!selectedParticipantType) {
      toast.error('Please select a participant type');
      return;
    }

    try {
      setIsLoading(true);

      // Create new rules objects from the current selection
      const newRules = products.map(product => ({
        participant_type: selectedParticipantType,
        product_id: product.id,
        allowed: selectedProducts.includes(product.id)
      }));

      // First, delete existing rules for this participant type
      const { error: deleteError } = await supabase
        .from('product_rules')
        .delete()
        .eq('participant_type', selectedParticipantType);

      if (deleteError) {
        console.error('Error deleting existing product rules:', deleteError);
        throw deleteError;
      }

      // Then insert the new set of rules
      if (newRules.length > 0) {
        const { error: insertError } = await supabase
          .from('product_rules')
          .insert(newRules);

        if (insertError) {
          console.error('Error inserting product rules:', insertError);
          throw insertError;
        }
      }

      // Update local state to reflect the changes without requiring a refetch
      const updatedRules = newRules.map(rule => ({
        id: '', // The ID will be generated by Supabase
        participant_type: rule.participant_type,
        product_id: rule.product_id,
        allowed: rule.allowed
      })) as ProductRule[];
      
      setProductRules(updatedRules);
      
      toast.success(`Product rules for ${selectedParticipantType} saved successfully`);
    } catch (error) {
      console.error('Error saving product rules:', error);
      toast.error('Failed to save product rules. Please try again.');
      
      // Refresh the rules in case of partial failure
      if (selectedParticipantType) {
        fetchProductRules(selectedParticipantType);
      }
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
          .insert([{
            name: newStaffType.name,
            description: newStaffType.description
          }]);

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
      <Tabs defaultValue="product-rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="product-rules">Product Rules</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Settings</TabsTrigger>
          <TabsTrigger value="staff-types">Staff Types</TabsTrigger>
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
              <RiAlertLine className="h-5 w-5 text-red-500" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p>Are you sure you want to delete the staff type &quot;{staffTypeToDelete?.name}&quot;?</p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
          </div>
          <DialogFooter className="flex justify-end gap-2">
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
              disabled={isLoading}
              onClick={handleDeleteStaffType}
            >
              {isLoading ? "Deleting..." : "Delete Staff Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Product Rules Tab */}
        <TabsContent value="product-rules" className="mt-0">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Product Rules</h2>
                <p className="text-sm text-gray-500">Configure which normal package products each participant type can consume</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Participant Type
                </label>
                <select
                  value={selectedParticipantType}
                  onChange={(e) => {
                    const type = e.target.value as ParticipantType;
                    // Clear selected products before loading new data
                    setSelectedProducts([]);
                    setProductRules([]);
                    setSelectedParticipantType(type);
                    if (type) {
                      fetchProductRules(type);
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:border-amber-500 focus:ring-amber-500"
                >
                  <option value="">Select a participant type</option>
                  {participantTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedParticipantType && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-4">Configure Allowed Products</h3>
                  
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8 border rounded-md">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 border-t-2 border-amber-600 border-solid rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm text-gray-500">Loading product rules...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[10%] text-center">Access</TableHead>
                            <TableHead className="w-[45%]">Product Name</TableHead>
                            <TableHead className="w-[15%] text-right">Rate</TableHead>
                            <TableHead className="w-[30%]">Time Slot</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                                No products found for the selected package
                              </TableCell>
                            </TableRow>
                          ) : (
                            products.map((product) => (
                              <TableRow key={product.id} className="border-b">
                                <TableCell className="text-center py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedProducts.includes(product.id)}
                                    onChange={() => {
                                      setSelectedProducts(prev =>
                                        prev.includes(product.id)
                                          ? prev.filter(id => id !== product.id)
                                          : [...prev, product.id]
                                      );
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                  />
                                </TableCell>
                                <TableCell className="py-3 font-medium">{product.name}</TableCell>
                                <TableCell className="py-3 text-right">₹{product.rate ? product.rate.toFixed(2) : '0.00'}</TableCell>
                                <TableCell className="py-3">
                                  {product.slot_start && product.slot_end ? (
                                    `${new Date('1970-01-01T' + product.slot_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} - ${new Date('1970-01-01T' + product.slot_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                  ) : 'No time slot'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={handleSaveProductRules}
                      disabled={isLoading}
                      className="bg-amber-600 hover:bg-amber-700"
                    >
                      {isLoading ? (
                        <span className="flex items-center">
                          <span className="w-4 h-4 mr-2 border-t-2 border-white border-solid rounded-full animate-spin"></span>
                          Saving...
                        </span>
                      ) : "Save Product Rules"}
                    </Button>
                  </div>
                </div>
              )}
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
    </div>
  );
};

export default Config;
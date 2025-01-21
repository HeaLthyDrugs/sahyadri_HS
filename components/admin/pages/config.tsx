"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiCloseLine,
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
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

interface ProductRule {
  [x: string]: any;
  id: string;
  package_id: string;
  product_id: string;
  allocation_type: 'per_day' | 'per_stay' | 'per_hour';
  quantity: number;
  created_at?: string;
  updated_at?: string;
}

interface Package {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
}

interface InvoiceConfig {
  id: string;
  company_name: string;
  from_address: string[];
  bill_to_address: string[];
  gstin: string;
  pan: string;
  footer_note: string;
  logo_url: string;
}

const Config = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [productRules, setProductRules] = useState<ProductRule[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPackage, setSelectedPackage] = useState("");
  const [ruleFormData, setRuleFormData] = useState<{
    product_id: string;
    allocation_type: 'per_day' | 'per_stay' | 'per_hour';
    quantity: number;
  }>({
    product_id: "",
    allocation_type: "per_day",
    quantity: 1
  });
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>({
    id: '',
    company_name: '',
    from_address: [],
    bill_to_address: [],
    gstin: '',
    pan: '',
    footer_note: '',
    logo_url: ''
  });

  useEffect(() => {
    fetchPackages();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      fetchProductRules(selectedPackage);
    }
  }, [selectedPackage]);

  useEffect(() => {
    fetchInvoiceConfig();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .order('name');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to fetch packages');
    }
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const fetchProductRules = async (packageId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_rules')
        .select(`
          *,
          products (
            name
          )
        `)
        .eq('package_id', packageId);

      if (error) throw error;
      setProductRules(data || []);
    } catch (error) {
      console.error('Error fetching product rules:', error);
      toast.error('Failed to fetch product rules');
    }
  };

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
            : (data.bill_to_address as string)?.split('\n').filter(Boolean) || []
        });
      }
    } catch (error) {
      console.error('Error fetching invoice config:', error);
      toast.error('Failed to fetch invoice configuration');
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
          : (invoiceConfig.bill_to_address as string)?.split('\n').filter(Boolean) || []
      };

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

  const saveProductRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ruleData = {
        package_id: selectedPackage,
        ...ruleFormData
      };

      const { error } = await supabase
        .from('product_rules')
        .insert([ruleData]);

      if (error) throw error;
      
      toast.success('Product rule saved successfully');
      fetchProductRules(selectedPackage);
      setRuleFormData({
        product_id: "",
        allocation_type: "per_day",
        quantity: 1
      });
    } catch (error) {
      console.error('Error saving product rule:', error);
      toast.error('Failed to save product rule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;

    if (window.confirm("Are you sure you want to delete this rule?")) {
      try {
        const { error } = await supabase
          .from('product_rules')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Rule deleted successfully');
        fetchProductRules(selectedPackage);
      } catch (error) {
        console.error('Error deleting rule:', error);
        toast.error('Failed to delete rule');
      }
    }
  };

  return (
    <div className="p-6">
      <Tabs defaultValue="product-rules">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-500">Manage system configurations</p>
          </div>
          <TabsList>
            <TabsTrigger value="product-rules">Product Rules</TabsTrigger>
            <TabsTrigger value="general">Invoice</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="product-rules">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Product Rules</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Package
              </label>
              <select
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value="">Choose a package</option>
                {packages.map(pkg => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPackage && (
              <>
                <form onSubmit={saveProductRule} className="mb-6 space-y-4 p-4 bg-amber-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-amber-800">Product</label>
                    <select
                      value={ruleFormData.product_id}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, product_id: e.target.value })}
                      className="w-full rounded-md border border-amber-200 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
                      required
                    >
                      <option value="">Select a product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-800">Allocation Type</label>
                    <select
                      value={ruleFormData.allocation_type}
                      onChange={(e) => setRuleFormData({ 
                        ...ruleFormData, 
                        allocation_type: e.target.value as 'per_day' | 'per_stay' | 'per_hour' 
                      })}
                      className="w-full rounded-md border border-amber-200 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
                      required
                    >
                      <option value="per_day">Per Day</option>
                      <option value="per_stay">Per Stay</option>
                      <option value="per_hour">Per Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-amber-800">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={ruleFormData.quantity}
                      onChange={(e) => setRuleFormData({ 
                        ...ruleFormData, 
                        quantity: parseInt(e.target.value) || 1 
                      })}
                      className="w-full rounded-md border border-amber-200 px-3 py-2 focus:border-amber-500 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="bg-amber-500 hover:bg-amber-600 text-white w-full"
                  >
                    {isLoading ? "Saving..." : "Add Rule"}
                  </Button>
                </form>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Rules</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-amber-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-amber-800 uppercase">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-amber-800 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-amber-50">
                          <td className="px-6 py-4">{rule.products.name}</td>
                          <td className="px-6 py-4 capitalize">
                            {rule.allocation_type.replace('_', ' ')}
                          </td>
                          <td className="px-6 py-4">{rule.quantity}</td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(rule.id)}
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
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="general">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium text-gray-900">Invoice Settings</h2>
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
                  From Address (one line per entry)
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

        <TabsContent value="notifications">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Config;
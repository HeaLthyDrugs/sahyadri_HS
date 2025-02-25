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
  address: string[];
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
    address: [],
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
    </div>
  );
};

export default Config;
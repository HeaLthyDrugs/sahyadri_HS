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

// Predefined color combinations for categories
const categoryColors = [
  { bg: '#FEF3C7', text: '#92400E' }, // Amber
  { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
  { bg: '#D1FAE5', text: '#065F46' }, // Green
  { bg: '#FCE7F3', text: '#9D174D' }, // Pink
  { bg: '#E5E7EB', text: '#1F2937' }, // Gray
];

interface Category {
  id: string;
  name: string;
  description?: string;
}

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
  category: string;
}

const Config = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
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

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPackages();
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedPackage) {
      fetchProductRules(selectedPackage);
    }
  }, [selectedPackage]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    }
  };

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
            name,
            category
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const categoryData = {
        name: formData.name,
        description: formData.description,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([categoryData]);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      setFormData({
        name: "",
        description: "",
      });
      setEditingCategory(null);
      setIsModalOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) return;

    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        // First check if category is used in any products
        const { data: products, error: checkError } = await supabase
          .from('products')
          .select('id')
          .eq('category', id)
          .limit(1);

        if (checkError) throw checkError;

        if (products && products.length > 0) {
          toast.error('Cannot delete this category as it is being used in products');
          return;
        }

        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.error('Failed to delete category');
      }
    }
  };

  // Get color combination based on index
  const getCategoryColor = (index: number) => {
    return categoryColors[index % categoryColors.length];
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

  return (
    <div className="p-6">
      <Tabs defaultValue="categories">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-gray-500">Manage system configurations</p>
          </div>
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="product-rules">Product Rules</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium text-gray-900">Product Categories</h2>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <RiAddLine className="w-4 h-4" />
                  Add Category
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category, index) => {
                      const colors = getCategoryColor(index);
                      return (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className="inline-flex px-2 py-1 text-sm rounded-full"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text
                              }}
                            >
                              {category.name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {category.description || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingCategory(category);
                                setFormData({
                                  name: category.name,
                                  description: category.description || "",
                                });
                                setIsModalOpen(true);
                              }}
                              className="text-amber-600 hover:text-amber-900 mr-4"
                            >
                              <RiEditLine className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <RiDeleteBinLine className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

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
                <form onSubmit={saveProductRule} className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product</label>
                    <select
                      value={ruleFormData.product_id}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, product_id: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
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
                    <label className="block text-sm font-medium text-gray-700">Allocation Type</label>
                    <select
                      value={ruleFormData.allocation_type}
                      onChange={(e) => setRuleFormData({ 
                        ...ruleFormData, 
                        allocation_type: e.target.value as 'per_day' | 'per_stay' | 'per_hour' 
                      })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    >
                      <option value="per_day">Per Day</option>
                      <option value="per_stay">Per Stay</option>
                      <option value="per_hour">Per Hour</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={ruleFormData.quantity}
                      onChange={(e) => setRuleFormData({ 
                        ...ruleFormData, 
                        quantity: parseInt(e.target.value) || 1 
                      })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                      required
                    />
                  </div>

                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Add Rule"}
                  </Button>
                </form>

                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Existing Rules</h3>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {productRules.map((rule) => (
                        <tr key={rule.id}>
                          <td className="px-6 py-4">{rule.products.name}</td>
                          <td className="px-6 py-4">{rule.allocation_type}</td>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">General Settings</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
            <p className="text-gray-500">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Category Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Add New Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <Input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCategory(null);
                  setFormData({
                    name: "",
                    description: "",
                  });
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Config;
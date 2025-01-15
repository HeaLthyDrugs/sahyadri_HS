"use client";

import { useState, useEffect } from "react";
import { 
  RiAddLine, 
  RiEditLine, 
  RiDeleteBinLine,
  RiCloseLine,
  RiFilterLine,
  RiTableLine,
  RiGridLine,
  RiDownloadLine,
  RiUploadLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiDeleteBin2Line,
  RiMoreLine,
  RiSearchLine
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { parse, unparse } from 'papaparse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  index: number;
  name: string;
  description: string;
  category: string;
  category_name?: string;
  package_id: string;
  rate: number;
  slot_start: string;
  slot_end: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

const categoryColors = [
  { bg: 'bg-amber-100 text-amber-800' },
  { bg: 'bg-blue-100 text-blue-800' },
  { bg: 'bg-green-100 text-green-800' },
  { bg: 'bg-purple-100 text-purple-800' },
  { bg: 'bg-pink-100 text-pink-800' },
];

const getCategoryColor = (index: number) => {
  return categoryColors[Math.abs(index) % categoryColors.length].bg;
};

const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const calculateHours = (start: string, end: string) => {
  if (!start || !end) return '';
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  let hours = endHours - startHours;
  let minutes = endMinutes - startMinutes;
  
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  }
  
  if (hours < 0) {
    hours += 24;
  }
  
  if (minutes === 0) {
    return `${hours}hr`;
  }
  return `${hours}hr ${minutes}min`;
};

export function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activePackage, setActivePackage] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    package_id: "",
    rate: "",
    slot_start: "00:00",
    slot_end: "12:00"
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch products and packages on component mount
  useEffect(() => {
    fetchProducts();
    fetchPackages();
    fetchCategories();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('packages')
        .select('id, name, type');

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
        .select(`
          *,
          packages:package_id (
            name,
            type
          ),
          categories:category (
            name
          )
        `)
        .order('index', { ascending: true });

      if (error) throw error;

      const productsWithIndex = (data || []).map((product, idx) => ({
        ...product,
        category_name: product.categories?.name,
        index: product.index || idx + 1
      }));

      setProducts(productsWithIndex);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get the next index if creating new product
      let nextIndex = 1;
      if (!editingProduct) {
        const { data: maxIndexProduct } = await supabase
          .from('products')
          .select('index')
          .order('index', { ascending: false })
          .limit(1);
        
        nextIndex = maxIndexProduct && maxIndexProduct[0]?.index 
          ? maxIndexProduct[0].index + 1 
          : 1;
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        package_id: formData.package_id,
        rate: parseFloat(formData.rate),
        slot_start: formData.slot_start,
        slot_end: formData.slot_end,
        index: editingProduct ? editingProduct.index : nextIndex
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) throw error;
        toast.success('Product created successfully');
      }

      setFormData({
        name: "",
        description: "",
        category: "",
        package_id: "",
        rate: "",
        slot_start: "00:00",
        slot_end: "12:00"
      });
      setEditingProduct(null);
      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      toast.error('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!id) {
      toast.error('Invalid product ID');
      return;
    }

    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        // First check if product is used in any billing entries
        const { data: billingEntries, error: checkError } = await supabase
          .from('billing_entries')
          .select('id')
          .eq('product_id', id)
          .limit(1);

        if (checkError) throw checkError;

        // If product is used in billing entries, prevent deletion
        if (billingEntries && billingEntries.length > 0) {
          toast.error('Cannot delete this product as it is being used in billing entries');
          return;
        }

        // If product is not used, proceed with deletion
        const { data, error } = await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .select();

        if (error) {
          console.error('Supabase delete error:', error);
          throw error;
        }

        if (!data || data.length === 0) {
          throw new Error('Product not found or already deleted');
        }

        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting product:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        const errorMessage = error.message || 'Failed to delete product';
        toast.error(errorMessage);
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const searchMatch = 
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.index.toString().includes(searchQuery);
    const categoryMatch = activeCategory === "all" || product.category === activeCategory;
    const packageMatch = activePackage === "all" || product.package_id === activePackage;
    return searchMatch && categoryMatch && packageMatch;
  });

  const handleExportCSV = () => {
    try {
      const exportData = filteredProducts.map(product => ({
        Name: product.name,
        Description: product.description,
        Category: product.category_name,
        Package: (product as any).packages?.name,
        Rate: product.rate,
        Slot_Start: product.slot_start,
        Slot_End: product.slot_end
      }));

      let filename = 'products';
      if (activeCategory !== 'all') {
        const categoryName = categories.find(c => c.id === activeCategory)?.name;
        if (categoryName) filename += `_${categoryName}`;
      }
      if (activePackage !== 'all') {
        const packageName = packages.find(p => p.id === activePackage)?.name;
        if (packageName) filename += `_${packageName}`;
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

      toast.success(`Exported ${exportData.length} products`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export products');
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

          const { data: maxIndexProduct } = await supabase
            .from('products')
            .select('index')
            .order('index', { ascending: false })
            .limit(1);
          
          let nextIndex = maxIndexProduct && maxIndexProduct[0]?.index 
            ? maxIndexProduct[0].index + 1 
            : 1;

          const importData = results.data.map((row: any, idx) => {
            // Find category ID by name
            const category = categories.find(c => c.name === row.Category);
            // Find package ID by name
            const pkg = packages.find(p => p.name === row.Package);

            return {
              name: row.Name,
              description: row.Description,
              category: category?.id, // Use category ID instead of name
              package_id: pkg?.id,
              rate: parseFloat(row.Rate),
              slot_start: row.Slot_Start,
              slot_end: row.Slot_End,
              index: nextIndex + idx
            };
          }).filter(item => 
            item.name && 
            item.category && 
            item.package_id && 
            !isNaN(item.rate)
          );

          if (importData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          const { error } = await supabase
            .from('products')
            .insert(importData);

          if (error) throw error;

          toast.success(`Successfully imported ${importData.length} products`);
          fetchProducts();
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast.error('Failed to import products');
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
        Name: 'Sample Product',
        Description: 'Product description',
        Category: 'Meals',
        Package: 'Package Name',
        Rate: '100'
      }
    ];

    const csv = unparse(template);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', 'products_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const paginatedProducts = () => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    return filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg shadow">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
              </span> of{' '}
              <span className="font-medium">{filteredProducts.length}</span> results
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <RiArrowLeftSLine className="h-5 w-5" />
              </button>
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => handlePageChange(index + 1)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === index + 1
                      ? 'z-10 bg-amber-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <RiArrowRightSLine className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  const handleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAllInPage = () => {
    const pageProducts = paginatedProducts();
    if (selectedProducts.length === pageProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(pageProducts.map(product => product.id));
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(product => product.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} products?`)) {
      try {
        // Check for billing entries for selected products
        const { data: billingEntries, error: checkError } = await supabase
          .from('billing_entries')
          .select('product_id')
          .in('product_id', selectedProducts);

        if (checkError) throw checkError;

        // Filter out products that have billing entries
        const productsWithBilling = new Set((billingEntries || []).map(entry => entry.product_id));
        const productsToDelete = selectedProducts.filter(id => !productsWithBilling.has(id));

        if (productsToDelete.length === 0) {
          toast.error('Selected products cannot be deleted as they are being used in billing entries');
          return;
        }

        // Delete the filtered products
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', productsToDelete);

        if (error) throw error;

        toast.success(`Successfully deleted ${productsToDelete.length} products`);
        if (productsWithBilling.size > 0) {
          toast(`${productsWithBilling.size} products were not deleted as they are being used in billing entries`, {
            icon: '⚠️'
          });
        }

        setSelectedProducts([]);
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting products:', error);
        toast.error(error.message || 'Failed to delete products');
      }
    }
  };

  // Add this useEffect to clear selections when filters change
  useEffect(() => {
    setSelectedProducts([]);
  }, [activeCategory, activePackage]);

  const DeleteDialog = () => (
    <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {productsToDelete.length} selected product(s)? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              handleBulkDelete();
              setIsDeleteDialogOpen(false);
            }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const SettingsDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <RiMoreLine className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={downloadTemplate}>
          Download Template
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setIsSelectMode(!isSelectMode)}>
          {isSelectMode ? 'Exit Select Mode' : 'Enter Select Mode'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Add this useEffect to reset slot times when adding a new product
  useEffect(() => {
    if (!editingProduct && !isModalOpen) {
      setFormData(prev => ({
        ...prev,
        slot_start: "00:00",
        slot_end: "12:00"
      }));
    }
  }, [isModalOpen, editingProduct]);

  // Update the modal close handler to include default times
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: "",
      description: "",
      category: "",
      package_id: "",
      rate: "",
      slot_start: "00:00",
      slot_end: "12:00"
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-sm font-light text-gray-500">Manage Products</h1>
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[300px]"
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-white rounded-lg shadow">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${
                viewMode === 'table'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <RiTableLine className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${
                viewMode === 'grid'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-gray-500 hover:text-amber-600'
              }`}
            >
              <RiGridLine className="w-5 h-5" />
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
            <RiFilterLine className="text-gray-500" />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="text-sm border-none focus:ring-0"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Package Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
            <RiFilterLine className="text-gray-500" />
            <select
              value={activePackage}
              onChange={(e) => setActivePackage(e.target.value)}
              className="text-sm border-none focus:ring-0"
            >
              <option value="all">All Packages</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} ({pkg.type})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Summary */}
          {(activeCategory !== "all" || activePackage !== "all") && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveCategory("all");
                  setActivePackage("all");
                }}
                className="text-xs text-amber-600 hover:text-amber-700"
              >
                Clear Filters
              </button>
              <span className="text-xs text-gray-400">
                ({filteredProducts.length} items)
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Export Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <RiDownloadLine className="w-5 h-5" />
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
                className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <RiUploadLine className="w-5 h-5" />
                Import
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedProducts.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <RiDeleteBin2Line className="w-5 h-5" />
                Delete Selected ({selectedProducts.length})
              </button>
            )}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RiAddLine className="w-5 h-5" />
            Add Product
          </button>

          {/* Settings Dropdown */}
          <SettingsDropdown />
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts().length > 0 ? (
              paginatedProducts().map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow relative">
                  {isSelectMode && (
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={() => handleSelectProduct(product.id)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{product.index}</div>
                      <h3 className="font-medium text-gray-900">{product.name}</h3>
                      <p className="text-sm text-gray-500">{product.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setFormData({
                            name: product.name,
                            description: product.description,
                            category: product.category,
                            package_id: product.package_id,
                            rate: product.rate.toString(),
                            slot_start: product.slot_start,
                            slot_end: product.slot_end
                          });
                          setIsModalOpen(true);
                        }}
                        className="text-amber-600 hover:text-amber-900"
                      >
                        <RiEditLine className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <RiDeleteBinLine className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Category:</span>
                      <span className={`font-medium px-2 py-1 rounded-full text-xs ${
                        getCategoryColor(categories.findIndex(cat => cat.id === product.category))
                      }`}>
                        {product.category_name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Package:</span>
                      <span className="font-medium text-amber-600">
                        {(product as any).packages?.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rate:</span>
                      <span className="font-medium">₹{product.rate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Slot Time:</span>
                      <div className="text-right">
                        <span className="font-medium">
                          {formatTime(product.slot_start)} - {formatTime(product.slot_end)}
                        </span>
                        <div className="text-xs text-gray-500">
                          ({calculateHours(product.slot_start, product.slot_end)})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No products found matching the selected filters
              </div>
            )}
          </div>
          <Pagination />
        </>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {isSelectMode && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={paginatedProducts().length > 0 && selectedProducts.length === paginatedProducts().length}
                          onChange={handleSelectAllInPage}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Package
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Slot Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedProducts().length > 0 ? (
                    paginatedProducts().map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        {isSelectMode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleSelectProduct(product.id)}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.index}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500">
                                {product.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getCategoryColor(categories.findIndex(cat => cat.id === product.category))
                          }`}>
                            {product.category_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-amber-600">
                            {(product as any).packages?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{product.rate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm text-gray-900">
                              {formatTime(product.slot_start)} - {formatTime(product.slot_end)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({calculateHours(product.slot_start, product.slot_end)})
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setFormData({
                                name: product.name,
                                description: product.description,
                                category: product.category,
                                package_id: product.package_id,
                                rate: product.rate.toString(),
                                slot_start: product.slot_start,
                                slot_end: product.slot_end
                              });
                              setIsModalOpen(true);
                            }}
                            className="text-amber-600 hover:text-amber-900 mr-4"
                          >
                            <RiEditLine className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <RiDeleteBinLine className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No products found matching the selected filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <RiCloseLine className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Package</label>
                <select
                  value={formData.package_id}
                  onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a package</option>
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rate (₹)</label>
                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Slot Start Time</label>
                <input
                  type="time"
                  value={formData.slot_start}
                  onChange={(e) => setFormData({ ...formData, slot_start: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Slot End Time</label>
                <input
                  type="time"
                  value={formData.slot_end}
                  onChange={(e) => setFormData({ ...formData, slot_end: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Delete Dialog */}
      <DeleteDialog />
    </div>
  );
} 
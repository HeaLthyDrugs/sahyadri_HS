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
import * as XLSX from 'xlsx';
import { PermissionGuard, EditGuard } from "@/components/PermissionGuard";
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
  serve_item_no: number | null;
  name: string;
  description: string;
  package_id: string;
  rate: number;
  slot_start: string;
  slot_end: string;
  quantity: string | null;
}

interface Package {
  id: string;
  name: string;
  type: string;
}

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
  const [activePackage, setActivePackage] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    package_id: "",
    rate: "",
    serve_item_no: "",
    slot_start: "00:00",
    slot_end: "12:00",
    quantity: ""
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const entriesOptions = [10, 25, 50, 100];
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productsToDelete, setProductsToDelete] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState({ show: false, current: 0, total: 0, status: '' });

  // Fetch products and packages on component mount
  useEffect(() => {
    fetchProducts();
    fetchPackages();
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
          )
        `)
        .order('serve_item_no', { ascending: true, nullsLast: true })
        .order('index', { ascending: true });

      if (error) throw error;

      const productsWithIndex = (data || []).map((product, idx) => ({
        ...product,
        index: product.index || idx + 1
      }));

      setProducts(productsWithIndex);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
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
        package_id: formData.package_id,
        rate: parseFloat(formData.rate),
        serve_item_no: formData.serve_item_no ? parseInt(formData.serve_item_no) : null,
        slot_start: formData.slot_start,
        slot_end: formData.slot_end,
        quantity: formData.quantity.trim() || null,
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
        package_id: "",
        rate: "",
        serve_item_no: "",
        slot_start: "00:00",
        slot_end: "12:00",
        quantity: ""
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

    if (window.confirm("Are you sure you want to delete this product? This will also delete all related billing entries.")) {
      try {
        setIsLoading(true);
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;

        toast.success('Product and related entries deleted successfully');
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting product:', error);
        toast.error(error.message || 'Failed to delete product');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const searchMatch = 
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.index.toString().includes(searchQuery);
    const packageMatch = activePackage === "all" || product.package_id === activePackage;
    return searchMatch && packageMatch;
  });

  const handleExport = () => {
    if (activePackage === 'all') {
      toast.error('Please select a specific package to export');
      return;
    }

    try {
      const exportData = filteredProducts.map((product, index) => ({
        'Serial No.': index + 1,
        'Serve Item No.': product.serve_item_no || '',
        'Product Name': product.name,
        'Product Description': product.description || '',
        'Quantity': product.quantity || '1',
        'Basic Rate': product.rate
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

      const packageName = packages.find(p => p.id === activePackage)?.name || 'products';
      const filename = `${packageName.replace(/\s+/g, '_')}_products.xlsx`;

      XLSX.writeFile(workbook, filename);
      toast.success(`Exported ${exportData.length} products from ${packageName}`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export products');
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (activePackage === 'all') {
      toast.error('Please select a specific package before importing');
      event.target.value = '';
      return;
    }

    event.target.value = '';
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      handleImportExcel(file);
    } else if (fileExtension === 'csv') {
      handleImportCSV(file);
    } else {
      toast.error('Please select a valid Excel (.xlsx, .xls) or CSV file');
    }
  };

  const handleImportExcel = async (file: File) => {
    try {
      setIsLoading(true);
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Skip header row and process data
      const rows = jsonData.slice(1) as any[][];
      
      // Get existing products for the selected package
      const { data: existingProducts } = await supabase
        .from('products')
        .select('id, name, index')
        .eq('package_id', activePackage);
      
      const { data: maxIndexProduct } = await supabase
        .from('products')
        .select('index')
        .order('index', { ascending: false })
        .limit(1);
      
      let nextIndex = maxIndexProduct && maxIndexProduct[0]?.index 
        ? maxIndexProduct[0].index + 1 
        : 1;

      const selectedPackageData = packages.find(p => p.id === activePackage);
      if (!selectedPackageData) {
        throw new Error('Selected package not found');
      }
      
      const processedData = rows.map((row, idx) => {
        if (!row || row.length < 6) return null;
        
        const productName = row[2]?.toString().trim() || '';
        if (!productName) return null;
        
        return {
          name: productName,
          description: row[3]?.toString().trim() || '',
          package_id: activePackage,
          rate: parseFloat(row[5]) || 0,
          serve_item_no: row[1] ? parseInt(row[1]) : null,
          quantity: row[4]?.toString().trim() || null,
          slot_start: "00:00",
          slot_end: "12:00",
          index: nextIndex + idx
        };
      }).filter(item => 
        item && 
        item.name && 
        item.package_id && 
        !isNaN(item.rate) && 
        item.rate > 0
      );

      if (processedData.length === 0) {
        throw new Error('No valid data found in Excel file');
      }

      let updatedCount = 0;
      let createdCount = 0;

      // Show progress
      setImportProgress({ show: true, current: 0, total: processedData.length, status: 'Processing products...' });

      // Process each product
      for (let i = 0; i < processedData.length; i++) {
        const productData = processedData[i];
        setImportProgress(prev => ({ ...prev, current: i + 1, status: `Processing: ${productData.name}` }));
        
        const existingProduct = existingProducts?.find(p => 
          p.name.toLowerCase() === productData.name.toLowerCase()
        );

        if (existingProduct) {
          // Update existing product
          const { error } = await supabase
            .from('products')
            .update({
              description: productData.description,
              rate: productData.rate,
              serve_item_no: productData.serve_item_no,
              quantity: productData.quantity,
              slot_start: productData.slot_start,
              slot_end: productData.slot_end
            })
            .eq('id', existingProduct.id);

          if (error) throw error;
          updatedCount++;
        } else {
          // Create new product
          const { error } = await supabase
            .from('products')
            .insert([productData]);

          if (error) throw error;
          createdCount++;
        }
      }

      setImportProgress(prev => ({ ...prev, status: 'Refreshing list...' }));
      await fetchProducts();
      toast.success(`Import completed: ${updatedCount} products updated, ${createdCount} products created`);
    } catch (error) {
      console.error('Error importing Excel:', error);
      toast.error('Failed to import Excel file');
    } finally {
      setIsLoading(false);
      setImportProgress({ show: false, current: 0, total: 0, status: '' });
    }
  };

  const handleImportCSV = (file: File) => {
    parse(file, {
      header: true,
      complete: async (results) => {
        try {
          setIsLoading(true);

          // Get existing products for the selected package
          const { data: existingProducts } = await supabase
            .from('products')
            .select('id, name, index')
            .eq('package_id', activePackage);

          const { data: maxIndexProduct } = await supabase
            .from('products')
            .select('index')
            .order('index', { ascending: false })
            .limit(1);
          
          let nextIndex = maxIndexProduct && maxIndexProduct[0]?.index 
            ? maxIndexProduct[0].index + 1 
            : 1;

          const selectedPackageData = packages.find(p => p.id === activePackage);
          if (!selectedPackageData) {
            throw new Error('Selected package not found');
          }

          const processedData = results.data.map((row: any, idx) => {
            const productName = row['Product Name']?.toString().trim() || '';
            if (!productName) return null;
            
            return {
              name: productName,
              description: row['Product Description']?.toString().trim() || '',
              package_id: activePackage,
              rate: parseFloat(row['Basic Rate']) || 0,
              serve_item_no: row['Serve Item No.'] ? parseInt(row['Serve Item No.']) : null,
              quantity: row['Quantity']?.toString().trim() || null,
              slot_start: "00:00",
              slot_end: "12:00",
              index: nextIndex + idx
            };
          }).filter(item => 
            item && 
            item.name && 
            item.package_id && 
            !isNaN(item.rate) && 
            item.rate > 0
          );

          if (processedData.length === 0) {
            throw new Error('No valid data found in CSV');
          }

          let updatedCount = 0;
          let createdCount = 0;

          // Show progress
          setImportProgress({ show: true, current: 0, total: processedData.length, status: 'Processing products...' });

          // Process each product
          for (let i = 0; i < processedData.length; i++) {
            const productData = processedData[i];
            setImportProgress(prev => ({ ...prev, current: i + 1, status: `Processing: ${productData.name}` }));
            
            const existingProduct = existingProducts?.find(p => 
              p.name.toLowerCase() === productData.name.toLowerCase()
            );

            if (existingProduct) {
              // Update existing product
              const { error } = await supabase
                .from('products')
                .update({
                  description: productData.description,
                  rate: productData.rate,
                  serve_item_no: productData.serve_item_no,
                  quantity: productData.quantity,
                  slot_start: productData.slot_start,
                  slot_end: productData.slot_end
                })
                .eq('id', existingProduct.id);

              if (error) throw error;
              updatedCount++;
            } else {
              // Create new product
              const { error } = await supabase
                .from('products')
                .insert([productData]);

              if (error) throw error;
              createdCount++;
            }
          }

          setImportProgress(prev => ({ ...prev, status: 'Refreshing list...' }));
          await fetchProducts();
          toast.success(`Import completed: ${updatedCount} products updated, ${createdCount} products created`);
        } catch (error) {
          console.error('Error importing CSV:', error);
          toast.error('Failed to import products');
        } finally {
          setIsLoading(false);
          setImportProgress({ show: false, current: 0, total: 0, status: '' });
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
        'Serial No.': 1,
        'Serve Item No.': 1,
        'Product Name': 'Sample Product',
        'Product Description': 'Product description',
        'Quantity': '200ml',
        'Basic Rate': 100
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products Template');
    
    XLSX.writeFile(workbook, 'products_template.xlsx');
    toast.success('Template downloaded successfully');
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

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1); // Reset to first page when changing entries per page
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

    if (window.confirm(`Are you sure you want to delete ${selectedProducts.length} products? This will also delete all related billing entries.`)) {
      try {
        setIsLoading(true);
        const { error } = await supabase
          .from('products')
          .delete()
          .in('id', selectedProducts);

        if (error) throw error;

        toast.success(`Successfully deleted ${selectedProducts.length} products and their related entries`);
        setSelectedProducts([]);
        fetchProducts();
      } catch (error: any) {
        console.error('Error deleting products:', error);
        toast.error(error.message || 'Failed to delete products');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Add this useEffect to clear selections when filters change
  useEffect(() => {
    setSelectedProducts([]);
  }, [activePackage]);

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

  return (
    <PermissionGuard>
      <div>
        {/* Header with Edit Controls */}
        <EditGuard>
          <div className="flex justify-end items-center gap-4 mb-6">
            <div className="relative">
              <button
                onClick={handleExport}
                disabled={activePackage === 'all'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activePackage === 'all' 
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                }`}
                title={activePackage === 'all' ? 'Please select a specific package to export' : ''}
              >
                <RiUploadLine className="w-4 h-4" />
                Export
              </button>
            </div>

            <div className="relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                className="hidden"
                id="file-upload"
                disabled={activePackage === 'all'}
              />
              <label
                htmlFor={activePackage === 'all' ? '' : 'file-upload'}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                  activePackage === 'all'
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-amber-600 bg-amber-50 hover:bg-amber-100 cursor-pointer'
                }`}
                title={activePackage === 'all' ? 'Please select a specific package to import' : ''}
              >
                <RiDownloadLine className="w-4 h-4" />
                Import
              </label>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors ml-2 text-sm"
            >
              <RiAddLine className="w-4 h-4" />
              Add Product
            </button>

            <SettingsDropdown />
          </div>
        </EditGuard>

        {/* Search and Filter Controls - Available to all users */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="relative w-[300px]">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
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

        {/* Table View */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto min-w-full divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isSelectMode && (
                    <EditGuard>
                      <th className="w-[50px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={paginatedProducts().length > 0 && selectedProducts.length === paginatedProducts().length}
                          onChange={handleSelectAllInPage}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                      </th>
                    </EditGuard>
                  )}
                  <th className="w-[80px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sr No.
                  </th>
                  <th className="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serve Item No.
                  </th>
                  <th className="w-1/6 min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="w-1/6 min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="w-1/6 min-w-[150px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Package
                  </th>
                  <th className="w-[100px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="w-1/5 min-w-[180px] px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slot Time
                  </th>
                  <EditGuard>
                    <th className="w-[100px] px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </EditGuard>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts().length > 0 ? (
                  paginatedProducts().map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {isSelectMode && (
                        <EditGuard>
                          <td className="w-[50px] px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product.id)}
                              onChange={() => handleSelectProduct(product.id)}
                              className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                            />
                          </td>
                        </EditGuard>
                      )}
                      <td className="w-[80px] px-4 py-4 text-sm text-gray-900">
                        {((currentPage - 1) * itemsPerPage) + index + 1}
                      </td>
                      <td className="w-[100px] px-4 py-4 text-sm text-gray-900">
                        {product.serve_item_no || '-'}
                      </td>
                      <td className="w-1/6 min-w-[150px] px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {product.name}
                        </div>
                      </td>
                      <td className="w-1/6 min-w-[150px] px-4 py-4">
                        <div className="text-sm text-gray-500 truncate">
                          {product.description || '-'}
                        </div>
                      </td>
                      <td className="w-[100px] px-4 py-4 text-sm text-gray-900">
                        {product.quantity || '1'}
                      </td>
                      <td className="w-1/6 min-w-[150px] px-4 py-4">
                        <span className="text-sm font-medium text-amber-600 truncate block">
                          {(product as any).packages?.name}
                        </span>
                      </td>
                      <td className="w-[100px] px-4 py-4 text-sm text-gray-900">
                        ₹{product.rate}
                      </td>
                      <td className="w-1/5 min-w-[180px] px-4 py-4">
                        <div>
                          <div className="text-sm text-gray-900">
                            {formatTime(product.slot_start)} - {formatTime(product.slot_end)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({calculateHours(product.slot_start, product.slot_end)})
                          </div>
                        </div>
                      </td>
                      <EditGuard>
                        <td className="w-[100px] px-4 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setFormData({
                                  name: product.name,
                                  description: product.description,
                                  package_id: product.package_id,
                                  rate: product.rate.toString(),
                                  serve_item_no: product.serve_item_no?.toString() || "",
                                  slot_start: product.slot_start,
                                  slot_end: product.slot_end,
                                  quantity: product.quantity || ""
                                });
                                setIsModalOpen(true);
                              }}
                              className="text-amber-600 hover:text-amber-900 p-1"
                            >
                              <RiEditLine className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900 p-1"
                            >
                              <RiDeleteBinLine className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </EditGuard>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isSelectMode ? 9 : 8} className="px-4 py-4 text-center text-gray-500">
                      No products found matching the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <Pagination />

        {/* Modals - Only for users with edit access */}
        <EditGuard>
          {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingProduct(null);
                      setFormData({
                        name: "",
                        description: "",
                        package_id: "",
                        rate: "",
                        serve_item_no: "",
                        slot_start: "00:00",
                        slot_end: "12:00",
                        quantity: ""
                      });
                    }}
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
                    <label className="block text-sm font-medium text-gray-700">Serve Item No.</label>
                    <input
                      type="number"
                      value={formData.serve_item_no}
                      onChange={(e) => setFormData({ ...formData, serve_item_no: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                      min="1"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="text"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                      placeholder="e.g., 200ml, 1kg, 10pcs"
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
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingProduct(null);
                        setFormData({
                          name: "",
                          description: "",
                          package_id: "",
                          rate: "",
                          serve_item_no: "",
                          slot_start: "00:00",
                          slot_end: "12:00",
                          quantity: ""
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
                      {isLoading ? "Saving..." : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          <DeleteDialog />
        </EditGuard>

        {/* Import Progress Modal */}
        {importProgress.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Importing Products</h3>
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    {importProgress.current} of {importProgress.total} products
                  </p>
                </div>
                <p className="text-sm text-gray-700 truncate">{importProgress.status}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
} 
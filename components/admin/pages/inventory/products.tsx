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
  RiArrowRightSLine
} from "react-icons/ri";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import { parse, unparse } from 'papaparse';

interface Product {
  id: string;
  name: string;
  description: string;
  category: "Meals" | "Drinks";
  package_id: string;
  rate: number;
  stock_quantity: number;
  created_at: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
}

export function ProductsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [activeCategory, setActiveCategory] = useState<"Meals" | "Drinks" | "all">("all");
  const [activePackage, setActivePackage] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    package_id: "",
    rate: "",
    stock_quantity: ""
  });
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

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
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to fetch products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        package_id: formData.package_id,
        rate: parseFloat(formData.rate),
        stock_quantity: parseInt(formData.stock_quantity)
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
        stock_quantity: ""
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
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product');
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const categoryMatch = activeCategory === "all" || product.category === activeCategory;
    const packageMatch = activePackage === "all" || product.package_id === activePackage;
    return categoryMatch && packageMatch;
  });

  const getStockStatus = (quantity: number) => {
    if (quantity > 10) return { color: "text-green-600", text: "In Stock" };
    if (quantity < 5) return { color: "text-yellow-600", text: "Low Stock" };
    return { color: "text-red-600", text: "Out of Stock" };
  };

  const handleExportCSV = () => {
    try {
      // Use filteredProducts instead of all products
      const exportData = filteredProducts.map(product => ({
        Name: product.name,
        Description: product.description,
        Category: product.category,
        Package: (product as any).packages?.name,
        Rate: product.rate,
        'Stock Quantity': product.stock_quantity
      }));

      // Add filter information to filename
      let filename = 'products';
      if (activeCategory !== 'all') filename += `_${activeCategory}`;
      if (activePackage !== 'all') {
        const packageName = packages.find(p => p.id === activePackage)?.name;
        if (packageName) filename += `_${packageName}`;
      }
      filename += '.csv';

      // Convert to CSV
      const csv = unparse(exportData);
      
      // Create download link
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

    // Reset input value so the same file can be selected again
    event.target.value = '';

    parse(file, {
      header: true,
      complete: async (results) => {
        try {
          setIsLoading(true);
          const importData = results.data.map((row: any) => ({
            name: row.Name,
            description: row.Description,
            category: row.Category,
            package_id: packages.find(p => p.name === row.Package)?.id,
            rate: parseFloat(row.Rate),
            stock_quantity: parseInt(row['Stock Quantity'])
          })).filter(item => 
            item.name && 
            item.category && 
            item.package_id && 
            !isNaN(item.rate) && 
            !isNaN(item.stock_quantity)
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
        Rate: '100',
        'Stock Quantity': '50'
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-sm font-light text-gray-500">Manage Products</h1>
        <div className="flex flex-wrap items-center gap-4">
          {/* View Toggle */}
          <div className="flex items-center bg-white rounded-lg shadow">
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
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-3 py-2">
            <RiFilterLine className="text-gray-500" />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as any)}
              className="text-sm border-none focus:ring-0"
            >
              <option value="all">All Categories</option>
              <option value="Meals">Meals</option>
              <option value="Drinks">Drinks</option>
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

            <button
              onClick={downloadTemplate}
              className="text-xs text-amber-600 hover:text-amber-700 ml-2"
            >
              Download Template
            </button>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <RiAddLine className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProducts().length > 0 ? (
              paginatedProducts().map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
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
                            stock_quantity: product.stock_quantity.toString()
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
                        product.category === 'Meals' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {product.category}
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
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-medium ${getStockStatus(product.stock_quantity).color}`}>
                        {getStockStatus(product.stock_quantity).text}
                      </span>
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
                      Stock
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
                            product.category === 'Meals'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {product.category}
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
                          <span className={`text-sm font-medium ${getStockStatus(product.stock_quantity).color}`}>
                            {product.stock_quantity} units
                            <span className="text-xs ml-1 text-gray-500">
                              ({getStockStatus(product.stock_quantity).text})
                            </span>
                          </span>
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
                                stock_quantity: product.stock_quantity.toString()
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
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingProduct(null);
                  setFormData({
                    name: "",
                    description: "",
                    category: "",
                    package_id: "",
                    rate: "",
                    stock_quantity: ""
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
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                >
                  <option value="">Select a category</option>
                  <option value="Meals">Meals</option>
                  <option value="Drinks">Drinks</option>
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
                <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-amber-500"
                  required
                  min="0"
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
                      category: "",
                      package_id: "",
                      rate: "",
                      stock_quantity: ""
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
    </div>
  );
} 
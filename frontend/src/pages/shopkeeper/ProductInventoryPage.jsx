import React, { useState, useEffect } from 'react';
import { shopService } from '../../services/shopService';
import { productService } from '../../services/productService';
import { ProductFormModal } from '../../components/shopkeeper/ProductFormModal';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Tag,
  IndianRupee,
} from 'lucide-react';

export const ProductInventoryPage = () => {
  const { addToast } = useNotification();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const shopRes = await shopService.getMyShop();
      if (shopRes.success) {
        setShop(shopRes.shop);
        const prodRes = await productService.getProducts({
          shopId: shopRes.shop._id,
        });
        if (prodRes.success) {
          setProducts(prodRes.products);
        }
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this product from your inventory?')) return;
    try {
      const res = await productService.deleteProduct(id);
      if (res.success) {
        addToast('Product removed from catalog', 'info');
        fetchInventory();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>Store Catalog & Stock Levels</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Product Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your shop catalog, adjust real-time prices, and track low-stock warnings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search within your catalog items..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-semibold">
          Showing {filteredProducts.length} of {products.length} items
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading catalog items...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search
              ? 'No products match your search query.'
              : 'Your store catalog is empty. Click "Add New Item" to populate your inventory.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4">Item Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Selling Price</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredProducts.map((p) => {
                  const isOutOfStock = p.quantityInStock <= 0;
                  const isLow = p.quantityInStock <= (p.lowStockThreshold || 5);

                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Item Details */}
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <img
                          src={
                            p.images?.[0] ||
                            'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=100&q=80'
                          }
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 leading-snug">{p.name}</h4>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Brand: {p.brand || 'Generic'}
                          </span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {p.category}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">₹{p.price}</div>
                        {p.mrp > p.price && (
                          <div className="text-[10px] text-slate-400 line-through">
                            MRP ₹{p.mrp}
                          </div>
                        )}
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900">
                          {p.quantityInStock} {p.unit}
                        </span>
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3.5 px-4">
                        {isOutOfStock ? (
                          <Badge variant="danger">Out of Stock</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">Low Stock ({p.quantityInStock})</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-brand-600 transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        shopCategory={shop?.category}
        onSuccess={() => fetchInventory()}
      />
    </div>
  );
};

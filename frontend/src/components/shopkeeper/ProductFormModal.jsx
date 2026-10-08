import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { productService } from '../../services/productService';
import { useNotification } from '../../context/NotificationContext';
import { Plus, Package, Tag, Layers, IndianRupee } from 'lucide-react';

export const ProductFormModal = ({ isOpen, onClose, product, shopCategory, onSuccess }) => {
  const { addToast } = useNotification();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState(shopCategory || 'Hardware & Tools');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [unit, setUnit] = useState('piece');
  const [quantityInStock, setQuantityInStock] = useState(10);
  const [lowStockThreshold, setLowStockThreshold] = useState(3);
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setBrand(product.brand || '');
      setCategory(product.category || shopCategory || 'Hardware & Tools');
      setDescription(product.description || '');
      setPrice(product.price ? String(product.price) : '');
      setMrp(product.mrp ? String(product.mrp) : '');
      setUnit(product.unit || 'piece');
      setQuantityInStock(product.quantityInStock ?? 10);
      setLowStockThreshold(product.lowStockThreshold ?? 3);
      setImageUrl(product.images?.[0] || '');
      setTags(product.tags ? product.tags.join(', ') : '');
    } else {
      setName('');
      setBrand('');
      setCategory(shopCategory || 'Hardware & Tools');
      setDescription('');
      setPrice('');
      setMrp('');
      setUnit('piece');
      setQuantityInStock(10);
      setLowStockThreshold(3);
      setImageUrl('https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80');
      setTags('');
    }
  }, [product, shopCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) {
      addToast('Please provide product name and price', 'error');
      return;
    }

    setLoading(true);
    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name,
      brand,
      category,
      description,
      price: parseFloat(price),
      mrp: mrp ? parseFloat(mrp) : parseFloat(price),
      unit,
      quantityInStock: parseInt(quantityInStock) || 0,
      lowStockThreshold: parseInt(lowStockThreshold) || 3,
      images: imageUrl ? [imageUrl] : ['https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=600&q=80'],
      tags: tagArray,
    };

    try {
      if (product?._id) {
        const res = await productService.updateProduct(product._id, payload);
        if (res.success) {
          addToast('Product updated in catalog', 'success');
          onClose();
          if (onSuccess) onSuccess(res.product);
        }
      } else {
        const res = await productService.createProduct(payload);
        if (res.success) {
          addToast('Product added to shop inventory', 'success');
          onClose();
          if (onSuccess) onSuccess(res.product);
        }
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? '✏️ Edit Catalog Product' : '📦 Add New Product to Inventory'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Product Title *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Astral CPVC Pro Pipe 1-inch (3 Meter)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Brand & Category */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Brand
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Astral, Finolex, Bosch"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Price, MRP & Unit */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="390"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              MRP (₹)
            </label>
            <input
              type="number"
              min="0"
              value={mrp}
              onChange={(e) => setMrp(e.target.value)}
              placeholder="450"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="piece, meter, kg"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Stock & Low Stock alert threshold */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Quantity In Stock
            </label>
            <input
              type="number"
              min="0"
              value={quantityInStock}
              onChange={(e) => setQuantityInStock(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Low Stock Alert Below
            </label>
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Image URL & Tags */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Product Image URL
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Search Keywords / Tags (comma separated)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="pipe, pvc, cpvc, plumbing, astral"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Saving...' : product ? 'Update Product' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

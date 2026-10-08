import React, { useState } from 'react';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Search,
  RefreshCw,
  Edit2,
  IndianRupee,
  Layers,
} from 'lucide-react';

export const InventoryVisibilitySection = ({
  products = [],
  onUpdateStock,
  onOpenAddModal,
  onEditProduct,
  loading = false,
}) => {
  const [filter, setFilter] = useState('ALL'); // 'ALL' | 'HEALTHY' | 'LOW' | 'OUT'
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Compute status counts
  const healthyCount = products.filter((p) => p.quantityInStock > (p.lowStockThreshold || 5)).length;
  const lowCount = products.filter((p) => p.quantityInStock > 0 && p.quantityInStock <= (p.lowStockThreshold || 5)).length;
  const outCount = products.filter((p) => (p.quantityInStock || 0) <= 0).length;

  const handleStockDelta = async (prod, delta) => {
    const newQty = Math.max(0, (prod.quantityInStock || 0) + delta);
    setUpdatingId(prod.id || prod._id);
    try {
      if (onUpdateStock) {
        await onUpdateStock(prod.id || prod._id, newQty);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const threshold = p.lowStockThreshold || 5;
    if (filter === 'HEALTHY') return p.quantityInStock > threshold;
    if (filter === 'LOW') return p.quantityInStock > 0 && p.quantityInStock <= threshold;
    if (filter === 'OUT') return (p.quantityInStock || 0) <= 0;
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Layers className="w-3.5 h-3.5" />
            <span>Storefront Inventory Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Live Inventory & Shelf Visibility
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time stock statuses with automated thresholds (Green = Healthy, Yellow = Low, Red = Critical).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAddModal && (
            <button
              onClick={onOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      {/* Critical Stock Warning Banner if any items need attention */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 font-black">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-900 block">
                Inventory Restock Advisory:
              </span>
              <span className="text-amber-800">
                You have <strong>{lowCount} low-stock</strong> and <strong>{outCount} out-of-stock</strong> item{outCount + lowCount > 1 ? 's' : ''} that risk losing counter sales.
              </span>
            </div>
          </div>

          <button
            onClick={() => setFilter(outCount > 0 ? 'OUT' : 'LOW')}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm flex-shrink-0"
          >
            Review At-Risk Items
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* State filters */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setFilter('HEALTHY')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filter === 'HEALTHY' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Healthy ({healthyCount})
          </button>
          <button
            onClick={() => setFilter('LOW')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filter === 'LOW' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Low Stock ({lowCount})
          </button>
          <button
            onClick={() => setFilter('OUT')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              filter === 'OUT' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Out of Stock ({outCount})
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search items by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
          <Package className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No inventory matches your current filter</p>
          <p className="text-[11px] text-slate-400">Try changing the search query or status filter above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const prodId = p.id || p._id;
            const threshold = p.lowStockThreshold || 5;
            const isHealthy = p.quantityInStock > threshold;
            const isLow = p.quantityInStock > 0 && p.quantityInStock <= threshold;
            const isOut = (p.quantityInStock || 0) <= 0;
            const isUpdating = updatingId === prodId;

            return (
              <div
                key={prodId}
                className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between space-y-3 bg-white ${
                  isOut
                    ? 'border-red-300 ring-2 ring-red-500/10 shadow-sm shadow-red-500/5'
                    : isLow
                    ? 'border-amber-300 ring-2 ring-amber-500/10 shadow-sm shadow-amber-500/5'
                    : 'border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div>
                  {/* Top Bar: Stock Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {isHealthy && (
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Healthy Stock
                      </span>
                    )}
                    {isLow && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        ⚠️ Low Stock Warning
                      </span>
                    )}
                    {isOut && (
                      <span className="bg-red-100 text-red-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-red-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        🔴 Out of Stock
                      </span>
                    )}

                    <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
                      {p.category}
                    </span>
                  </div>

                  {/* Thumbnail & Name */}
                  <div className="flex items-start gap-3">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'}
                      alt={p.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                        {p.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Brand: <strong>{p.brand || 'Local Brand'}</strong>
                      </p>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-black text-slate-900">₹{p.price}</span>
                        {p.mrp && p.mrp > p.price && (
                          <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                        )}
                        <span className="text-[10px] text-slate-400">/ {p.unit || 'piece'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stock Level Counter & Adjustment Controls */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Current Stock:</span>
                    <span
                      className={`text-base font-black ${
                        isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {p.quantityInStock} {p.unit || 'units'}
                    </span>
                  </div>

                  {/* Quick Inline Increment / Decrement Buttons */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleStockDelta(p, -1)}
                      disabled={isUpdating || p.quantityInStock <= 0}
                      title="Decrease stock by 1"
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 text-center font-mono font-black text-xs text-slate-800">
                      {isUpdating ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto text-brand-600" />
                      ) : (
                        `${p.quantityInStock} on shelf`
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStockDelta(p, 1)}
                      disabled={isUpdating}
                      title="Increase stock by 1"
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold transition-all disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

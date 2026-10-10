import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { productService } from '../../services/productService';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { ProductCard } from '../../components/customer/ProductCard';
import { ReservationModal } from '../../components/customer/ReservationModal';
import { Package, Search, RefreshCw, Filter, ShoppingBag } from 'lucide-react';

export const PublicProductsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { coordinates, radiusKm } = useLocation();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState('distance');
  const [loading, setLoading] = useState(true);
  const [reserveTarget, setReserveTarget] = useState(null);

  const categories = [
    'All',
    'Hardware & Tools',
    'Plumbing & Sanitary',
    'Electrical & Lighting',
    'Stationery & Office',
    'Groceries & Daily Essentials',
    'Electronics & Mobiles',
  ];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({
        lng: coordinates[0],
        lat: coordinates[1],
        radius: radiusKm,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        search: search || undefined,
        sort: sortBy,
      });
      if (res.success) {
        setProducts(res.products);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [coordinates, radiusKm, selectedCategory, sortBy]);

  const handleStartChat = async (product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: product.shopId._id || product.shopId,
        productName: product.name,
        price: product.price,
      });
      if (res.success) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      }
    } catch (err) {
      console.error('Error opening chat:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Package className="w-3.5 h-3.5" />
            <span>Master Catalog & Live Inventory</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Products In Stock Nearby
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time stock from verified local shops with transparent pricing and 60-min in-store holds.
          </p>
        </div>
      </div>

      {/* Categories & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto text-xs pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === c
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchProducts();
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by title, brand, tag (e.g. pipe, drill, led, tape)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
          >
            Search
          </button>
        </form>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Checking inventory...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching products found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try searching for a different keyword or broadcast a custom inquiry to nearby shops.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((p) => (
            <ProductCard
              key={p._id}
              product={p}
              onReserveClick={(item) => setReserveTarget(item)}
              onChatClick={() => handleStartChat(p)}
            />
          ))}
        </div>
      )}

      {/* Hold Modal */}
      {reserveTarget && (
        <ReservationModal
          isOpen={!!reserveTarget}
          onClose={() => setReserveTarget(null)}
          targetItem={reserveTarget}
          onSuccess={() => navigate('/customer/reservations')}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLocation } from '../../context/LocationContext';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { shopService } from '../../services/shopService';
import { productService } from '../../services/productService';
import { chatService } from '../../services/chatService';
import { ShopCard } from '../../components/customer/ShopCard';
import { ProductCard } from '../../components/customer/ProductCard';
import { MapView } from '../../components/common/MapView';
import { BroadcastRequestModal } from '../../components/customer/BroadcastRequestModal';
import { ReservationModal } from '../../components/customer/ReservationModal';
import { BargainModal } from '../../components/customer/BargainModal';
import { getSehoreDemoData } from '../../components/customer/sehoreDemoData';
import { getRoutedShopId, isUuidLike } from '../../components/customer/customerItemUtils';
import { CompareProvider, useCompare } from '../../components/customer/CompareContext';
import { ComparePanel } from '../../components/customer/ComparePanel';
import { SmartSearch } from '../../components/customer/SmartSearch';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Map,
  Grid,
  Store,
  Package,
  Sparkles,
  RefreshCw,
  Send,
  Zap,
  Compass,
  ArrowUpRight,
  MessageCircle,
  AlertTriangle,
  HandCoins,
  Pill,
  Scale,
  X,
} from 'lucide-react';

// Great-circle distance in km between two [lng, lat] points.
const haversineKm = (a, b) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)) * 10) / 10;
};

// Demo region anchor: VIT Bhopal University, Kothri Kalan (verified via OpenStreetMap).
const DEMO_ANCHOR = [76.8498, 23.0755];

// CompareProvider is mounted here — inside the customer folder only — so the
// entire Compare feature (context, utils, panel) lives in components/customer.
const DiscoverFeedInner = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { coordinates, addressText, radiusKm, setRadiusKm, setCoordinates, setAddressText } = useLocation();
  const { isAuthenticated, role } = useAuth();
  const { addToast } = useNotification();
  const { compareItems, compareCount, toggleCompare, isInCompare, clearCompare } = useCompare();

  const [activeTab, setActiveTab] = useState('shops'); // 'shops' | 'products'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'All');
  const [sortBy, setSortBy] = useState('distance'); // 'distance' | 'rating' | 'price_asc'
  
  const [shops, setShops] = useState([]);
  const [totalShops, setTotalShops] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [reserveTarget, setReserveTarget] = useState(null);
  const [bargainTarget, setBargainTarget] = useState(null);
  const isFirstLoad = useRef(true);

  const categories = [
    'All',
    'Hardware & Tools',
    'Plumbing & Sanitary',
    'Electrical & Lighting',
    'Stationery & Office',
    'Groceries & Daily Essentials',
    'Electronics & Mobiles',
    'Medicines & Wellness',
  ];

  const medicalProducts = products.filter((product) => product.category === 'Medicines & Wellness');
  const medicalAvailable = medicalProducts.filter((product) => product.isAvailable !== false && Number(product.quantityInStock) > 0).length;
  const medicalLowStock = medicalProducts.filter((product) => product.stockStatus === 'low_stock').length;

  // Fetch shops and products (stale-while-revalidate: keep old data visible on refetch)
  const fetchData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const [shopRes, prodRes] = await Promise.all([
        shopService.getNearbyShops({
          lng: coordinates[0],
          lat: coordinates[1],
          radius: radiusKm,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchQuery || undefined,
        }),
        productService.getProducts({
          lng: coordinates[0],
          lat: coordinates[1],
          radius: radiusKm,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchQuery || undefined,
          sort: sortBy,
        }),
      ]);

      const sehoreDemo = getSehoreDemoData();
      // GPS users near VIT Bhopal / Ashta / Sehore city also get the demo shops —
      // detect by proximity to the VIT Bhopal anchor (covers Kothri Kalan, Ashta, Sehore, Bhopal).
      const isNearDemoRegion = haversineKm(coordinates, DEMO_ANCHOR) <= 150;
      const isSehoreSearch =
        isNearDemoRegion ||
        addressText.toLowerCase().includes('sehore') ||
        addressText.toLowerCase().includes('bhopal') ||
        addressText.toLowerCase().includes('ashta') ||
        addressText.toLowerCase().includes('kothri kalan');
      // Distances are recomputed live from the user's current location so GPS users
      // near Ashta see relevant, correctly-spaced shops.
      const demoShops = isSehoreSearch
        ? sehoreDemo.shops
            .map((shop) => ({
              ...shop,
              distanceKm: haversineKm(coordinates, [shop.location.coordinates[0], shop.location.coordinates[1]]),
            }))
            .filter(
              (shop) =>
                shop.distanceKm <= radiusKm &&
                (selectedCategory === 'All' || shop.category === selectedCategory)
            )
        : [];
      const demoShopIds = new Set(demoShops.map((shop) => shop._id));
      const demoProducts = isSehoreSearch
        ? sehoreDemo.products.filter((product) => {
            // Only show products whose shop is actually within the chosen radius.
            if (!demoShopIds.has(product.shopId?._id || product.shopId)) return false;
            const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
            const searchable = `${product.name} ${product.brand} ${product.category}`.toLowerCase();
            return matchesCategory && (!searchQuery.trim() || searchable.includes(searchQuery.trim().toLowerCase()));
          })
        : [];

      if (shopRes.success) {
        // LINKED SHOPS: live backend shops ALWAYS come first — they carry the
        // real UUID shop_id the reservation API needs to route the hold to the
        // correct shopkeeper. Demo catalogue shops are appended as extras (never
        // replacing live rows), so "Hold & Reserve" stays working in every region.
        const liveShops = shopRes.shops || [];
        const liveIds = new Set(liveShops.map((s) => s._id || s.id));
        const extraDemoShops = demoShops.filter((s) => !liveIds.has(s._id || s.id));
        const customerShops = [...liveShops, ...extraDemoShops];
        setShops(customerShops);
        const reportedTotal = shopRes.totalRegisteredShops ?? shopRes.totalVerifiedShops ?? shopRes.totalShops ?? shopRes.shops?.length ?? 0;
        setTotalShops(Math.max(customerShops.length, Number(reportedTotal) || 0));
      }
      if (prodRes.success) {
        const apiProducts = prodRes.products || [];
        const liveProductIds = new Set(apiProducts.map((p) => p._id || p.id));
        const extraDemoProducts = demoProducts.filter((p) => !liveProductIds.has(p._id || p.id));
        setProducts([...apiProducts, ...extraDemoProducts]);
      }
    } catch (err) {
      console.error('Error loading discover feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const initial = isFirstLoad.current;
    isFirstLoad.current = false;
    fetchData(initial);

    const refreshTimer = setInterval(() => fetchData(), 30000);
    return () => clearInterval(refreshTimer);
  }, [coordinates, addressText, radiusKm, selectedCategory, sortBy]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const compareLocalShops = () => {
    setActiveTab('shops');
    setViewMode('grid');
    window.setTimeout(() => document.getElementById('customer-shop-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const selectSehoreDemo = () => {
    // VIT Bhopal University, Kothri Kalan (verified OpenStreetMap location)
    setCoordinates([76.8498, 23.0755]);
    setAddressText('VIT Bhopal University, Kothri Kalan, Sehore');
    setRadiusKm(20);
    setViewMode('grid');
  };


  const availableShops = shops.filter((shop) => shop.isActive !== false && shop.openingHours?.isOpenNow !== false).length;
  const unavailableShops = shops.length - availableShops;
  const getAvailableItemCount = (shop) => shop.availableItemCount ?? (shop.topProducts || []).filter((item) => item.isAvailable !== false).length;
  const getLowStockItemCount = (shop) => shop.lowStockItemCount ?? (shop.topProducts || []).filter((item) => {
      const quantity = item.quantityInStock ?? item.quantity_in_stock;
      const threshold = item.lowStockThreshold ?? item.low_stock_threshold ?? 3;
      return item.isAvailable !== false && Number.isFinite(Number(quantity)) && Number(quantity) <= Number(threshold);
    }).length;
  const availableItems = shops.reduce((total, shop) => total + getAvailableItemCount(shop), 0);
  const lowStockItems = shops.reduce((total, shop) => total + getLowStockItemCount(shop), 0);
  const radiusCoverage = totalShops > 0 ? Math.min(100, Math.round((shops.length / totalShops) * 100)) : 0;
  const outsideRadiusShops = Math.max(totalShops - shops.length, 0);
  const hasSelectedNeed = Boolean(searchQuery.trim()) || selectedCategory !== 'All';
  const nearbyShopIds = new Set(shops.map((shop) => shop._id || shop.id));
  const supplyingShopIds = new Set(
    products
      .filter((product) => product.isAvailable !== false && Number(product.quantityInStock ?? 1) > 0)
      .map((product) => product.shopId?._id || product.shopId?.id || product.shopId)
      .filter((shopId) => shopId && nearbyShopIds.has(shopId))
  );
  const supplyingShops = supplyingShopIds.size;
  const needCoverage = shops.length > 0 ? Math.round((supplyingShops / shops.length) * 100) : 0;

  const handleChatWithProduct = async (product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Demo-catalogue rows route to the linked live partner shop, so chat works
    // from every listing (same routing as holds/bargains).
    const shopIdValue = getRoutedShopId(product);
    if (!shopIdValue || !isUuidLike(shopIdValue)) {
      addToast(
        'This listing is not linked to a live shop chat yet. Broadcast a request to get quotes from nearby shops.',
        'error',
        6000
      );
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: shopIdValue,
        productName: product.name,
        price: product.price,
      });
      if (res.success) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  const handleBargain = (product) => setBargainTarget(product);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner & Search Header */}
      <div className="bg-gradient-to-r from-navy-900 via-slate-900 to-navy-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl lg:max-w-[50%]">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-400 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            <span>Hyperlocal Discovery Engine</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Discover Verified Shops Around You
          </h1>

          <p className="text-xs sm:text-sm text-slate-300">
            Real-time stock, pricing, and shop capabilities within{' '}
            <strong className="text-white">{radiusKm} km</strong> of{' '}
            <strong className="text-brand-400">{addressText}</strong>.
          </p>

          {/* Search bar inside header */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or shops (e.g. PVC pipe, drill, switch, notebook)..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white text-slate-900 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 font-bold text-xs text-white shadow-md shadow-brand-500/30 transition-colors flex-shrink-0"
            >
              Search
            </button>
          </form>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 lg:absolute lg:top-8 lg:right-8 lg:w-[44%]">
          <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Nearby</span>
              <Store className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black mt-3">{availableShops}</div>
            <div className="text-xs font-semibold mt-1">shops ready to visit</div>
          </div>
          <div className="rounded-2xl bg-sky-50 p-4 text-sky-800 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Stock</span>
              <Package className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black mt-3">{availableItems}</div>
            <div className="text-xs font-semibold mt-1">items available</div>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-800 shadow-sm">
            <div className="flex items-start justify-between">
              <span className="text-xs font-black uppercase tracking-wider">Low Stock</span>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-3xl font-black mt-3">{lowStockItems}</div>
            <div className="text-xs font-semibold mt-1">reserve soon</div>
          </div>
        </div>

        <div className="relative z-10 mt-7 border-t border-white/10 pt-5 lg:mt-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span className="text-slate-200">Nearby coverage</span>
                <span className="text-sky-300">{radiusCoverage}% of listed shops</span>
              </div>
              <div className="h-3 rounded-full bg-slate-700 mt-3 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${radiusCoverage}%` }} />
              </div>
              <p className="flex items-center gap-1.5 text-xs text-slate-300 mt-3">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                {outsideRadiusShops > 0 ? `${outsideRadiusShops} more registered shop${outsideRadiusShops === 1 ? '' : 's'} outside this radius` : 'All registered shops are inside this radius'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => document.querySelector('input[placeholder^="Search products"]')?.focus()}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-black flex items-center gap-1.5 transition-colors"
              >
                <Compass className="w-4 h-4" /> Find an item
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center gap-1.5 transition-colors"
              >
                <Map className="w-4 h-4" /> Open live map
              </button>
            </div>
          </div>
        </div>

        <div className="relative z-10 -mx-6 sm:-mx-8 -mb-6 sm:-mb-8 mt-6 grid grid-cols-1 sm:grid-cols-3 border-t border-white/10">
          <button type="button" onClick={compareLocalShops} className="p-4 text-left border-b sm:border-b-0 sm:border-r border-white/10 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3"><Store className="w-5 h-5 text-sky-300" /><span className="text-sm font-black text-white">Compare local shops</span><ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto" /></div>
            <p className="text-xs text-slate-400 pl-8 mt-1">See distance, trust, and live status</p>
          </button>
          <button type="button" onClick={() => setIsBroadcastOpen(true)} className="p-4 text-left border-b sm:border-b-0 sm:border-r border-white/10 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3"><Send className="w-5 h-5 text-amber-300" /><span className="text-sm font-black text-white">Ask every nearby shop</span><ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto" /></div>
            <p className="text-xs text-slate-400 pl-8 mt-1">Get quotes when catalog search misses</p>
          </button>
          <button type="button" onClick={() => navigate('/customer/messages')} className="p-4 text-left hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3"><MessageCircle className="w-5 h-5 text-emerald-300" /><span className="text-sm font-black text-white">Reserve with confidence</span><Sparkles className="w-4 h-4 text-emerald-300 ml-auto" /></div>
            <p className="text-xs text-slate-400 pl-8 mt-1">Chat first, then hold in-store</p>
          </button>
        </div>
      </div>

      {/* Customer availability summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Radius</p>
          <p className="text-xl font-black text-slate-900 mt-1">{shops.length} <span className="text-xs font-semibold text-slate-400">/ {totalShops}</span></p>
          <p className="text-[11px] text-brand-600 font-bold mt-1">{radiusCoverage}% coverage</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nearby Shops</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{availableShops}</p>
          <p className="text-[11px] text-slate-500 mt-1">{unavailableShops} unavailable</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{hasSelectedNeed ? 'Need Suppliers' : 'Available Items'}</p>
          <p className="text-xl font-black text-sky-600 mt-1">{hasSelectedNeed ? supplyingShops : availableItems}</p>
          <p className="text-[11px] text-slate-500 mt-1">{hasSelectedNeed ? `${needCoverage}% of nearby shops` : 'Across nearby inventory'}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Low Stock</p>
          <p className="text-xl font-black text-amber-600 mt-1">{lowStockItems}</p>
          <p className="text-[11px] text-slate-500 mt-1">Item{lowStockItems === 1 ? '' : 's'} need attention</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm col-span-2 lg:col-span-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Search Area</p>
          <p className="text-xl font-black text-slate-900 mt-1">{radiusKm} km</p>
          <p className="text-[11px] text-slate-500 mt-1 truncate">{addressText}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <MapPin className="w-4 h-4 text-brand-600" />
          <span className="font-bold text-slate-700">Search radius</span>
          <span className="text-slate-400">around {addressText}</span>
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Search radius">
          {[1, 3, 5, 10, 20, 60].map((radius) => (
            <button
              key={radius}
              type="button"
              onClick={() => setRadiusKm(radius)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                radiusKm === radius
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {radius} km
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-r from-brand-50 via-white to-slate-50 border border-brand-200/60 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 text-white flex items-center justify-center shadow-md shadow-brand-600/20 flex-shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-slate-800 truncate">Explore the VIT Bhopal demo region — Ashta &amp; Bhopal shops</p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">Kothri Kalan &amp; Ashta within 20 km • Bhopal city within 60 km (measured from VIT Bhopal University, Kothri Kalan)</p>
          </div>
        </div>
        <button
          type="button"
          onClick={selectSehoreDemo}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white text-xs font-bold shadow-sm shadow-brand-600/20 hover:from-brand-700 hover:to-brand-800 transition-all flex items-center gap-1.5 flex-shrink-0"
        >
          <MapPin className="w-3.5 h-3.5" />
          Show nearby demo shops
        </button>
      </div>

      {/* Broadcast CTA Strip */}
      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-amber-900">
              Can't find the exact item you need?
            </h4>
            <p className="text-xs text-amber-800">
              Broadcast a custom request to all nearby shops simultaneously and receive instant quotes.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsBroadcastOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 flex-shrink-0 w-full sm:w-auto justify-center"
        >
          <Send className="w-3.5 h-3.5" />
          Broadcast Request Now
        </button>
      </div>

      {/* Filters & Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tab & View Mode switchers */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Shops vs Products Tab */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => {
                setActiveTab('smart');
                setViewMode('grid');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'smart'
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200'
                  : 'text-brand-700 bg-brand-50 hover:bg-brand-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Smart Search
            </button>
            <button
              onClick={() => setActiveTab('shops')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'shops'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Nearby Shops ({shops.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'products'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Product Catalog ({products.length})
            </button>
            <button
              onClick={() => {
                setSelectedCategory('Medicines & Wellness');
                setActiveTab('medical');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'medical' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Pill className="w-3.5 h-3.5" /> Medical
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              aria-label={`Compare selected products (${compareCount} selected)`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                activeTab === 'compare'
                  ? 'bg-white text-brand-700 shadow-sm ring-1 ring-brand-200'
                  : compareCount > 0
                  ? 'text-brand-700 bg-brand-50 hover:bg-brand-100'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5" /> Compare
              <span
                className={`min-w-[1.25rem] px-1 py-0.5 rounded-full text-[10px] font-black text-center ${
                  compareCount > 0 ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {compareCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-amber-700 hover:bg-amber-50"
            >
              <HandCoins className="w-3.5 h-3.5" /> Bargain
            </button>
          </div>

          {/* Right Toolbar: View Toggle & Sort (not applicable to rule-based smart search) */}
          {activeTab !== 'smart' && (
          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="flex items-center gap-1.5 text-brand-600 font-semibold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Updating...
              </span>
            )}
            {/* Sort */}
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold text-slate-800 focus:outline-none"
              >
                <option value="distance">Nearest Distance</option>
                <option value="rating">Top Rated</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
            </div>

            {/* View Mode */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'map' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500'
                }`}
                title="Map view"
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'smart' ? (
        <SmartSearch />
      ) : activeTab === 'compare' ? (
        <ComparePanel
          onBrowse={() => setActiveTab('products')}
          onReserve={(offer) => setReserveTarget(offer)}
        />
      ) : viewMode === 'map' ? (
        <div className="space-y-4">
          <MapView
            userCoords={coordinates}
            shops={shops}
            radiusKm={radiusKm}
            totalShops={totalShops}
            needLabel={hasSelectedNeed ? searchQuery.trim() || selectedCategory : ''}
            supplyingShops={supplyingShops}
            needCoverage={needCoverage}
            height="550px"
          />
        </div>
      ) : (
        <div>
          {loading ? (
            <div className="text-center py-16 space-y-2">
              <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">
                Scanning verified stores in {addressText}...
              </p>
            </div>
          ) : activeTab === 'shops' ? (
            shops.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
                <Store className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">
                  No shops found within {radiusKm} km
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try expanding your search radius to 10km or 20km from the top bar, or broadcast a request!
                </p>
                <button
                  onClick={() => setRadiusKm(10)}
                  className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  Expand Radius to 10km
                </button>
              </div>
            ) : (
              <div id="customer-shop-results" className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
                {shops.map((shop) => (
                  <ShopCard
                    key={shop._id}
                    shop={shop}
                    onBroadcastClick={(s) => setIsBroadcastOpen(true)}
                  />
                ))}
              </div>
            )
          ) : (activeTab === 'medical' ? medicalProducts : products).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No medical items found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try a wider radius or contact a nearby pharmacy for availability.
              </p>
              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
              >
                Broadcast Request for this Item
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTab === 'medical' && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-700 text-xs font-black uppercase tracking-wider"><Pill className="w-4 h-4" /> Ashta pharmacy care</div>
                      <h2 className="text-lg font-black text-slate-900 mt-1">Medicines and everyday health essentials</h2>
                      <p className="text-xs text-slate-600 mt-1">Browse stock from the medical store on SH-70, opposite Civil Hospital Ashta.</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-xl bg-white border border-emerald-200 px-3 py-2 font-bold text-emerald-700">{medicalAvailable} available</span>
                      <span className="rounded-xl bg-white border border-amber-200 px-3 py-2 font-bold text-amber-700">{medicalLowStock} low stock</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-emerald-900 bg-white/70 rounded-xl px-3 py-2">Prescription medicines require a valid prescription and pharmacist guidance. Use Hold & Reserve to confirm availability before visiting.</p>
                </div>
              )}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-opacity ${refreshing ? 'opacity-60' : ''}`}>
              {(activeTab === 'medical' ? medicalProducts : products).map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onReserveClick={(p) => setReserveTarget(p)}
                  onChatClick={handleChatWithProduct}
                  onBargain={handleBargain}
                  onCompareToggle={toggleCompare}
                  isCompared={isInCompare(product._id || product.id)}
                  medicalMode={activeTab === 'medical'}
                />
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating compare tray (persistent access, cart-bar style) */}
      {compareCount > 0 && activeTab !== 'compare' && (
        <div className="sticky bottom-4 z-30 flex justify-center px-4">
          <div className="bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-700 px-4 py-2.5 flex items-center gap-3 max-w-full">
            <Scale className="w-4 h-4 text-brand-400 flex-shrink-0" />
            <span className="text-xs font-bold whitespace-nowrap hidden sm:inline">
              {compareCount} offer{compareCount === 1 ? '' : 's'} selected
            </span>
            <span className="text-xs font-bold sm:hidden">{compareCount}</span>
            <button
              onClick={() => setActiveTab('compare')}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-colors whitespace-nowrap"
            >
              Compare Selected
            </button>
            <button
              onClick={clearCompare}
              aria-label="Clear comparison selection"
              title="Clear comparison selection"
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Broadcast Request Modal */}
      <BroadcastRequestModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        initialProduct={searchQuery}
        initialCategory={selectedCategory !== 'All' ? selectedCategory : 'Hardware & Tools'}
        onSuccess={() => navigate('/customer/requests')}
      />

      {/* Reservation Hold Modal */}
      {reserveTarget && (
        <ReservationModal
          isOpen={!!reserveTarget}
          onClose={() => setReserveTarget(null)}
          targetItem={reserveTarget}
          onSuccess={() => navigate('/customer/reservations')}
        />
      )}

      {bargainTarget && (
        <BargainModal
          isOpen={!!bargainTarget}
          onClose={() => setBargainTarget(null)}
          product={bargainTarget}
          onSubmitted={() => setBargainTarget(null)}
        />
      )}

      </div>
  );
};

export const DiscoverFeed = () => (
  <CompareProvider>
    <DiscoverFeedInner />
  </CompareProvider>
);

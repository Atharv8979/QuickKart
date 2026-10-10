import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { shopService } from '../../services/shopService';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../context/LocationContext';
import { CustomerInventoryBoard } from '../../components/customer/CustomerInventoryBoard';
import { ReservationModal } from '../../components/customer/ReservationModal';
import { BroadcastRequestModal } from '../../components/customer/BroadcastRequestModal';
import { getSehoreDemoData } from '../../components/customer/sehoreDemoData';
import { ShopReviews } from '../../components/shop/ShopReviews';
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  Users,
  Send,
  MessageSquare,
  Navigation,
  RefreshCw,
} from 'lucide-react';

export const ShopProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { coordinates } = useLocation();
  const { isAuthenticated } = useAuth();

  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reserveTarget, setReserveTarget] = useState(null);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  useEffect(() => {
    const loadShopData = async () => {
      setLoading(true);
      // Demo shops (Kothri Kalan / Ashta / Bhopal) are served from local demo data
      // so they never fall back to the backend's default store profile.
      if (id && String(id).startsWith('sehore-demo-')) {
        const demo = getSehoreDemoData();
        const demoShop = demo.shops.find((s) => s._id === id);
        if (demoShop) {
          setShop(demoShop);
          setProducts(demo.products.filter((p) => (p.shopId?._id || p.shopId) === id));
          setLoading(false);
          return;
        }
      }
      try {
        const res = await shopService.getShopById(id, {
          lng: coordinates[0],
          lat: coordinates[1],
        });
        if (res.success) {
          setShop(res.shop);
          setProducts(Array.isArray(res.products) ? res.products : []);
        }
      } catch (err) {
        console.error('Error loading shop profile:', err);
        setShop(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadShopData();
  }, [id, coordinates]);

  const handleStartChat = async (product) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: shop._id,
        productName: product?.name || 'General Inquiry',
        price: product?.price || 0,
      });
      if (res.success) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 space-y-2">
        <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading store profile & live catalog...</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <Store className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">Store Not Found</h3>
        <button
          onClick={() => navigate('/customer/search')}
          className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold"
        >
          &larr; Back to Shop Discovery
        </button>
      </div>
    );
  }

  const isOpen = shop.openingHours?.isOpenNow ?? true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Storefront Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200 bg-slate-900 text-white">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={shop.bannerImage || 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=1200&q=80'}
            alt={shop.shopName}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Verification Badge */}
          {shop.verificationStatus === 'verified' && (
            <div className="absolute top-4 left-4 bg-emerald-500 text-white backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
              <ShieldCheck className="w-4 h-4" />
              Verified QuickKart Store
            </div>
          )}

          {/* Quick Distance info */}
          <div className="absolute top-4 right-4 bg-white/95 text-slate-900 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-md">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            {shop.distanceKm ? `${shop.distanceKm.toFixed(1)} km away` : 'Nearby'}
          </div>

          {/* Store Info Bottom Overlay */}
          <div className="absolute bottom-6 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
                {shop.category}
              </span>
              <h1 className="text-2xl sm:text-4xl font-black leading-tight drop-shadow-md">
                {shop.shopName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-200 font-medium drop-shadow-sm">
                {shop.tagline || shop.description}
              </p>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartChat(null)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Chat Store
              </button>
              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-lg shadow-brand-500/30 flex items-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                Ask for Stock
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details & Live State Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Store Details, Timings, Live capability */}
        <div className="space-y-6">
          {/* Live Business Capability Card (Chapter 16.4) */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Live Store Capabilities
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Storefront Status:</span>
                <span className={`font-bold flex items-center gap-1 ${isOpen ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {isOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Current In-Store Queue:</span>
                <span className="font-bold text-slate-800">
                  {shop.liveState?.currentlyServing || 2} customers serving
                </span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Estimated Counter Wait:</span>
                <span className="font-bold text-slate-800">
                  ~{shop.liveState?.queueTimeMinutes || 5} mins
                </span>
              </div>

              <div className="flex justify-between py-1">
                <span className="text-slate-500">Response Rate:</span>
                <span className="font-bold text-brand-600">
                  {shop.liveState?.responseRatePercent || 96}% prompt replies
                </span>
              </div>
            </div>
          </div>

          {/* Location & Address */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Address & Contact
            </h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {shop.address?.street}, {shop.address?.area}, {shop.address?.city}, {shop.address?.state} - {shop.address?.pincode}
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-brand-600" /> Phone:
                </span>
                <a href={`tel:${shop.contactPhone}`} className="font-bold text-brand-600 hover:underline">
                  {shop.contactPhone}
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-brand-600" /> Hours:
                </span>
                <span className="font-bold text-slate-800">
                  {shop.openingHours?.open} - {shop.openingHours?.close}
                </span>
              </div>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${shop.location?.coordinates?.[1]},${shop.location?.coordinates?.[0]}`}
              target="_blank"
              rel="noreferrer"
              className="w-full mt-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors block text-center"
            >
              <Navigation className="w-3.5 h-3.5 text-brand-600" />
              Navigate to Store
            </a>
          </div>
        </div>

        {/* Right 2 Columns: Live Product Catalog & Reviews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Catalog */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Available Catalog ({products.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Products currently in stock at this store. Hold any item for 60 minutes.
                </p>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No products currently listed for this store.
              </div>
            ) : (
              <CustomerInventoryBoard
                products={products.map((product) => ({ ...product, shopId: shop }))}
                shopId={shop._id}
                onReserveClick={(item) => setReserveTarget(item)}
                onChatClick={(product) => handleStartChat(product)}
              />
            )}
          </div>

          {/* Reviews */}
          <ShopReviews shopId={shop._id} />
        </div>
      </div>

      {/* Reservation Modal */}
      {reserveTarget && (
        <ReservationModal
          isOpen={!!reserveTarget}
          onClose={() => setReserveTarget(null)}
          targetItem={reserveTarget}
          onSuccess={() => navigate('/customer/reservations')}
        />
      )}

      {/* Broadcast Request Modal */}
      <BroadcastRequestModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        initialCategory={shop.category}
        onSuccess={() => navigate('/customer/requests')}
      />
    </div>
  );
};

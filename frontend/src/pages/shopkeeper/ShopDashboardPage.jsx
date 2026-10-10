import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useLocation } from '../../context/LocationContext';
import { useSocket } from '../../context/SocketContext';
import { shopService } from '../../services/shopService';
import { requestService } from '../../services/requestService';
import { reservationService } from '../../services/reservationService';
import { productService } from '../../services/productService';

// Shopkeeper Components
import { DashboardSummaryCards } from '../../components/shopkeeper/DashboardSummaryCards';
import { NetworkShopCard } from '../../components/shopkeeper/NetworkShopCard';
import { CustomerRequestCard } from '../../components/shopkeeper/CustomerRequestCard';
import { GoldenTarajuModal } from '../../components/shopkeeper/GoldenTarajuModal';
import { InventoryVisibilitySection } from '../../components/shopkeeper/InventoryVisibilitySection';
import { RegionalSalesRankingSection } from '../../components/shopkeeper/RegionalSalesRankingSection';
import { LiveStateToggleCard } from '../../components/shopkeeper/LiveStateToggleCard';
import { ShelfIntelligenceCard } from '../../components/shopkeeper/ShelfIntelligenceCard';
import { ProductFormModal } from '../../components/shopkeeper/ProductFormModal';
import { RespondModal } from '../../components/shopkeeper/RespondModal';
import { Badge } from '../../components/common/Badge';

import {
  Store,
  Package,
  AlertTriangle,
  Send,
  ShoppingBag,
  Scale,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  MapPin,
  Users,
  Building2,
} from 'lucide-react';

const REQUEST_STATUS_PRIORITY = {
  PENDING: 0,
  ACTIVE: 0,
  CLOSED: 0,
  BARGAINING: 1,
  REJECTED: 2,
  ACCEPTED: 2,
  CONFIRMING: 3,
  CONFIRMED: 4,
  READY: 4,
  COMPLETED: 4,
  DELIVERED: 4,
};

const linkCompletedReservations = (shopRequests, shopReservations) => {
  const completedReservations = shopReservations.filter((reservation) =>
    ['CONFIRMED', 'READY', 'COMPLETED', 'DELIVERED'].includes(
      String(reservation.status || '').toUpperCase()
    )
  );

  return shopRequests.map((request) => {
    if (!['CLOSED', 'CONFIRMED', 'COMPLETED', 'DELIVERED'].includes(
      String(request.status || '').toUpperCase()
    )) {
      return request;
    }

    const requestCustomerId =
      request.customerId || request.customer_id || request.customer?.id || request.customer?._id;
    const matchingReservation = completedReservations.find((reservation) => {
      const reservationCustomerId =
        reservation.customerId || reservation.customer_id || reservation.customer?.id || reservation.customer?._id;
      return (
        String(requestCustomerId || '') === String(reservationCustomerId || '') &&
        String(request.productName || request.product_name || '').trim().toLowerCase() ===
          String(reservation.productName || reservation.product_name || '').trim().toLowerCase()
      );
    });

    return matchingReservation
      ? {
          ...request,
          status: 'CONFIRMED',
          reservationCode: matchingReservation.reservationCode || matchingReservation.reservation_code,
          agreedPrice: request.agreedPrice ?? matchingReservation.agreedPrice ?? matchingReservation.agreed_price,
        }
      : request;
  });
};

const preserveRequestProgress = (currentRequests, incomingRequests) => {
  const currentById = new Map(
    currentRequests.map((request) => [request.id || request._id, request])
  );

  return incomingRequests.map((request) => {
    const previous = currentById.get(request.id || request._id);
    if (
      previous &&
      (REQUEST_STATUS_PRIORITY[previous.status] ?? 0) >=
        (REQUEST_STATUS_PRIORITY[request.status] ?? 0)
    ) {
      return {
        ...request,
        status: previous.status,
        agreedPrice: previous.agreedPrice ?? request.agreedPrice,
        reservationCode: previous.reservationCode ?? request.reservationCode,
      };
    }
    return request;
  });
};

export const ShopDashboardPage = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const { socket } = useSocket();
  const { coordinates, addressText, radiusKm } = useLocation();

  // Core Data
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [networkShops, setNetworkShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const requestFetchSequence = useRef(0);

  // Modals & Active Bargain Session
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [bargainRequestTarget, setBargainRequestTarget] = useState(null);
  const [selectedRespondRequest, setSelectedRespondRequest] = useState(null);

  // Quick filter tab for requests section ('ALL', 'PENDING', 'BARGAINING', 'ACCEPTED')
  const [requestFilter, setRequestFilter] = useState('ALL');

  const fetchDashboardData = async (isInitial = false) => {
    const requestFetchId = ++requestFetchSequence.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

    try {
      const [shopRes, reqRes, resRes, nearbyRes] = await Promise.all([
        shopService.getMyShop(),
        requestService.getShopRelevantRequests(),
        reservationService.getShopReservations(),
        shopService.getNearbyShops({
          lng: coordinates[0],
          lat: coordinates[1],
          radius: radiusKm,
        }),
      ]);

      let currentShop = null;
      if (shopRes.success) {
        currentShop = shopRes.shop;
        setShop(shopRes.shop);
      }
      if (resRes.success) {
        setReservations(resRes.reservations || []);
      }
      if (reqRes.success && requestFetchId === requestFetchSequence.current) {
        const linkedRequests = linkCompletedReservations(
          reqRes.requests || [],
          resRes.success ? resRes.reservations || [] : []
        );
        setRequests((current) => preserveRequestProgress(current, linkedRequests));
      }

      // Network shops: ONLY live backend shops (no demo shops for shopkeeper dashboard)
      if (nearbyRes.success) {
        const liveShops = nearbyRes.shops || [];
        setNetworkShops(liveShops);
      }

      // Scope inventory to THIS shop's live UUID. Without a resolved shop id
      // keep the shelf EMPTY — never fall back to the shared demo catalogue.
      try {
        const myId = currentShop?._id || currentShop?.id;
        if (myId) {
          const prodRes = await productService.getProducts({ shopId: myId });
          if (prodRes.success) {
            setProducts(prodRes.products || []);
          }
        } else {
          setProducts([]);
        }
      } catch {
        /* inventory stays as-is on transient failure */
      }
    } catch (err) {
      console.error('Error loading shop dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(true);
  }, []);

  // Live order link: when a customer places a hold / broadcast, the backend
  // emits a socket event — refresh this shopkeeper's inbox instantly so the
  // request appears without a manual refresh.
  useEffect(() => {
    if (!socket) return;
    const refreshLinkedOrders = () => fetchDashboardData(false);
    socket.on('new_reservation', refreshLinkedOrders);
    socket.on('new_broadcast_request', refreshLinkedOrders);
    socket.on('reservation_updated', refreshLinkedOrders);
    socket.on('bargain_update', refreshLinkedOrders);
    return () => {
      socket.off('new_reservation', refreshLinkedOrders);
      socket.off('new_broadcast_request', refreshLinkedOrders);
      socket.off('reservation_updated', refreshLinkedOrders);
      socket.off('bargain_update', refreshLinkedOrders);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Compute Metrics for Feature 6 (Dashboard Summary Cards)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayOrders = reservations.filter((r) => {
    const t = new Date(r.created_at || r.createdAt || Date.now()).getTime();
    return t >= todayStart.getTime();
  });

  const todayOrdersCount = todayOrders.length;
  const todaySalesAmount = todayOrders.reduce((acc, curr) => acc + (curr.total_amount || curr.totalAmount || 0), 0);

  const currentInventoryCount = products.length;
  const totalStockUnits = products.reduce((acc, curr) => acc + (curr.quantityInStock || 0), 0);

  const activeBargains = requests.filter((r) => r.status === 'BARGAINING');
  const activeBargainsCount = activeBargains.length;

  const pendingRequests = requests.filter((r) => r.status === 'PENDING' || !r.status);
  const pendingRequestsCount = pendingRequests.length;

  const lowStockProducts = products.filter(
    (p) => (p.quantityInStock || 0) <= (p.lowStockThreshold || 5)
  );
  const lowStockCount = lowStockProducts.length;

  // Handle Request Actions
  const handleAcceptRequest = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const res = await requestService.acceptRequest(requestId);
      if (res.success) {
        addToast(res.message || 'Customer offer accepted!', 'success');
        setRequests((current) =>
          current.map((request) =>
            (request.id || request._id) === requestId
              ? { ...request, ...res.request, status: 'ACCEPTED' }
              : request
          )
        );
        fetchDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to accept request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    setActionLoadingId(requestId);
    try {
      const res = await requestService.rejectRequest(requestId);
      if (res.success) {
        addToast(res.message || 'Request declined', 'info');
        setRequests((current) =>
          current.map((request) =>
            (request.id || request._id) === requestId
              ? { ...request, ...res.request, status: 'REJECTED' }
              : request
          )
        );
        fetchDashboardData();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBargainSubmit = async (requestId, payload) => {
    const res = await requestService.bargainRequest(requestId, payload);
    if (res.success) {
      addToast(res.message || 'Counter offer sent', 'success');
      // Update local state in requests
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId || r._id === requestId ? res.request : r))
      );
      if (bargainRequestTarget && (bargainRequestTarget.id === requestId || bargainRequestTarget._id === requestId)) {
        setBargainRequestTarget(res.request);
      }
      return res;
    }
  };

  const handleConfirmBargainDeal = async (target) => {
    const targetId = target.id || target._id;
    setRequests((current) =>
      current.map((request) =>
        (request.id || request._id) === targetId
          ? { ...request, ...target, status: 'CONFIRMING' }
          : request
      )
    );
    setActionLoadingId(targetId);
    try {
      const res = await requestService.confirmBargainDeal(targetId, target);
      if (res.success) {
        addToast(res.message || 'Bargain deal confirmed into official reservation order!', 'success');
        const confirmedRequest = {
          ...target,
          ...(res.request || {}),
          status: 'CONFIRMED',
          reservationCode:
            res.reservation?.reservationCode ||
            res.request?.reservationCode ||
            target.reservationCode,
        };
        setRequests((current) =>
          current.map((request) =>
            (request.id || request._id) === targetId
              ? { ...request, ...confirmedRequest }
              : request
          )
        );
        if (res.reservation) {
          setReservations((current) => [
            res.reservation,
            ...current.filter(
              (reservation) =>
                (reservation.id || reservation._id) !==
                (res.reservation.id || res.reservation._id)
            ),
          ]);
        }
        fetchDashboardData();
      } else {
        setRequests((current) =>
          current.map((request) =>
            (request.id || request._id) === targetId && request.status === 'CONFIRMING'
              ? { ...request, ...target }
              : request
          )
        );
        addToast(res.message || 'Failed to confirm bargain order', 'error');
      }
    } catch (err) {
      setRequests((current) =>
        current.map((request) =>
          (request.id || request._id) === targetId && request.status === 'CONFIRMING'
            ? { ...request, ...target }
            : request
        )
      );
      addToast(err.response?.data?.message || 'Failed to confirm bargain order', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateStock = async (productId, newQty) => {
    try {
      const res = await productService.updateProduct(productId, {
        quantityInStock: newQty,
      });
      if (res.success) {
        addToast(`Inventory updated to ${newQty} units`, 'success');
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId || p._id === productId ? { ...p, quantityInStock: newQty } : p
          )
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update stock', 'error');
    }
  };

  const filteredCustomerRequests = requests.filter((r) => {
    if (requestFilter === 'PENDING') return r.status === 'PENDING';
    if (requestFilter === 'BARGAINING') return r.status === 'BARGAINING';
    if (requestFilter === 'ACCEPTED') return r.status === 'ACCEPTED' || r.status === 'CONFIRMED';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl animate-bounce">
          ⚖️
        </div>
        <p className="text-xs text-slate-500 font-bold">
          Initializing Intelligent Shopkeeper Hub...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
              Merchant Control Hub
            </span>
            {shop?.verificationStatus === 'verified' ? (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Verified Store
              </span>
            ) : (
              <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-blue-200">
                <Store className="w-3 h-3" /> New Storefront
              </span>
            )}
            {shop?.gstNumber && (
              <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                GST: {shop.gstNumber}
              </span>
            )}
            <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-sm">
              <span>⚖️</span> Bargaining Enabled
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            {shop?.shopName || (user?.name ? `${user.name}'s Store` : 'My QuickKart Store')}
          </h1>
          <p className="text-xs text-slate-500">
            {shop?.address?.street ? `${shop.address.street}, ` : ''}{shop?.address?.city || 'Local Area'} • {shop?.category || 'General Store'}
            {shop?.contactPhone ? ` • 📞 ${shop.contactPhone}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/shop/profile"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Store className="w-4 h-4 text-slate-500" />
            Edit Profile
          </Link>
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsAddProductOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={() => fetchDashboardData(false)}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Onboarding Welcome Banner for Newly Registered Merchant */}
      {products.length === 0 && (
        <div className="bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <span className="bg-white/20 text-white text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block">
                🏪 Store Setup Guide
              </span>
              <h2 className="text-xl sm:text-2xl font-black">
                Welcome to QuickKart, {user?.name || 'Merchant'}!
              </h2>
              <p className="text-xs text-brand-100 leading-relaxed">
                Your store <strong>{shop?.shopName || 'storefront'}</strong> is live on QuickKart. It currently has no products listed. Add items manually to your catalog so customers in your neighborhood can view live shelf stock, place hold reservations, and send price requests.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsAddProductOpen(true);
              }}
              className="px-6 py-3 rounded-2xl bg-white text-brand-700 hover:bg-brand-50 text-xs font-black shadow-lg transition-all flex items-center gap-2 self-start md:self-auto flex-shrink-0"
            >
              <Plus className="w-4 h-4 text-brand-600" />
              Add Your First Product
            </button>
          </div>
        </div>
      )}

      {/* FEATURE 6: Modern Dashboard Summary Cards */}
      <DashboardSummaryCards
        todayOrdersCount={todayOrdersCount}
        todaySalesAmount={todaySalesAmount}
        currentInventoryCount={currentInventoryCount}
        totalStockUnits={totalStockUnits}
        activeBargainsCount={activeBargainsCount}
        pendingRequestsCount={pendingRequestsCount}
        lowStockCount={lowStockCount}
        onQuickFilter={(cardId) => {
          if (cardId === 'active-bargains') setRequestFilter('BARGAINING');
          if (cardId === 'pending-requests') setRequestFilter('PENDING');
        }}
      />

      {/* FEATURE: Live Storefront Inventory Management */}
      <InventoryVisibilitySection
        products={products}
        onUpdateStock={handleUpdateStock}
        onOpenAddModal={() => {
          setEditingProduct(null);
          setIsAddProductOpen(true);
        }}
        onEditProduct={(p) => {
          setEditingProduct(p);
          setIsAddProductOpen(true);
        }}
      />

      {/* FEATURE 1: Customer Product Requests & Live Inquiries Feed */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Send className="w-3.5 h-3.5" />
              <span>Direct Customer Interactions</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Customer Product Requests & Bargains
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review nearby shopper requests with quantity needed, shop stock availability, and offered price.
            </p>
          </div>

          {/* Request Category / State Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setRequestFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setRequestFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'PENDING' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Pending ({pendingRequestsCount})
            </button>
            <button
              onClick={() => setRequestFilter('BARGAINING')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                requestFilter === 'BARGAINING' ? 'bg-white text-amber-700 shadow-sm font-black' : 'text-slate-600'
              }`}
            >
              <span>⚖️</span> Bargaining ({activeBargainsCount})
            </button>
            <button
              onClick={() => setRequestFilter('ACCEPTED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                requestFilter === 'ACCEPTED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Accepted Deals
            </button>
          </div>
        </div>

        {/* Requests Grid */}
        {filteredCustomerRequests.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl space-y-2">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No customer requests in this filter</p>
            <p className="text-[11px] text-slate-400">Incoming requests from shoppers in your neighborhood will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCustomerRequests.map((req) => (
              <CustomerRequestCard
                key={req.id || req._id}
                request={req}
                actionLoading={actionLoadingId === (req.id || req._id)}
                onAccept={handleAcceptRequest}
                onReject={handleRejectRequest}
                onBargain={(item) => setBargainRequestTarget(item)}
                onConfirmOrder={handleConfirmBargainDeal}
              />
            ))}
          </div>
        )}
      </div>

      {/* Linked Network Shops — live backend shops from the same network the customer dashboard orders from */}
      {networkShops.length > 0 && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Linked QuickKart Network</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Nearby Shops in Your Network
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {networkShops.length} verified shop{networkShops.length !== 1 ? 's' : ''} within {radiusKm} km of {addressText}. Customer orders route through this network.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {networkShops.length} Connected
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {networkShops.map((netShop) => (
              <NetworkShopCard key={netShop._id || netShop.id} netShop={netShop} shop={shop} />
            ))}
          </div>
        </div>
      )}

      {/* FEATURES 4 & 5: Regional Sales Ranking & My Shop vs Regional Demand */}
      <RegionalSalesRankingSection shopId={shop?._id || shop?.id} />

      {/* Operational Models: Live State Toggle & Shelf Intelligence (Preserved Existing Capabilities) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveStateToggleCard shop={shop} onUpdate={(updated) => setShop(updated)} />
        <ShelfIntelligenceCard />
      </div>

      {/* Recent Reservations Quick-Access Grid */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              In-Store Holds & Pickup Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Customers with reserved hold codes awaiting counter pickup.
            </p>
          </div>
          <Link
            to="/shop/reservations"
            className="text-xs font-bold text-brand-600 hover:underline flex items-center gap-1"
          >
            Manage All ({reservations.length}) &rarr;
          </Link>
        </div>

        {reservations.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-6 text-center">
            No active reservation hold tickets requested yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reservations.slice(0, 6).map((res) => (
              <div
                key={res._id || res.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900 bg-slate-200/80 px-2 py-0.5 rounded text-[11px]">
                      {res.reservationCode}
                    </span>
                    <Badge
                      variant={
                        res.status === 'READY'
                          ? 'success'
                          : res.status === 'CONFIRMED'
                          ? 'primary'
                          : 'neutral'
                      }
                    >
                      {res.status}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-slate-800 truncate">{res.productName || res.product_name}</h4>
                  <p className="text-slate-500 text-[11px]">
                    Qty: {res.quantity} • Total: <strong>₹{res.totalAmount || res.total_amount}</strong>
                  </p>
                </div>

                <Link
                  to="/shop/reservations"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 text-xs flex-shrink-0"
                >
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FEATURE 2: Golden Taraju Bargaining Modal */}
      {bargainRequestTarget && (
        <GoldenTarajuModal
          isOpen={!!bargainRequestTarget}
          onClose={() => setBargainRequestTarget(null)}
          requestItem={bargainRequestTarget}
          onBargainSubmit={handleBargainSubmit}
          onAcceptDeal={handleAcceptRequest}
          onRejectDeal={handleRejectRequest}
          onConfirmOrder={handleConfirmBargainDeal}
        />
      )}

      {/* Add / Edit Product Modal */}
      <ProductFormModal
        isOpen={isAddProductOpen}
        onClose={() => {
          setIsAddProductOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        shopCategory={shop?.category}
        onSuccess={() => fetchDashboardData(false)}
      />

      {/* Respond Modal (Preserved Existing Capability) */}
      {selectedRespondRequest && (
        <RespondModal
          isOpen={!!selectedRespondRequest}
          onClose={() => setSelectedRespondRequest(null)}
          requestItem={selectedRespondRequest}
          onSuccess={() => fetchDashboardData()}
        />
      )}
    </div>
  );
};

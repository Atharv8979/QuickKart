import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Store, MessageSquare, CheckCircle2, PackageCheck, AlertTriangle, Clock, Truck, Landmark, Navigation } from 'lucide-react';
import { Badge } from '../common/Badge';
import { isDemoCatalogue } from './customerItemUtils';

export const ShopCard = ({ shop, onBroadcastClick }) => {
  // Demo shops are local fixtures, not verified businesses — they must never
  // wear the "Verified" badge that real, moderation-approved shops earn.
  const isDemoShop = isDemoCatalogue(shop);
  // Opening hours / distance / rating are only claimed when the shop record
  // actually publishes them; missing data is shown as "not listed", never
  // guessed (no fabricated "Open", "Nearby" or "4.5").
  const hoursKnown = Boolean(shop.openingHours);
  const isOpen = hoursKnown ? shop.openingHours.isOpenNow !== false : null;
  const hasDistance = shop.distanceKm != null && Number.isFinite(Number(shop.distanceKm));
  const distanceValue = hasDistance ? Number(shop.distanceKm) : null;
  const hasRating = shop.rating != null && Number.isFinite(Number(shop.rating));
  const ratingValue = hasRating ? Number(shop.rating) : null;
  const products = shop.topProducts || [];
  const availableItems = shop.availableItemCount ?? products.filter((item) => item.isAvailable !== false).length;
  const lowStockItems = shop.lowStockItemCount ?? products.filter((item) => {
    const quantity = item.quantityInStock ?? item.quantity_in_stock;
    const threshold = item.lowStockThreshold ?? item.low_stock_threshold ?? 3;
    return item.isAvailable !== false && Number.isFinite(Number(quantity)) && Number(quantity) <= Number(threshold);
  }).length;
  const hasStock = availableItems > 0;
  const addr = shop.address || {};
  const addressLine = [addr.street, addr.area].filter(Boolean).join(', ');
  const cityLine = [addr.city, addr.state].filter(Boolean).join(', ') + (addr.pincode ? ` - ${addr.pincode}` : '');
  const hasAddress = Boolean(addressLine || cityLine);

  return (
    <div className="group bg-white rounded-3xl border border-slate-200/70 shadow-[0_4px_18px_rgba(2,6,23,0.08)] hover:shadow-[0_14px_34px_rgba(2,6,23,0.16)] hover:-translate-y-1 hover:border-brand-200/70 transition-all duration-300 overflow-hidden flex flex-col">
      {/* Banner / Header */}
      <div className="h-40 relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <img
          src={shop.bannerImage || shop.images?.[0] || 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80'}
          alt={shop.shopName}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/25 to-transparent" />

        {/* Distance Badge — only when the shop record carries a real distance */}
        {hasDistance && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-brand-600" />
            <span>{distanceValue.toFixed(1)} km</span>
          </div>
        )}

        {/* Live open/closed + verification chips */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-sm ${
            !hoursKnown ? 'bg-slate-200/90 text-slate-600' : isOpen ? 'bg-emerald-500/90 text-white' : 'bg-slate-200/90 text-slate-600'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${hoursKnown && isOpen ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
            {!hoursKnown ? 'Hours n/a' : isOpen ? 'Open' : 'Closed'}
          </span>
          {isDemoShop ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/90 text-white backdrop-blur-md text-[10px] font-bold shadow-sm">
              <AlertTriangle className="w-3 h-3" />
              Demo shop
            </span>
          ) : shop.verificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/90 text-white backdrop-blur-md text-[10px] font-bold shadow-sm">
              <CheckCircle2 className="w-3 h-3" />
              Verified
            </span>
          ) : null}
        </div>

        {/* Shop Title overlay */}
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-extrabold text-lg leading-tight drop-shadow group-hover:text-brand-300 transition-colors">
            {shop.shopName}
          </h3>
          <p className="text-[11px] text-slate-100 font-medium truncate drop-shadow">
            {shop.tagline || shop.category}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        {/* Rating & Category */}
        <div className="flex items-center justify-between text-xs">
          <div className="inline-flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/70 font-bold text-amber-900 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            {hasRating ? (
              <>
                <span>{ratingValue.toFixed(1)}</span>
                <span className="text-amber-600/80 font-medium">({shop.reviewCount ?? shop.numReviews ?? 0})</span>
              </>
            ) : (
              <span className="text-amber-700/80 font-medium">No ratings yet</span>
            )}
          </div>

          <Badge variant="primary">{shop.category}</Badge>
        </div>

        {/* Real shop address */}
        {hasAddress && (
          <div className="bg-gradient-to-br from-brand-50 to-slate-50 border border-brand-100/70 rounded-2xl px-3 py-2.5 space-y-1">
            <div className="flex items-start gap-2 text-xs text-slate-800 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-brand-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                {addressLine && <p className="truncate">{addressLine}</p>}
                {cityLine && <p className="text-[11px] text-slate-500 font-medium truncate">{cityLine}</p>}
              </div>
            </div>
            {shop.landmark && (
              <div className="flex items-start gap-2 text-[11px] text-slate-500">
                <Landmark className="w-3 h-3 text-brand-500 mt-0.5 flex-shrink-0" />
                <span className="truncate">{shop.landmark}</span>
              </div>
            )}
            <a
              href={
                shop.location?.coordinates
                  ? `https://www.google.com/maps/dir/?api=1&destination=${shop.location.coordinates[1]},${shop.location.coordinates[0]}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.shopName} ${cityLine}`)}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:text-brand-800 transition-colors"
            >
              <Navigation className="w-3 h-3" />
              Get Directions
            </a>
          </div>
        )}

        {/* Hours & Delivery capability */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
            !hoursKnown
              ? 'bg-slate-50 border-slate-200 text-slate-500'
              : isOpen
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-600'
          }`}>
            <Clock className="w-3 h-3" />
            {!hoursKnown
              ? 'Opening hours not listed'
              : isOpen
              ? shop.openingHours?.close
                ? `Open until ${shop.openingHours.close}`
                : 'Open now'
              : 'Closed'}
          </span>
          {shop.deliveryAvailable ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-sky-50 border-sky-200 text-sky-700">
              <Truck className="w-3 h-3" />
              Home delivery {shop.deliveryEtaMinutes ? `~${shop.deliveryEtaMinutes} min` : 'available'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border bg-slate-50 border-slate-200 text-slate-500">
              <Store className="w-3 h-3" />
              Store pickup only
            </span>
          )}
        </div>

        {/* Live Business Capability (Chapter 16.4 & Chapter 6) */}
        <div className="bg-slate-50/80 rounded-2xl p-2.5 text-xs text-slate-600 space-y-1.5 border border-slate-200/70">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-medium">Live Status</span>
            <span className={`font-bold inline-flex items-center gap-1 ${!hoursKnown ? 'text-slate-500' : isOpen ? 'text-emerald-600' : 'text-rose-500'}`}>
              <span className={`w-2 h-2 rounded-full ${!hoursKnown ? 'bg-slate-300' : isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {!hoursKnown ? 'Hours not listed' : isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
            <span className="text-slate-400 font-medium">Stock preview</span>
            <span className="font-bold text-slate-800 inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-600"><PackageCheck className="w-3.5 h-3.5" />{availableItems} in stock</span>
              {!hasStock && <span className="text-rose-600 font-medium">No stock</span>}
              {lowStockItems > 0 && <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />{lowStockItems} low</span>}
            </span>
          </div>
          {shop.liveState && (
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-400">Queue / Response:</span>
              <span className="font-semibold text-slate-700">
                ~{shop.liveState.queueTimeMinutes || 5} min • {shop.liveState.responseRatePercent || 95}% rate
              </span>
            </div>
          )}
        </div>

        {/* Top Product preview tags */}
        {shop.topProducts && shop.topProducts.length > 0 && (
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
              Popular in store
            </span>
            <div className="flex flex-wrap gap-1.5">
              {shop.topProducts.map((p) => (
                <span
                  key={p._id}
                  className="text-[11px] bg-slate-100/90 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200/70 font-medium truncate max-w-[150px]"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
          <Link
            to={`/shops/${shop._id}`}
            className="flex-1 py-2.5 text-center text-xs font-bold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 rounded-xl transition-all shadow-sm shadow-brand-600/20 flex items-center justify-center gap-1"
          >
            <Store className="w-3.5 h-3.5" />
            View Store
          </Link>
          <button
            onClick={() => onBroadcastClick && onBroadcastClick(shop)}
            className="flex-1 py-2.5 text-center text-xs font-bold text-brand-700 bg-white border-2 border-brand-200 hover:bg-brand-50 rounded-xl transition-all flex items-center justify-center gap-1"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Ask Stock
          </button>
        </div>
      </div>
    </div>
  );
};

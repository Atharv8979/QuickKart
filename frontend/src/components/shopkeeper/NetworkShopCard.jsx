import React from 'react';
import { Link } from 'react-router-dom';
import { Store, MapPin, Star, CheckCircle2, PackageCheck } from 'lucide-react';

// Linked network card — renders one shop from the SAME /shops/nearby feed the
// customer dashboard orders from. Same IDs => customer holds route here.
export const NetworkShopCard = ({ netShop, shop }) => {
  const netId = netShop?._id || netShop?.id;
  const myId = shop?._id || shop?.id;
  const isMine = netId && myId && String(netId) === String(myId);
  const addr = netShop?.address || {};
  const areaLine = [addr.area, addr.city].filter(Boolean).join(', ');
  const rating = Number(netShop?.rating);
  const listed = Array.isArray(netShop?.topProducts) ? netShop.topProducts.length : 0;

  return (
    <div
      className={`rounded-2xl border overflow-hidden flex flex-col transition-all ${
        isMine
          ? 'border-emerald-300 ring-2 ring-emerald-100 shadow-md'
          : 'border-slate-200 hover:border-brand-200 hover:shadow-md'
      }`}
    >
      <div className="h-28 relative bg-slate-100 overflow-hidden">
        <img
          src={netShop?.bannerImage || 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?auto=format&fit=crop&w=800&q=80'}
          alt={netShop?.shopName || 'Linked shop'}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        {isMine ? (
          <span className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> YOUR STORE
          </span>
        ) : (
          <span className="absolute top-2 left-2 bg-white/90 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full shadow">
            LINKED SHOP
          </span>
        )}
        {Number.isFinite(Number(netShop?.distanceKm)) && (
          <span className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 shadow flex items-center gap-1">
            <MapPin className="w-3 h-3 text-brand-600" />
            {Number(netShop.distanceKm).toFixed(1)} km
          </span>
        )}
        <p className="absolute bottom-2 left-3 right-3 text-white text-sm font-black truncate drop-shadow">
          {netShop?.shopName || 'Linked shop'}
        </p>
      </div>
      <div className="p-3.5 space-y-2 flex-1 flex flex-col">
        <p className="text-[11px] text-slate-500 truncate">
          {areaLine || netShop?.category || 'Local shop'}
          {netShop?.category && areaLine ? ` • ${netShop.category}` : ''}
        </p>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-500" />
            {Number.isFinite(rating) ? rating.toFixed(1) : '4.5'}
          </span>
          <span className={`font-bold ${netShop?.openingHours?.isOpenNow !== false ? 'text-emerald-600' : 'text-rose-500'}`}>
            {netShop?.openingHours?.isOpenNow !== false ? '● Open' : '● Closed'}
          </span>
          <span className="text-slate-500 flex items-center gap-1">
            <PackageCheck className="w-3 h-3" /> {listed} items
          </span>
        </div>
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2 mt-auto">
          <Link
            to={`/shops/${netId}`}
            className="flex-1 py-2 text-center text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1"
          >
            <Store className="w-3 h-3" /> View as Customer
          </Link>
          <Link
            to="/shop/reservations"
            className="flex-1 py-2 text-center text-[11px] font-bold text-brand-700 bg-brand-50 border border-brand-200 hover:bg-brand-100 rounded-xl transition-colors"
          >
            {isMine ? 'My Orders' : 'Shop Orders'}
          </Link>
        </div>
      </div>
    </div>
  );
};

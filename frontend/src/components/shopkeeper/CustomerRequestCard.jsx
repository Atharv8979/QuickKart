import React from 'react';
import {
  Clock,
  Check,
  X,
  Scale,
  Package,
  IndianRupee,
  User,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export const CustomerRequestCard = ({
  request,
  onAccept,
  onReject,
  onBargain,
  onConfirmOrder,
  actionLoading = false,
}) => {
  const {
    id,
    _id,
    productName,
    productImage,
    category,
    quantity = 1,
    unit = 'piece',
    shopStock = 0,
    customerOffer = 0,
    currentPrice = 0,
    status = 'PENDING',
    createdAt,
    customerName = 'Customer',
    notes,
    negotiationHistory = [],
  } = request;

  const reqId = id || _id;
  const isPending = status === 'PENDING';
  const isBargaining = status === 'BARGAINING';
  const isAccepted = status === 'ACCEPTED';
  const isRejected = status === 'REJECTED';
  const isConfirmed = status === 'CONFIRMED';

  const priceDiff = currentPrice - customerOffer;
  const discountPct = currentPrice > 0 ? Math.round((priceDiff / currentPrice) * 100) : 0;

  // Stock status logic
  const isStockHealthy = shopStock >= quantity;
  const isStockLow = shopStock > 0 && shopStock < 5;
  const isOutOfStock = shopStock <= 0;

  // Format timestamp
  const formatTime = (ts) => {
    if (!ts) return 'Just now';
    const date = new Date(ts);
    const diffMin = Math.round((Date.now() - date.getTime()) / (60 * 1000));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-sm relative overflow-hidden ${
        isBargaining
          ? 'border-amber-300 ring-2 ring-amber-400/20 shadow-amber-500/5'
          : isAccepted
          ? 'border-emerald-300 bg-emerald-50/10'
          : isRejected
          ? 'border-slate-200 opacity-60'
          : 'border-slate-200 hover:border-brand-300 hover:shadow-md'
      }`}
    >
      {/* Golden top trim when in bargaining or accepted */}
      {isBargaining && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-600" />
      )}
      {isAccepted && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
      )}

      <div className="space-y-3.5">
        {/* Top bar: Category + Status + Time */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {category || 'Product Request'}
          </span>

          <div className="flex items-center gap-1.5">
            {isPending && (
              <span className="bg-brand-50 text-brand-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-brand-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                New Request
              </span>
            )}
            {isBargaining && (
              <span className="bg-amber-100 text-amber-900 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-sm">
                <span>⚖️</span> Active Bargain
              </span>
            )}
            {isAccepted && (
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" /> Deal Accepted
              </span>
            )}
            {isConfirmed && (
              <span className="bg-purple-100 text-purple-800 text-[11px] font-black px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
                <Package className="w-3 h-3 text-purple-600" /> Order Confirmed
              </span>
            )}
            {isRejected && (
              <span className="bg-slate-100 text-slate-500 text-[11px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                Declined
              </span>
            )}

            <span className="text-[11px] text-slate-400 font-medium flex items-center gap-0.5 ml-1">
              <Clock className="w-3 h-3" /> {formatTime(createdAt)}
            </span>
          </div>
        </div>

        {/* Product Visual & Title */}
        <div className="flex items-start gap-3.5">
          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
            {productImage ? (
              <img
                src={productImage}
                alt={productName}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <Package className="w-8 h-8 text-slate-300" />
            )}
            {discountPct > 0 && isPending && (
              <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 backdrop-blur-sm text-white text-[9px] font-black text-center py-0.5">
                -{discountPct}% Offer
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
              {productName}
            </h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-slate-400" /> {customerName}
            </p>
          </div>
        </div>

        {/* Essential Metrics Grid: Requested Qty, Shop Stock, Customer Offer, Current Price */}
        <div className="grid grid-cols-2 gap-2 bg-slate-50/80 rounded-xl p-3 border border-slate-100 text-xs">
          {/* Requested Quantity */}
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              Requested Qty:
            </span>
            <span className="text-sm font-black text-slate-900">
              {quantity} {unit}
            </span>
          </div>

          {/* Shop Stock Availability */}
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              Shop Stock:
            </span>
            <span
              className={`text-sm font-black flex items-center gap-1 ${
                isOutOfStock
                  ? 'text-red-600'
                  : isStockLow
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOutOfStock
                    ? 'bg-red-500'
                    : isStockLow
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
              {shopStock} in stock
            </span>
          </div>

          {/* Customer Offer */}
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              Customer Budget:
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-brand-600">
                {customerOffer > 0 ? `₹${customerOffer}` : 'Flexible'}
              </span>
              {customerOffer > 0 && <span className="text-[10px] text-slate-400 font-medium">INR</span>}
            </div>
          </div>

          {/* Current Catalog Price */}
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block">
              Current Price:
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-slate-700 line-through decoration-slate-300">
                {currentPrice > 0 ? `₹${currentPrice}` : 'Not listed'}
              </span>
              {currentPrice > 0 && <span className="text-[10px] text-slate-400 font-medium">/ unit</span>}
            </div>
          </div>
        </div>

        {/* Customer Note if any */}
        {notes && (
          <div className="text-[11px] text-slate-600 bg-amber-50/60 border border-amber-100 p-2 rounded-lg italic">
            "{notes}"
          </div>
        )}

        {/* Recent Negotiation Snippet if in Bargaining */}
        {negotiationHistory.length > 0 && (
          <div className="space-y-1 bg-amber-50/40 rounded-xl p-2.5 border border-amber-200/60">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <span>⚖️</span> Latest Negotiation Exchange:
            </span>
            <p className="text-xs text-slate-700 font-medium truncate">
              <strong>{negotiationHistory[negotiationHistory.length - 1]?.senderName}:</strong>{' '}
              "{negotiationHistory[negotiationHistory.length - 1]?.message}"
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons: Accept | Reject | ⚖️ Bargain */}
      <div className="pt-4 mt-3 border-t border-slate-100">
        {isPending || isBargaining ? (
          <div className="flex items-center gap-2">
            {/* Reject Button */}
            <button
              onClick={() => onReject && onReject(reqId)}
              disabled={actionLoading}
              title="Reject Request"
              className="px-3 py-2 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-xs transition-colors flex items-center justify-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reject</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={() => onAccept && onAccept(reqId)}
              disabled={actionLoading}
              title="Accept Customer Offer Directly"
              className="flex-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Accept ₹{customerOffer}
            </button>

            {/* Bargain Button */}
            <button
              onClick={() => onBargain && onBargain(request)}
              disabled={actionLoading}
              title="Open Bargaining Interface"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-sm">⚖️</span>
              <span>Bargain</span>
            </button>
          </div>
        ) : isAccepted ? (
          <div className="flex items-center justify-between gap-2 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
            <div className="text-xs">
              <span className="font-bold text-emerald-900 block">
                Agreed at ₹{request.agreedPrice || customerOffer} / unit
              </span>
              <span className="text-[11px] text-emerald-700">
                Total: ₹{((request.agreedPrice || customerOffer) * quantity).toLocaleString('en-IN')}
              </span>
            </div>
            <button
              onClick={() => onConfirmOrder && onConfirmOrder(request)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm flex items-center gap-1"
            >
              Confirm Order <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isConfirmed ? (
          <div className="text-xs font-bold text-purple-700 bg-purple-50 p-2 rounded-xl border border-purple-200 text-center">
            Ticket #{request.reservationCode || 'QK-DONE'} • In Pickup Queue
          </div>
        ) : (
          <div className="text-xs font-bold text-slate-400 text-center py-1">
            Offer Declined
          </div>
        )}
      </div>
    </div>
  );
};

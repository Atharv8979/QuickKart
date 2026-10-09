import React, { useEffect, useState } from 'react';
import { Star, MapPin, Clock, MessageSquare, ShoppingBag, CheckCircle2, Sparkles, Check, Send } from 'lucide-react';
import { Badge } from '../common/Badge';

const RequestActivity = ({ request, onRespondToBargain, responding }) => {
  const history = Array.isArray(request?.negotiationHistory) ? request.negotiationHistory : [];
  const latest = history[history.length - 1];
  const shopOffer = [...history].reverse().find(
    (item) => item.sender === 'shopkeeper' && item.offer != null && Number.isFinite(Number(item.offer))
  );
  const [counterOffer, setCounterOffer] = useState('');

  useEffect(() => {
    setCounterOffer(shopOffer ? String(shopOffer.offer) : '');
  }, [request?._id, shopOffer?.offer]);

  const status = request?.status || 'ACTIVE';
  const statusLabel = {
    ACTIVE: 'Waiting for offers',
    PENDING: 'Waiting for offers',
    BARGAINING: 'Bargaining',
    ACCEPTED: 'Deal accepted',
    REJECTED: 'Request declined',
    CONFIRMED: 'Order confirmed',
    CLOSED: 'Request closed',
    EXPIRED: 'Request expired',
  }[status] || status;
  const statusClass = status === 'ACCEPTED' || status === 'CONFIRMED'
    ? 'bg-emerald-100 text-emerald-800'
    : status === 'REJECTED'
    ? 'bg-rose-100 text-rose-800'
    : status === 'BARGAINING'
    ? 'bg-amber-100 text-amber-800'
    : 'bg-slate-100 text-slate-700';
  const canRespond = status === 'BARGAINING' && latest?.sender === 'shopkeeper' && onRespondToBargain;

  if (!history.length && status === 'ACTIVE') return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3" aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-sm text-slate-900">Request activity</h4>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${statusClass}`}>{statusLabel}</span>
      </div>
      {request?.agreedPrice != null && (
        <p className="text-sm font-bold text-emerald-700">Agreed price: ₹{Number(request.agreedPrice).toLocaleString('en-IN')}</p>
      )}
      {history.length > 0 && (
        <ol className="space-y-2">
          {history.map((item, index) => (
            <li key={`${item.time || 'activity'}-${index}`} className="text-xs bg-slate-50 rounded-xl p-3">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-slate-800">{item.senderName || (item.sender === 'shopkeeper' ? 'Shopkeeper' : 'Customer')}</span>
                {item.offer != null && Number.isFinite(Number(item.offer)) && (
                  <span className="font-black text-brand-700">₹{Number(item.offer).toLocaleString('en-IN')}</span>
                )}
              </div>
              {item.message && <p className="text-slate-600 mt-1">{item.message}</p>}
            </li>
          ))}
        </ol>
      )}
      {canRespond && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-bold text-amber-900">
            Shop offer: ₹{Number(shopOffer.offer).toLocaleString('en-IN')}. Accept it or send a counter-offer.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={responding}
              onClick={() => onRespondToBargain({ action: 'accept' })}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" /> Accept offer
            </button>
            <div className="flex gap-1">
              <input
                aria-label="Counter-offer amount in rupees"
                type="number"
                min="1"
                value={counterOffer}
                onChange={(event) => setCounterOffer(event.target.value)}
                className="w-32 px-2.5 rounded-lg border border-slate-300 text-xs"
              />
              <button
                type="button"
                disabled={responding || !Number.isFinite(Number(counterOffer)) || Number(counterOffer) <= 0}
                onClick={() => onRespondToBargain({ action: 'counter', counterOffer: Number(counterOffer) })}
                className="px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" /> Counter
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const ComparisonGrid = ({ request, responses = [], onChat, onReserve, onRespondToBargain, responding }) => {
  const requestTitle = request?.productName || 'your request';
  const requestedQuantity = request?.quantity ?? '—';
  const requestedUnit = request?.unit || 'unit';

  if (!responses.length) {
    return (
      <div className="space-y-4">
        <RequestActivity request={request} onRespondToBargain={onRespondToBargain} responding={responding} />
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-8 text-center">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-slate-700 text-sm">Waiting for Shopkeeper Offers...</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Your request for "{requestTitle}" has been broadcast to nearby shops. Offers usually arrive within a few minutes!
          </p>
        </div>
      </div>
    );
  }

  // Sort: Best Value first, then lowest price
  const sortedResponses = [...responses].sort((a, b) => {
    if (a.isBestValue) return -1;
    if (b.isBestValue) return 1;
    return (a.offeredPrice || Infinity) - (b.offeredPrice || Infinity);
  });

  return (
    <div className="space-y-4">
      <RequestActivity request={request} onRespondToBargain={onRespondToBargain} responding={responding} />
      {/* Request Header Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] uppercase font-bold text-brand-600 tracking-wider">
            Live Comparison Grid (Fig 10.2)
          </span>
          <h3 className="text-lg font-black text-slate-900 leading-tight">
            Request: "{requestTitle}"
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quantity: {requestedQuantity} {requestedUnit} • {responses.length} shops responded
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">{responses.length} Quotes Received</Badge>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards Grid (Fig 10.2) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedResponses.map((item) => {
          const shop = item.shopId;
          const isBestValue = item.isBestValue;
          const isAvailable = item.availabilityStatus === 'available';
          const isAlternative = item.availabilityStatus === 'available_alternative';
          const isNotAvailable = item.availabilityStatus === 'not_available';
          // Missing ratings/distances are disclosed, never guessed.
          const shopRatingValue = shop?.rating != null ? Number(shop.rating) : NaN;
          const hasShopRating = Number.isFinite(shopRatingValue);
          const distanceValue = item.distanceKm != null ? Number(item.distanceKm) : NaN;
          const hasDistance = Number.isFinite(distanceValue);

          return (
            <div
              key={item._id}
              className={`relative bg-white rounded-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                isBestValue
                  ? 'border-2 border-emerald-500 ring-4 ring-emerald-500/10'
                  : 'border border-slate-200'
              }`}
            >
              {/* Best Value Highlight Badge */}
              {isBestValue && (
                <div className="bg-emerald-500 text-white text-[11px] font-black tracking-wider uppercase text-center py-1.5 flex items-center justify-center gap-1.5 shadow-inner">
                  <Sparkles className="w-3.5 h-3.5" />
                  BEST VALUE OFFER
                </div>
              )}

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Shop Name & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-base text-slate-900 leading-tight">
                      {shop?.shopName || 'Neighborhood Store'}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {shop?.address?.area || shop?.address?.street || 'Local Market'}
                  </p>
                </div>

                {/* Big Price Display */}
                <div className="py-2 text-center bg-slate-50 rounded-xl border border-slate-100">
                  {isNotAvailable ? (
                    <span className="text-base font-bold text-rose-500">Out of Stock</span>
                  ) : (
                    <div>
                      <span
                        className={`text-3xl font-black ${
                          isBestValue ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        ₹{item.offeredPrice}
                      </span>
                      {item.preparationTimeMinutes && (
                        <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Ready in ~{item.preparationTimeMinutes} mins
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Alternative details if any */}
                {isAlternative && (
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold">Alternative Offer:</p>
                    <p className="text-[11px] mt-0.5">{item.alternativeProductName || item.notes}</p>
                  </div>
                )}

                {/* Notes from shopkeeper */}
                {item.notes && !isAlternative && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl italic">
                    "{item.notes}"
                  </p>
                )}

                {/* Distance & Rating Stats */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-600" /> Distance:
                    </span>
                    <span className="font-bold text-slate-800">
                      {hasDistance ? `${distanceValue.toFixed(1)} km away` : 'Distance not available'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Rating:
                    </span>
                    <span className="font-bold text-slate-800">
                      {hasShopRating ? `${shopRatingValue.toFixed(1)}★ (${shop?.reviewCount || 0})` : 'No ratings yet'}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Chat • Reserve */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => onChat?.(item)}
                    className="flex-1 py-2 text-center text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Chat
                  </button>

                  <button
                    onClick={() => onReserve?.(item)}
                    disabled={isNotAvailable}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 shadow-sm ${
                      isBestValue
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                        : isNotAvailable
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
                    }`}
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Reserve
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';
import { Clock, MapPin, IndianRupee, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '../common/Badge';

export const IncomingRequestCard = ({ requestItem, onRespondClick }) => {
  const request = requestItem || {};
  const response = request.myResponse && typeof request.myResponse === 'object'
    ? request.myResponse
    : null;
  const hasResponded = Boolean(response);
  const isImmediate = request.urgency === 'immediate';
  const customerBudget = request.expectedBudget ?? request.expected_budget ?? request.budget;
  const distanceKm = Number(request.distanceKm);
  const hasDistance = request.distanceKm != null && request.distanceKm !== '' && Number.isFinite(distanceKm);
  const availabilityStatus = response?.availabilityStatus
    ? String(response.availabilityStatus).replace(/_/g, ' ')
    : 'available';

  return (
    <div
      className={`bg-white rounded-2xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm ${
        hasResponded
          ? 'border-slate-200 opacity-90'
          : 'border-brand-200 ring-2 ring-brand-500/10'
      }`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasResponded ? 'bg-emerald-500' : 'bg-brand-500 animate-pulse'
              }`}
            />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {request.category || 'Product Request'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isImmediate && <Badge variant="danger">⚡ Urgent Inquiry</Badge>}
            {hasResponded && <Badge variant="success">Offer Sent</Badge>}
          </div>
        </div>

        {/* Product Title */}
        <h4 className="text-base font-black text-slate-900 leading-snug">
          {request.productName || 'Requested product'}
        </h4>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <span className="text-slate-400 font-medium">Quantity Needed:</span>
            <p className="font-bold text-slate-800">
              {request.quantity ?? 1} {request.unit || 'piece'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Customer Budget:</span>
            <p className="font-bold text-slate-800">
              {customerBudget != null ? `₹${customerBudget}` : 'Flexible'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Customer Distance:</span>
            <p className="font-bold text-brand-600 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {hasDistance ? `${distanceKm.toFixed(1)} km away` : 'Nearby'}
            </p>
          </div>

          <div>
            <span className="text-slate-400 font-medium">Customer Name:</span>
            <p className="font-bold text-slate-800">
              {request.customerName || request.customerId?.name || request.customer?.name || 'Customer'}
            </p>
          </div>
        </div>

        {/* Note */}
        {(request.notes || request.note) && (
          <p className="text-xs text-slate-600 italic mt-2.5 bg-brand-50/50 p-2.5 rounded-xl border border-brand-100">
            Note: "{request.notes || request.note}"
          </p>
        )}

        {/* Current Response if already sent */}
        {hasResponded && (
          <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
            <div className="flex justify-between items-center font-bold">
              <span>Your Sent Quote:</span>
              <span className="text-emerald-700 font-black text-sm">
                ₹{response.offeredPrice ?? response.offered_price ?? '—'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-0.5">
              Status: {availabilityStatus} • Ready in ~
              {response.preparationTimeMinutes ?? response.prepEtaMinutes ?? response.prep_eta_minutes ?? 10} min
            </p>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
        <button
          onClick={() => onRespondClick?.(request)}
          className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
            hasResponded
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          {hasResponded ? 'Update Your Offer' : 'Respond with Stock & Price'}
        </button>
      </div>
    </div>
  );
};

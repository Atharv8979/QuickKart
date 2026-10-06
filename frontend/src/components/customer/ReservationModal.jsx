import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { reservationService } from '../../services/reservationService';
import { useNotification } from '../../context/NotificationContext';
import { ShoppingBag, ShieldCheck, AlertTriangle, Store, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  DEMO_FALLBACK_SHOP_NAME,
  HOLD_DURATION_OPTIONS,
  getHoldDurationValue,
  getPriceValue,
  getReservationReadiness,
  getRoutedProductId,
  getRoutedShopId,
  getRoutedShopName,
  getStockQuantity,
} from './customerItemUtils';

const formatAmount = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const rounded = Math.round(num * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};

export const ReservationModal = ({ isOpen, onClose, targetItem, onSuccess }) => {
  const { addToast } = useNotification();
  const [quantity, setQuantity] = useState('1');
  const [customerNote, setCustomerNote] = useState('');
  const [holdMinutes, setHoldMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Demo-catalogue rows carry slug ids (not DB UUIDs). The backend routes them
  // to the linked live partner shop (`DEMO_FALLBACK_SHOP_ID`), keeping the
  // original demo shop name in `demoShopName` for traceability.
  const productIdValue = getRoutedProductId(targetItem);
  const shopIdValue = getRoutedShopId(targetItem);
  const demoShopLabel = (() => {
    try {
      const raw = targetItem?.shopId ?? targetItem?.shop;
      const name =
        (raw && typeof raw === 'object' ? raw.shopName || raw.shop_name : null) ||
        targetItem?.shopName ||
        null;
      return name;
    } catch {
      return null;
    }
  })();
  // Parents such as Smart Search keep this modal mounted and swap the product
  // in, so every field has to reset when a different listing is opened —
  // otherwise the previous item's quantity/note leaked into the next hold.
  const itemKey = `${productIdValue || 'none'}::${shopIdValue || 'none'}`;

  useEffect(() => {
    if (!targetItem) return;
    const seedQuantity = Number(targetItem.quantity);
    setQuantity(Number.isFinite(seedQuantity) && seedQuantity > 0 ? String(Math.floor(seedQuantity)) : '1');
    setCustomerNote('');
    setHoldMinutes(getHoldDurationValue(targetItem.holdDurationMinutes));
    setSubmitError('');
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKey, isOpen]);

  if (!targetItem) return null;

  const unitPrice = getPriceValue(targetItem);
  const shopName = getRoutedShopName(targetItem);
  const shopId = shopIdValue;
  const stock = getStockQuantity(targetItem);
  const readiness = getReservationReadiness(targetItem);
  const canReserve = readiness.canReserve;
  const maxQuantity = Number.isFinite(stock) ? Math.max(1, Math.floor(stock)) : null;
  const requestedQuantity = Math.max(1, parseInt(quantity, 10) || 1);
  const effectiveQuantity = maxQuantity === null ? requestedQuantity : Math.min(requestedQuantity, maxQuantity);
  const quantityExceedsStock = maxQuantity !== null && requestedQuantity > maxQuantity;
  const totalPrice = unitPrice === null ? null : unitPrice * effectiveQuantity;
  const productName =
    targetItem.name ||
    targetItem.productName ||
    targetItem.product_name ||
    targetItem.alternativeProductName ||
    null;

  const clampQuantityInput = (raw) => {
    if (raw === '') return '';
    const next = parseInt(raw, 10);
    if (!Number.isFinite(next)) return '';
    if (next < 1) return '1';
    if (maxQuantity !== null && next > maxQuantity) return String(maxQuantity);
    return String(next);
  };

  // Demo listings post `productId: null` (DB column is nullable) plus the
  // human `productName`; the backend resolves the routed shop UUID and keeps
  // the original demo storefront in the customer note for the shopkeeper.

  const handleConfirmHold = async (e) => {
    e.preventDefault();
    // Duplicate-submission guard: a second confirm click while the first
    // request is in flight must never create a second hold ticket.
    if (loading) return;
    if (!canReserve) {
      setSubmitError(readiness.message);
      return;
    }
    if (!productName) {
      setSubmitError('This listing has no product name, so the shop cannot identify the item to hold.');
      return;
    }

    setSubmitError('');
    setLoading(true);

    try {
      const routedNoteParts = [];
      if (readiness.isDemoRouted && demoShopLabel) {
        routedNoteParts.push(`Demo storefront: ${demoShopLabel}`);
      }
      if (customerNote.trim()) routedNoteParts.push(customerNote.trim());
      const res = await reservationService.createReservation({
        shopId,
        productId: productIdValue,
        requestId: targetItem.requestId || null,
        productName,
        quantity: effectiveQuantity,
        unit: targetItem.unit || 'piece',
        agreedPrice: unitPrice,
        customerNote: routedNoteParts.join(' | ') || undefined,
        holdDurationMinutes: getHoldDurationValue(holdMinutes),
      });

      if (!res || res.success !== true) {
        throw new Error(res?.message || 'The shop could not confirm this hold. Please try again.');
      }
      if (!res.reservation) {
        throw new Error('The shop confirmed the request but returned no hold ticket. Please check "My Reservations" before retrying.');
      }

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      addToast(
        `🎉 Product Hold Confirmed! Ticket Code: ${res.reservation.reservationCode}. Shop has set item aside for you.`,
        'success',
        7000
      );
      onClose();
      if (onSuccess) onSuccess(res.reservation);
    } catch (err) {
      // The customer's input is deliberately preserved so the hold can be
      // retried after a transient failure.
      setSubmitError(
        err.response?.data?.message || err.message || 'Failed to create reservation. Please try again.'
      );
      addToast(err.response?.data?.message || err.message || 'Failed to create reservation', 'error', 6000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🛍️ Confirm In-Store Hold & Reservation" maxWidth="max-w-md">
      <form onSubmit={handleConfirmHold} className="space-y-4">
        {canReserve ? (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 text-emerald-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Zero Upfront Payment Required</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              The shopkeeper will hold this product exclusively for you. You inspect and pay at the shop counter when you visit.
            </p>
            {readiness.isDemoRouted && (
              <p className="text-[11px] font-semibold text-emerald-800 bg-white/70 border border-emerald-200 rounded-xl px-3 py-2">
                Demo listing — fulfilled by the linked partner shop ({DEMO_FALLBACK_SHOP_NAME}
                {shopName && shopName !== DEMO_FALLBACK_SHOP_NAME ? `, billed as "${shopName}"` : ''}). The shopkeeper will see which demo storefront you browsed.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>In-store hold unavailable for this listing</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">{readiness.message}</p>
            <div className="rounded-xl bg-white/70 border border-amber-200 p-3 space-y-1.5">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-800">Working alternatives</p>
              <Link
                to="/products"
                className="flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline"
              >
                <Store className="w-3.5 h-3.5" /> Browse verified live inventory
              </Link>
              <Link
                to="/customer/requests"
                className="flex items-center gap-1.5 text-xs font-bold text-brand-700 hover:underline"
              >
                <Send className="w-3.5 h-3.5" /> Broadcast a request so nearby shops can quote you
              </Link>
            </div>
          </div>
        )}

        {/* Item Summary */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Store:</span>
            <span className="font-bold text-slate-800">{shopName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Product:</span>
            <span className="font-bold text-slate-800">{productName || 'Not specified'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Unit Price:</span>
            <span className="font-bold text-slate-800">
              {unitPrice === null ? 'Not listed by the shop' : `₹${formatAmount(unitPrice)}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-medium">Shop stock:</span>
            <span className="font-bold text-slate-800">
              {stock === null
                ? 'Not published by the shop'
                : `${Math.max(0, Math.floor(stock))} ${targetItem.unit || 'unit'}(s)`}
            </span>
          </div>
        </div>

        {/* Quantity & Hold Duration — hidden entirely when the hold cannot be
            created, so no control implies an action that cannot succeed. */}
        {canReserve && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxQuantity ?? undefined}
                  value={quantity}
                  onChange={(e) => setQuantity(clampQuantityInput(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Hold Duration
                </label>
                <select
                  value={holdMinutes}
                  onChange={(e) => setHoldMinutes(getHoldDurationValue(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {HOLD_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {quantityExceedsStock && (
              <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Only {maxQuantity} {targetItem.unit || 'unit'}(s) are in stock, so the hold will ask for{' '}
                {maxQuantity}.
              </p>
            )}

            {/* Customer Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Note for Shopkeeper (Optional)
              </label>
              <input
                type="text"
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                placeholder="e.g. Arriving on bike in 25 mins"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Total Price Banner */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white">
              <span className="text-xs font-medium text-slate-300">
                Total Payable at Counter ({effectiveQuantity} {targetItem.unit || 'unit'}):
              </span>
              <span className="text-xl font-black text-brand-400">
                {totalPrice === null ? '—' : `₹${formatAmount(totalPrice)}`}
              </span>
            </div>
          </>
        )}

        {submitError && (
          <p className="flex items-start gap-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{submitError}</span>
          </p>
        )}

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            {canReserve ? 'Cancel' : 'Close'}
          </button>
          <button
            type="submit"
            disabled={loading || !canReserve}
            title={canReserve ? undefined : readiness.message}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-4 h-4" />
            {loading ? 'Confirming Hold...' : canReserve ? 'Confirm In-Store Hold' : 'Hold unavailable'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

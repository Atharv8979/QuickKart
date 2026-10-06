import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, TrendingDown, Loader2, AlertTriangle, Store } from 'lucide-react';
import { Modal } from '../common/Modal';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { getRoutedShopId, getStockQuantity, isDemoCatalogue, isUuidLike } from './customerItemUtils';

export const BargainModal = ({ product, isOpen, onClose, onSubmitted }) => {
  const { isAuthenticated } = useAuth();
  const { addToast } = useNotification();
  const [quantity, setQuantity] = useState(1);
  const [targetPrice, setTargetPrice] = useState(product?.price || '');
  const [maxPrice, setMaxPrice] = useState(product?.price || '');
  const [message, setMessage] = useState('Can you offer a better price for this quantity?');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  // The modal stays mounted while the parent swaps products in, so reset the
  // form every time it opens with a (possibly different) product.
  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setTargetPrice(product.price ?? '');
      setMaxPrice(product.price ?? '');
      setMessage('Can you offer a better price for this quantity?');
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?._id]);

  if (!product) return null;

  const stockLimit = Math.max(1, Number(getStockQuantity(product)) || 1);
  const productName = product.name || product.product_name || 'this item';
  // Demo listings route to the linked live partner shop, so bargaining stays
  // available everywhere — the offer travels through the partner shop's chat.
  const shopIdValue = getRoutedShopId(product);
  const isDemoRouted = isDemoCatalogue(product);
  const canBargain = Boolean(shopIdValue) && isUuidLike(shopIdValue || '');
  const blockedReason =
    'This listing is not linked to a verified live shop account, so there is no shop chat to send a bargain offer to.';

  const submitOffer = async (event) => {
    event.preventDefault();
    if (sending) return;

    if (!isAuthenticated) {
      addToast('Please log in to send a bargain offer to the shop owner.', 'error');
      return;
    }
    if (!canBargain) {
      addToast(blockedReason, 'error', 6000);
      return;
    }

    const target = parseFloat(targetPrice);
    const max = parseFloat(maxPrice);
    if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(max) || max <= 0) {
      addToast('Enter a valid target and maximum price.', 'error');
      return;
    }
    if (max < target) {
      addToast('Your maximum price cannot be lower than your target price.', 'error');
      return;
    }

    setSending(true);
    try {
      const convoRes = await chatService.getOrCreateConversation({
        shopId: shopIdValue,
        productName,
        price: product.price,
      });
      if (!convoRes?.success || !convoRes.conversation?._id) {
        throw new Error(convoRes?.message || 'Could not start a chat with this shop.');
      }

      const offerText = [
        `Bargain offer for ${productName}:`,
        `• Quantity: ${quantity}`,
        `• Target price: ₹${target}`,
        `• Maximum price: ₹${max}`,
        message ? `• Note: ${message}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      const msgRes = await chatService.sendMessage(convoRes.conversation._id, { text: offerText });
      if (!msgRes?.success) {
        throw new Error(msgRes?.message || 'Could not send the offer message.');
      }

      setSubmitted(true);
      onSubmitted?.({ quantity, targetPrice: target, maxPrice: max, message, product });
    } catch (err) {
      addToast(
        err.response?.data?.message || err.message || 'Failed to send the bargain offer. Please try again.',
        'error',
        6000
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bargain with shop owner" maxWidth="max-w-lg">
      {submitted ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><Send className="w-5 h-5" /></div>
          <h3 className="font-black text-slate-900">Offer sent for review</h3>
          <p className="text-xs text-slate-500">{product.shopId?.shopName || 'The shop owner'} can reply with a counter-offer in chat.</p>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-brand-600 text-white text-xs font-bold">Done</button>
        </div>
      ) : (
        <form onSubmit={submitOffer} className="space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-xs font-black text-slate-900">{productName}</p>
            <p className="text-xs text-slate-500 mt-1">
              {product.shopId?.shopName || product.shopName || 'Local shop'} • Listed at ₹
              {product.price ?? product.offeredPrice ?? '—'} / {product.unit || 'piece'}
            </p>
            {isDemoRouted && (
              <p className="text-[11px] font-semibold text-emerald-700 mt-1">
                Demo listing — your offer goes to the linked partner shop.
              </p>
            )}
          </div>

          {!canBargain && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Bargaining unavailable for this listing</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">{blockedReason}</p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                >
                  <Store className="w-3.5 h-3.5" /> Browse live inventory
                </Link>
                <Link
                  to="/customer/requests"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 hover:underline"
                >
                  <Send className="w-3.5 h-3.5" /> Request a quote from nearby shops
                </Link>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-bold text-slate-700">Quantity<input type="number" min="1" max={stockLimit} value={quantity} onChange={(e) => { const next = Number(e.target.value); setQuantity(Number.isFinite(next) ? Math.max(1, Math.min(next, stockLimit)) : 1); }} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs" /></label>
            <label className="text-xs font-bold text-slate-700">Target ₹<input type="number" min="1" value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs" /></label>
            <label className="text-xs font-bold text-slate-700">Max ₹<input type="number" min={targetPrice || 1} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs" /></label>
          </div>
          <label className="block text-xs font-bold text-slate-700">Message to shop owner<textarea value={message} onChange={(e) => setMessage(e.target.value)} rows="3" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs resize-none" /></label>
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"><TrendingDown className="w-4 h-4" /> Your target is ₹{targetPrice} and you can go up to ₹{maxPrice}.</div>
          <button type="submit" disabled={sending} className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
            {sending ? 'Sending offer...' : 'Send offer to shop owner'}
          </button>
        </form>
      )}
    </Modal>
  );
};

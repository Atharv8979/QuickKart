import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Scale,
  Send,
  Check,
  CheckCircle2,
  Package,
  IndianRupee,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  User,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const GoldenTarajuModal = ({
  isOpen,
  onClose,
  requestItem,
  onUpdateSuccess,
  onConfirmOrder,
  onBargainSubmit,
  onAcceptDeal,
  onRejectDeal,
}) => {
  if (!isOpen || !requestItem) return null;

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
    customerName = 'Customer',
    negotiationHistory = [],
  } = requestItem;

  const reqId = id || _id;

  // Local counter-offer state
  const midPoint = Math.round((currentPrice + customerOffer) / 2);
  const [counterPrice, setCounterPrice] = useState(midPoint > customerOffer ? midPoint : currentPrice);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDealAccepted, setIsDealAccepted] = useState(status === 'ACCEPTED' || status === 'CONFIRMED');
  const [agreedPrice, setAgreedPrice] = useState(requestItem.agreedPrice || customerOffer);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setIsDealAccepted(status === 'ACCEPTED' || status === 'CONFIRMED');
    if (requestItem.agreedPrice) setAgreedPrice(requestItem.agreedPrice);
  }, [status, requestItem.agreedPrice]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [negotiationHistory]);

  const handleConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#fbbf24', '#10b981', '#0ea5e9'],
    });
  };

  const handleCounterOffer = async (e) => {
    if (e) e.preventDefault();
    if (!counterPrice || counterPrice <= 0) return;

    setIsSubmitting(true);
    try {
      if (onBargainSubmit) {
        const res = await onBargainSubmit(reqId, {
          counterOffer: counterPrice,
          message: message || `I can offer ₹${counterPrice} with priority counter pickup.`,
        });

        setMessage('');
        if (res?.request?.status === 'ACCEPTED') {
          setIsDealAccepted(true);
          setAgreedPrice(res.request.agreedPrice || counterPrice);
          handleConfetti();
        }
      }
    } catch (err) {
      console.error('Error submitting counter offer:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      if (onAcceptDeal) {
        await onAcceptDeal(reqId);
        setIsDealAccepted(true);
        setAgreedPrice(customerOffer);
        handleConfetti();
      }
    } catch (err) {
      console.error('Error accepting deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Decline this customer negotiation?')) return;
    setIsSubmitting(true);
    try {
      if (onRejectDeal) {
        await onRejectDeal(reqId);
        onClose();
      }
    } catch (err) {
      console.error('Error rejecting deal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalOrderConfirm = async () => {
    if (onConfirmOrder) {
      await onConfirmOrder({
        ...requestItem,
        agreedPrice,
      });
      onClose();
    }
  };

  // Preset counter calculations
  const presets = [
    { label: 'Catalog Price', val: currentPrice },
    { label: 'Midpoint (Fair)', val: midPoint },
    { label: '-5% Discount', val: Math.round(currentPrice * 0.95) },
    { label: 'Customer Ask', val: customerOffer },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all max-h-[92vh] flex flex-col border border-amber-200/80">
        {/* Golden Taraju Header Bar */}
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 px-6 py-4 text-slate-950 flex items-center justify-between shadow-md relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950/10 border border-slate-950/20 flex items-center justify-center text-xl font-black shadow-inner">
              ⚖️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-950 flex items-center gap-1.5">
                  Bargaining Desk™
                </h2>
                <span className="bg-slate-950 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Live Negotiation
                </span>
              </div>
              <p className="text-xs text-slate-900/80 font-semibold">
                Real-Time Hyperlocal Price Bargaining
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-950/10 hover:bg-slate-950/20 text-slate-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product & Negotiation Context Ribbon */}
        <div className="bg-amber-50/70 border-b border-amber-200/60 p-4 px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={productImage || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80'}
              alt={productName}
              className="w-12 h-12 rounded-xl object-cover border border-amber-200 flex-shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-black text-slate-900 truncate text-sm">
                {productName}
              </h3>
              <p className="text-slate-600 text-xs">
                Requested: <strong>{quantity} {unit}</strong> • Shop stock: <strong>{shopStock} available</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white px-3.5 py-2 rounded-xl border border-amber-200 shadow-sm">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Customer Ask</span>
              <span className="text-sm font-black text-brand-600">₹{customerOffer}</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Price</span>
              <span className="text-sm font-black text-slate-800">₹{currentPrice}</span>
            </div>
          </div>
        </div>

        {/* Chat / Negotiation History Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/50 min-h-[220px] max-h-[340px]">
          <div className="text-center my-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200">
              Bargaining Session Opened
            </span>
          </div>

          {negotiationHistory.map((item, idx) => {
            const isShop = item.sender === 'shopkeeper';
            return (
              <div
                key={idx}
                className={`flex flex-col ${isShop ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-bold px-1">
                  {isShop ? (
                    <>
                      <span>Sharma Hardware (You)</span>
                      <span className="text-amber-600">⚖️</span>
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{customerName}</span>
                    </>
                  )}
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[82%] text-xs shadow-sm ${
                    isShop
                      ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-sm border border-amber-400'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                  }`}
                >
                  <p className="font-semibold">{item.message}</p>
                  {item.offer && (
                    <div
                      className={`mt-1.5 pt-1.5 border-t text-[11px] font-black flex items-center justify-between gap-4 ${
                        isShop ? 'border-amber-600/30 text-slate-950' : 'border-slate-100 text-brand-700'
                      }`}
                    >
                      <span>Offered Price:</span>
                      <span className="text-sm font-black">₹{item.offer} / {unit}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* DEAL ACCEPTED CELEBRATION STATE */}
        {isDealAccepted ? (
          <div className="p-6 bg-gradient-to-br from-amber-50 via-emerald-50 to-white border-t border-emerald-200 space-y-4">
            <div className="bg-emerald-500 text-white rounded-2xl p-4 shadow-lg shadow-emerald-500/20 text-center space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-center gap-2 text-xl font-black">
                <span>🎉</span>
                <span>DEAL ACCEPTED</span>
                <span>⚖️</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Customer and Shopkeeper have mutually agreed on this offer!
              </p>
            </div>

            {/* Breakdown Summary */}
            <div className="grid grid-cols-3 gap-3 bg-white p-3.5 rounded-2xl border border-emerald-200 text-center text-xs shadow-sm">
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">Quantity</span>
                <span className="text-base font-black text-slate-900">{quantity} {unit}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">Agreed Price</span>
                <span className="text-base font-black text-emerald-600">₹{agreedPrice} / {unit}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[11px]">Total Amount</span>
                <span className="text-base font-black text-slate-900">
                  ₹{(agreedPrice * quantity).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Confirm Order Button */}
            <button
              onClick={handleFinalOrderConfirm}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirm Order & Issue Pickup Ticket
            </button>
          </div>
        ) : (
          /* ACTIVE BARGAINING CONTROLS */
          <div className="p-5 bg-white border-t border-slate-200 space-y-4">
            {/* Quick Price Presets */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span className="flex items-center gap-1">
                  <span>⚖️</span> Quick Counter Price Chips:
                </span>
                <span className="text-[11px] text-brand-600 font-semibold">
                  Selected: ₹{counterPrice}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCounterPrice(p.val)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      counterPrice === p.val
                        ? 'bg-amber-100 border-amber-400 text-amber-950 ring-2 ring-amber-400/20 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block text-[10px] text-slate-400 font-semibold">{p.label}</span>
                    <span>₹{p.val}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Slider & Number Input */}
            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex-1">
                <input
                  type="range"
                  min={customerOffer}
                  max={currentPrice}
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 mt-0.5">
                  <span>Customer Ask (₹{customerOffer})</span>
                  <span>Catalog Price (₹{currentPrice})</span>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-inner">
                <span className="text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(parseInt(e.target.value) || 0)}
                  className="w-16 font-black text-sm text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Message input */}
            <form onSubmit={handleCounterOffer} className="flex gap-2">
              <input
                type="text"
                placeholder={`Type counter offer note (e.g. "₹${counterPrice} for instant counter pickup")...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 flex-shrink-0 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Counter Offer</span>
              </button>
            </form>

            {/* Offer Decision Actions: Accept Deal | Reject Deal */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-700 font-bold text-xs transition-colors"
              >
                Reject Deal
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-4 h-4" />
                  Accept Deal at ₹{customerOffer}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

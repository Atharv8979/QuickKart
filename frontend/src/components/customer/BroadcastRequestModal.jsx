import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useLocation } from '../../context/LocationContext';
import { requestService } from '../../services/requestService';
import { useNotification } from '../../context/NotificationContext';
import { Radio, Send, Sparkles, MapPin, Clock, IndianRupee } from 'lucide-react';

export const BroadcastRequestModal = ({ isOpen, onClose, onSuccess, initialProduct = '', initialCategory = 'Hardware & Tools' }) => {
  const { coordinates, addressText, radiusKm } = useLocation();
  const { addToast } = useNotification();

  const [productName, setProductName] = useState(initialProduct);
  const [category, setCategory] = useState(initialCategory);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('piece');
  const [budget, setBudget] = useState('');
  const [urgency, setUrgency] = useState('immediate');
  const [note, setNote] = useState('');
  const [searchRadius, setSearchRadius] = useState(radiusKm || 5);
  const [loading, setLoading] = useState(false);

  const categories = [
    'Hardware & Tools',
    'Plumbing & Sanitary',
    'Electrical & Lighting',
    'Stationery & Office',
    'Groceries & Daily Essentials',
    'Electronics & Mobiles',
    'Medicines & Wellness',
  ];

  // The modal stays mounted while the parent page is open, so the prefill from
  // props must be re-applied every time it opens (otherwise the form keeps the
  // values from the first time it was opened, ignoring later search/category
  // changes on the dashboard).
  useEffect(() => {
    if (isOpen) {
      setProductName(initialProduct || '');
      setCategory(initialCategory || 'Hardware & Tools');
    }
  }, [isOpen, initialProduct, initialCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productName.trim()) {
      addToast('Please enter what product or item you need', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await requestService.createRequest({
        productName,
        category,
        quantity: parseInt(quantity) || 1,
        unit,
        budget: budget ? parseFloat(budget) : 0,
        urgency,
        note,
        coordinates,
        addressText,
        searchRadiusKm: searchRadius,
      });

      if (res?.success) {
        addToast(
          `🚀 Broadcast sent to ${res.broadcastShopCount || 'nearby'} shops! You'll receive quotes shortly.`,
          'success',
          6000
        );
        onClose();
        if (onSuccess) onSuccess(res.request);
      } else {
        // The API answered without throwing but refused the request — never
        // leave the customer staring at a modal that silently did nothing.
        addToast(res?.message || 'The broadcast could not be sent. Please try again.', 'error');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to broadcast request', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚡ Broadcast Request to Nearby Shops" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-brand-50/80 p-3 rounded-xl border border-brand-100 text-xs text-brand-900 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
          <span>
            QuickKart will simultaneously ping active shops in your area. Compare quotes side-by-side and choose the best offer!
          </span>
        </div>

        {/* Product Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Product / Item Name *
          </label>
          <input
            type="text"
            required
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="e.g. 10 meters of 1-inch PVC Pipe, Drill Kit, Parker Pen..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        {/* Category & Urgency Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Urgency
            </label>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="immediate">⚡ Immediate (Within 2 hrs)</option>
              <option value="today">🕒 Today (Within 8 hrs)</option>
              <option value="flexible">📅 Flexible (Next 24 hrs)</option>
            </select>
          </div>
        </div>

        {/* Quantity, Unit & Budget */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Unit
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="piece, meter, kg"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Budget (₹)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Notes / Special requirements */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Note / Specific Brand or Spec (Optional)
          </label>
          <textarea
            rows="2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Prefer Astral or Finolex brand with heavy wall thickness"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          ></textarea>
        </div>

        {/* Radius control info */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="w-4 h-4 text-brand-600" />
            <span>Target Broadcast Radius:</span>
          </div>
          <div className="flex gap-1">
            {[3, 5, 10].map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setSearchRadius(r)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                  searchRadius === r
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Broadcasting...' : 'Broadcast to Nearby Shops'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

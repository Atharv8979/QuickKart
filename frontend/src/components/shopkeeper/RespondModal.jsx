import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { requestService } from '../../services/requestService';
import { useNotification } from '../../context/NotificationContext';
import { CheckCircle2, AlertTriangle, XCircle, Send, IndianRupee, Clock } from 'lucide-react';

export const RespondModal = ({ isOpen, onClose, requestItem, onSuccess }) => {
  const { addToast } = useNotification();
  const budget = requestItem?.budget ?? requestItem?.expectedBudget;

  const [status, setStatus] = useState('available');
  const [offeredPrice, setOfferedPrice] = useState('');
  const [prepTime, setPrepTime] = useState(10);
  const [notes, setNotes] = useState('');
  const [altName, setAltName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (requestItem?.myResponse) {
      setStatus(requestItem.myResponse.availabilityStatus || 'available');
      setOfferedPrice(requestItem.myResponse.offeredPrice || '');
      setPrepTime(requestItem.myResponse.preparationTimeMinutes || 10);
      setNotes(requestItem.myResponse.notes || '');
      setAltName(requestItem.myResponse.alternativeProductName || '');
    } else {
      setStatus('available');
      setOfferedPrice(budget ? String(budget) : '');
      setPrepTime(10);
      setNotes('');
      setAltName('');
    }
  }, [requestItem, budget]);

  if (!requestItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status !== 'not_available' && !offeredPrice) {
      addToast('Please enter your offered price', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await requestService.respondToRequest(requestItem._id, {
        availabilityStatus: status,
        offeredPrice: status === 'not_available' ? 0 : parseFloat(offeredPrice),
        preparationTimeMinutes: parseInt(prepTime) || 10,
        notes,
        alternativeProductName: status === 'available_alternative' ? altName : '',
      });

      if (res.success) {
        addToast('Quote submitted! Customer notified in real time.', 'success');
        onClose();
        if (onSuccess) onSuccess(res.response);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to submit response', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="💬 Respond to Customer Request" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer requirement banner */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
          <p className="text-slate-400 font-medium">Customer is looking for:</p>
          <h4 className="font-bold text-slate-900 text-sm">{requestItem.productName}</h4>
          <p className="text-slate-600">
            Quantity: {requestItem.quantity} {requestItem.unit} • Budget: {budget != null && budget > 0 ? `₹${budget}` : 'Any'}
          </p>
        </div>

        {/* Availability Options */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
            Availability Status
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setStatus('available')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                status === 'available'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CheckCircle2 className={`w-5 h-5 ${status === 'available' ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">In Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('available_alternative')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                status === 'available_alternative'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-5 h-5 ${status === 'available_alternative' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">Alternative</span>
            </button>

            <button
              type="button"
              onClick={() => setStatus('not_available')}
              className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                status === 'not_available'
                  ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold ring-2 ring-rose-500/20'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <XCircle className={`w-5 h-5 ${status === 'not_available' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span className="text-[11px]">Out of Stock</span>
            </button>
          </div>
        </div>

        {/* If Alternative */}
        {status === 'available_alternative' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Alternative Product / Brand Name *
            </label>
            <input
              type="text"
              required
              value={altName}
              onChange={(e) => setAltName(e.target.value)}
              placeholder="e.g. Astral CPVC 1-inch Heavy (Alternative to requested brand)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {/* Pricing & Prep time (only if available or alternative) */}
        {status !== 'not_available' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Your Price Quote (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(e.target.value)}
                placeholder="790"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Ready for Pickup in (Mins)
              </label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="10"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}

        {/* Remarks / Message to customer */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Note for Customer (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Genuine Finolex with 10-year warranty, can pack in 5 mins"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
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
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? 'Submitting Quote...' : 'Submit Quote to Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

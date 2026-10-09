import React, { useState, useEffect } from 'react';
import { reservationService } from '../../services/reservationService';
import { reviewService } from '../../services/reviewService';
import { useNotification } from '../../context/NotificationContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import {
  ShoppingBag,
  Clock,
  MapPin,
  Phone,
  Store,
  CheckCircle2,
  AlertCircle,
  XCircle,
  QrCode,
  Star,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const ReservationsPage = () => {
  const { addToast } = useNotification();
  const { socket } = useSocket();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [reviewTarget, setReviewTarget] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await reservationService.getCustomerReservations();
      if (res.success) {
        setReservations(res.reservations);
      }
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchReservations();
    socket.on('reservation_updated', handleUpdate);
    socket.on('new_reservation', handleUpdate);
    return () => {
      socket.off('reservation_updated', handleUpdate);
      socket.off('new_reservation', handleUpdate);
    };
  }, [socket]);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this in-store hold?')) return;
    try {
      const res = await reservationService.updateStatus(id, {
        status: 'CANCELLED',
        cancellationReason: 'Cancelled by customer',
      });
      if (res.success) {
        addToast('Reservation cancelled', 'info');
        fetchReservations();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel', 'error');
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      addToast('Please write a brief feedback comment', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await reviewService.createReview({
        shopId: reviewTarget.shopId._id || reviewTarget.shopId,
        reservationId: reviewTarget._id,
        rating,
        comment,
        tags: selectedTags,
      });

      if (res.success) {
        addToast('⭐ Thank you! Your review has been published.', 'success');
        setReviewTarget(null);
        setComment('');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to post review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const reviewTagOptions = ['Fast Service', 'Exact Match', 'Fair Price', 'Friendly Shopkeeper', 'Genuine Quality'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>In-Store Hold & Pickup Manager</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            My Product Holds & Pickup Tickets
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Show your unique reservation code at the shop counter when visiting in person.
          </p>
        </div>

        <button
          onClick={fetchReservations}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Tickets
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your in-store reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No active product reservations</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When you discover a product or accept a shopkeeper quote, you can place a free 60-minute in-store hold.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reservations.map((res) => {
            const shop = res.shopId;
            const isCompleted = res.status === 'COMPLETED';
            const isCancelled = res.status === 'CANCELLED';
            const isExpired = res.status === 'EXPIRED';
            const isActive = ['PENDING', 'CONFIRMED', 'READY'].includes(res.status);

            let statusVariant = 'primary';
            if (res.status === 'CONFIRMED') statusVariant = 'primary';
            if (res.status === 'READY') statusVariant = 'success';
            if (res.status === 'COMPLETED') statusVariant = 'success';
            if (res.status === 'CANCELLED') statusVariant = 'danger';
            if (res.status === 'EXPIRED') statusVariant = 'neutral';

            return (
              <div
                key={res._id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Ticket Top Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 to-navy-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider block">
                      Pickup Reservation Ticket
                    </span>
                    <h3 className="text-xl font-black tracking-wider text-white">
                      {res.reservationCode}
                    </h3>
                  </div>

                  <Badge variant={statusVariant}>{res.status}</Badge>
                </div>

                {/* Ticket Body */}
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 leading-snug">
                      {res.productName}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Quantity: {res.quantity} {res.unit} • Agreed Price: ₹{res.agreedPrice} / {res.unit}
                    </p>
                  </div>

                  {/* Shop Details */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-brand-600" />
                        {shop?.shopName}
                      </span>
                      {shop?.contactPhone && (
                        <a
                          href={`tel:${shop.contactPhone}`}
                          className="text-brand-600 font-bold flex items-center gap-1 hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          {shop.contactPhone}
                        </a>
                      )}
                    </div>
                    <p className="text-slate-600 text-[11px] flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                      {shop?.address?.street}, {shop?.address?.area}, {shop?.address?.city}
                    </p>
                  </div>

                  {/* Status Timeline (Fig 5.4) */}
                  <div className="pt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                      Reservation State Timeline (Fig 5.4)
                    </span>
                    <div className="flex items-center justify-between text-xs font-semibold text-center gap-1">
                      {['PENDING', 'CONFIRMED', 'READY', 'COMPLETED'].map((step, idx) => {
                        const stepOrder = ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED'];
                        const currentIdx = stepOrder.indexOf(res.status);
                        const isDone = currentIdx >= idx;
                        const isCurrent = res.status === step;

                        return (
                          <div key={step} className="flex-1 flex flex-col items-center">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-1 ${
                                isDone
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-400'
                              } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                            >
                              {idx + 1}
                            </div>
                            <span
                              className={`text-[9px] uppercase tracking-wider ${
                                isDone ? 'text-emerald-700 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {step}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hold Window Countdown info */}
                  {isActive && (
                    <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Hold Expires:
                      </span>
                      <strong className="font-bold">
                        {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </strong>
                    </div>
                  )}

                  {/* Total Amount Pay at Counter */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 font-medium">Pay on Counter Pickup:</span>
                    <span className="text-lg font-black text-slate-900">₹{res.totalAmount}</span>
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  {isActive && (
                    <>
                      <button
                        onClick={() => handleCancel(res._id)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200"
                      >
                        Cancel Hold
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${shop?.location?.coordinates?.[1]},${shop?.location?.coordinates?.[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 text-center text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Get Directions
                      </a>
                    </>
                  )}

                  {isCompleted && (
                    <button
                      onClick={() => setReviewTarget(res)}
                      className="w-full py-2 text-center text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      Rate & Review Store
                    </button>
                  )}

                  {(isCancelled || isExpired) && (
                    <span className="text-xs text-slate-400 font-medium text-center w-full">
                      This reservation is closed ({res.status.toLowerCase()}).
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <Modal
          isOpen={!!reviewTarget}
          onClose={() => setReviewTarget(null)}
          title="⭐ Rate & Review Local Shop"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div className="text-center space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">
                How was your experience at {reviewTarget.shopId?.shopName}?
              </h4>
              <div className="flex items-center justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 text-2xl transition-transform hover:scale-125"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Highlight Features
              </label>
              <div className="flex flex-wrap gap-1.5">
                {reviewTagOptions.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => {
                        setSelectedTags((prev) =>
                          isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Your Feedback Comment *
              </label>
              <textarea
                required
                rows="3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Super fast response! Reserved items were ready when I arrived."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              ></textarea>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-all"
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

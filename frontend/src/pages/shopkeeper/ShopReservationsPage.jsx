import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService } from '../../services/reservationService';
import { chatService } from '../../services/chatService';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { Badge } from '../../components/common/Badge';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  PackageCheck,
  XCircle,
  RefreshCw,
  User,
  Phone,
  IndianRupee,
  MessageSquare,
} from 'lucide-react';

export const ShopReservationsPage = () => {
  const navigate = useNavigate();
  const { addToast } = useNotification();
  const { socket } = useSocket();
  const [reservations, setReservations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await reservationService.getShopReservations({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });
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
  }, [statusFilter]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchReservations();
    socket.on('new_reservation', handleUpdate);
    socket.on('reservation_updated', handleUpdate);
    return () => {
      socket.off('new_reservation', handleUpdate);
      socket.off('reservation_updated', handleUpdate);
    };
  }, [socket]);

  const handleStartChatWithCustomer = async (resv) => {
    const cust = typeof resv.customerId === 'object' ? resv.customerId : resv.customer;
    const custId = cust?.id || resv.customer_id;
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: custId || 'a0000000-0000-0000-0000-000000000001',
        productName: `Hold Ticket: ${resv.productName}`,
      });
      if (res.success && res.conversation) {
        navigate(`/shopkeeper/messages?c=${res.conversation._id || res.conversation.id}`);
      } else {
        navigate('/shopkeeper/messages');
      }
    } catch {
      navigate('/shopkeeper/messages');
    }
  };

  const handleStatusTransition = async (id, newStatus, note) => {
    try {
      const res = await reservationService.updateStatus(id, {
        status: newStatus,
        note: note || `Shopkeeper marked order as ${newStatus}`,
      });
      if (res.success) {
        addToast(`Reservation status transitioned to ${newStatus}`, 'success');
        fetchReservations();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update reservation', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>In-Store Hold Order Fulfillment</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Customer Reservation State Machine
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            State flow (Fig 5.4): PENDING &rarr; CONFIRMED &rarr; READY FOR PICKUP &rarr; COMPLETED AT COUNTER
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto">
            {['ALL', 'PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === s
                    ? 'bg-white text-slate-900 shadow-sm font-bold'
                    : 'text-slate-600'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={fetchReservations}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading reservation holds...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No reservations found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            When customers place in-store holds on your catalog or quotes, they appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reservations.map((res) => {
            const customer = typeof res.customerId === 'object' && res.customerId ? res.customerId : (res.customer || {});
            const isPending = res.status === 'PENDING';
            const isConfirmed = res.status === 'CONFIRMED';
            const isReady = res.status === 'READY';
            const isCompleted = res.status === 'COMPLETED';

            return (
              <div
                key={res._id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-brand-400 text-base">
                      {res.reservationCode}
                    </span>
                  </div>
                  <Badge
                    variant={
                      res.status === 'READY'
                        ? 'success'
                        : res.status === 'COMPLETED'
                        ? 'success'
                        : res.status === 'CONFIRMED'
                        ? 'primary'
                        : 'neutral'
                    }
                  >
                    {res.status}
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-5 space-y-4 flex-1">
                  <div>
                    <h4 className="font-bold text-base text-slate-900 leading-snug">
                      {res.productName}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>
                        Qty: {res.quantity} {res.unit}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        Total: ₹{res.totalAmount}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {customer?.name || 'Customer'}
                      </span>
                      <div className="flex items-center gap-2">
                        {customer?.phone && (
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-brand-600 font-bold flex items-center gap-1 hover:underline"
                          >
                            <Phone className="w-3 h-3" />
                            {customer.phone}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartChatWithCustomer(res)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 flex items-center gap-1 text-[11px] border border-emerald-200"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" /> Chat
                        </button>
                      </div>
                    </div>
                    {res.customerNote && (
                      <p className="text-slate-600 text-[11px] italic">
                        Customer note: "{res.customerNote}"
                      </p>
                    )}
                  </div>

                  {/* Expiration Countdown Info */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" /> Hold Expires:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {new Date(res.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Actions State Machine Buttons */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() =>
                          handleStatusTransition(res._id, 'CONFIRMED', 'Shopkeeper confirmed and set aside')
                        }
                        className="flex-1 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm & Hold
                      </button>
                      <button
                        onClick={() =>
                          handleStatusTransition(res._id, 'CANCELLED', 'Item unavailable / sold out')
                        }
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {isConfirmed && (
                    <button
                      onClick={() =>
                        handleStatusTransition(res._id, 'READY', 'Item packed and waiting at counter')
                      }
                      className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <PackageCheck className="w-4 h-4" />
                      Mark Ready for Counter Pickup
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() =>
                        handleStatusTransition(res._id, 'COMPLETED', 'Customer collected item and completed purchase at shop')
                      }
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Mark Order Completed (Customer Paid)
                    </button>
                  )}

                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-600 text-center w-full py-1">
                      ✓ Completed In-Store Purchase
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

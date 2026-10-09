import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestService } from '../../services/requestService';
import { chatService } from '../../services/chatService';
import { ComparisonGrid } from '../../components/customer/ComparisonGrid';
import { BroadcastRequestModal } from '../../components/customer/BroadcastRequestModal';
import { ReservationModal } from '../../components/customer/ReservationModal';
import { Badge } from '../../components/common/Badge';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import {
  Send,
  Clock,
  MapPin,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Plus,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';

export const MyRequestsPage = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { addToast } = useNotification();
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);

  // Modals
  const [isNewBroadcastOpen, setIsNewBroadcastOpen] = useState(false);
  const [reserveTarget, setReserveTarget] = useState(null);

  const fetchRequests = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await requestService.getMyRequests();
      if (res.success) {
        setRequests(res.requests);
        setSelectedRequest((current) => (
          res.requests.find((request) => request._id === current?._id) || current || res.requests[0] || null
        ));
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests(true);
  }, [fetchRequests]);

  useEffect(() => {
    if (!socket) return undefined;
    const refreshRequests = (event) => {
      if (event?.requestId && !requests.some((request) => request._id === event.requestId)) return;
      fetchRequests();
    };
    const refreshOnBroadcast = () => fetchRequests();
    socket.on('new_broadcast_request', refreshOnBroadcast);
    socket.on('request_updated', refreshRequests);
    socket.on('request_response_received', refreshRequests);
    return () => {
      socket.off('new_broadcast_request', refreshOnBroadcast);
      socket.off('request_updated', refreshRequests);
      socket.off('request_response_received', refreshRequests);
    };
  }, [socket, requests, fetchRequests]);

  const handleBargainResponse = async (payload) => {
    setResponding(true);
    try {
      const result = await requestService.respondToBargain(selectedRequest._id, payload);
      if (!result.success) {
        addToast(result.message || 'Could not update your request', 'error');
        return;
      }
      addToast(result.message, 'success');
      await fetchRequests();
    } catch (error) {
      addToast(error.response?.data?.message || 'Could not update your request', 'error');
    } finally {
      setResponding(false);
    }
  };

  const handleChat = async (responseItem) => {
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: responseItem.shopId._id || responseItem.shopId,
        requestId: selectedRequest._id,
        productName: selectedRequest.productName,
        price: responseItem.offeredPrice,
      });
      if (res.success) {
        navigate(`/customer/messages?c=${res.conversation._id}`);
      }
    } catch (err) {
      console.error('Error starting chat:', err);
    }
  };

  const handleReserve = (responseItem) => {
    setReserveTarget({
      ...responseItem,
      productName: selectedRequest.productName,
      quantity: selectedRequest.quantity,
      unit: selectedRequest.unit,
      requestId: selectedRequest._id,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Send className="w-3.5 h-3.5" />
            <span>Broadcast Request Manager</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            My Broadcast Inquiries & Price Quotes
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Compare live shopkeeper quotes side-by-side (Chapter 10.3) and hold items instantly.
          </p>
        </div>

        <button
          onClick={() => setIsNewBroadcastOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Broadcast New Request
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading your broadcast requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Send className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No active broadcast requests</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Need an item urgently? Send a single request to nearby shops to receive price and availability quotes.
          </p>
          <button
            onClick={() => setIsNewBroadcastOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20"
          >
            Broadcast Your First Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Requests List (Left Column) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Active Broadcasts ({requests.length})
            </h3>

            <div className="space-y-2.5">
              {requests.map((req) => {
                const isSelected = selectedRequest?._id === req._id;
                const responseCount = req.responses?.length || 0;

                return (
                  <div
                    key={req._id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left space-y-2 ${
                      isSelected
                        ? 'bg-white border-brand-500 shadow-md ring-2 ring-brand-500/10'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {req.productName}
                      </h4>
                      <Badge variant={responseCount > 0 ? 'success' : 'neutral'}>
                        {responseCount} {responseCount === 1 ? 'Quote' : 'Quotes'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Qty: {req.quantity} {req.unit}
                      </span>
                      <span>Budget: {(req.budget ?? req.expectedBudget) ? `₹${req.budget ?? req.expectedBudget}` : 'Any'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {req.urgency}
                      </span>
                      <span className="text-brand-600 font-semibold flex items-center">
                        Compare &rarr;
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison Grid Pane (Right Column) */}
          <div className="lg:col-span-8">
            {selectedRequest ? (
              <ComparisonGrid
                request={selectedRequest}
                responses={selectedRequest.responses || []}
                onChat={handleChat}
                onReserve={handleReserve}
                onRespondToBargain={handleBargainResponse}
                responding={responding}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                Select a request from the left list to view side-by-side shop quotes.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Broadcast Modal */}
      <BroadcastRequestModal
        isOpen={isNewBroadcastOpen}
        onClose={() => setIsNewBroadcastOpen(false)}
        onSuccess={() => fetchRequests()}
      />

      {/* Reservation Modal */}
      {reserveTarget && (
        <ReservationModal
          isOpen={!!reserveTarget}
          onClose={() => setReserveTarget(null)}
          targetItem={reserveTarget}
          onSuccess={() => navigate('/customer/reservations')}
        />
      )}
    </div>
  );
};

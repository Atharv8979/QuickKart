import React, { useState, useEffect } from 'react';
import { requestService } from '../../services/requestService';
import { IncomingRequestCard } from '../../components/shopkeeper/IncomingRequestCard';
import { RespondModal } from '../../components/shopkeeper/RespondModal';
import { Send, RefreshCw, Filter, Clock } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const ShopRequestsInboxPage = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { refetchRequests } = useSocket();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await requestService.getShopRelevantRequests();
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      console.error('Error fetching shop requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [refetchRequests]);

  const filteredRequests = requests.filter((r) => {
    if (filter === 'PENDING') return !r.myResponse;
    if (filter === 'RESPONDED') return !!r.myResponse;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Send className="w-3.5 h-3.5" />
            <span>Nearby Broadcast Inquiries</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Customer Broadcast Requests Inbox
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Incoming high-intent product inquiries from nearby shoppers in your neighborhood.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              All ({requests.length})
            </button>
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'PENDING' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Pending ({requests.filter((r) => !r.myResponse).length})
            </button>
            <button
              onClick={() => setFilter('RESPONDED')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'RESPONDED' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              Quoted ({requests.filter((r) => !!r.myResponse).length})
            </button>
          </div>

          <button
            onClick={fetchRequests}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-brand-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Checking for customer broadcast requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No requests match this filter</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You will receive real-time audio and visual alerts whenever a customer broadcasts a requirement in your category!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.map((reqItem) => (
            <IncomingRequestCard
              key={reqItem._id}
              requestItem={reqItem}
              onRespondClick={(target) => setSelectedRequest(target)}
            />
          ))}
        </div>
      )}

      {/* Respond Modal */}
      {selectedRequest && (
        <RespondModal
          isOpen={!!selectedRequest}
          onClose={() => setSelectedRequest(null)}
          requestItem={selectedRequest}
          onSuccess={() => fetchRequests()}
        />
      )}
    </div>
  );
};

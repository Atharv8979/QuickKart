import React, { useState, useEffect } from 'react';
import { shopService } from '../../services/shopService';
import { requestService } from '../../services/requestService';
import { reservationService } from '../../services/reservationService';
import { chatService } from '../../services/chatService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useLocation } from '../../context/LocationContext';
import { Modal } from '../common/Modal';
import { Search, Store, User, MessageSquare, Loader2, ArrowRight, Sparkles, MapPin, Tag } from 'lucide-react';

export const StartChatModal = ({ isOpen, onClose, onSelectConversation }) => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const { coordinates, radiusKm } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [startingChatId, setStartingChatId] = useState(null);

  // Customer targets (Shops) or Shopkeeper targets (Customers/Inquiries)
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!isOpen) return;

    const loadTargets = async () => {
      setLoading(true);
      try {
        if (user?.role === 'customer') {
          // Fetch shops according to user's selected location & radius
          const res = await shopService.getNearbyShops({
            lng: coordinates?.[0] || 77.1906,
            lat: coordinates?.[1] || 28.6517,
            radius: Math.max(radiusKm || 10, 50),
            limit: 100,
          });
          if (res.success) {
            setItems(res.shops || []);
          }
        } else {
          // Fetch customer inquiries / requests / reservations / conversations for shopkeeper
          const [reqRes, resRes, convRes] = await Promise.all([
            requestService.getShopRelevantRequests().catch(() => ({ success: false })),
            reservationService.getShopReservations().catch(() => ({ success: false })),
            chatService.getConversations().catch(() => ({ success: false })),
          ]);

          const combinedMap = new Map();
          if (convRes.success && convRes.conversations) {
            convRes.conversations.forEach((c) => {
              const cust = c.customer || c.customerId;
              if (cust?.name) {
                combinedMap.set(cust.name, {
                  id: cust.id || cust._id,
                  name: cust.name,
                  phone: cust.phone || '',
                  subtitle: `Active Chat: ${c.productContext?.productName || 'Customer Direct Chat'}`,
                  type: 'chat',
                });
              }
            });
          }
          if (reqRes.success && reqRes.requests) {
            reqRes.requests.forEach((r) => {
              if (r.customerName) {
                combinedMap.set(r.customerName, {
                  id: r.customerId || r._id,
                  name: r.customerName,
                  phone: r.customerPhone,
                  subtitle: `Broadcast Inquiry: ${r.productName}`,
                  type: 'request',
                });
              }
            });
          }
          if (resRes.success && resRes.reservations) {
            resRes.reservations.forEach((resv) => {
              const cust = typeof resv.customerId === 'object' ? resv.customerId : resv.customer;
              const custName = cust?.name || resv.customerName || 'Customer';
              if (custName && !combinedMap.has(custName)) {
                combinedMap.set(custName, {
                  id: cust?.id || resv.customer_id || resv._id,
                  name: custName,
                  phone: cust?.phone || resv.customerPhone,
                  subtitle: `Hold Ticket: ${resv.productName} (${resv.reservationCode})`,
                  type: 'reservation',
                });
              }
            });
          }

          // Fallback sample customer if map is empty
          if (combinedMap.size === 0) {
            combinedMap.set('Walk-in Customer', {
              id: 'a0000000-0000-0000-0000-000000000001',
              name: 'Walk-in Customer',
              phone: '+91 9876543210',
              subtitle: 'Recent counter hold inquiry',
              type: 'customer',
            });
          }

          setItems(Array.from(combinedMap.values()));
        }
      } catch (err) {
        console.error('Error loading chat targets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTargets();
  }, [isOpen, user?.role]);

  const handleStartChat = async (target) => {
    const targetId = target._id || target.id;
    if (!targetId) return;

    setStartingChatId(targetId);
    try {
      const res = await chatService.getOrCreateConversation({
        shopId: targetId,
        productName: target.subtitle || target.shopName,
      });

      if (res.success && res.conversation) {
        addToast(
          `💬 Conversation started with ${target.shopName || target.name}!`,
          'success'
        );
        onSelectConversation(res.conversation);
        onClose();
      } else {
        throw new Error(res.message || 'Could not start conversation');
      }
    } catch (err) {
      addToast(
        err.response?.data?.message || err.message || 'Failed to start chat session.',
        'error'
      );
    } finally {
      setStartingChatId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    const title = (item.shopName || item.name || '').toLowerCase();
    const category = (item.category || item.subtitle || '').toLowerCase();
    const city = (item.address?.city || item.address?.street || '').toLowerCase();
    return title.includes(q) || category.includes(q) || city.includes(q);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user?.role === 'customer' ? 'Message a Verified Store' : 'Start Chat with Customer'}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Subtitle */}
        <p className="text-xs text-slate-500">
          {user?.role === 'customer'
            ? 'Select a shop from your neighborhood to open a real-time WhatsApp-style chat.'
            : 'Select a customer from your active quotes or hold requests to start chatting.'}
        </p>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              user?.role === 'customer'
                ? 'Search shop name, category (e.g. Hardware)...'
                : 'Search customer name or order...'
            }
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50"
          />
        </div>

        {/* Targets List */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
              <span>Loading nearby targets...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No matching {user?.role === 'customer' ? 'shops' : 'customers'} found.
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemId = item._id || item.id;
              const isStarting = startingChatId === itemId;
              const isShop = user?.role === 'customer';

              return (
                <div
                  key={itemId}
                  onClick={() => !isStarting && handleStartChat(item)}
                  className="p-3 rounded-2xl border border-slate-200 hover:border-brand-500 hover:shadow-md transition-all cursor-pointer bg-white flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-brand-400 flex items-center justify-center font-bold flex-shrink-0 shadow-sm group-hover:bg-brand-600 group-hover:text-white transition-colors">
                      {isShop ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {item.shopName || item.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                        {isShop ? (
                          <>
                            <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{item.category || 'General Store'}</span>
                            {item.rating && <span className="text-amber-600 font-bold ml-1">★ {item.rating}</span>}
                          </>
                        ) : (
                          <span>{item.subtitle || item.phone || 'Customer'}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    disabled={isStarting}
                    className="p-2 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors text-xs font-bold flex items-center gap-1 flex-shrink-0"
                  >
                    {isStarting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

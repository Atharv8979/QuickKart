import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { StartChatModal } from '../../components/chat/StartChatModal';
import { MessageSquare, Store, Search, RefreshCw, Plus, MessageSquarePlus } from 'lucide-react';

export const CustomerChatPage = () => {
  const [searchParams] = useSearchParams();
  const initialConvId = searchParams.get('c');

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isStartChatOpen, setIsStartChatOpen] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await chatService.getConversations();
      if (res.success) {
        setConversations(res.conversations || []);
        if (initialConvId) {
          const matched = res.conversations.find((c) => (c._id || c.id) === initialConvId);
          if (matched) setActiveConversation(matched);
        } else if (res.conversations.length > 0 && !activeConversation) {
          setActiveConversation(res.conversations[0]);
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [initialConvId]);

  const filteredConversations = conversations.filter((conv) => {
    const q = searchQuery.toLowerCase();
    const shopName = (conv.shop?.shopName || conv.shopId?.shopName || 'Shopkeeper').toLowerCase();
    const lastText = (conv.lastMessage?.text || '').toLowerCase();
    const inquiry = (conv.productContext?.productName || '').toLowerCase();
    return shopName.includes(q) || lastText.includes(q) || inquiry.includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            <span>WhatsApp-Style Hyperlocal Messaging</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            Real-Time Messages & Shopkeeper Chat
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Direct real-time messaging with verified shop owners for price inquiries, live stock, and pickup schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsStartChatOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Start New Chat</span>
          </button>

          <button
            onClick={fetchConversations}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
            title="Refresh active chats"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Syncing live conversations...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <MessageSquarePlus className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900">No active shop chats yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Start a direct conversation with any verified store in your neighborhood to inquire about availability or negotiate prices.
            </p>
          </div>
          <button
            onClick={() => setIsStartChatOpen(true)}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all inline-flex items-center gap-2"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>Message a Nearby Shop</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Conversation List (Left Column) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Conversations ({conversations.length})
              </h3>
              <button
                onClick={() => setIsStartChatOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Search filter in conversation list */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="space-y-2 max-h-[530px] overflow-y-auto pr-1">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No matching chats found.
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const convoId = conv._id || conv.id;
                  const activeId = activeConversation?._id || activeConversation?.id;
                  const isSelected = activeId === convoId;
                  const shop = conv.shop || conv.shopId;

                  return (
                    <div
                      key={convoId}
                      onClick={() => setActiveConversation(conv)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left flex items-start gap-3 ${
                        isSelected
                          ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-brand-400 flex items-center justify-center font-bold flex-shrink-0 shadow-sm">
                        <Store className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {shop?.shopName || shop?.shop_name || 'Verified Shop'}
                          </h4>
                          {conv.lastMessage?.createdAt && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        {conv.productContext?.productName && (
                          <p className="text-[11px] text-emerald-600 font-semibold truncate mt-0.5">
                            Inquiry: {conv.productContext.productName}
                          </p>
                        )}

                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {conv.lastMessage?.text || 'Tap to open chat'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Chat Pane (Right Column) */}
          <div className="lg:col-span-8">
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                onBack={() => setActiveConversation(null)}
              />
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-xs shadow-sm">
                Select a conversation thread to view messages.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Start Chat Modal */}
      <StartChatModal
        isOpen={isStartChatOpen}
        onClose={() => setIsStartChatOpen(false)}
        onSelectConversation={(convo) => {
          setConversations((prev) => [convo, ...prev.filter((c) => (c._id || c.id) !== (convo._id || convo.id))]);
          setActiveConversation(convo);
        }}
      />
    </div>
  );
};

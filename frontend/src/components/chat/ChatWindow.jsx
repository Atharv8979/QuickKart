import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatService } from '../../services/chatService';
import {
  Send,
  Store,
  CheckCheck,
  User,
  Phone,
  Paperclip,
  X,
  Loader2,
  ZoomIn,
  Sparkles,
} from 'lucide-react';

export const ChatWindow = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const shop = conversation?.shopId || conversation?.shop;
  const customer = conversation?.customerId || conversation?.customer;
  const otherParticipant =
    user?.role === 'customer'
      ? conversation?.shopkeeperId || { name: shop?.shopName || shop?.shop_name || 'Shopkeeper' }
      : customer || { name: 'Customer' };

  // Scroll to bottom safely
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!conversation?._id && !conversation?.id) return;
    const convoId = conversation._id || conversation.id;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await chatService.getMessages(convoId, { limit: 100 });
        if (res.success) {
          setMessages(res.messages || []);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
        setTimeout(scrollToBottom, 100);
      }
    };

    loadMessages();

    // Socket Room Join
    if (socket) {
      socket.emit('join_conversation', convoId);

      const handleNewMessage = (newMsg) => {
        if (newMsg.conversationId === convoId || newMsg.conversation_id === convoId) {
          setMessages((prev) => {
            if (prev.some((m) => (m._id || m.id) === (newMsg._id || newMsg.id))) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
        }
      };

      const handleNewImage = (newMsg) => {
        if (newMsg.conversationId === convoId || newMsg.conversation_id === convoId) {
          setMessages((prev) => {
            if (prev.some((m) => (m._id || m.id) === (newMsg._id || newMsg.id))) return prev;
            return [...prev, { ...newMsg, messageType: 'image' }];
          });
          setTimeout(scrollToBottom, 50);
        }
      };

      const handleUserTyping = (data) => {
        if (data.conversationId === convoId) {
          setIsTyping(true);
          setTypingUser(data.senderName);
        }
      };

      const handleStopTyping = (data) => {
        if (data.conversationId === convoId) {
          setIsTyping(false);
          setTypingUser('');
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('new_image_message', handleNewImage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stopped_typing', handleStopTyping);

      return () => {
        socket.emit('leave_conversation', convoId);
        socket.off('new_message', handleNewMessage);
        socket.off('new_image_message', handleNewImage);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stopped_typing', handleStopTyping);
      };
    }
  }, [conversation?._id, conversation?.id, socket, scrollToBottom]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    const convoId = conversation?._id || conversation?.id;
    if (socket && convoId) {
      socket.emit('typing_start', {
        conversationId: convoId,
        senderName: user?.name || 'Someone',
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: convoId });
      }, 2000);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image file size must be less than 5MB.');
      return;
    }
    setPreviewImage(URL.createObjectURL(file));
  };

  const removePreview = () => {
    setPreviewImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageUpload = async () => {
    if (!previewImage) return;
    const file = fileInputRef.current?.files[0];
    if (!file) return;

    const convoId = conversation?._id || conversation?.id;
    setUploading(true);
    try {
      const res = await chatService.uploadImage(file);
      if (res.success) {
        if (socket && convoId) {
          socket.emit('send_image', {
            conversationId: convoId,
            imageUrl: res.imageUrl,
            thumbnailUrl: res.thumbnailUrl,
            senderName: user?.name || 'Someone',
          });
        }
        await chatService.sendMessage(convoId, {
          imageUrl: res.imageUrl,
          imageThumbnailUrl: res.thumbnailUrl,
          messageType: 'image',
        });
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      removePreview();
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !previewImage) return;

    if (previewImage) {
      await handleImageUpload();
      if (!inputText.trim()) return;
    }

    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    const convoId = conversation?._id || conversation?.id;
    if (socket && convoId) {
      socket.emit('typing_stop', { conversationId: convoId });
    }

    try {
      const res = await chatService.sendMessage(convoId, { text: textToSend });
      if (res.success && res.message) {
        if (socket && convoId) {
          socket.emit('send_message', {
            conversationId: convoId,
            text: textToSend,
            senderId: user?.id || user?._id,
            senderName: user?.name || 'Someone',
            senderRole: user?.role || 'customer',
          });
        }
        setMessages((prev) => {
          const msgId = res.message._id || res.message.id;
          if (prev.some((m) => (m._id || m.id) === msgId)) return prev;
          return [...prev, res.message];
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (msg, index) => {
    const rawSender = msg.senderId?._id || msg.senderId?.id || msg.senderId || msg.sender_id || msg.sender?.id;
    const myId = user?.id || user?._id;
    const isMe = String(rawSender || '') === String(myId || '') || msg.senderRole === user?.role;
    const senderName = msg.sender?.name || (isMe ? 'You' : otherParticipant?.name || 'Shop');
    const msgId = msg._id || msg.id || `msg_${index}`;

    return (
      <div
        key={msgId}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-1.5`}
      >
        <div className={`flex items-end gap-2 max-w-[82%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${
              isMe
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-brand-400'
            }`}
          >
            {senderName.charAt(0).toUpperCase()}
          </div>

          {/* Message Bubble Container */}
          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
            {!isMe && (
              <span className="text-[10px] text-slate-400 mb-0.5 ml-1 font-semibold">
                {senderName}
              </span>
            )}

            {/* Bubble */}
            <div
              className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm relative ${
                isMe
                  ? 'bg-emerald-700 text-white rounded-br-none'
                  : 'bg-white text-slate-900 border border-slate-200/90 rounded-bl-none'
              }`}
            >
              {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}

              {msg.imageUrl && (
                <div className="relative mt-1 group cursor-pointer" onClick={() => setZoomedImageUrl(msg.imageUrl)}>
                  <img
                    src={msg.imageUrl}
                    alt="Chat attachment"
                    className="max-w-[260px] max-h-[260px] rounded-xl object-cover border border-black/10 transition-transform group-hover:scale-[1.01]"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* Time & Read Receipts (WhatsApp style) */}
              <div
                className={`flex items-center gap-1 justify-end text-[10px] mt-1 ${
                  isMe ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                <span>{formatTime(msg.createdAt || msg.created_at)}</span>
                {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px] relative">
      {/* WhatsApp-Style Header */}
      <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white lg:hidden text-xs font-bold"
            >
              &larr; Back
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md flex-shrink-0">
            {shop?.shopName || shop?.shop_name ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>

          <div>
            <h4 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
              <span>
                {user?.role === 'customer'
                  ? shop?.shopName || shop?.shop_name || 'Verified Store'
                  : otherParticipant?.name || 'Customer'}
              </span>
            </h4>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Online • WhatsApp Live Direct Sync</span>
            </p>
          </div>
        </div>

        {(shop?.contactPhone || shop?.contact_phone) && (
          <a
            href={`tel:${shop?.contactPhone || shop?.contact_phone}`}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Call Store Owner"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Call Shop</span>
          </a>
        )}
      </div>

      {/* Product Context Banner */}
      {conversation?.productContext?.productName && (
        <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-950">
          <span className="font-medium">
            Inquiry for: <strong className="font-bold">{conversation.productContext.productName}</strong>
          </span>
          {conversation.productContext.price > 0 && (
            <span className="font-black text-emerald-700">
              ₹{conversation.productContext.price}
            </span>
          )}
        </div>
      )}

      {/* Messages Stream (WhatsApp Background) */}
      <div className="flex-1 p-4 overflow-y-auto bg-slate-100/70 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
            Syncing live messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-slate-400 space-y-2 text-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Store className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No messages exchanged yet</p>
            <p className="max-w-xs mx-auto text-slate-500">
              Type a message or attach an image below to ask about stock, specs, or counter pickup!
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="text-xs text-emerald-700 font-semibold italic flex items-center gap-2 bg-emerald-50 p-2 rounded-xl w-fit animate-pulse border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{typingUser || 'Someone'} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Upload Preview Bar */}
      {previewImage && (
        <div className="p-3 bg-emerald-50 border-t border-emerald-200 flex items-center gap-3">
          <img
            src={previewImage}
            alt="Upload preview"
            className="w-14 h-14 rounded-xl object-cover border border-emerald-300"
          />
          <div className="flex-1 text-xs text-emerald-900">
            <p className="font-bold">Image Attachment Selected</p>
            <p className="text-emerald-700">Click send to upload and share in real time</p>
          </div>
          <button
            type="button"
            onClick={removePreview}
            className="p-1.5 rounded-xl bg-emerald-200 hover:bg-emerald-300 text-emerald-900"
            title="Cancel attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Progress Overlay */}
      {uploading && (
        <div className="p-3 bg-amber-50 border-t border-amber-200 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span className="text-xs text-amber-900 font-bold">Uploading image to QuickKart chat...</span>
        </div>
      )}

      {/* WhatsApp Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <label
          htmlFor="chat-file-input"
          className="p-2.5 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer"
          title="Attach image"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="chat-file-input"
          />
          <Paperclip className="w-5 h-5" />
        </label>

        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
          disabled={uploading}
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !previewImage) || uploading}
          className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 disabled:opacity-40 transition-all flex items-center justify-center"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>

      {/* Full Resolution Image Lightbox Modal */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute -top-10 right-0 text-white bg-slate-800/80 p-2 rounded-full hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImageUrl}
              alt="Zoomed view"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
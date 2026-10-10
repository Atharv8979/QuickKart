import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { chatService } from '../../services/chatService';
import { Send, Store, MapPin, CheckCheck, Clock, User, Phone, Image, Paperclip, X, Loader2 } from 'lucide-react';

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
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const shop = conversation?.shopId;
  const otherParticipant =
    user?.role === 'customer'
      ? conversation?.shopkeeperId || { name: shop?.shopName || 'Shopkeeper' }
      : conversation?.customerId || { name: 'Customer' };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages
  useEffect(() => {
    if (!conversation?._id) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const res = await chatService.getMessages(conversation._id, { limit: 100 });
        if (res.success) {
          setMessages(res.messages);
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
      socket.emit('join_conversation', conversation._id);

      const handleNewMessage = (newMsg) => {
        if (newMsg.conversationId === conversation._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
        }
      };

      const handleNewImage = (newMsg) => {
        if (newMsg.conversationId === conversation._id) {
          setMessages((prev) => {
            if (prev.some((m) => m._id === newMsg._id)) return prev;
            return [...prev, { ...newMsg, messageType: 'image' }];
          });
          setTimeout(scrollToBottom, 50);
        }
      };

      const handleUserTyping = (data) => {
        if (data.conversationId === conversation._id) {
          setIsTyping(true);
          setTypingUser(data.senderName);
        }
      };

      const handleStopTyping = (data) => {
        if (data.conversationId === conversation._id) {
          setIsTyping(false);
          setTypingUser('');
        }
      };

      socket.on('new_message', handleNewMessage);
      socket.on('new_image_message', handleNewImage);
      socket.on('user_typing', handleUserTyping);
      socket.on('user_stopped_typing', handleStopTyping);

      return () => {
        socket.emit('leave_conversation', conversation._id);
        socket.off('new_message', handleNewMessage);
        socket.off('new_image_message', handleNewImage);
        socket.off('user_typing', handleUserTyping);
        socket.off('user_stopped_typing', handleStopTyping);
      };
    }
  }, [conversation?._id, socket, scrollToBottom]);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (socket && conversation?._id) {
      socket.emit('typing_start', {
        conversationId: conversation._id,
        senderName: user?.name || 'Someone',
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing_stop', { conversationId: conversation._id });
      }, 2000);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
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

    setUploading(true);
    try {
      const res = await chatService.uploadImage(file);
      if (res.success) {
        // Send image message via socket
        if (socket) {
          socket.emit('send_image', {
            conversationId: conversation._id,
            imageUrl: res.imageUrl,
            thumbnailUrl: res.thumbnailUrl,
            senderName: user?.name || 'Someone',
          });
        }
        // Also send via REST for persistence
        await chatService.sendMessage(conversation._id, {
          imageUrl: res.imageUrl,
          imageThumbnailUrl: res.thumbnailUrl,
          messageType: 'image',
        });
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
      removePreview();
    }
  };

  const cancelPreview = () => {
    removePreview();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !previewImage) return;

    // If there's a preview image, upload it first
    if (previewImage) {
      await handleImageUpload();
      // Text will be sent after image upload if there's text
      if (!inputText.trim()) return;
    }

    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (socket) {
      socket.emit('typing_stop', { conversationId: conversation._id });
    }

    try {
      const res = await chatService.sendMessage(conversation._id, { text: textToSend });
      if (res.success) {
        // Also emit via socket for real-time to other participants
        if (socket) {
          socket.emit('send_message', {
            conversationId: conversation._id,
            text: textToSend,
            senderId: user?._id || user?.id,
            senderName: user?.name || 'Someone',
            senderRole: user?.role || 'customer',
          });
        }
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

const renderMessage = (msg) => {
    const isMe = msg.senderId?._id === user?._id || msg.senderId === user?._id;
    const messageContent = (
      <div className={`relative max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
        isMe
          ? 'bg-brand-600 text-white rounded-br-none'
          : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
      }`}>
        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
        {msg.imageUrl && (
          <div className="relative mt-1">
            <img
              src={msg.imageUrl}
              alt="Chat image"
              className="max-w-[250px] max-h-[250px] rounded-xl object-cover cursor-zoom-in"
              onClick={() => window.open(msg.imageUrl, '_blank')}
            />
          </div>
        )}
      </div>
    );

    return (
      <div
        key={msg._id || Math.random()}
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
      >
        <div className={`max-w-[75%] ${isMe ? 'flex items-end' : 'flex items-start'}`}>
          {!isMe && (
            <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-600 mr-2 flex-shrink-0">
              {msg.sender?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
            {!isMe && msg.sender?.name && (
              <span className="text-[10px] text-slate-400 mb-1 ml-1">{msg.sender.name}</span>
            )}
            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
              <div className={`relative max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                isMe
                  ? 'bg-brand-600 text-white rounded-br-none'
                  : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
              }`}>
                {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                {msg.imageUrl && (
                  <div className="relative mt-1">
                    <img
                      src={msg.imageUrl}
                      alt="Chat image"
                      className="max-w-[250px] max-h-[250px] rounded-xl object-cover cursor-zoom-in"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                <span>{formatTime(msg.createdAt)}</span>
                {isMe && <CheckCheck className="w-3 h-3 text-brand-400" />}
              </div>
            </div>
          </div>
          {isMe && (
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-xs font-bold text-white ml-2 flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white lg:hidden text-xs font-bold px-2"
            >
              &larr; Back
            </button>
          )}

          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white shadow-md">
            {shop?.shopName ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
          </div>

          <div>
            <h4 className="font-bold text-sm leading-tight text-white">
              {user?.role === 'customer' ? shop?.shopName || 'Shop' : otherParticipant?.name || 'Customer'}
            </h4>
            <p className="text-[11px] text-slate-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Online • QuickKart Verified Direct Chat</span>
            </p>
          </div>
        </div>

        {shop?.contactPhone && (
          <a
            href={`tel:${shop.contactPhone}`}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-400 transition-colors"
            title="Call Shopkeeper"
          >
            <Phone className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Product Context Ribbon if linked */}
      {conversation?.productContext?.productName && (
        <div className="bg-brand-50 px-4 py-2 border-b border-brand-100 flex items-center justify-between text-xs text-brand-900">
          <span className="font-semibold">
            Inquiry for: <strong>{conversation.productContext.productName}</strong>
          </span>
          {conversation.productContext.price > 0 && (
            <span className="font-bold text-brand-700">
              ₹{conversation.productContext.price}
            </span>
          )}
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 space-y-1 text-xs">
            <Store className="w-8 h-8 mx-auto text-slate-300 mb-1" />
            <p className="font-bold">No messages yet</p>
            <p>Say hello to inquire about stock or schedule in-person pickup!</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="text-xs text-slate-400 italic flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>{typingUser || 'Typing...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview Bar */}
      {previewImage && (
        <div className="p-3 bg-brand-50 border-t border-brand-100 flex items-center gap-3">
          <img
            src={previewImage}
            alt="Preview"
            className="w-16 h-16 rounded-xl object-cover"
          />
          <div className="flex-1 text-xs text-brand-900">
            <p className="font-semibold">Image ready to send</p>
            <p className="text-brand-700">Tap send to upload and share</p>
          </div>
          <button
            onClick={cancelPreview}
            className="p-2 rounded-xl bg-brand-100 hover:bg-brand-200 text-brand-700"
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="p-3 bg-amber-50 border-t border-amber-100 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
          <span className="text-xs text-amber-800 font-medium">Uploading image...</span>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <label className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-brand-600 transition-colors cursor-pointer" title="Attach image">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="chat-image-upload"
          />
          <Paperclip className="w-5 h-5" />
        </label>
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder="Type message..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          disabled={uploading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() && !previewImage || uploading}
          className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-500/20 disabled:opacity-40 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
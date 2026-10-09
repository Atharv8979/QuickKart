import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, shop } = useAuth();
  const { addToast, setUnreadCount } = useNotification();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize Socket instance
    const socketUrl = import.meta.env.VITE_API_URL || 'https://quickkart-ollt.onrender.com';
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Register user rooms when user or shop is loaded
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('join_user', user._id);

      if (shop?._id) {
        socket.emit('join_shop', shop._id);
      }

      // Listeners for real-time broadcasts and events
      const handleBroadcastRequest = (data) => {
        addToast(
          `⚡ Nearby Customer Request: "${data.productName}" (Qty: ${data.quantity})`,
          'info',
          6000
        );
        setUnreadCount((c) => c + 1);
      };

      const handleRequestResponse = (data) => {
        addToast(
          `🏷️ Shop Offer Received: ${data.shopName} offered ₹${data.offeredPrice}!`,
          'success',
          6000
        );
        setUnreadCount((c) => c + 1);
      };

      const handleRequestUpdated = (data) => {
        const actionLabels = {
          bargain: 'A shop sent a counter-offer',
          accept: 'A shop accepted your request',
          reject: 'A shop declined your request',
          customer_accept: 'The customer accepted your offer',
          customer_counter: 'The customer sent a counter-offer',
          confirm: 'A bargain was confirmed and reserved',
        };
        addToast(actionLabels[data.action] || 'A broadcast request was updated', 'info', 6000);
        setUnreadCount((count) => count + 1);
      };

      const handleNewReservation = (data) => {
        addToast(
          `📦 New Product Hold: ${data.reservationCode} for "${data.productName}"`,
          'success',
          6000
        );
        setUnreadCount((c) => c + 1);
      };

      const handleReservationUpdated = (data) => {
        addToast(
          `📋 Reservation ${data.code || ''} status updated to: ${data.status}`,
          'info',
          5000
        );
      };

      const handleChatNotification = (data) => {
        addToast(`💬 Message from ${data.senderName}: "${data.text}"`, 'info', 5000);
      };

      socket.on('new_broadcast_request', handleBroadcastRequest);
      socket.on('request_response_received', handleRequestResponse);
      socket.on('request_updated', handleRequestUpdated);
      socket.on('new_reservation', handleNewReservation);
      socket.on('reservation_updated', handleReservationUpdated);
      socket.on('chat_notification', handleChatNotification);

      return () => {
        socket.off('new_broadcast_request', handleBroadcastRequest);
        socket.off('request_response_received', handleRequestResponse);
        socket.off('request_updated', handleRequestUpdated);
        socket.off('new_reservation', handleNewReservation);
        socket.off('reservation_updated', handleReservationUpdated);
        socket.off('chat_notification', handleChatNotification);
      };
    }
  }, [socket, user, shop]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export const initializeSocket = (io) => {
  io.on('connection', (socket) => {
    // Register user to personal room
    socket.on('join_user', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    // Register shopkeeper to their shop broadcast room
    socket.on('join_shop', (shopId) => {
      if (shopId) {
        socket.join(`shop_${shopId}`);
      }
    });

    // Join specific conversation room
    socket.on('join_conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation_${conversationId}`);
      }
    });

    // Leave specific conversation room
    socket.on('leave_conversation', (conversationId) => {
      if (conversationId) {
        socket.leave(`conversation_${conversationId}`);
      }
    });

    // Handle typing indicator - forward to conversation room
    socket.on('typing_start', ({ conversationId, senderName }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('user_typing', { conversationId, senderName });
      }
    });

    socket.on('typing_stop', ({ conversationId }) => {
      if (conversationId) {
        socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', { conversationId });
      }
    });

    // Handle text message - forward to conversation room
    socket.on('send_message', ({ conversationId, text, senderId, senderName, senderRole }) => {
      if (conversationId && text) {
        socket.to(`conversation_${conversationId}`).emit('new_message', {
          conversationId,
          text,
          senderId,
          senderName,
          senderRole,
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Handle image message - forward to conversation room
    socket.on('send_image', ({ conversationId, imageUrl, thumbnailUrl, senderName }) => {
      if (conversationId && imageUrl) {
        socket.to(`conversation_${conversationId}`).emit('new_image_message', {
          conversationId,
          imageUrl,
          thumbnailUrl,
          senderName,
        });
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });
};

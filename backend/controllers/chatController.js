import { supabase } from '../config/supabase.js';

// @desc    Get user conversations
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    res.json({
      success: true,
      conversations: [
        {
          _id: 'conv_1',
          id: 'conv_1',
          shop: {
            _id: 'b0000000-0000-0000-0000-000000000001',
            shopName: 'Sharma Hardware & Sanitation Store',
            contactPhone: '+91 9876543210',
          },
          lastMessage: {
            text: 'Yes, 1-inch Finolex pipes are ready at our counter!',
            createdAt: new Date().toISOString(),
          },
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create conversation
// @route   POST /api/chat/conversations
// @access  Private
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { shopId } = req.body;
    res.json({
      success: true,
      conversation: {
        _id: 'conv_1',
        id: 'conv_1',
        shop: {
          _id: shopId || 'b0000000-0000-0000-0000-000000000001',
          shopName: 'Sharma Hardware & Sanitation Store',
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    res.json({
      success: true,
      messages: [
        {
          _id: 'msg_1',
          sender: { name: 'Ramesh Sharma' },
          text: 'Hello! Welcome to Sharma Hardware. How can we help you today?',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const senderName = req.user?.name || 'Customer';
    const conversationId = req.params.id;
    const msg = {
      _id: 'msg_' + Date.now(),
      conversationId,
      sender: { name: senderName },
      text,
      createdAt: new Date().toISOString(),
    };

    const io = req.app.get('io');
    if (io) {
      // Emit to the specific conversation room so both participants receive it instantly
      io.to(`conversation_${conversationId}`).emit('new_message', msg);
    }

    res.status(201).json({
      success: true,
      message: msg,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get in-app notifications
// @route   GET /api/chat/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    res.json({
      success: true,
      notifications: [
        {
          _id: 'notif_1',
          id: 'notif_1',
          title: 'Welcome to QuickKart',
          message: 'Discover verified hardware & plumbing supplies in minutes.',
          type: 'general',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/chat/notifications/read-all
// @access  Private
export const markNotificationsRead = async (req, res, next) => {
  try {
    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// Aliases for backwards compatibility
export const getUserConversations = getConversations;
export const getConversationMessages = getMessages;

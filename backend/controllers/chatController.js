import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';

// ====================================================================
// CONVERSATIONS
// ====================================================================

// @desc    Get user conversations
// @route   GET /api/chat/conversations
// @access  Private
export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!supabase) {
      return res.json({
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
            unreadCount: 0,
          },
        ],
      });
    }

    let query = supabase
      .from('conversations')
      .select(`
        *,
        shop:shops(id, shop_name, contact_phone, banner_image, address, rating),
        customer:users!conversations_customer_id_fkey(id, name, profile_image),
        product:products(id, name, price, images, brand),
        last_message:messages!conversations_last_message_id_fkey(text, created_at, sender_id)
      `)
      .order('last_message_at', { ascending: false });

    if (userRole === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (userRole === 'shopkeeper') {
      query = query.eq('shop_id', req.user.shopId || req.user.id);
    }

    const { data: conversations, error } = await query;

    if (error) throw error;

    const formatted = (conversations || []).map(c => ({
      _id: c.id,
      id: c.id,
      shop: c.shop ? {
        _id: c.shop.id,
        shopName: c.shop.shop_name,
        contactPhone: c.shop.contact_phone,
        bannerImage: c.shop.banner_image,
        address: c.shop.address,
        rating: c.shop.rating,
      } : null,
      customer: c.customer ? {
        _id: c.customer.id,
        name: c.customer.name,
        profileImage: c.customer.profile_image,
      } : null,
      productContext: c.product ? {
        _id: c.product.id,
        name: c.product.name,
        price: c.product.price,
        images: c.product.images,
        brand: c.product.brand,
      } : null,
      lastMessage: c.last_message ? {
        text: c.last_message.text,
        createdAt: c.last_message.created_at,
        senderId: c.last_message.sender_id,
      } : null,
      unreadCount: req.user.role === 'customer' ? c.unread_count_customer : c.unread_count_shop,
      updatedAt: c.updated_at,
    }));

    return res.json({ success: true, conversations: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Get or create conversation between customer and shop
// @route   POST /api/chat/conversations
// @access  Private
export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { shopId, productId, productContext } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!shopId) {
      return res.status(400).json({ success: false, message: 'shopId is required' });
    }

    if (!supabase) {
      return res.json({
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
    }

    let customerId, shopIdFinal;

    if (userRole === 'customer') {
      customerId = userId;
      shopIdFinal = shopId;
    } else if (userRole === 'shopkeeper') {
      shopIdFinal = req.user.shopId || req.user.id;
      customerId = shopId; // In this case shopId param is actually customerId
    } else {
      return res.status(403).json({ success: false, message: 'Only customers and shopkeepers can start conversations' });
    }

    // Try to find existing conversation
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('shop_id', shopIdFinal);

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data: existing, error: findError } = await query.maybeSingle();

    if (findError) throw findError;

    if (existing) {
      return res.json({
        success: true,
        conversation: {
          _id: existing.id,
          id: existing.id,
          shop: existing.shop,
          customer: existing.customer,
          productContext: existing.product_context,
        },
      });
    }

    // Create new conversation
    const { data: shop } = await supabase
      .from('shops')
      .select('id, shop_name, contact_phone, banner_image, address, rating')
      .eq('id', shopIdFinal)
      .single();

    const { data: customer } = await supabase
      .from('users')
      .select('id, name, profile_image')
      .eq('id', customerId)
      .single();

    let productContext = {};
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, images, brand')
        .eq('id', productId)
        .single();
      if (product) {
        productContext = {
          _id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          brand: product.brand,
        };
      }
    }

    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: customerId,
        shop_id: shopIdFinal,
        product_id: productId || null,
        product_context: productContext,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      conversation: {
        _id: conversation.id,
        id: conversation.id,
        shop: shop ? {
          _id: shop.id,
          shopName: shop.shop_name,
          contactPhone: shop.contact_phone,
          bannerImage: shop.banner_image,
          address: shop.address,
          rating: shop.rating,
        } : null,
        customer: customer ? {
          _id: customer.id,
          name: customer.name,
          profileImage: customer.profile_image,
        } : null,
        productContext,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/conversations/:id/messages
// @access  Private
export const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 50, before } = req.query;

    if (!supabase) {
      return res.json({
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
    }

    // Verify user has access to this conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('customer_id, shop_id')
      .eq('id', id)
      .single();

    if (convError || !conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const hasAccess = (userRole === 'customer' && conv.customer_id === userId) ||
                      (userRole === 'shopkeeper' && conv.shop_id === userId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, profile_image, role)
      `)
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;

    // Mark messages as read
    if (userRole === 'customer') {
      await supabase
        .from('messages')
        .update({ read_by_customer: true })
        .eq('conversation_id', id)
        .neq('sender_id', userId);
      
      await supabase
        .from('conversations')
        .update({ unread_count_customer: 0 })
        .eq('id', id);
    } else if (userRole === 'shopkeeper') {
      await supabase
        .from('messages')
        .update({ read_by_shop: true })
        .eq('conversation_id', id)
        .neq('sender_id', userId);
      
      await supabase
        .from('conversations')
        .update({ unread_count_shop: 0 })
        .eq('id', id);
    }

    const formatted = (messages || []).reverse().map(m => ({
      _id: m.id,
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      sender: m.sender ? {
        _id: m.sender.id,
        name: m.sender.name,
        profileImage: m.sender.profile_image,
        role: m.sender.role,
      } : null,
      text: m.text,
      imageUrl: m.image_url,
      imageThumbnailUrl: m.image_thumbnail_url,
      messageType: m.message_type,
      createdAt: m.created_at,
    }));

    return res.json({ success: true, messages: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message (text or image)
// @route   POST /api/chat/conversations/:id/messages
// @access  Private
export const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, imageUrl, imageThumbnailUrl, messageType = 'text' } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userName = req.user.name;

    if (!text && !imageUrl) {
      return res.status(400).json({ success: false, message: 'Message content required' });
    }

    if (!supabase) {
      const msg = {
        _id: 'msg_' + Date.now(),
        conversationId: id,
        sender: { name: req.user.name || 'Customer' },
        text,
        imageUrl,
        imageThumbnailUrl,
        messageType,
        createdAt: new Date().toISOString(),
      };

      const io = req.app.get('io');
      if (io) {
        io.to(`conversation_${id}`).emit('new_message', {
          ...msg,
          senderId: req.user.id,
          sender: { name: req.user.name, role: req.user.role },
        });
      }

      return res.status(201).json({ success: true, message: msg });
    }

    // Verify access
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('customer_id, shop_id, customer:users!conversations_customer_id_fkey(id), shop:shops(id)')
      .eq('id', id)
      .single();

    if (convError || !conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const hasAccess = (userRole === 'customer' && conv.customer_id === userId) ||
                      (userRole === 'shopkeeper' && conv.shop_id === userId);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Create message
    const messageData = {
      conversation_id: id,
      sender_id: userId,
      sender_role: userRole,
      text: text || null,
      image_url: imageUrl || null,
      image_thumbnail_url: imageThumbnailUrl || null,
      message_type: messageType,
      read_by_customer: userRole === 'shopkeeper', // sender's messages are auto-read for sender
      read_by_shop: userRole === 'customer',
    };

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, profile_image, role)
      `)
      .single();

    if (error) throw error;

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_text: text || (messageType === 'image' ? '📷 Image' : 'Message'),
        last_message_at: new Date().toISOString(),
        last_message_sender_id: userId,
        unread_count_customer: userRole === 'shopkeeper' ? conv.unread_count_customer + 1 : conv.unread_count_customer,
        unread_count_shop: userRole === 'customer' ? conv.unread_count_shop + 1 : conv.unread_count_shop,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const formatted = {
      _id: message.id,
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      sender: message.sender ? {
        _id: message.sender.id,
        name: message.sender.name,
        profileImage: message.sender.profile_image,
        role: message.sender.role,
      } : null,
      text: message.text,
      imageUrl: message.image_url,
      imageThumbnailUrl: message.image_thumbnail_url,
      messageType: message.message_type,
      createdAt: message.created_at,
    };

    // Emit real-time
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${id}`).emit('new_message', formatted);
    }

    return res.status(201).json({ success: true, message: formatted });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload chat image
// @route   POST /api/chat/upload-image
// @access  Private
export const uploadChatImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }

    if (!supabase) {
      // Return mock URL for fallback
      return res.json({
        success: true,
        imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=200&q=80',
      });
    }

    const file = req.file;
    const fileName = `chat/${req.user.id}/${Date.now()}-${file.originalname}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('chat-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-images')
      .getPublicUrl(uploadData.path);

    // Generate thumbnail URL (Supabase supports transform)
    const thumbnailUrl = `${publicUrl}?width=200&height=200&resize=cover`;

    return res.json({
      success: true,
      imageUrl: publicUrl,
      thumbnailUrl,
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
    if (!supabase) {
      return res.json({
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
    }

    // In a full implementation, you'd have a notifications table
    // For now, return unread message counts as notifications
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'customer') {
      const { data: convs } = await supabase
        .from('conversations')
        .select('unread_count_customer')
        .eq('customer_id', userId);
      
      const totalUnread = (convs || []).reduce((sum, c) => sum + (c.unread_count_customer || 0), 0);
      
      return res.json({
        success: true,
        notifications: totalUnread > 0 ? [{
          _id: 'chat_unread',
          title: 'New Messages',
          message: `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
          type: 'chat',
          read: false,
          createdAt: new Date().toISOString(),
        }] : [],
      });
    } else {
      const { data: convs } = await supabase
        .from('conversations')
        .select('unread_count_shop')
        .eq('shop_id', req.user.shopId || req.user.id);
      
      const totalUnread = (convs || []).reduce((sum, c) => sum + (c.unread_count_shop || 0), 0);
      
      return res.json({
        success: true,
        notifications: totalUnread > 0 ? [{
          _id: 'chat_unread',
          title: 'New Customer Messages',
          message: `You have ${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`,
          type: 'chat',
          read: false,
          createdAt: new Date().toISOString(),
        }] : [],
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/chat/notifications/read-all
// @access  Private
export const markNotificationsRead = async (req, res, next) => {
  try {
    // In a full implementation, you'd update a notifications table
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Aliases for backwards compatibility
export const getUserConversations = getConversations;
export const getConversationMessages = getMessages;
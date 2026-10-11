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
      .select('*')
      .order('last_message_at', { ascending: false });

    if (userRole === 'customer') {
      query = query.eq('customer_id', userId);
    } else if (userRole === 'shopkeeper') {
      const { data: myShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
        .single();

      const shopId = myShop ? myShop.id : userId;
      query = query.or(`shop_id.eq.${shopId},shop_id.eq.${userId}`);
    }

    const { data: conversations, error } = await query;

    if (error) throw error;

    const rows = conversations || [];
    const shopIds = [...new Set(rows.map((conversation) => conversation.shop_id).filter(Boolean))];
    const customerIds = [...new Set(rows.map((conversation) => conversation.customer_id).filter(Boolean))];
    const productIds = [...new Set(rows.map((conversation) => conversation.product_id).filter(Boolean))];
    const [shopsResult, customersResult, productsResult] = await Promise.all([
      shopIds.length
        ? supabase.from('shops').select('id, shop_name, contact_phone, banner_image, address, rating').in('id', shopIds)
        : Promise.resolve({ data: [], error: null }),
      customerIds.length
        ? supabase.from('users').select('id, name, profile_image').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
      productIds.length
        ? supabase.from('products').select('id, name, price, images, brand').in('id', productIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (shopsResult.error) throw shopsResult.error;
    if (customersResult.error) throw customersResult.error;
    if (productsResult.error) throw productsResult.error;

    const shopsById = new Map((shopsResult.data || []).map((shop) => [shop.id, shop]));
    const customersById = new Map((customersResult.data || []).map((customer) => [customer.id, customer]));
    const productsById = new Map((productsResult.data || []).map((product) => [product.id, product]));
    const formatted = rows.map((c) => {
      const shop = shopsById.get(c.shop_id);
      const customer = customersById.get(c.customer_id);
      const product = productsById.get(c.product_id);
      return {
        _id: c.id,
        id: c.id,
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
        productContext: product ? {
          _id: product.id,
          name: product.name,
          price: product.price,
          images: product.images,
          brand: product.brand,
        } : c.product_context || null,
        lastMessage: c.last_message_text || c.last_message_at ? {
          text: c.last_message_text,
          createdAt: c.last_message_at,
          senderId: c.last_message_sender_id,
        } : null,
        unreadCount: req.user.role === 'customer' ? c.unread_count_customer : c.unread_count_shop,
        updatedAt: c.updated_at,
      };
    });

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
      const { data: myShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
        .single();

      shopIdFinal = myShop ? myShop.id : (req.user.shopId || req.user.id);
      customerId = shopId; // In this case shopId param is actually customerId
    } else {
      return res.status(403).json({ success: false, message: 'Only customers and shopkeepers can start conversations' });
    }

    // Try to find existing conversation
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('customer_id', customerId)
      .eq('shop_id', shopIdFinal)
      .order('last_message_at', { ascending: false })
      .limit(1);

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

    let localProductContext = {};
    if (productId) {
      const { data: product } = await supabase
        .from('products')
        .select('id, name, price, images, brand')
        .eq('id', productId)
        .single();
      if (product) {
        localProductContext = {
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
        product_context: localProductContext,
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

    let shopId = userId;
    if (userRole === 'shopkeeper') {
      const { data: myShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
        .single();
      if (myShop) shopId = myShop.id;
    }

    const hasAccess =
      (userRole === 'customer' && conv.customer_id === userId) ||
      (userRole === 'shopkeeper' && (conv.shop_id === shopId || conv.shop_id === userId));

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) throw error;
    const senderIds = [...new Set((messages || []).map((message) => message.sender_id).filter(Boolean))];
    const { data: senders, error: sendersError } = senderIds.length
      ? await supabase.from('users').select('id, name, profile_image, role').in('id', senderIds)
      : { data: [], error: null };
    if (sendersError) throw sendersError;
    const sendersById = new Map((senders || []).map((sender) => [sender.id, sender]));

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

    const formatted = (messages || []).reverse().map((m) => {
      const sender = sendersById.get(m.sender_id);
      return {
        _id: m.id,
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        sender: sender ? {
          _id: sender.id,
          name: sender.name,
          profileImage: sender.profile_image,
          role: sender.role,
        } : null,
        text: m.text,
        imageUrl: m.image_url,
        imageThumbnailUrl: m.image_thumbnail_url,
        messageType: m.message_type,
        createdAt: m.created_at,
      };
    });

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
      .select('customer_id, shop_id, unread_count_customer, unread_count_shop')
      .eq('id', id)
      .single();

    if (convError || !conv) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    let shopId = userId;
    if (userRole === 'shopkeeper') {
      const { data: myShop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();
      if (myShop) shopId = myShop.id;
    }

    const hasAccess =
      (userRole === 'customer' && conv.customer_id === userId) ||
      (userRole === 'shopkeeper' && (conv.shop_id === shopId || conv.shop_id === userId));

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
      .select('*')
      .single();

    if (error) throw error;
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', userId)
      .single();
    if (senderError) throw senderError;

    // Update conversation last message
    await supabase
      .from('conversations')
      .update({
        last_message_text: text || (messageType === 'image' ? '📷 Image' : 'Message'),
        last_message_at: new Date().toISOString(),
        last_message_sender_id: userId,
        unread_count_customer: userRole === 'shopkeeper' ? (conv.unread_count_customer || 0) + 1 : conv.unread_count_customer,
        unread_count_shop: userRole === 'customer' ? (conv.unread_count_shop || 0) + 1 : conv.unread_count_shop,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    const formatted = {
      _id: message.id,
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      sender: sender ? {
        _id: sender.id,
        name: sender.name,
        profileImage: sender.profile_image,
        role: sender.role,
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
      io.emit('new_message', formatted);
      io.emit('chat_notification', {
        conversationId: id,
        senderId: userId,
        senderName: userName || 'User',
        text: text || 'New message',
      });
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
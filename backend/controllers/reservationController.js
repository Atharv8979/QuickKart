import { supabase } from '../config/supabase.js';
import { FALLBACK_RESERVATIONS, FALLBACK_SHOPS } from '../utils/fallbackData.js';

// Demo-catalogue slugs (sehore-demo-*, sehore-item-*) are not database UUIDs.
// They are routed to this linked live partner shop so EVERY listing — live or
// demo — can create a real hold ticket that a shopkeeper actually receives.
const DEMO_FALLBACK_SHOP_ID = 'b0000000-0000-0000-0000-000000000001';

const isUuidLike = (value) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());

const resolveLiveShopId = (rawShopId) => {
  if (isUuidLike(rawShopId)) return rawShopId;
  // Demo storefront or missing id -> linked partner shop (never null, column is NOT NULL)
  return DEMO_FALLBACK_SHOP_ID;
};

// @desc    Create In-Store Hold & Reservation Ticket (Chapter 5.4 / Fig 5.4)
// @route   POST /api/reservations
// @access  Private (Customer)
export const createReservation = async (req, res, next) => {
  try {
    const { shopId, productId, productName, quantity = 1, agreedPrice, customerNote, holdDurationMinutes = 60 } = req.body;

    if (!productName || agreedPrice === undefined) {
      return res.status(400).json({ success: false, message: 'Product name and agreed price are required' });
    }

    const reservationCode = 'QK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const expiresAt = new Date(Date.now() + (parseInt(holdDurationMinutes) || 60) * 60 * 1000).toISOString();
    const totalAmount = parseFloat(agreedPrice) * (parseInt(quantity) || 1);

    if (supabase) {
      // Demo storefronts (sehore-demo-*) resolve to the linked partner shop so
      // the FK insert succeeds; only live UUID product ids are sent, and the
      // column is nullable so demo products post null + keep productName.
      const targetShopId = resolveLiveShopId(shopId);
      const targetProductId = isUuidLike(productId) ? productId : null;

      const { data: reservation, error } = await supabase
        .from('reservations')
        .insert([
          {
            reservation_code: reservationCode,
            customer_id: req.user.id,
            shop_id: targetShopId,
            product_id: targetProductId,
            product_name: productName,
            quantity: parseInt(quantity) || 1,
            unit: 'piece',
            agreed_price: parseFloat(agreedPrice),
            total_amount: totalAmount,
            status: 'PENDING',
            hold_duration_minutes: parseInt(holdDurationMinutes) || 60,
            expires_at: expiresAt,
            customer_note: customerNote,
          },
        ])
        .select('*, shops(id, shop_name, contact_phone, address)')
        .single();

      if (error) throw error;

      // Real-time socket notification to shopkeeper
      const io = req.app.get('io');
      if (io) {
        io.emit('new_reservation', {
          reservationCode,
          productName,
          quantity,
          shopId: targetShopId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'In-store hold ticket created successfully!',
        reservation: {
          _id: reservation.id,
          id: reservation.id,
          reservationCode: reservation.reservation_code,
          productName: reservation.product_name,
          quantity: reservation.quantity,
          agreedPrice: reservation.agreed_price,
          totalAmount: reservation.total_amount,
          status: reservation.status,
          expiresAt: reservation.expires_at,
          shopId: reservation.shops
            ? {
                _id: reservation.shops.id,
                id: reservation.shops.id,
                shopName: reservation.shops.shop_name,
                contactPhone: reservation.shops.contact_phone,
                address: reservation.shops.address,
              }
            : null,
        },
      });
    }

    const fallbackId = 'res_' + Date.now();
    // Same demo routing in fallback mode so the ticket lands in the linked
    // partner shopkeeper's inbox (Sharma) instead of being dropped.
    const fallbackShopId = resolveLiveShopId(shopId);
    const fallbackProductId = isUuidLike(productId) ? productId : null;
    const fallbackReservation = {
      _id: fallbackId,
      id: fallbackId,
      reservationCode,
      customer_id: req.user.id,
      customerId: req.user.id,
      customerName: req.user.name || 'Walk-in Customer',
      customerPhone: req.user.phone || '',
      // Keep the exact shop the customer ordered from so the linked
      // shopkeeper dashboard can filter it (Sharma vs Gupta).
      shop_id: fallbackShopId,
      product_id: fallbackProductId,
      productId: fallbackProductId,
      productName,
      product_name: productName,
      quantity: parseInt(quantity) || 1,
      unit: 'piece',
      agreedPrice: parseFloat(agreedPrice),
      agreed_price: parseFloat(agreedPrice),
      totalAmount,
      total_amount: totalAmount,
      status: 'PENDING',
      expiresAt,
      expires_at: expiresAt,
      customerNote,
      customer_note: customerNote,
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    FALLBACK_RESERVATIONS.unshift(fallbackReservation);

    // Real-time socket notification so the linked shopkeeper sees it instantly
    const ioFallback = req.app.get('io');
    if (ioFallback) {
      ioFallback.emit('new_reservation', {
        reservationCode,
        productName,
        quantity: fallbackReservation.quantity,
        shopId: fallbackReservation.shop_id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'In-store hold ticket created successfully!',
      reservation: {
        _id: fallbackId,
        id: fallbackId,
        reservationCode,
        productName,
        quantity: parseInt(quantity) || 1,
        agreedPrice: parseFloat(agreedPrice),
        totalAmount,
        status: 'PENDING',
        expiresAt,
        shopId: {
          _id: fallbackReservation.shop_id,
          id: fallbackReservation.shop_id,
          shopName: 'Sharma Hardware & Sanitation Store',
          contactPhone: '+91 9876543210',
          address: { street: 'Shop 14, Karol Bagh', city: 'New Delhi' },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's hold reservations
// @route   GET /api/reservations/my
// @access  Private (Customer)
export const getCustomerReservations = async (req, res, next) => {
  try {
    if (supabase) {
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select('*, shops(id, shop_name, contact_phone, address)')
        .eq('customer_id', req.user.id)
        .order('created_at', { ascending: false });

      if (!error && reservations && reservations.length > 0) {
        const formatted = reservations.map((r) => ({
          _id: r.id,
          id: r.id,
          reservationCode: r.reservation_code,
          productName: r.product_name,
          quantity: r.quantity,
          unit: r.unit,
          agreedPrice: r.agreed_price,
          totalAmount: r.total_amount,
          status: r.status,
          expiresAt: r.expires_at,
          createdAt: r.created_at,
          shopId: r.shops
            ? {
                _id: r.shops.id,
                id: r.shops.id,
                shopName: r.shops.shop_name,
                contactPhone: r.shops.contact_phone,
                address: r.shops.address,
              }
            : null,
        }));

        return res.json({
          success: true,
          count: formatted.length,
          reservations: formatted,
        });
      }
    }

    // Linked fallback: this customer's newly-created holds first, then sample
    const mine = (FALLBACK_RESERVATIONS || []).filter(
      (r) => (r.customerId || r.customer_id) === req.user.id
    );
    const sample = {
          _id: 'sample_res_1',
          id: 'sample_res_1',
          reservationCode: 'QK-8421',
          productName: 'Finolex 1-inch Heavy Duty PVC Pipe (10ft)',
          quantity: 2,
          agreedPrice: 290,
          totalAmount: 580,
          status: 'READY',
          expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          shopId: {
            _id: 'shop_1',
            shopName: 'Sharma Hardware & Sanitation Store',
            contactPhone: '+91 9876543210',
            address: { street: 'Shop 14, Karol Bagh', city: 'New Delhi' },
          },
        };
    const combined = [...mine, sample];
    res.json({
      success: true,
      count: combined.length,
      reservations: combined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update reservation order status (Finite State Machine Fig 5.4)
// @route   PUT /api/reservations/:id/status
// @access  Private (Shopkeeper / Customer)
export const updateReservationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const normalizedStatus = status.toUpperCase();
    const validStatuses = ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (supabase) {
      // 1. Fetch reservation and shop info to verify ownership
      const { data: resv, error: fetchErr } = await supabase
        .from('reservations')
        .select('*, shops(id, owner_id)')
        .eq('id', id)
        .single();

      if (fetchErr || !resv) {
        return res.status(404).json({ success: false, message: 'Reservation ticket not found' });
      }

      // 2. Ownership verification:
      // - Customer can only cancel their own reservation
      // - Shopkeeper must own the shop
      // - Admin can perform any transition
      const isCustomerOwner = resv.customer_id === req.user.id;
      const isShopOwner = resv.shops?.owner_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isAdmin) {
        if (isCustomerOwner) {
          if (normalizedStatus !== 'CANCELLED') {
            return res.status(403).json({
              success: false,
              message: 'Customers can only cancel pending reservations',
            });
          }
        } else if (!isShopOwner) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not authorized to update this reservation ticket',
          });
        }
      }

      const { data: updated, error } = await supabase
        .from('reservations')
        .update({ status: normalizedStatus, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*, shops(id, shop_name, contact_phone, address)')
        .single();

      if (error) throw error;

      // Real-time socket notification to customer and shop rooms
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${resv.customer_id}`).emit('reservation_updated', {
          reservationId: id,
          reservationCode: resv.reservation_code,
          status: normalizedStatus,
        });
        io.to(`shop_${resv.shop_id}`).emit('reservation_updated', {
          reservationId: id,
          reservationCode: resv.reservation_code,
          status: normalizedStatus,
        });
        io.emit('reservation_updated', {
          id,
          status: normalizedStatus,
        });
      }

      return res.json({
        success: true,
        message: `Reservation moved to ${normalizedStatus}`,
        reservation: {
          _id: updated.id,
          id: updated.id,
          reservationCode: updated.reservation_code,
          productName: updated.product_name,
          quantity: updated.quantity,
          agreedPrice: updated.agreed_price,
          totalAmount: updated.total_amount,
          status: updated.status,
          expiresAt: updated.expires_at,
          shopId: updated.shops
            ? {
                _id: updated.shops.id,
                id: updated.shops.id,
                shopName: updated.shops.shop_name,
                contactPhone: updated.shops.contact_phone,
                address: updated.shops.address,
              }
            : null,
        },
      });
    }

    res.json({
      success: true,
      message: `Reservation moved to ${normalizedStatus}`,
      reservation: {
        id,
        status: normalizedStatus,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reservation orders for shopkeeper
// @route   GET /api/reservations/shop
// @access  Private (Shopkeeper)
export const getShopReservations = async (req, res, next) => {
  try {
    if (supabase) {
      // Find shop owned by shopkeeper
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('owner_id', req.user.id)
        .maybeSingle();

      if (!shop && req.user.role !== 'admin') {
        return res.json({
          success: true,
          count: 0,
          reservations: [],
        });
      }

      let query = supabase.from('reservations').select('*, customer:users(id, name, phone, email)');
      if (shop) {
        query = query.eq('shop_id', shop.id);
      }

      const { data: reservations, error } = await query.order('created_at', { ascending: false });

      if (!error && reservations) {
        return res.json({
          success: true,
          count: reservations.length,
          reservations: reservations.map((r) => ({
            _id: r.id,
            id: r.id,
            reservationCode: r.reservation_code,
            customerId: r.customer_id,
            productName: r.product_name,
            quantity: r.quantity,
            unit: r.unit,
            agreedPrice: r.agreed_price,
            totalAmount: r.total_amount,
            status: r.status,
            expiresAt: r.expires_at,
            customerNote: r.customer_note,
            customer: r.customer ? { name: r.customer.name, phone: r.customer.phone } : null,
            createdAt: r.created_at,
          })),
        });
      }
    }

    const ownedShop = FALLBACK_SHOPS.find((s) => s.owner_id === req.user.id);
    let scoped = [];
    if (ownedShop) {
      const ownedId = ownedShop._id || ownedShop.id;
      scoped = FALLBACK_RESERVATIONS.filter(
        (r) => (r.shop_id || r.shopId) === ownedId
      );
    } else if (req.user.role === 'admin') {
      scoped = FALLBACK_RESERVATIONS;
    } else {
      scoped = [];
    }

    res.json({
      success: true,
      count: scoped.length,
      reservations: scoped,
    });
  } catch (error) {
    next(error);
  }
};


// Aliases for backwards compatibility
export const getMyReservations = getCustomerReservations;

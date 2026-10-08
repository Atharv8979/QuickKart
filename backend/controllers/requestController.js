import { supabase } from '../config/supabase.js';
import { FALLBACK_CUSTOMER_REQUESTS, FALLBACK_PRODUCTS, FALLBACK_RESERVATIONS, FALLBACK_SHOPS } from '../utils/fallbackData.js';

// @desc    Broadcast structured request to nearby shops
// @route   POST /api/requests
// @access  Private (Customer)
export const createRequest = async (req, res, next) => {
  try {
    const { productName, category, quantity, unit, expectedBudget, urgency, notes } = req.body;

    if (!productName || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required' });
    }

    if (supabase) {
      const { data: request, error } = await supabase
        .from('requests')
        .insert([
          {
            customer_id: req.user.id,
            product_name: productName,
            category,
            quantity: parseInt(quantity) || 1,
            unit: unit || 'piece',
            expected_budget: expectedBudget ? parseFloat(expectedBudget) : null,
            urgency: urgency || 'today',
            notes,
            status: 'ACTIVE',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Real-time broadcast notification to shopkeeper rooms
      const io = req.app.get('io');
      if (io) {
        io.emit('new_broadcast_request', {
          requestId: request.id,
          productName: request.product_name,
          category: request.category,
          quantity: request.quantity,
          unit: request.unit,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Request broadcasted to nearby verified shops!',
        request,
      });
    }

    // Fallback response (persist in-memory so linked shopkeeper inbox sees it)
    const newId = 'req_' + Date.now();
    const mockRequest = {
      _id: newId,
      id: newId,
      customerId: req.user.id,
      customerName: req.user.name || 'Walk-in Customer',
      customerPhone: req.user.phone || '',
      productName,
      category,
      quantity: parseInt(quantity) || 1,
      unit: unit || 'piece',
      expectedBudget: expectedBudget ? parseFloat(expectedBudget) : 0,
      urgency: urgency || 'today',
      notes,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      responses: [],
      negotiationHistory: [],
    };

    FALLBACK_CUSTOMER_REQUESTS.unshift(mockRequest);

    // Real-time broadcast so linked shopkeeper dashboards refresh instantly
    const ioFallback = req.app.get('io');
    if (ioFallback) {
      ioFallback.emit('new_broadcast_request', {
        requestId: mockRequest._id,
        productName: mockRequest.productName,
        category: mockRequest.category,
        quantity: mockRequest.quantity,
        unit: mockRequest.unit,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Request broadcasted to nearby verified shops!',
      request: mockRequest,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer's own broadcast requests with quotes
// @route   GET /api/requests/my
// @access  Private (Customer)
export const getMyRequests = async (req, res, next) => {
  try {
    if (supabase) {
      const { data: requests, error } = await supabase
        .from('requests')
        .select('*, responses:request_responses(*, shops(id, shop_name, rating, contact_phone, address, location_lat, location_lng))')
        .eq('customer_id', req.user.id)
        .order('created_at', { ascending: false });

      if (!error && requests && requests.length > 0) {
        const formatted = requests.map((r) => ({
          _id: r.id,
          id: r.id,
          productName: r.product_name,
          category: r.category,
          quantity: r.quantity,
          unit: r.unit,
          expectedBudget: r.expected_budget,
          urgency: r.urgency,
          status: r.status,
          createdAt: r.created_at,
          responses: (r.responses || []).map((resp) => ({
            _id: resp.id,
            id: resp.id,
            offeredPrice: resp.offered_price,
            responseType: resp.response_type,
            prepEtaMinutes: resp.prep_eta_minutes,
            notes: resp.notes,
            shopId: resp.shops
              ? {
                  _id: resp.shops.id,
                  id: resp.shops.id,
                  shopName: resp.shops.shop_name,
                  rating: resp.shops.rating,
                  contactPhone: resp.shops.contact_phone,
                  address: resp.shops.address,
                }
              : null,
          })),
        }));

        return res.json({
          success: true,
          count: formatted.length,
          requests: formatted,
        });
      }
    }

    // Linked fallback: return this customer's own newly-created broadcasts plus sample
    const mine = (FALLBACK_CUSTOMER_REQUESTS || []).filter(
      (r) => (r.customerId || r.customer_id) === req.user.id
    );
    // Fallback sample data (seed + this customer's newly-created linked orders first)
    const sample = {
          _id: 'sample_req_1',
          id: 'sample_req_1',
          productName: '10 meters of 1-inch PVC Pipe',
          category: 'Plumbing & Sanitary',
          quantity: 10,
          unit: 'meter',
          expectedBudget: 300,
          urgency: 'immediate',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          responses: [
            {
              _id: 'quote_1',
              offeredPrice: 290,
              responseType: 'in_stock',
              prepEtaMinutes: 5,
              notes: 'Finolex heavy duty in stock right now at counter.',
              shopId: {
                _id: 'shop_1',
                shopName: 'Sharma Hardware & Sanitation Store',
                rating: 4.9,
                distanceKm: 0.8,
                contactPhone: '+91 9876543210',
                address: { street: 'Shop 14, Karol Bagh', city: 'New Delhi' },
              },
            },
          ],
        };
    const combined = [...mine, sample];
    res.json({
      success: true,
      count: combined.length,
      requests: combined,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single request details by ID
// @route   GET /api/requests/:id
// @access  Public / Private
export const getRequestDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      const { data: r, error } = await supabase
        .from('requests')
        .select('*, responses:request_responses(*, shops(id, shop_name, rating, contact_phone, address, location_lat, location_lng))')
        .eq('id', id)
        .single();

      if (!error && r) {
        return res.json({
          success: true,
          request: {
            _id: r.id,
            id: r.id,
            productName: r.product_name,
            category: r.category,
            quantity: r.quantity,
            unit: r.unit,
            expectedBudget: r.expected_budget,
            urgency: r.urgency,
            status: r.status,
            notes: r.notes,
            createdAt: r.created_at,
            responses: (r.responses || []).map((resp) => ({
              _id: resp.id,
              id: resp.id,
              offeredPrice: resp.offered_price,
              responseType: resp.response_type,
              prepEtaMinutes: resp.prep_eta_minutes,
              notes: resp.notes,
              shopId: resp.shops
                ? {
                    _id: resp.shops.id,
                    id: resp.shops.id,
                    shopName: resp.shops.shop_name,
                    rating: resp.shops.rating,
                    contactPhone: resp.shops.contact_phone,
                    address: resp.shops.address,
                  }
                : null,
            })),
          },
        });
      }
    }

    res.json({
      success: true,
      request: {
        _id: id,
        id,
        productName: '10 meters of 1-inch PVC Pipe',
        category: 'Plumbing & Sanitary',
        quantity: 10,
        unit: 'meter',
        expectedBudget: 300,
        urgency: 'immediate',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        responses: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Shopkeeper responds to a broadcast request
// @route   POST /api/requests/:id/respond
// @access  Private (Shopkeeper)
export const respondToRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseType = 'in_stock', offeredPrice, offeredProductName, prepEtaMinutes, notes, shopId } = req.body;

    if (offeredPrice === undefined || offeredPrice === null) {
      return res.status(400).json({ success: false, message: 'Offered price is required' });
    }

    if (supabase) {
      // 1. Verify request exists and is ACTIVE
      const { data: request, error: reqErr } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .single();

      if (reqErr || !request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      if (request.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: `Cannot quote on ${request.status.toLowerCase()} request` });
      }

      // 2. Resolve shop owned by the authenticated shopkeeper
      let targetShopId = shopId;
      if (!targetShopId || req.user.role !== 'admin') {
        const { data: myShop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', req.user.id)
          .single();

        if (myShop) {
          targetShopId = myShop.id;
        } else if (req.user.role === 'admin' && targetShopId) {
          // Admin provided shopId
        } else {
          return res.status(400).json({
            success: false,
            message: 'You must have a registered shop profile to quote on requests',
          });
        }
      }

      const { data: response, error } = await supabase
        .from('request_responses')
        .insert([
          {
            request_id: id,
            shop_id: targetShopId,
            response_type: responseType,
            offered_price: parseFloat(offeredPrice),
            offered_product_name: offeredProductName || null,
            prep_eta_minutes: parseInt(prepEtaMinutes) || 10,
            notes: notes || null,
          },
        ])
        .select('*, shops(id, shop_name, rating, contact_phone, address)')
        .single();

      if (error) throw error;

      // Real-time socket notification to customer room
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${request.customer_id}`).emit('request_response_received', {
          requestId: id,
          offeredPrice: parseFloat(offeredPrice),
          shopId: targetShopId,
          shopName: response.shops?.shop_name || 'Nearby Store',
        });
        io.emit('request_response_received', {
          requestId: id,
          offeredPrice: parseFloat(offeredPrice),
          shopId: targetShopId,
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Quotation response submitted to customer!',
        response,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Quotation response submitted to customer!',
      response: {
        _id: 'b0000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14),
        id: 'b0000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14),
        requestId: id,
        offeredPrice: parseFloat(offeredPrice),
        responseType,
        prepEtaMinutes: parseInt(prepEtaMinutes) || 10,
        notes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get requests feed for shopkeepers (Enriched with product, stock, price, and negotiation history)
// @route   GET /api/requests/shop
// @access  Private (Shopkeeper)
export const getShopRelevantRequests = async (req, res, next) => {
  try {
    if (supabase) {
      let shopCategory = null;
      let shopProducts = [];
      if (req.user) {
        const { data: myShop } = await supabase
          .from('shops')
          .select('id, category, products(*)')
          .eq('owner_id', req.user.id)
          .single();
        if (myShop) {
          shopCategory = myShop.category;
          shopProducts = myShop.products || [];
        }
      }

      let query = supabase
        .from('requests')
        .select('*, customer:users(id, name, phone)')
        .order('created_at', { ascending: false });

      if (shopCategory && req.query.filterByCategory === 'true') {
        query = query.eq('category', shopCategory);
      }

      const { data: requests, error } = await query;

      if (!error && requests) {
        const formatted = requests.map((r) => {
          const match = shopProducts.find(
            (p) => p.name.toLowerCase().includes(r.product_name.toLowerCase()) || r.product_name.toLowerCase().includes(p.name.toLowerCase())
          );
          return {
            _id: r.id,
            id: r.id,
            productName: r.product_name,
            productImage: match?.images?.[0] || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
            category: r.category,
            quantity: r.quantity || 1,
            unit: r.unit || 'piece',
            shopStock: match ? match.quantity_in_stock : 10,
            customerOffer: r.expected_budget || (match ? Math.round(match.price * 0.9) : 60),
            currentPrice: match ? match.price : (r.expected_budget ? Math.round(r.expected_budget * 1.1) : 70),
            status: r.status === 'ACTIVE' ? 'PENDING' : r.status,
            urgency: r.urgency || 'today',
            customerName: r.customer?.name || 'Customer',
            customerPhone: r.customer?.phone || '+91 9876543210',
            notes: r.notes || '',
            createdAt: r.created_at,
            negotiationHistory: [
              {
                sender: 'customer',
                senderName: r.customer?.name || 'Customer',
                offer: r.expected_budget || 60,
                message: `Can you offer for ₹${r.expected_budget || 60}?`,
                time: r.created_at,
              }
            ],
          };
        });

        return res.json({
          success: true,
          count: formatted.length,
          requests: formatted,
        });
      }
    }

    // Fallback mode:
    const DEMO_SHOP_IDS = new Set([
      'b0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000002',
      'b0000000-0000-0000-0000-000000000003',
      'b0000000-0000-0000-0000-000000000004',
      'sehore-demo-001',
    ]);
    const isDemoSharma = req.user?.id === 'a0000000-0000-0000-0000-000000000002';
    const ownedShop = (FALLBACK_SHOPS || []).find((s) => s.owner_id === req.user?.id && !DEMO_SHOP_IDS.has(s._id || s.id));
    const ownedCategory = ownedShop?.category || null;

    let scoped = [];
    if (isDemoSharma) {
      // Demo Sharma sees demo Karol Bagh fixtures for exhibition walkthrough
      scoped = (FALLBACK_CUSTOMER_REQUESTS || []).filter((r) => {
        if (!ownedCategory) return true;
        return (r.category || '') === ownedCategory || String(r._id || r.id || '').startsWith('req_');
      });
    } else {
      // Real registered shopkeeper: only show requests freshly broadcasted this session
      // matching their category, NEVER pre-seeded demo fixtures.
      scoped = (FALLBACK_CUSTOMER_REQUESTS || []).filter((r) => {
        const idStr = String(r._id || r.id || '');
        const isFresh = idStr.startsWith('req_') && !idStr.startsWith('req_cust_');
        if (!isFresh) return false;
        if (!ownedCategory) return true;
        return (r.category || '') === ownedCategory;
      });
    }

    res.json({
      success: true,
      count: scoped.length,
      requests: scoped,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit shopkeeper counter-offer / bargaining message (Golden Taraju Feature 2)
// @route   POST /api/requests/:id/bargain
// @access  Private (Shopkeeper)
export const bargainRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { counterOffer, message } = req.body;

    if (!counterOffer) {
      return res.status(400).json({ success: false, message: 'Counter offer price is required' });
    }

    const offerVal = parseFloat(counterOffer);

    // Look up in fallback customer requests
    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((r) => r._id === id || r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Customer request not found' });
    }

    const shopMsg = {
      sender: 'shopkeeper',
      senderName: 'Sharma Hardware (You)',
      offer: offerVal,
      message: message || `I can offer ₹${offerVal} with priority counter pickup.`,
      time: new Date().toISOString(),
    };

    reqItem.negotiationHistory = reqItem.negotiationHistory || [];
    reqItem.negotiationHistory.push(shopMsg);
    reqItem.status = 'BARGAINING';

    // Simulated interactive customer reply
    const lastCustOffer = reqItem.customerOffer;
    const diff = offerVal - lastCustOffer;

    let custMsg = null;
    if (diff <= 5 || offerVal <= lastCustOffer) {
      // Customer accepts deal
      reqItem.status = 'ACCEPTED';
      reqItem.agreedPrice = offerVal;
      custMsg = {
        sender: 'customer',
        senderName: reqItem.customerName,
        offer: offerVal,
        message: 'Deal accepted! Thank you, looking forward to pickup.',
        time: new Date().toISOString(),
      };
    } else {
      // Customer makes slight final counter offer
      const custCounter = Math.round(offerVal - diff * 0.4);
      custMsg = {
        sender: 'customer',
        senderName: reqItem.customerName,
        offer: custCounter,
        message: `Can we settle at ₹${custCounter} final? Picking up today.`,
        time: new Date().toISOString(),
      };
      reqItem.customerOffer = custCounter;
    }

    reqItem.negotiationHistory.push(custMsg);

    // Socket notification
    const io = req.app.get('io');
    if (io) {
      io.emit('bargain_update', {
        requestId: id,
        request: reqItem,
      });
    }

    res.json({
      success: true,
      message: 'Counter offer submitted',
      request: reqItem,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Directly accept customer request offer (Feature 1 Action)
// @route   POST /api/requests/:id/accept
// @access  Private (Shopkeeper)
export const acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((r) => r._id === id || r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const agreedPrice = reqItem.customerOffer || reqItem.currentPrice;
    reqItem.status = 'ACCEPTED';
    reqItem.agreedPrice = agreedPrice;
    reqItem.negotiationHistory = reqItem.negotiationHistory || [];
    reqItem.negotiationHistory.push({
      sender: 'shopkeeper',
      senderName: 'Sharma Hardware (You)',
      offer: agreedPrice,
      message: `Deal Accepted! Ready for counter collection at ₹${agreedPrice}.`,
      time: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Customer offer accepted!',
      request: reqItem,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject customer request offer (Feature 1 Action)
// @route   POST /api/requests/:id/reject
// @access  Private (Shopkeeper)
export const rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((r) => r._id === id || r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    reqItem.status = 'REJECTED';
    reqItem.negotiationHistory = reqItem.negotiationHistory || [];
    reqItem.negotiationHistory.push({
      sender: 'shopkeeper',
      senderName: 'Sharma Hardware (You)',
      message: 'Regrettably, we cannot accept this offer at current wholesale rates.',
      time: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Request offer declined',
      request: reqItem,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Confirm accepted bargain deal into official reservation ticket (Feature 2 Action)
// @route   POST /api/requests/:id/confirm-deal
// @access  Private (Shopkeeper)
export const confirmBargainDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((r) => r._id === id || r.id === id);

    if (!reqItem) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const reservationCode = 'QK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const agreedPrice = reqItem.agreedPrice || reqItem.customerOffer || reqItem.currentPrice;
    const totalAmount = agreedPrice * (reqItem.quantity || 1);

    // Create reservation record
    const newReservation = {
      _id: 'res_' + Date.now(),
      id: 'res_' + Date.now(),
      reservationCode,
      customer_id: 'a0000000-0000-0000-0000-000000000001',
      shop_id: 'b0000000-0000-0000-0000-000000000001',
      product_name: reqItem.productName,
      quantity: reqItem.quantity,
      unit: reqItem.unit || 'piece',
      agreed_price: agreedPrice,
      total_amount: totalAmount,
      status: 'CONFIRMED',
      customer: { name: reqItem.customerName, phone: reqItem.customerPhone },
      created_at: new Date().toISOString(),
    };

    FALLBACK_RESERVATIONS.unshift(newReservation);

    // Deduct stock from shop inventory
    const matchedProd = FALLBACK_PRODUCTS.find(
      (p) => p.name.toLowerCase() === reqItem.productName.toLowerCase()
    );
    if (matchedProd && matchedProd.quantityInStock >= reqItem.quantity) {
      matchedProd.quantityInStock -= reqItem.quantity;
      if (matchedProd.quantityInStock <= matchedProd.lowStockThreshold) {
        matchedProd.stockStatus = matchedProd.quantityInStock > 0 ? 'low_stock' : 'out_of_stock';
      }
      reqItem.shopStock = matchedProd.quantityInStock;
    }

    reqItem.status = 'CONFIRMED';
    reqItem.reservationCode = reservationCode;

    res.status(201).json({
      success: true,
      message: `Bargain confirmed! In-store reservation ticket ${reservationCode} issued.`,
      reservation: newReservation,
      request: reqItem,
    });
  } catch (error) {
    next(error);
  }
};

// Aliases for backwards compatibility
export const createBroadcastRequest = createRequest;
export const getShopRequestsInbox = getShopRelevantRequests;

import { supabase } from '../config/supabase.js';
import { FALLBACK_CUSTOMER_REQUESTS, FALLBACK_PRODUCTS, FALLBACK_RESERVATIONS, FALLBACK_SHOPS } from '../utils/fallbackData.js';

const emitRequestUpdate = (req, request, action, shopId) => {
  const io = req.app.get('io');
  if (!io) return;

  const update = {
    requestId: request.id || request._id,
    status: request.status,
    action,
  };
  const customerId = request.customer_id || request.customerId;

  if (customerId) io.to(`user_${customerId}`).emit('request_updated', update);
  if (shopId) io.to(`shop_${shopId}`).emit('request_updated', update);
};

const normalizeHistory = (history) => (Array.isArray(history) ? history : []);

const throwUnexpectedQueryError = (error) => {
  if (error && error.code !== 'PGRST116') throw error;
};

const formatActionRequest = (request) => ({
  _id: request.id,
  id: request.id,
  productName: request.product_name,
  category: request.category,
  quantity: request.quantity || 1,
  unit: request.unit || 'piece',
  budget: request.expected_budget,
  expectedBudget: request.expected_budget,
  customerOffer: request.expected_budget ?? 0,
  agreedPrice: request.agreed_price,
  status: request.status === 'ACTIVE' ? 'PENDING' : request.status,
  urgency: request.urgency || 'today',
  customerName: request.customer?.name || 'Customer',
  customerPhone: request.customer?.phone || '',
  notes: request.notes || '',
  createdAt: request.created_at,
  negotiationHistory: normalizeHistory(request.negotiation_history),
});

// @desc    Broadcast structured request to nearby shops
// @route   POST /api/requests
// @access  Private (Customer)
export const createRequest = async (req, res, next) => {
  try {
    const {
      productName,
      category,
      quantity,
      unit,
      urgency,
    } = req.body;
    const budgetInput = req.body.expectedBudget ?? req.body.budget;
    const expectedBudget = budgetInput === undefined || budgetInput === null || budgetInput === ''
      ? null
      : Number(budgetInput);
    const notes = req.body.notes ?? req.body.note;

    if (!productName || !category) {
      return res.status(400).json({ success: false, message: 'Product name and category are required' });
    }

    if (expectedBudget !== null && (!Number.isFinite(expectedBudget) || expectedBudget < 0)) {
      return res.status(400).json({ success: false, message: 'Budget must be a valid non-negative amount' });
    }

    const initialHistory = expectedBudget === null ? [] : [{
      sender: 'customer',
      senderName: req.user.name || 'Customer',
      offer: expectedBudget,
      message: `Customer budget: ₹${expectedBudget}.`,
      time: new Date().toISOString(),
    }];

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
            expected_budget: expectedBudget,
            urgency: urgency || 'today',
            notes,
            negotiation_history: initialHistory,
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
      budget: expectedBudget,
      expectedBudget,
      customerOffer: expectedBudget ?? 0,
      currentPrice: 0,
      urgency: urgency || 'today',
      notes,
      negotiationHistory: initialHistory,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      responses: [],
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
          budget: r.expected_budget,
          expectedBudget: r.expected_budget,
          agreedPrice: r.agreed_price,
          negotiationHistory: normalizeHistory(r.negotiation_history),
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
            budget: r.expected_budget,
            expectedBudget: r.expected_budget,
            agreedPrice: r.agreed_price,
            negotiationHistory: normalizeHistory(r.negotiation_history),
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
          const negotiationHistory = normalizeHistory(r.negotiation_history);
          const latestCustomerOffer = [...negotiationHistory].reverse().find(
            (entry) => entry.sender === 'customer' && entry.offer != null && Number.isFinite(Number(entry.offer))
          );
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
            shopStock: match ? match.quantity_in_stock : 0,
            budget: r.expected_budget,
            expectedBudget: r.expected_budget,
            customerOffer: latestCustomerOffer ? Number(latestCustomerOffer.offer) : (r.expected_budget ?? 0),
            currentPrice: match?.price ?? 0,
            agreedPrice: r.agreed_price,
            status: r.status === 'ACTIVE' ? 'PENDING' : r.status,
            urgency: r.urgency || 'today',
            customerName: r.customer?.name || 'Customer',
            customerPhone: r.customer?.phone || '+91 9876543210',
            notes: r.notes || '',
            createdAt: r.created_at,
            negotiationHistory,
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
      requests: scoped.map((item) => ({
        ...item,
        budget: item.budget ?? item.expectedBudget,
        expectedBudget: item.expectedBudget ?? item.budget,
        customerOffer: item.customerOffer ?? item.budget ?? item.expectedBudget ?? 0,
        status: item.status === 'ACTIVE' ? 'PENDING' : item.status,
      })),
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
    const offerVal = Number(counterOffer);
    if (!Number.isFinite(offerVal) || offerVal <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid counter-offer amount' });
    }

    const time = new Date().toISOString();
    let request;
    let shopId;

    if (supabase) {
      const [{ data: existing, error: requestError }, { data: shop, error: shopError }] = await Promise.all([
        supabase.from('requests').select('*, customer:users(id, name)').eq('id', id).single(),
        supabase.from('shops').select('id, shop_name').eq('owner_id', req.user.id).single(),
      ]);
      throwUnexpectedQueryError(requestError);
      throwUnexpectedQueryError(shopError);
      if (requestError || !existing) return res.status(404).json({ success: false, message: 'Customer request not found' });
      if (shopError || !shop) return res.status(400).json({ success: false, message: 'You must have a registered shop profile to bargain' });
      if (!['ACTIVE', 'BARGAINING'].includes(existing.status)) {
        return res.status(400).json({ success: false, message: 'This request is no longer open for bargaining' });
      }

      shopId = shop.id;
      const history = normalizeHistory(existing.negotiation_history);
      history.push({
        sender: 'shopkeeper',
        senderName: shop.shop_name,
        shopId: shop.id,
        offer: offerVal,
        message: message || `Shop counter-offer: ₹${offerVal}.`,
        time,
      });
      const { data: updated, error } = await supabase
        .from('requests')
        .update({ status: 'BARGAINING', agreed_price: null, negotiation_history: history })
        .eq('id', id)
        .select('*, customer:users(id, name, phone)')
        .single();
      if (error) throw error;
      request = formatActionRequest(updated);
      emitRequestUpdate(req, updated, 'bargain', shopId);
    } else {
      const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((item) => item._id === id || item.id === id);
      if (!reqItem) return res.status(404).json({ success: false, message: 'Customer request not found' });
      if (!['ACTIVE', 'PENDING', 'BARGAINING'].includes(reqItem.status)) {
        return res.status(400).json({ success: false, message: 'This request is no longer open for bargaining' });
      }

      reqItem.negotiationHistory = normalizeHistory(reqItem.negotiationHistory);
      const ownedShop = (FALLBACK_SHOPS || []).find((item) => item.owner_id === req.user.id);
      reqItem.negotiationHistory.push({
        sender: 'shopkeeper',
        senderName: req.user.name || 'Shopkeeper',
        shopId: ownedShop?._id || ownedShop?.id,
        offer: offerVal,
        message: message || `Shop counter-offer: ₹${offerVal}.`,
        time,
      });
      reqItem.status = 'BARGAINING';
      request = reqItem;
      emitRequestUpdate(req, reqItem, 'bargain', ownedShop?._id || ownedShop?.id);
    }

    return res.json({ success: true, message: 'Counter offer sent to the customer', request });
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
    const time = new Date().toISOString();

    if (supabase) {
      const [{ data: existing, error: requestError }, { data: shop, error: shopError }] = await Promise.all([
        supabase.from('requests').select('*, customer:users(id, name, phone)').eq('id', id).single(),
        supabase.from('shops').select('id, shop_name').eq('owner_id', req.user.id).single(),
      ]);
      throwUnexpectedQueryError(requestError);
      throwUnexpectedQueryError(shopError);
      if (requestError || !existing) return res.status(404).json({ success: false, message: 'Request not found' });
      if (shopError || !shop) return res.status(400).json({ success: false, message: 'You must have a registered shop profile to accept requests' });
      if (!['ACTIVE', 'BARGAINING'].includes(existing.status)) {
        return res.status(400).json({ success: false, message: 'This request is no longer open' });
      }

      const history = normalizeHistory(existing.negotiation_history);
      const latestOffer = [...history].reverse().find(
        (entry) => entry.offer != null && Number.isFinite(Number(entry.offer))
      );
      const agreedPrice = latestOffer ? Number(latestOffer.offer) : Number(existing.expected_budget);
      if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
        return res.status(400).json({ success: false, message: 'A customer budget or negotiated offer is required before accepting' });
      }
      history.push({
        sender: 'shopkeeper',
        senderName: shop.shop_name,
        offer: agreedPrice,
        message: `Request accepted at ₹${agreedPrice}.`,
        time,
      });
      const { data: updated, error } = await supabase
        .from('requests')
        .update({ status: 'ACCEPTED', agreed_price: agreedPrice, negotiation_history: history })
        .eq('id', id)
        .select('*, customer:users(id, name, phone)')
        .single();
      if (error) throw error;

      emitRequestUpdate(req, updated, 'accept', shop.id);
      return res.json({ success: true, message: 'Customer offer accepted!', request: formatActionRequest(updated) });
    }

    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((item) => item._id === id || item.id === id);
    if (!reqItem) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!['ACTIVE', 'PENDING', 'BARGAINING'].includes(reqItem.status)) {
      return res.status(400).json({ success: false, message: 'This request is no longer open' });
    }
    const latestOffer = [...normalizeHistory(reqItem.negotiationHistory)].reverse()
      .find((entry) => entry.offer != null && Number.isFinite(Number(entry.offer)));
    const agreedPrice = latestOffer ? Number(latestOffer.offer) : Number(reqItem.expectedBudget ?? reqItem.customerOffer);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      return res.status(400).json({ success: false, message: 'A customer budget or negotiated offer is required before accepting' });
    }
    reqItem.status = 'ACCEPTED';
    reqItem.agreedPrice = agreedPrice;
    reqItem.negotiationHistory = normalizeHistory(reqItem.negotiationHistory);
    reqItem.negotiationHistory.push({
      sender: 'shopkeeper',
      senderName: req.user.name || 'Shopkeeper',
      offer: agreedPrice,
      message: `Request accepted at ₹${agreedPrice}.`,
      time,
    });
    const ownedShop = (FALLBACK_SHOPS || []).find((item) => item.owner_id === req.user.id);
    emitRequestUpdate(req, reqItem, 'accept', ownedShop?._id || ownedShop?.id);
    return res.json({ success: true, message: 'Customer offer accepted!', request: reqItem });
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
    const time = new Date().toISOString();

    if (supabase) {
      const [{ data: existing, error: requestError }, { data: shop, error: shopError }] = await Promise.all([
        supabase.from('requests').select('*, customer:users(id, name, phone)').eq('id', id).single(),
        supabase.from('shops').select('id, shop_name').eq('owner_id', req.user.id).single(),
      ]);
      throwUnexpectedQueryError(requestError);
      throwUnexpectedQueryError(shopError);
      if (requestError || !existing) return res.status(404).json({ success: false, message: 'Request not found' });
      if (shopError || !shop) return res.status(400).json({ success: false, message: 'You must have a registered shop profile to reject requests' });
      if (!['ACTIVE', 'BARGAINING'].includes(existing.status)) {
        return res.status(400).json({ success: false, message: 'This request is no longer open' });
      }

      const history = normalizeHistory(existing.negotiation_history);
      history.push({
        sender: 'shopkeeper',
        senderName: shop.shop_name,
        message: 'The shop declined this request.',
        time,
      });
      const { data: updated, error } = await supabase
        .from('requests')
        .update({ status: 'REJECTED', negotiation_history: history })
        .eq('id', id)
        .select('*, customer:users(id, name, phone)')
        .single();
      if (error) throw error;

      emitRequestUpdate(req, updated, 'reject', shop.id);
      return res.json({ success: true, message: 'Request offer declined', request: formatActionRequest(updated) });
    }

    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((item) => item._id === id || item.id === id);
    if (!reqItem) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!['ACTIVE', 'PENDING', 'BARGAINING'].includes(reqItem.status)) {
      return res.status(400).json({ success: false, message: 'This request is no longer open' });
    }
    reqItem.status = 'REJECTED';
    reqItem.negotiationHistory = normalizeHistory(reqItem.negotiationHistory);
    reqItem.negotiationHistory.push({
      sender: 'shopkeeper',
      senderName: req.user.name || 'Shopkeeper',
      message: 'The shop declined this request.',
      time,
    });
    const ownedShop = (FALLBACK_SHOPS || []).find((item) => item.owner_id === req.user.id);
    emitRequestUpdate(req, reqItem, 'reject', ownedShop?._id || ownedShop?.id);
    return res.json({ success: true, message: 'Request offer declined', request: reqItem });
  } catch (error) {
    next(error);
  }
};

// @desc    Customer accepts or counters a shopkeeper's bargain offer
// @route   POST /api/requests/:id/customer-respond
// @access  Private (Customer)
export const respondToBargain = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, counterOffer, message } = req.body;
    if (!['accept', 'counter'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Choose whether to accept or counter the shop offer' });
    }

    const time = new Date().toISOString();
    if (supabase) {
      const { data: existing, error: requestError } = await supabase
        .from('requests')
        .select('*, customer:users(id, name)')
        .eq('id', id)
        .eq('customer_id', req.user.id)
        .single();
      throwUnexpectedQueryError(requestError);
      if (requestError || !existing) return res.status(404).json({ success: false, message: 'Your request was not found' });
      if (existing.status !== 'BARGAINING') {
        return res.status(400).json({ success: false, message: 'There is no shop offer awaiting your response' });
      }

      const history = normalizeHistory(existing.negotiation_history);
      const latest = history[history.length - 1];
      if (latest?.sender !== 'shopkeeper' || latest.offer == null || !Number.isFinite(Number(latest.offer))) {
        return res.status(400).json({ success: false, message: 'The latest request update is not a shop offer' });
      }

      let status = 'ACCEPTED';
      let agreedPrice = Number(latest.offer);
      let customerMessage = `Deal accepted at ₹${agreedPrice}.`;
      let offer = agreedPrice;
      if (action === 'counter') {
        offer = Number(counterOffer);
        if (!Number.isFinite(offer) || offer <= 0) {
          return res.status(400).json({ success: false, message: 'Enter a valid counter-offer amount' });
        }
        status = 'BARGAINING';
        agreedPrice = null;
        customerMessage = message || `Customer counter-offer: ₹${offer}.`;
      }
      history.push({
        sender: 'customer',
        senderName: existing.customer?.name || req.user.name || 'Customer',
        offer,
        message: customerMessage,
        time,
      });

      const { data: updated, error } = await supabase
        .from('requests')
        .update({ status, agreed_price: agreedPrice, negotiation_history: history })
        .eq('id', id)
        .eq('customer_id', req.user.id)
        .select('*, customer:users(id, name, phone)')
        .single();
      if (error) throw error;

      emitRequestUpdate(req, updated, `customer_${action}`, latest.shopId);
      return res.json({
        success: true,
        message: action === 'accept' ? 'Shop offer accepted' : 'Counter-offer sent to the shop',
        request: {
          _id: updated.id,
          id: updated.id,
          status: updated.status,
          agreedPrice: updated.agreed_price,
          negotiationHistory: normalizeHistory(updated.negotiation_history),
        },
      });
    }

    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((item) => (item._id === id || item.id === id)
      && (item.customerId || item.customer_id) === req.user.id);
    if (!reqItem) return res.status(404).json({ success: false, message: 'Your request was not found' });
    if (reqItem.status !== 'BARGAINING') {
      return res.status(400).json({ success: false, message: 'There is no shop offer awaiting your response' });
    }

    const history = normalizeHistory(reqItem.negotiationHistory);
    const latest = history[history.length - 1];
    if (latest?.sender !== 'shopkeeper' || latest.offer == null || !Number.isFinite(Number(latest.offer))) {
      return res.status(400).json({ success: false, message: 'The latest request update is not a shop offer' });
    }

    let status = 'ACCEPTED';
    let agreedPrice = Number(latest.offer);
    let offer = agreedPrice;
    let customerMessage = `Deal accepted at ₹${agreedPrice}.`;
    if (action === 'counter') {
      offer = Number(counterOffer);
      if (!Number.isFinite(offer) || offer <= 0) {
        return res.status(400).json({ success: false, message: 'Enter a valid counter-offer amount' });
      }
      status = 'BARGAINING';
      agreedPrice = null;
      customerMessage = message || `Customer counter-offer: ₹${offer}.`;
    }
    history.push({
      sender: 'customer',
      senderName: reqItem.customerName || req.user.name || 'Customer',
      offer,
      message: customerMessage,
      time,
    });
    reqItem.status = status;
    reqItem.agreedPrice = agreedPrice;
    if (action === 'counter') reqItem.customerOffer = offer;
    reqItem.negotiationHistory = history;
    emitRequestUpdate(req, reqItem, `customer_${action}`, latest.shopId);
    return res.json({
      success: true,
      message: action === 'accept' ? 'Shop offer accepted' : 'Counter-offer sent to the shop',
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
    const reservationCode = 'QK-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const time = new Date().toISOString();

    if (supabase) {
      const [{ data: request, error: requestError }, { data: shop, error: shopError }] = await Promise.all([
        supabase.from('requests').select('*, customer:users(id, name, phone)').eq('id', id).single(),
        supabase.from('shops').select('id, shop_name').eq('owner_id', req.user.id).single(),
      ]);
      throwUnexpectedQueryError(requestError);
      throwUnexpectedQueryError(shopError);
      if (requestError || !request) return res.status(404).json({ success: false, message: 'Request not found' });
      if (shopError || !shop) return res.status(400).json({ success: false, message: 'You must have a registered shop profile to confirm bargains' });
      if (request.status !== 'ACCEPTED') {
        return res.status(400).json({ success: false, message: 'Only an accepted bargain can be confirmed' });
      }

      const agreedPrice = Number(request.agreed_price);
      if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
        return res.status(400).json({ success: false, message: 'The accepted bargain has no valid agreed price' });
      }
      const quantity = Number(request.quantity) || 1;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert([{
          reservation_code: reservationCode,
          customer_id: request.customer_id,
          shop_id: shop.id,
          product_id: null,
          product_name: request.product_name,
          quantity,
          unit: request.unit || 'piece',
          agreed_price: agreedPrice,
          total_amount: agreedPrice * quantity,
          status: 'CONFIRMED',
          hold_duration_minutes: 60,
          expires_at: expiresAt,
          customer_note: request.notes || null,
        }])
        .select('*, shops(id, shop_name, contact_phone, address)')
        .single();
      if (reservationError) throw reservationError;

      const history = normalizeHistory(request.negotiation_history);
      history.push({
        sender: 'shopkeeper',
        senderName: shop.shop_name,
        shopId: shop.id,
        offer: agreedPrice,
        message: `Bargain confirmed. Reservation ${reservationCode} is ready.`,
        time,
      });
      const { data: updated, error: updateError } = await supabase
        .from('requests')
        .update({ status: 'CONFIRMED', negotiation_history: history })
        .eq('id', id)
        .eq('status', 'ACCEPTED')
        .select('*, customer:users(id, name, phone)')
        .single();
      if (updateError) throw updateError;

      const io = req.app.get('io');
      if (io) {
        io.to(`shop_${shop.id}`).emit('new_reservation', {
          reservationCode,
          productName: request.product_name,
          quantity,
          shopId: shop.id,
        });
      }
      emitRequestUpdate(req, updated, 'confirm', shop.id);
      return res.status(201).json({
        success: true,
        message: `Bargain confirmed! Reservation ${reservationCode} issued.`,
        reservation,
        request: formatActionRequest(updated),
      });
    }

    const reqItem = FALLBACK_CUSTOMER_REQUESTS.find((item) => item._id === id || item.id === id);
    if (!reqItem) return res.status(404).json({ success: false, message: 'Request not found' });
    if (reqItem.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Only an accepted bargain can be confirmed' });
    }
    const agreedPrice = Number(reqItem.agreedPrice);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      return res.status(400).json({ success: false, message: 'The accepted bargain has no valid agreed price' });
    }
    const ownedShop = (FALLBACK_SHOPS || []).find((item) => item.owner_id === req.user.id);
    const shopId = ownedShop?._id || ownedShop?.id;
    const totalAmount = agreedPrice * (reqItem.quantity || 1);

    // Create reservation record
    const reservationId = 'res_' + Date.now();
    const newReservation = {
      _id: reservationId,
      id: reservationId,
      reservationCode,
      customer_id: reqItem.customerId || reqItem.customer_id,
      shop_id: shopId,
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
    reqItem.negotiationHistory = normalizeHistory(reqItem.negotiationHistory);
    reqItem.negotiationHistory.push({
      sender: 'shopkeeper',
      senderName: req.user.name || 'Shopkeeper',
      shopId,
      offer: agreedPrice,
      message: `Bargain confirmed. Reservation ${reservationCode} is ready.`,
      time,
    });

    const io = req.app.get('io');
    if (io && shopId) {
      io.to(`shop_${shopId}`).emit('new_reservation', {
        reservationCode,
        productName: reqItem.productName,
        quantity: reqItem.quantity,
        shopId,
      });
    }
    emitRequestUpdate(req, reqItem, 'confirm', shopId);

    return res.status(201).json({
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

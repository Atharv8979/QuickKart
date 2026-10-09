import { supabase } from '../config/supabase.js';
import { calculateDistanceKm } from '../utils/geoCoder.js';
import { FALLBACK_SHOPS, FALLBACK_PRODUCTS, FALLBACK_RESERVATIONS } from '../utils/fallbackData.js';

// @desc    Get nearby shops with geospatial filtering & search using Supabase
// @route   GET /api/shops/nearby
// @access  Public
export const getNearbyShops = async (req, res, next) => {
  try {
    const {
      lng,
      lat,
      radius = 10,
      category,
      search,
    } = req.query;

    const userLng = parseFloat(lng) || 77.2090;
    const userLat = parseFloat(lat) || 28.6139;

    let shops = [];

    if (supabase) {
      let query = supabase
        .from('shops')
        .select('*, products(id, name, price, mrp, unit, is_available, images)')
        .eq('verification_status', 'verified');

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`shop_name.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`);
      }

      const { data: shopsData, error } = await query;

      if (!error && shopsData && shopsData.length > 0) {
        shops = shopsData.map((s) => {
          const dist = calculateDistanceKm([userLng, userLat], [s.location_lng || 77.1906, s.location_lat || 28.6517]);
          return {
            _id: s.id,
            id: s.id,
            shopName: s.shop_name,
            tagline: s.tagline,
            description: s.description,
            category: s.category,
            address: s.address,
            location: { coordinates: [s.location_lng, s.location_lat] },
            contactPhone: s.contact_phone,
            bannerImage: s.banner_image || 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
            rating: s.rating || 4.8,
            numReviews: s.num_reviews || 120,
            isActive: s.is_active,
            verificationStatus: s.verification_status,
            liveServingCount: s.live_serving_count || 2,
            estWaitTimeMinutes: s.est_wait_time_minutes || 5,
            promptResponseRate: s.prompt_response_rate || 95,
            distanceKm: parseFloat(dist.toFixed(1)),
            topProducts: (s.products || []).slice(0, 4),
          };
        });
      }
    }

    if (shops.length === 0) {
      shops = FALLBACK_SHOPS.map((s) => {
        const coords = s.location?.coordinates || [77.1906, 28.6517];
        const dist = calculateDistanceKm([userLng, userLat], coords);
        return {
          ...s,
          distanceKm: parseFloat(dist.toFixed(1)),
        };
      });
    }

    // Filter by radius & sort
    const withinRadius = shops.filter((s) => s.distanceKm <= parseFloat(radius));
    withinRadius.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({
      success: true,
      count: withinRadius.length,
      userLocation: { lng: userLng, lat: userLat },
      shops: withinRadius,
    });
  } catch (error) {
    res.json({
      success: true,
      count: FALLBACK_SHOPS.length,
      userLocation: { lng: parseFloat(req.query.lng) || 77.2090, lat: parseFloat(req.query.lat) || 28.6139 },
      shops: FALLBACK_SHOPS,
    });
  }
};

// @desc    Get single shop by ID
// @route   GET /api/shops/:id
// @access  Public
export const getShopById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      const { data: shop, error } = await supabase
        .from('shops')
        .select('*, products(*)')
        .eq('id', id)
        .single();

      if (!error && shop) {
        return res.json({
          success: true,
          shop: {
            _id: shop.id,
            id: shop.id,
            shopName: shop.shop_name,
            tagline: shop.tagline,
            description: shop.description,
            category: shop.category,
            address: shop.address,
            location: { coordinates: [shop.location_lng, shop.location_lat] },
            contactPhone: shop.contact_phone,
            bannerImage: shop.banner_image,
            rating: shop.rating,
            numReviews: shop.num_reviews,
            liveServingCount: shop.live_serving_count,
            estWaitTimeMinutes: shop.est_wait_time_minutes,
            promptResponseRate: shop.prompt_response_rate,
          },
          products: shop.products || [],
        });
      }
    }

    const fallback = FALLBACK_SHOPS.find((s) => s._id === id || s.id === id) || FALLBACK_SHOPS[0];
    return res.json({ success: true, shop: fallback, products: fallback.topProducts });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new store
// @route   POST /api/shops
// @access  Private (Shopkeeper)
export const registerShop = async (req, res, next) => {
  try {
    const {
      shopName,
      tagline,
      description,
      category,
      address,
      locationLat = 28.6517,
      locationLng = 77.1906,
      contactPhone,
      bannerImage,
      openingHours,
    } = req.body;

    if (!shopName || !category) {
      return res.status(400).json({ success: false, message: 'Shop name and category are required' });
    }

    if (supabase) {
      // Check if user already owns a shop
      const { data: existingShop } = await supabase
        .from('shops')
        .select('*')
        .eq('owner_id', req.user.id)
        .single();

      if (existingShop) {
        return res.status(400).json({
          success: false,
          message: 'You already have a registered shop profile',
          shop: existingShop,
        });
      }

      const { data: shop, error } = await supabase
        .from('shops')
        .insert([
          {
            owner_id: req.user.id,
            shop_name: shopName.trim(),
            tagline: tagline || '',
            description: description || '',
            category,
            address: address || { street: '', area: '', city: 'New Delhi', pincode: '110001' },
            location_lat: parseFloat(locationLat) || 28.6517,
            location_lng: parseFloat(locationLng) || 77.1906,
            contact_phone: contactPhone || req.user.phone || '+91 9876543210',
            banner_image: bannerImage || 'https://images.unsplash.com/photo-1581783342308-f792dbdd27c5?auto=format&fit=crop&w=800&q=80',
            opening_hours: openingHours || { open: '09:00 AM', close: '09:00 PM' },
            verification_status: 'verified',
            is_active: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Update user's role to shopkeeper if not already
      if (req.user.role !== 'admin') {
        await supabase
          .from('users')
          .update({ role: 'shopkeeper', updated_at: new Date().toISOString() })
          .eq('id', req.user.id);
      }

      return res.status(201).json({
        success: true,
        message: 'Shop registered successfully',
        shop: {
          _id: shop.id,
          id: shop.id,
          shopName: shop.shop_name,
          tagline: shop.tagline,
          description: shop.description,
          category: shop.category,
          address: shop.address,
          location: { coordinates: [shop.location_lng, shop.location_lat] },
          contactPhone: shop.contact_phone,
          bannerImage: shop.banner_image,
          rating: shop.rating || 5.0,
          numReviews: shop.num_reviews || 0,
          isActive: shop.is_active,
          verificationStatus: shop.verification_status,
          liveServingCount: shop.live_serving_count || 1,
          estWaitTimeMinutes: shop.est_wait_time_minutes || 5,
          promptResponseRate: shop.prompt_response_rate || 95,
        },
      });
    }

    // Fallback response
    const mockId = 'b0000000-0000-0000-0000-000000000099';
    return res.status(201).json({
      success: true,
      message: 'Shop registered successfully',
      shop: {
        _id: mockId,
        id: mockId,
        owner_id: req.user.id,
        shopName,
        category,
        address: address || {},
        verificationStatus: 'verified',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current shopkeeper's store profile
// @route   GET /api/shops/my-shop
// @access  Private (Shopkeeper)
export const getMyShop = async (req, res, next) => {
  try {
    if (supabase) {
      const { data: shop, error } = await supabase
        .from('shops')
        .select('*, products(*)')
        .eq('owner_id', req.user.id)
        .single();

      if (shop) {
        // If this shop is a known demo shop ID, treat as new user (no seeded products)
        const DEMO_SHOP_IDS = new Set([
          'b0000000-0000-0000-0000-000000000001', // Sharma Hardware
          'b0000000-0000-0000-0000-000000000002', // Gupta Building Materials
        ]);
        if (DEMO_SHOP_IDS.has(shop.id || shop._id)) {
          // Return the shop metadata but WITHOUT seeded products - new user starts fresh
          return res.json({
            success: true,
            shop: {
              _id: shop.id,
              id: shop.id,
              shopName: shop.shop_name,
              tagline: shop.tagline,
              description: shop.description,
              category: shop.category,
              address: shop.address,
              gstNumber: shop.address?.gstNumber || null,
              tags: shop.address?.tags || (shop.category ? [shop.category] : []),
              location: { coordinates: [shop.location_lng, shop.location_lat] },
              contactPhone: shop.contact_phone,
              bannerImage: shop.banner_image,
              rating: shop.rating,
              numReviews: shop.num_reviews,
              verificationStatus: shop.verification_status,
              liveServingCount: shop.live_serving_count,
              estWaitTimeMinutes: shop.est_wait_time_minutes,
              promptResponseRate: shop.prompt_response_rate,
              products: [], // Empty - new user, no demo products
            },
          });
        }

        // Newly registered shopkeeper (not a demo shop): return their fresh shop with products
        return res.json({
          success: true,
          shop: {
            _id: shop.id,
            id: shop.id,
            shopName: shop.shop_name,
            tagline: shop.tagline,
            description: shop.description,
            category: shop.category,
            address: shop.address,
            gstNumber: shop.address?.gstNumber || null,
            tags: shop.address?.tags || (shop.category ? [shop.category] : []),
            location: { coordinates: [shop.location_lng, shop.location_lat] },
            contactPhone: shop.contact_phone,
            bannerImage: shop.banner_image,
            rating: shop.rating,
            numReviews: shop.num_reviews,
            verificationStatus: shop.verification_status,
            liveServingCount: shop.live_serving_count,
            estWaitTimeMinutes: shop.est_wait_time_minutes,
            promptResponseRate: shop.prompt_response_rate,
            products: shop.products || [],
          },
        });
      }

      // Shop not found in Supabase for this owner — fall through to demo/new user logic
    }

    // ---- Fallback logic for demo users or shopkeepers without a Supabase shop ----
    // 1. Try to find a fallback shop that matches this user AND is NOT a demo owner
    let ownedFallback = FALLBACK_SHOPS.find(
      (s) => s.owner_id === req.user.id && !DEMO_OWNER_IDS.has(s.owner_id)
    ) || null;

    // 2. If no matching non-demo fallback found AND user is a shopkeeper,
    //    create a brand‑new fallback with empty products (never show demo items)
    if (!ownedFallback && req.user?.role === 'shopkeeper') {
      const generatedShopId = 'shop_' + req.user.id.substring(0, 10);
      ownedFallback = {
        _id: generatedShopId,
        id: generatedShopId,
        owner_id: req.user.id,
        shopName: req.user.name ? `${req.user.name}'s Store` : 'My QuickKart Store',
        tagline: 'Neighborhood Merchant Store',
        description: '',
        category: 'General Store',
        address: req.user.address || { city: 'New Delhi', state: 'Delhi' },
        gstNumber: null,
        tags: ['General Store'],
        contactPhone: req.user.phone || null,
        location: {
          type: 'Point',
          coordinates: [77.1906, 28.6517],
        },
        rating: 5.0,
        numReviews: 0,
        isActive: true,
        verificationStatus: 'verified',
        liveServingCount: 0,
        estWaitTimeMinutes: 0,
        promptResponseRate: 100,
        products: [],
      };
      FALLBACK_SHOPS.unshift(ownedFallback);
    }

    // 3. If still no shop (e.g. demo customer or edge case), return null
    if (!ownedFallback) {
      return res.json({
        success: true,
        shop: null,
        products: [],
      });
    }

    res.json({
      success: true,
      shop: ownedFallback,
    });
} catch (error) {
    next(error);
  }
};

// @desc    Update current shopkeeper store profile
// @route   PUT /api/shops/my-shop
// @access  Private (Shopkeeper)
export const updateMyShop = async (req, res, next) => {
  try {
    const { shopName, tagline, category, description, contactPhone, address, gstNumber, tags, openingHours } = req.body;
    const updateData = {};
    if (shopName) updateData.shop_name = shopName;
    if (tagline !== undefined) updateData.tagline = tagline;
    if (category) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (contactPhone) updateData.contact_phone = contactPhone;
    if (address) updateData.address = address;
    // GST + shop tags are stored inside the address JSONB (no schema change),
    // so profile edits merge them into the address object.
    if (gstNumber !== undefined || tags !== undefined) {
      const mergedAddress = { ...(updateData.address || address || {}) };
      if (gstNumber !== undefined) mergedAddress.gstNumber = gstNumber;
      if (tags !== undefined) mergedAddress.tags = tags;
      updateData.address = mergedAddress;
    }
    // Opening hours are nested inside address JSONB
    if (openingHours) {
      const existingAddress = updateData.address || address || {};
      updateData.address = {
        ...existingAddress,
        openingHours: {
          open: openingHours.open,
          close: openingHours.close,
        },
      };
    }
    updateData.updated_at = new Date().toISOString();

    if (supabase) {
      const { data: shop, error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('owner_id', req.user.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Store profile updated in Supabase',
        shop: shop || req.body,
      });
    }

    const DEMO_SHOP_IDS = new Set([
      'b0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000002',
      'b0000000-0000-0000-0000-000000000003',
      'b0000000-0000-0000-0000-000000000004',
      'sehore-demo-001',
    ]);
    const fallbackItem = FALLBACK_SHOPS.find((s) => s.owner_id === req.user.id && !DEMO_SHOP_IDS.has(s._id || s.id));
    if (fallbackItem) {
      if (shopName) fallbackItem.shopName = shopName;
      if (tagline !== undefined) fallbackItem.tagline = tagline;
      if (category) fallbackItem.category = category;
      if (description !== undefined) fallbackItem.description = description;
      if (contactPhone) fallbackItem.contactPhone = contactPhone;
      if (updateData.address) fallbackItem.address = updateData.address;
    }

    res.json({
      success: true,
      message: 'Store profile updated',
      shop: fallbackItem || req.body,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update My Shop Live Business Capability State (Chapter 16.4 / Fig 16.4)
// @route   PUT /api/shops/live-state
// @access  Private (Shopkeeper)
export const updateLiveBusinessState = async (req, res, next) => {
  try {
    const { liveServingCount, estWaitTimeMinutes, promptResponseRate, isOpenNow } = req.body;
    const updateData = {};
    if (liveServingCount !== undefined) updateData.live_serving_count = parseInt(liveServingCount);
    if (estWaitTimeMinutes !== undefined) updateData.est_wait_time_minutes = parseInt(estWaitTimeMinutes);
    if (promptResponseRate !== undefined) updateData.prompt_response_rate = parseInt(promptResponseRate);
    if (isOpenNow !== undefined) updateData.is_active = !!isOpenNow;
    updateData.updated_at = new Date().toISOString();

    if (supabase) {
      const { data: shop, error } = await supabase
        .from('shops')
        .update(updateData)
        .eq('owner_id', req.user.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Live business capability updated in Supabase',
        shop: shop || req.body,
      });
    }

    const DEMO_SHOP_IDS = new Set([
      'b0000000-0000-0000-0000-000000000001',
      'b0000000-0000-0000-0000-000000000002',
      'b0000000-0000-0000-0000-000000000003',
      'b0000000-0000-0000-0000-000000000004',
      'sehore-demo-001',
    ]);
    const fallbackItem = FALLBACK_SHOPS.find((s) => s.owner_id === req.user.id && !DEMO_SHOP_IDS.has(s._id || s.id));
    if (fallbackItem) {
      if (liveServingCount !== undefined) fallbackItem.liveServingCount = parseInt(liveServingCount);
      if (estWaitTimeMinutes !== undefined) fallbackItem.estWaitTimeMinutes = parseInt(estWaitTimeMinutes);
      if (promptResponseRate !== undefined) fallbackItem.promptResponseRate = parseInt(promptResponseRate);
      if (isOpenNow !== undefined) fallbackItem.isActive = !!isOpenNow;
    }

    res.json({
      success: true,
      message: 'Live business capability updated',
      shop: fallbackItem || req.body,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dynamic Regional Sales Ranking & My Shop vs Regional Demand (Features 4 & 5)
// @route   GET /api/shops/regional-ranking
// @access  Public / Private (Shopkeeper)
export const getRegionalRanking = async (req, res, next) => {
  try {
    const {
      range = '10', // 1, 5, 10, 25, 50, 100
      period = '30d', // today, 7d, 30d, 90d, custom
      startDate,
      endDate,
      shopId,
    } = req.query;

    const rangeKm = parseFloat(range) || 10;

    // Determine current shop reference point
    let myShop = null;
    let shopCoords = [77.1906, 28.6517]; // Default Karol Bagh reference
    let targetShopId = shopId || null;

    if (req.user) {
      if (supabase) {
        const { data: dbShop } = await supabase
          .from('shops')
          .select('id, location_lng, location_lat, shop_name')
          .eq('owner_id', req.user.id)
          .single();
        if (dbShop) {
          myShop = dbShop;
          targetShopId = dbShop.id;
          if (dbShop.location_lng && dbShop.location_lat) {
            shopCoords = [dbShop.location_lng, dbShop.location_lat];
          }
        }
      } else {
        const DEMO_SHOP_IDS = new Set([
          'b0000000-0000-0000-0000-000000000001',
          'b0000000-0000-0000-0000-000000000002',
          'b0000000-0000-0000-0000-000000000003',
          'b0000000-0000-0000-0000-000000000004',
          'sehore-demo-001',
        ]);
        const userOwned = FALLBACK_SHOPS.find((s) => s.owner_id === req.user.id && !DEMO_SHOP_IDS.has(s._id || s.id));
        if (userOwned) {
          myShop = userOwned;
          targetShopId = userOwned.id || userOwned._id;
          shopCoords = userOwned.location?.coordinates || shopCoords;
        }
      }
    }

    if (!myShop) {
      const found = targetShopId
        ? FALLBACK_SHOPS.find((s) => s.id === targetShopId || s._id === targetShopId)
        : null;
      if (found) {
        shopCoords = found.location?.coordinates || [77.1906, 28.6517];
        targetShopId = found.id || found._id;
        myShop = found;
      } else if (!req.user || req.user.role === 'admin') {
        const fallbackDefault = FALLBACK_SHOPS[0];
        shopCoords = fallbackDefault?.location?.coordinates || [77.1906, 28.6517];
        targetShopId = fallbackDefault?.id || fallbackDefault?._id;
        myShop = fallbackDefault;
      }
    }

    // Resolve THIS shopkeeper's real catalog first so every "My Shop" column
    // only ever reflects stock they actually own — never another (demo)
    // shop's inventory. Supabase mode reads their live products row; local
    // fallback mode matches owned rows in the seed catalogue by shop id.
    // NOTE: seed products store shopId as an embedded shop OBJECT
    // ({ _id, id, shopName }), while dynamically created ones use a plain
    // string — normalize both before comparing (same rule as productController).
    const isOwnedFallbackProduct = (p) => {
      if (!targetShopId) return false;
      const owner = p.shopId || p.shop_id;
      const ownerKey = owner && typeof owner === 'object' ? owner._id || owner.id : owner;
      return String(ownerKey || '') === String(targetShopId);
    };

    let ownedCatalog = FALLBACK_PRODUCTS.filter(isOwnedFallbackProduct);
    if (supabase && targetShopId) {
      const { data: myProducts } = await supabase
        .from('products')
        .select('*')
        .eq('shop_id', targetShopId);
      ownedCatalog = (myProducts || []).map((p) => ({
        name: p.name,
        category: p.category,
        price: p.price,
        unit: p.unit,
        images: p.images,
        quantityInStock: p.quantity_in_stock ?? 0,
        lowStockThreshold: p.low_stock_threshold ?? 5,
      }));
    }

    // Step 1: Identify all shops within selected geographical range
    const allShops = FALLBACK_SHOPS.map((s) => {
      const coords = s.location?.coordinates || [77.1906, 28.6517];
      const dist = calculateDistanceKm(shopCoords, coords);
      return {
        ...s,
        distKm: dist,
        inRadius: dist <= rangeKm,
      };
    });

    const inRangeShopIds = new Set(allShops.filter((s) => s.inRadius).map((s) => s.id));

    // Step 2: Filter orders according to selected time period
    const now = Date.now();
    let minTimestamp = 0;
    let maxTimestamp = now;

    if (period === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      minTimestamp = d.getTime();
    } else if (period === '7d') {
      minTimestamp = now - 7 * 24 * 60 * 60 * 1000;
    } else if (period === '30d') {
      minTimestamp = now - 30 * 24 * 60 * 60 * 1000;
    } else if (period === '90d') {
      minTimestamp = now - 90 * 24 * 60 * 60 * 1000;
    } else if (period === 'custom') {
      if (startDate) minTimestamp = new Date(startDate).getTime();
      if (endDate) {
        const ed = new Date(endDate);
        ed.setHours(23, 59, 59, 999);
        maxTimestamp = ed.getTime();
      }
    }

    // Filter reservations/orders
    const matchingReservations = FALLBACK_RESERVATIONS.filter((res) => {
      // Must be within geographical range
      if (!inRangeShopIds.has(res.shop_id)) return false;

      // Must match time period
      const t = new Date(res.created_at).getTime();
      if (t < minTimestamp || t > maxTimestamp) return false;

      return true;
    });

    // Step 3 & 4: Group sold products and calculate total quantity sold per product
    const productAggregates = {};

    matchingReservations.forEach((order) => {
      const name = order.product_name;
      if (!productAggregates[name]) {
        // Find product catalog metadata if available
        const catalogItem = FALLBACK_PRODUCTS.find(
          (p) => p.name.toLowerCase() === name.toLowerCase()
        );
        const ownedItem = ownedCatalog.find(
          (p) => String(p.name || '').toLowerCase() === name.toLowerCase()
        );
        productAggregates[name] = {
          productName: name,
          category: catalogItem?.category || 'General',
          image: catalogItem?.images?.[0] || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
          price: catalogItem?.price || order.agreed_price,
          unit: order.unit || 'piece',
          totalQuantitySold: 0,
          totalRevenue: 0,
          orderCount: 0,
          myShopQuantitySold: 0,
          // Only report stock for products THIS shop actually lists.
          myShopStock: ownedItem ? ownedItem.quantityInStock : 0,
          lowStockThreshold: ownedItem?.lowStockThreshold || catalogItem?.lowStockThreshold || 5,
          inMyCatalog: !!ownedItem,
        };
      }

      const qty = order.quantity || 1;
      const rev = order.total_amount || (order.agreed_price * qty);

      productAggregates[name].totalQuantitySold += qty;
      productAggregates[name].totalRevenue += rev;
      productAggregates[name].orderCount += 1;

      if (order.shop_id === targetShopId) {
        productAggregates[name].myShopQuantitySold += qty;
      }
    });

    // Also include this shop's OWN catalog products so the shopkeeper sees
    // comparison — strictly products owned by their shop id, never the whole
    // shared demo catalogue.
    ownedCatalog.forEach((p) => {
      const existing = productAggregates[p.name];
      if (!existing) {
        productAggregates[p.name] = {
          productName: p.name,
          category: p.category,
          image: p.images?.[0] || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
          price: p.price,
          unit: p.unit || 'piece',
          totalQuantitySold: 0,
          totalRevenue: 0,
          orderCount: 0,
          myShopQuantitySold: 0,
          myShopStock: p.quantityInStock,
          lowStockThreshold: p.lowStockThreshold || 5,
          inMyCatalog: true,
        };
      } else {
        existing.inMyCatalog = true;
        existing.myShopStock = p.quantityInStock;
        existing.lowStockThreshold = p.lowStockThreshold || existing.lowStockThreshold;
      }
    });

    // Step 5: Sort products by quantity sold descending
    const rankings = Object.values(productAggregates)
      .filter((p) => p.totalQuantitySold > 0 || p.myShopStock > 0)
      .sort((a, b) => b.totalQuantitySold - a.totalQuantitySold);

    // Compute regional totals
    const totalRegionalUnits = rankings.reduce((acc, curr) => acc + curr.totalQuantitySold, 0);
    const totalRegionalRevenue = rankings.reduce((acc, curr) => acc + curr.totalRevenue, 0);

    // Step 6: Add Smart Indicators (Feature 5: My Shop vs Regional Demand)
    const opportunities = [];

    const decoratedRankings = rankings.map((prod, index) => {
      const rank = index + 1;
      const indicators = [];

      // Top Seller badge
      if (rank <= 3 && prod.totalQuantitySold > 10) {
        indicators.push({ type: 'top_seller', label: '🏆 Top seller', color: 'bg-amber-100 text-amber-800 border-amber-300' });
      }

      // Trending badge (high recent velocity or rank 1-4)
      if (prod.totalQuantitySold >= 25 || (period === 'today' && prod.totalQuantitySold >= 4)) {
        indicators.push({ type: 'trending', label: '🔥 Trending', color: 'bg-rose-100 text-rose-800 border-rose-300' });
      }

      // High regional demand
      const regionalShare = totalRegionalUnits > 0 ? (prod.totalQuantitySold / totalRegionalUnits) * 100 : 0;
      if (prod.totalQuantitySold >= 30 || regionalShare >= 15) {
        indicators.push({ type: 'high_demand', label: '📈 High regional demand', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' });
      }

      // Low stock warning — only for products THIS shop actually lists,
      // so demo/other-shop items never render as "your" stock alerts.
      if (prod.inMyCatalog && prod.myShopStock <= prod.lowStockThreshold) {
        indicators.push({
          type: 'low_stock',
          label: prod.myShopStock === 0 ? '🚫 Out of stock' : '⚠️ Low stock',
          color: prod.myShopStock === 0 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-yellow-100 text-yellow-800 border-yellow-300'
        });

        if (prod.totalQuantitySold > 15) {
          opportunities.push({
            productName: prod.productName,
            regionalSold: prod.totalQuantitySold,
            myStock: prod.myShopStock,
            recommendation: `High demand alert: ${prod.totalQuantitySold} units sold in ${rangeKm}km radius, but your store has only ${prod.myShopStock} units! Restock recommended.`,
          });
        }
      }

      return {
        rank,
        ...prod,
        regionalSharePct: Math.round(regionalShare * 10) / 10,
        indicators,
      };
    });

    res.json({
      success: true,
      rangeKm,
      period,
      selectedShop: {
        id: targetShopId,
        // Never fall back to another shop's name — a shopkeeper without a
        // resolvable profile gets null, not the demo store's title.
        shopName: myShop?.shopName || myShop?.shop_name || null,
        coordinates: shopCoords,
      },
      shopsInRangeCount: inRangeShopIds.size,
      totalOrdersEvaluated: matchingReservations.length,
      totalRegionalUnits,
      totalRegionalRevenue,
      rankings: decoratedRankings,
      highDemandOpportunities: opportunities,
    });
  } catch (error) {
    next(error);
  }
};

import { supabase } from '../config/supabase.js';
import { FALLBACK_PRODUCTS } from '../utils/fallbackData.js';

// @desc    List & search products across nearby shops using Supabase
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      shopId,
    } = req.query;

    if (supabase) {
      let query = supabase
        .from('products')
        .select('*, shops(id, shop_name, rating, address, location_lat, location_lng)');

      if (shopId) {
        query = query.eq('shop_id', shopId);
      }

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      if (minPrice) {
        query = query.gte('price', parseFloat(minPrice));
      }

      if (maxPrice) {
        query = query.lte('price', parseFloat(maxPrice));
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,brand.ilike.%${search}%`);
      }

      const { data: prods, error } = await query;

      if (!error && prods && prods.length > 0) {
        const formatted = prods.map((p) => ({
          _id: p.id,
          id: p.id,
          name: p.name,
          brand: p.brand,
          description: p.description,
          category: p.category,
          price: p.price,
          mrp: p.mrp,
          unit: p.unit,
          quantityInStock: p.quantity_in_stock,
          isAvailable: p.is_available,
          stockStatus: p.quantity_in_stock > 3 ? 'in_stock' : p.quantity_in_stock > 0 ? 'low_stock' : 'out_of_stock',
          images: p.images || [],
          tags: p.tags || [],
          shopId: p.shops
            ? {
                _id: p.shops.id,
                id: p.shops.id,
                shopName: p.shops.shop_name,
                rating: p.shops.rating || 4.8,
                address: p.shops.address,
                location: { coordinates: [p.shops.location_lng, p.shops.location_lat] },
              }
            : null,
        }));

        return res.json({
          success: true,
          count: formatted.length,
          total: formatted.length,
          page: 1,
          pages: 1,
          products: formatted,
        });
      }
    }

    let filtered = FALLBACK_PRODUCTS;
    if (shopId) {
      const target = String(shopId);
      filtered = filtered.filter((p) => {
        const owner = p.shopId;
        const ownerId = owner && typeof owner === 'object' ? owner._id || owner.id : owner;
        return String(ownerId || '') === target;
      });
    }
    if (category && category !== 'All') filtered = filtered.filter((p) => p.category === category);
    if (search) filtered = filtered.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

    res.json({
      success: true,
      count: filtered.length,
      total: filtered.length,
      page: 1,
      pages: 1,
      products: filtered,
    });
  } catch (error) {
    res.json({
      success: true,
      count: FALLBACK_PRODUCTS.length,
      total: FALLBACK_PRODUCTS.length,
      page: 1,
      pages: 1,
      products: FALLBACK_PRODUCTS,
    });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      const { data: p, error } = await supabase
        .from('products')
        .select('*, shops(*)')
        .eq('id', id)
        .single();

      if (!error && p) {
        const formatted = {
          _id: p.id,
          id: p.id,
          name: p.name,
          brand: p.brand,
          description: p.description,
          category: p.category,
          price: p.price,
          mrp: p.mrp,
          unit: p.unit,
          quantityInStock: p.quantity_in_stock,
          isAvailable: p.is_available,
          images: p.images || [],
          tags: p.tags || [],
          shopId: p.shops
            ? {
                _id: p.shops.id,
                id: p.shops.id,
                shopName: p.shops.shop_name,
                rating: p.shops.rating || 4.8,
                address: p.shops.address,
                location: { coordinates: [p.shops.location_lng, p.shops.location_lat] },
              }
            : null,
        };

        return res.json({
          success: true,
          product: formatted,
          similarProducts: [],
        });
      }
    }

    const fallback = FALLBACK_PRODUCTS.find((item) => item._id === id || item.id === id) || FALLBACK_PRODUCTS[0];
    return res.json({ success: true, product: fallback, similarProducts: FALLBACK_PRODUCTS.slice(1, 4) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product in Supabase
// @route   POST /api/products
// @access  Private (Shopkeeper)
export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      brand,
      description,
      category,
      price,
      mrp,
      unit,
      quantityInStock,
      quantity_in_stock,
      lowStockThreshold,
      low_stock_threshold,
      isAvailable,
      is_available,
      images,
      tags,
      shopId,
    } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ success: false, message: 'Name, price, and category are required' });
    }

    if (supabase) {
      let targetShopId = shopId;
      if (!targetShopId || req.user.role !== 'admin') {
        const { data: shop } = await supabase
          .from('shops')
          .select('id')
          .eq('owner_id', req.user.id)
          .single();

        if (shop) {
          targetShopId = shop.id;
        } else if (req.user.role === 'admin' && targetShopId) {
          // Admin provided shopId
        } else {
          return res.status(400).json({
            success: false,
            message: 'No shop profile found for your account. Please register your shop first.',
          });
        }
      }

      const parsedQty = parseInt(quantityInStock !== undefined ? quantityInStock : quantity_in_stock);
      const parsedLowStock = parseInt(lowStockThreshold !== undefined ? lowStockThreshold : low_stock_threshold);
      const parsedAvailable = isAvailable !== undefined ? !!isAvailable : is_available !== undefined ? !!is_available : true;

      const { data: newProd, error } = await supabase
        .from('products')
        .insert([
          {
            shop_id: targetShopId,
            name: name.trim(),
            brand: brand || null,
            description: description || null,
            category,
            price: parseFloat(price),
            mrp: mrp ? parseFloat(mrp) : null,
            unit: unit || 'piece',
            quantity_in_stock: isNaN(parsedQty) ? 10 : parsedQty,
            low_stock_threshold: isNaN(parsedLowStock) ? 3 : parsedLowStock,
            is_available: parsedAvailable,
            images: Array.isArray(images) ? images : [],
            tags: Array.isArray(tags) ? tags : [],
          },
        ])
        .select('*, shops(id, shop_name, rating, address)')
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Product added successfully to Supabase catalog',
        product: {
          _id: newProd.id,
          id: newProd.id,
          name: newProd.name,
          brand: newProd.brand,
          description: newProd.description,
          category: newProd.category,
          price: newProd.price,
          mrp: newProd.mrp,
          unit: newProd.unit,
          quantityInStock: newProd.quantity_in_stock,
          isAvailable: newProd.is_available,
          images: newProd.images,
          tags: newProd.tags,
          shopId: newProd.shops ? { _id: newProd.shops.id, id: newProd.shops.id, shopName: newProd.shops.shop_name } : newProd.shop_id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Product added successfully',
      product: {
        _id: 'b0000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14),
        id: 'b0000000-0000-0000-0000-' + Math.random().toString(36).substring(2, 14),
        name,
        category,
        price: parseFloat(price),
        quantityInStock: parseInt(quantityInStock) || 10,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product in Supabase
// @route   PUT /api/products/:id
// @access  Private (Shopkeeper)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      // 1. Fetch product and its shop to verify ownership
      const { data: prod, error: fetchErr } = await supabase
        .from('products')
        .select('*, shops(id, owner_id)')
        .eq('id', id)
        .single();

      if (fetchErr || !prod) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // 2. Ownership check: must own the shop or be admin
      if (req.user.role !== 'admin' && prod.shops?.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only modify products from your own shop',
        });
      }

      // 3. Build sanitized update payload
      const updateData = { updated_at: new Date().toISOString() };
      const {
        name,
        brand,
        description,
        category,
        price,
        mrp,
        unit,
        quantityInStock,
        quantity_in_stock,
        lowStockThreshold,
        low_stock_threshold,
        isAvailable,
        is_available,
        images,
        tags,
      } = req.body;

      if (name !== undefined) updateData.name = name.trim();
      if (brand !== undefined) updateData.brand = brand;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (price !== undefined) updateData.price = parseFloat(price);
      if (mrp !== undefined) updateData.mrp = mrp ? parseFloat(mrp) : null;
      if (unit !== undefined) updateData.unit = unit;
      if (quantityInStock !== undefined || quantity_in_stock !== undefined) {
        updateData.quantity_in_stock = parseInt(quantityInStock !== undefined ? quantityInStock : quantity_in_stock);
      }
      if (lowStockThreshold !== undefined || low_stock_threshold !== undefined) {
        updateData.low_stock_threshold = parseInt(lowStockThreshold !== undefined ? lowStockThreshold : low_stock_threshold);
      }
      if (isAvailable !== undefined || is_available !== undefined) {
        updateData.is_available = isAvailable !== undefined ? !!isAvailable : !!is_available;
      }
      if (images !== undefined) updateData.images = Array.isArray(images) ? images : [];
      if (tags !== undefined) updateData.tags = Array.isArray(tags) ? tags : [];

      const { data: updated, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select('*, shops(id, shop_name)')
        .single();

      if (error) throw error;

      return res.json({
        success: true,
        message: 'Product updated in Supabase',
        product: {
          _id: updated.id,
          id: updated.id,
          name: updated.name,
          brand: updated.brand,
          description: updated.description,
          category: updated.category,
          price: updated.price,
          mrp: updated.mrp,
          unit: updated.unit,
          quantityInStock: updated.quantity_in_stock,
          isAvailable: updated.is_available,
          images: updated.images,
          tags: updated.tags,
        },
      });
    }

    // Fallback in-memory update
    const item = FALLBACK_PRODUCTS.find((p) => p.id === id || p._id === id);
    if (item) {
      if (req.body.name !== undefined) item.name = req.body.name;
      if (req.body.price !== undefined) item.price = parseFloat(req.body.price);
      if (req.body.mrp !== undefined) item.mrp = parseFloat(req.body.mrp);
      if (req.body.quantityInStock !== undefined) item.quantityInStock = parseInt(req.body.quantityInStock);
      if (req.body.lowStockThreshold !== undefined) item.lowStockThreshold = parseInt(req.body.lowStockThreshold);
      if (item.quantityInStock > (item.lowStockThreshold || 5)) {
        item.stockStatus = 'in_stock';
        item.isAvailable = true;
      } else if (item.quantityInStock > 0) {
        item.stockStatus = 'low_stock';
        item.isAvailable = true;
      } else {
        item.stockStatus = 'out_of_stock';
        item.isAvailable = false;
      }
      return res.json({
        success: true,
        message: 'Product updated',
        product: item,
      });
    }

    res.json({
      success: true,
      message: 'Product updated',
      product: { id, ...req.body },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product from Supabase
// @route   DELETE /api/products/:id
// @access  Private (Shopkeeper)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      // 1. Fetch product and its shop to verify ownership
      const { data: prod, error: fetchErr } = await supabase
        .from('products')
        .select('*, shops(id, owner_id)')
        .eq('id', id)
        .single();

      if (fetchErr || !prod) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // 2. Ownership check: must own the shop or be admin
      if (req.user.role !== 'admin' && prod.shops?.owner_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only delete products from your own shop',
        });
      }

      const { error: delErr } = await supabase.from('products').delete().eq('id', id);
      if (delErr) throw delErr;
    }

    const idx = FALLBACK_PRODUCTS.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      FALLBACK_PRODUCTS.splice(idx, 1);
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};


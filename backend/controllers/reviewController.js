import { supabase } from '../config/supabase.js';

// @desc    Add review for a shop
// @route   POST /api/reviews
// @access  Private (Customer)
export const createReview = async (req, res, next) => {
  try {
    const { shopId, rating, comment, tags } = req.body;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    if (supabase) {
      let targetShopId = shopId;
      if (!targetShopId) {
        const { data: firstShop } = await supabase.from('shops').select('id').limit(1).single();
        if (firstShop) targetShopId = firstShop.id;
      }

      const { data: review, error } = await supabase
        .from('reviews')
        .insert([
          {
            shop_id: targetShopId,
            customer_id: req.user.id,
            rating: parseInt(rating),
            comment,
            tags: tags || [],
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully to Supabase!',
        review,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review: {
        _id: 'rev_' + Date.now(),
        id: 'rev_' + Date.now(),
        customerId: req.user.id,
        rating: parseInt(rating) || 5,
        comment,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a shop
// @route   GET /api/reviews/shop/:shopId
// @access  Public
export const getShopReviews = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    if (supabase) {
      // Fetch reviews with customer details
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, customer:users (id, name)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (!error && reviews) {
        return res.json({
          success: true,
          reviews,
        });
      }
    }

    res.json({
      success: true,
      reviews: [],
    });
  } catch (error) {
    next(error);
  }
};

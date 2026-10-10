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

      // Update shop rating summary
      await updateShopRatingSummary(targetShopId);

      // Emit real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`shop_${targetShopId}`).emit('review_added', { review });
        io.emit('review_added', { review });
      }

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

// @desc    Update review (customer can edit their own)
// @route   PUT /api/reviews/:id
// @access  Private (Customer)
export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment, tags } = req.body;

    if (!rating && !comment) {
      return res.status(400).json({ success: false, message: 'Rating or comment required' });
    }

    if (supabase) {
      // Verify ownership
      const { data: existing, error: findError } = await supabase
        .from('reviews')
        .select('shop_id, customer_id')
        .eq('id', id)
        .single();

      if (findError || !existing) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }

      if (existing.customer_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this review' });
      }

      const updates = {};
      if (rating) updates.rating = parseInt(rating);
      if (comment !== undefined) updates.comment = comment;
      if (tags) updates.tags = tags;

      const { data: review, error } = await supabase
        .from('reviews')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update shop rating summary
      await updateShopRatingSummary(existing.shop_id);

      // Emit real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`shop_${existing.shop_id}`).emit('review_updated', { review });
        io.emit('review_updated', { review });
      }

      return res.json({ success: true, message: 'Review updated successfully', review });
    }

    res.status(400).json({ success: false, message: 'Supabase not available' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (customer can delete their own)
// @route   DELETE /api/reviews/:id
// @access  Private (Customer)
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (supabase) {
      // Verify ownership
      const { data: existing, error: findError } = await supabase
        .from('reviews')
        .select('shop_id, customer_id')
        .eq('id', id)
        .single();

      if (findError || !existing) {
        return res.status(404).json({ success: false, message: 'Review not found' });
      }

      if (existing.customer_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
      }

      const { error } = await supabase.from('reviews').delete().eq('id', id);
      if (error) throw error;

      // Update shop rating summary
      await updateShopRatingSummary(existing.shop_id);

      // Emit real-time
      const io = req.app.get('io');
      if (io) {
        io.to(`shop_${existing.shop_id}`).emit('review_deleted', { reviewId: id });
        io.emit('review_deleted', { reviewId: id });
      }

      return res.json({ success: true, message: 'Review deleted successfully' });
    }

    res.status(400).json({ success: false, message: 'Supabase not available' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a shop with rating summary
// @route   GET /api/reviews/shop/:shopId
// @access  Public
export const getShopReviews = async (req, res, next) => {
  try {
    const { shopId } = req.params;

    if (supabase) {
      // Fetch reviews with customer details
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, customer:users (id, name, profile_image)')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      // Get rating summary
      const { data: summary } = await supabase
        .from('shops')
        .select('rating, num_reviews')
        .eq('id', shopId)
        .single();

      if (!error && reviews) {
        return res.json({
          success: true,
          reviews,
          summary: {
            averageRating: summary?.rating || 0,
            totalReviews: summary?.num_reviews || 0,
          },
        });
      }
    }

    res.json({
      success: true,
      reviews: [],
      summary: { averageRating: 0, totalReviews: 0 },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user's reviews
// @route   GET /api/reviews/my
// @access  Private (Customer)
export const getMyReviews = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (supabase) {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*, shop:shops (id, shop_name, category, rating, num_reviews)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      if (!error && reviews) {
        return res.json({ success: true, reviews });
      }
    }

    res.json({ success: true, reviews: [] });
  } catch (error) {
    next(error);
  }
};

// Helper: Update shop rating summary
async function updateShopRatingSummary(shopId) {
  if (!supabase) return;

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('shop_id', shopId);

  if (reviews && reviews.length > 0) {
    const totalReviews = reviews.length;
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews;

    await supabase
      .from('shops')
      .update({
        rating: parseFloat(avgRating.toFixed(1)),
        num_reviews: totalReviews,
      })
      .eq('id', shopId);
  } else {
    await supabase
      .from('shops')
      .update({ rating: 0, num_reviews: 0 })
      .eq('id', shopId);
  }
}



import React, { useState, useEffect } from 'react';
import { Star, User, MessageCircle, Edit2, Trash2, Clock } from 'lucide-react';
import { reviewService } from '../../services/reviewService';
import { useSocket } from '../../context/SocketContext';

export const ShopReviews = ({ shopId, editable = false }) => {
  const { socket, refetchReviews } = useSocket();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 0, comment: '' });

  const fetchReviews = async () => {
    try {
      const res = await reviewService.getShopReviews(shopId);
      if (res.success) {
        setReviews(res.reviews || []);
        setSummary(res.summary || { averageRating: 0, totalReviews: 0 });
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [shopId, refetchReviews]);

  useEffect(() => {
    if (!socket) return;
    const handleReviewAdded = (data) => {
      if (data.review.shop_id === shopId) {
        setReviews(prev => [data.review, ...prev]);
      }
    };
    const handleReviewUpdated = (data) => {
      if (data.review.shop_id === shopId) {
        setReviews(prev => prev.map(r => r._id === data.review._id ? data.review : r));
      }
    };
    const handleReviewDeleted = (data) => {
      setReviews(prev => prev.filter(r => r._id !== data.reviewId));
    };
    socket.on('review_added', handleReviewAdded);
    socket.on('review_updated', handleReviewUpdated);
    socket.on('review_deleted', handleReviewDeleted);
    return () => {
      socket.off('review_added', handleReviewAdded);
      socket.off('review_updated', handleReviewUpdated);
      socket.off('review_deleted', handleReviewDeleted);
    };
  }, [socket, shopId]);

  const handleEditStart = (review) => {
    setEditingId(review._id);
    setEditForm({ rating: review.rating, comment: review.comment || '' });
  };

  const handleEditSave = async (reviewId) => {
    try {
      const res = await reviewService.updateReview(reviewId, editForm);
      if (res.success) {
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error updating review:', err);
      alert('Failed to update review');
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    try {
      const res = await reviewService.deleteReview(reviewId);
      if (res.success) {
        // Real-time will handle removal
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Failed to delete review');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ rating: 0, comment: '' });
  };

  const renderStars = (rating) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`w-5 h-5 ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
          <div className="h-20 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Rating Summary */}
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-5xl font-bold text-slate-900">
              {summary.averageRating || 0}
            </div>
            <div>
              {renderStars(summary.averageRating || 0)}
              <p className="text-sm text-slate-500 mt-1">
                {summary.totalReviews || 0} {summary.totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>
          </div>
          <div className="flex-1">
            <div className="w-full max-w-xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1/6 text-xs text-slate-500 text-right">5</div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1/6 text-xs text-slate-500 text-right">4</div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '20%' }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1/6 text-xs text-slate-500 text-right">3</div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '10%' }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1/6 text-xs text-slate-500 text-right">2</div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '5%' }}></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1/6 text-xs text-slate-500 text-right">1</div>
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full" style={{ width: '5%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-slate-100">
        {reviews.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <MessageCircle className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold text-slate-700">No reviews yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Be the first to review this shop!
            </p>
          </div>
        ) : (
          reviews.map(review => (
            <div
              key={review._id}
              className="p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm flex-shrink-0">
                  {review.customer?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {review.customer?.name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {formatDate(review.created_at)}
                      </span>
                    </div>
                    {editable && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500">Verified</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    {renderStars(review.rating)}
                    <span className="text-sm font-semibold text-amber-600 ml-1">
                      {review.rating}/5
                    </span>
                  </div>
                  {review.comment && (
                    <p className="mt-3 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {review.comment}
                    </p>
                  )}
                  {review.tags && review.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {review.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ShopReviews;
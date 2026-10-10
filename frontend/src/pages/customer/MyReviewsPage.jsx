import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewService } from '../../services/reviewService';
import { useSocket } from '../../context/SocketContext';
import { Star, Edit2, Trash2, ShoppingBag, Clock, ArrowLeft, Save, X, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const MyReviewsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, refetchReviews } = useSocket();
  const { addToast } = useNotification();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 0, comment: '' });
  const [savingId, setSavingId] = useState(null);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await reviewService.getMyReviews();
      if (res.success) {
        setReviews(res.reviews);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [refetchReviews]);

  useEffect(() => {
    if (!socket) return;
    const handleReviewUpdated = (data) => {
      setReviews(prev => prev.map(r => r._id === data.review._id ? data.review : r));
    };
    const handleReviewDeleted = (data) => {
      setReviews(prev => prev.filter(r => r._id !== data.reviewId));
    };
    socket.on('review_updated', handleReviewUpdated);
    socket.on('review_deleted', handleReviewDeleted);
    return () => {
      socket.off('review_updated', handleReviewUpdated);
      socket.off('review_deleted', handleReviewDeleted);
    };
  }, [socket]);

  const handleEditStart = (review) => {
    setEditingId(review._id);
    setEditForm({ rating: review.rating, comment: review.comment || '' });
  };

  const handleEditSave = async (reviewId) => {
    if (editForm.rating === 0) {
      alert('Please select a rating');
      return;
    }
    setSavingId(reviewId);
    try {
      const res = await reviewService.updateReview(reviewId, editForm);
      if (res.success) {
        addToast('Review updated successfully', 'success');
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error updating review:', err);
      addToast('Failed to update review', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      const res = await reviewService.deleteReview(reviewId);
      if (res.success) {
        addToast('Review deleted', 'success');
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      addToast('Failed to delete review', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({ rating: 0, comment: '' });
  };

  const handleRatingChange = (rating) => {
    setEditForm(prev => ({ ...prev, rating }));
  };

  const handleCommentChange = (e) => {
    setEditForm(prev => ({ ...prev, comment: e.target.value }));
  };

  const renderStars = (rating, interactive = false, onClick = null) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={"w-6 h-6 cursor-pointer " + (star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300') + " transition-colors"}
          onClick={interactive && onClick ? () => onClick(star) : undefined}
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

  // Helper to render review actions (edit form or action buttons)
  const renderReviewActions = (review) => {
    if (editingId === review._id) {
      return (
        <div className="flex flex-col gap-3 w-full md:w-80">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">Rating:</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={"w-6 h-6 cursor-pointer " + (star <= editForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
                  onClick={() => setEditForm(prev => ({ ...prev, rating: star }))}
                />
              ))}
            </div>
          </div>
          <textarea
            value={editForm.comment}
            onChange={handleCommentChange}
            placeholder="Your review..."
            rows={3}
            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEditSave(review._id)}
              disabled={savingId === review._id}
              className="flex-1 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50 transition-colors"
            >
              {savingId === review._id ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" /> Save
                </>
              )}
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleEditStart(review)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          title="Edit review"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(review._id)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-red-50 text-red-600 transition-colors"
          title="Delete review"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900">My Reviews</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your shop reviews - edit or delete anytime
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-200 rounded"></div>
            <div className="h-24 bg-slate-200 rounded"></div>
          </div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <Star className="w-16 h-16 mx-auto text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700">No reviews yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You haven't reviewed any shops yet. Visit a shop page to leave your first review!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {reviews.map(review => (
            <div
              key={review._id}
              className="p-6 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-sm">
                      {review.shop?.shopName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">
                        {review.shop?.shopName || 'Unknown Shop'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {review.shop?.category} • {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={"w-6 h-6 " + (star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300')}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-amber-600 ml-1">
                      {review.rating}/5
                    </span>
                  </div>

                  {review.comment && (
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                      {review.comment}
                    </p>
                  )}

                  {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {review.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    {review.shop && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        Shop rating: {review.shop.rating || 0} ({review.shop.numReviews || 0} reviews)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderReviewActions(review)}
                </div>
              </div>
            </div>
            ))}
          </div>
          )}
      </div>
    );
};

export default MyReviewsPage;
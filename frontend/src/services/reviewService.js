import api from './api';

export const reviewService = {
  createReview: async (reviewData) => {
    const res = await api.post('/reviews', reviewData);
    return res.data;
  },

  updateReview: async (reviewId, reviewData) => {
    const res = await api.put(`/reviews/${reviewId}`, reviewData);
    return res.data;
  },

  deleteReview: async (reviewId) => {
    const res = await api.delete(`/reviews/${reviewId}`);
    return res.data;
  },

  getShopReviews: async (shopId) => {
    const res = await api.get(`/reviews/shop/${shopId}`);
    return res.data;
  },

  getMyReviews: async () => {
    const res = await api.get('/reviews/my');
    return res.data;
  },
};

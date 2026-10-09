import api from './api';

export const requestService = {
  createRequest: async (data) => {
    const res = await api.post('/requests', data);
    return res.data;
  },

  getMyRequests: async () => {
    const res = await api.get('/requests/my');
    return res.data;
  },

  getRequestDetails: async (id) => {
    const res = await api.get(`/requests/${id}`);
    return res.data;
  },

  getShopRelevantRequests: async () => {
    const res = await api.get('/requests/shop');
    return res.data;
  },

  respondToRequest: async (requestId, data) => {
    const res = await api.post(`/requests/${requestId}/respond`, data);
    return res.data;
  },

  bargainRequest: async (requestId, data) => {
    const res = await api.post(`/requests/${requestId}/bargain`, data);
    return res.data;
  },

  respondToBargain: async (requestId, data) => {
    const res = await api.post(`/requests/${requestId}/customer-respond`, data);
    return res.data;
  },

  acceptRequest: async (requestId) => {
    const res = await api.post(`/requests/${requestId}/accept`);
    return res.data;
  },

  rejectRequest: async (requestId) => {
    const res = await api.post(`/requests/${requestId}/reject`);
    return res.data;
  },

  confirmBargainDeal: async (requestId, dealData = {}) => {
    const res = await api.post(`/requests/${requestId}/confirm-deal`, dealData);
    return res.data;
  },
};

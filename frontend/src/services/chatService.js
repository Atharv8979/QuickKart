import api from './api';

export const chatService = {
  getConversations: async () => {
    const res = await api.get('/chat/conversations');
    return res.data;
  },

  getOrCreateConversation: async (contextData) => {
    const res = await api.post('/chat/conversations', contextData);
    return res.data;
  },

  getMessages: async (conversationId, params = {}) => {
    const res = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  sendMessage: async (conversationId, messageData) => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, messageData);
    return res.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await api.post('/chat/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getNotifications: async () => {
    const res = await api.get('/chat/notifications');
    return res.data;
  },

  markNotificationsRead: async () => {
    const res = await api.put('/chat/notifications/read-all');
    return res.data;
  },
};

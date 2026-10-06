import api from './api';

// Axios rejects any non-2xx response, which would otherwise hide the backend's
// helpful message (e.g. "User already exists with this email") behind a generic
// "Registration failed" toast. This normalizes the error into { success, message }.
const extractErrorMessage = (error, fallback) => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (!error?.response) {
    return 'Unable to reach the QuickKart server. Please check your connection and try again.';
  }
  return error?.message || fallback;
};

export const authService = {
  login: async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      return res.data;
    } catch (error) {
      return { success: false, message: extractErrorMessage(error, 'Invalid email or password') };
    }
  },

  register: async (userData) => {
    try {
      const res = await api.post('/auth/register', userData);
      return res.data;
    } catch (error) {
      return { success: false, message: extractErrorMessage(error, 'Registration failed. Please try again.') };
    }
  },

  // Intentionally still rejects on failure: AuthContext relies on the thrown
  // error to clear an invalid/expired session.
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      return res.data;
    } catch (error) {
      return { success: false, message: extractErrorMessage(error, 'Failed to update profile') };
    }
  },

  // ---------------------------------------------------------------------------
  // Password reset (email OTP). Three steps:
  //   1. requestPasswordReset(email)          -> emails a 6-digit code
  //   2. verifyResetCode(email, code)         -> returns a short-lived resetToken
  //   3. resetPassword(resetToken, newPass)   -> sets the new password
  // ---------------------------------------------------------------------------
  requestPasswordReset: async (email) => {
    try {
      const res = await api.post('/auth/forgot-password', { email });
      return res.data;
    } catch (error) {
      return {
        success: false,
        retryAfter: error?.response?.data?.retryAfter,
        message: extractErrorMessage(error, 'Unable to send the reset code. Please try again.'),
      };
    }
  },

  verifyResetCode: async (email, code) => {
    try {
      const res = await api.post('/auth/verify-reset-code', { email, code });
      return res.data;
    } catch (error) {
      return {
        success: false,
        attemptsRemaining: error?.response?.data?.attemptsRemaining,
        message: extractErrorMessage(error, 'Unable to verify the reset code. Please try again.'),
      };
    }
  },

  resetPassword: async (resetToken, newPassword, confirmPassword) => {
    try {
      const res = await api.post('/auth/reset-password', { resetToken, newPassword, confirmPassword });
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: extractErrorMessage(error, 'Unable to reset your password. Please try again.'),
      };
    }
  },
};


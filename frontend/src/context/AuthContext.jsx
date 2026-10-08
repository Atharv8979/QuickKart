import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('quickkart_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('quickkart_token') || null);
  const [shop, setShop] = useState(() => {
    const saved = localStorage.getItem('quickkart_shop');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Sync token state
  useEffect(() => {
    if (token) {
      localStorage.setItem('quickkart_token', token);
    } else {
      localStorage.removeItem('quickkart_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('quickkart_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('quickkart_user');
    }
  }, [user]);

  useEffect(() => {
    if (shop) {
      localStorage.setItem('quickkart_shop', JSON.stringify(shop));
    } else {
      localStorage.removeItem('quickkart_shop');
    }
  }, [shop]);

  // Load current user profile on init
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const res = await authService.getMe();
          if (res.success) {
            setUser(res.user);
            if (res.shop) setShop(res.shop);
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out.');
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authService.login(email, password);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      if (res.shop) setShop(res.shop);
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message };
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      return { success: true, user: res.user };
    }
    return { success: false, message: res.message };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setShop(null);
    localStorage.removeItem('quickkart_token');
    localStorage.removeItem('quickkart_user');
    localStorage.removeItem('quickkart_shop');
  };

  // Instant 1-click Demo Login for fast evaluations & reviews
  const demoLogin = async (roleType) => {
    let email = 'customer@quickkart.com';
    if (roleType === 'shopkeeper' || roleType === 'sharma') email = 'sharma@quickkart.com';
    if (roleType === 'gupta') email = 'gupta@quickkart.com';
    if (roleType === 'admin') email = 'admin@quickkart.com';
    if (roleType === 'customer') email = 'customer@quickkart.com';

    return await login(email, 'password123');
  };

  const updateUser = (updatedData) => {
    setUser((prev) => ({ ...prev, ...updatedData }));
  };

  const updateShop = (updatedShop) => {
    setShop(updatedShop);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        shop,
        role: user?.role || 'guest',
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        demoLogin,
        updateUser,
        updateShop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

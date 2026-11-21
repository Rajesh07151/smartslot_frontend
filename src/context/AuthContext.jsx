import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartslot_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('smartslot_token') || null);
  const [loading, setLoading] = useState(true);

  // Modal control for customer registration & login
  const [authModalState, setAuthModalState] = useState({ isOpen: false, defaultTab: 'register' });

  useEffect(() => {
    async function checkCurrentSession() {
      if (token) {
        try {
          const data = await api.getMe();
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('smartslot_user', JSON.stringify(data.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    checkCurrentSession();
  }, [token]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('smartslot_user', JSON.stringify(data.user));
    localStorage.setItem('smartslot_token', data.token);
    return data.user;
  };

  const adminLogin = async (email, password) => {
    const data = await api.adminLogin(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('smartslot_user', JSON.stringify(data.user));
    localStorage.setItem('smartslot_token', data.token);
    return data.user;
  };

  const staffLogin = async (email, password) => {
    const data = await api.staffLogin(email, password);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('smartslot_user', JSON.stringify(data.user));
    localStorage.setItem('smartslot_token', data.token);
    return data.user;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem('smartslot_user', JSON.stringify(data.user));
    localStorage.setItem('smartslot_token', data.token);
    return data.user;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('smartslot_user');
    localStorage.removeItem('smartslot_token');
    try {
      // Clear all SmartSlot keys from local and session storage
      sessionStorage.clear();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('smartslot')) {
          localStorage.removeItem(key);
        }
      });
    } catch {
      // Ignore storage restrictions
    }
    window.location.hash = 'book';
  };

  const openCustomerAuth = (defaultTab = 'register') => {
    setAuthModalState({ isOpen: true, defaultTab });
  };

  const closeCustomerAuth = () => {
    setAuthModalState(prev => ({ ...prev, isOpen: false }));
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'STAFF',
    isCustomer: user?.role === 'CUSTOMER',
    login,
    adminLogin,
    staffLogin,
    register,
    logout,
    authModalState,
    openCustomerAuth,
    closeCustomerAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

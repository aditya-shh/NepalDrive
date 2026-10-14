import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  full_name: string;
  phone: string;
  is_verified: boolean;
  driving_license?: string;
  citizenship_no?: string;
  avatar_index?: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (credentials: any) => Promise<User | null>;
  logout: () => void;
  registerUser: (payload: any) => Promise<any>;
  refreshMe: () => Promise<void>;
  reloadUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('nepaldrive_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else if (res.message?.includes('Unauthenticated') || res.message?.includes('session invalid')) {
            logout();
          }
        } catch (err: any) {
          // Strictly only logout if the server explicitly confirms 401 Unauthenticated / expired token
          // Never log the user out due to serverless cold-starts, 500 DB reconnects, or offline network glitches
          if (err?.status === 401 || err?.message?.includes('Unauthenticated') || err?.message?.includes('401')) {
            logout();
          } else {
            console.warn('Transient session verification notice:', err.message);
          }
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (credentials: any): Promise<User | null> => {
    const res = await api.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem('nepaldrive_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      return res.data.user;
    }
    return null;
  };

  const logout = () => {
    localStorage.removeItem('nepaldrive_token');
    setToken(null);
    setUser(null);
  };

  const registerUser = async (payload: any) => {
    const res = await api.register(payload);
    return res;
  };

  const refreshMe = async () => {
    if (token) {
      const res = await api.getMe();
      if (res.success) {
        setUser(res.data);
      }
    }
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, loading, token, login, logout, registerUser, refreshMe, reloadUser: refreshMe, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

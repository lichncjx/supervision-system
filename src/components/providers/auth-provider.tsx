'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  getUserById,
  login as doLogin,
  verifyToken,
  type User,
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const session = verifyToken(token);

      if (!session) {
        localStorage.removeItem('token');
        setUser(null);
        setIsLoading(false);
        return;
      }

      const fullUser = getUserById(session.userId);

      if (!fullUser) {
        localStorage.removeItem('token');
        setUser(null);
        setIsLoading(false);
        return;
      }

      setUser(fullUser);
      setIsLoading(false);
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (username: string, password: string) => {
    const result = doLogin(username, password);

    if (!result.success || !result.user || !result.token) {
      return { success: false, error: result.error || '登录失败' };
    }

    localStorage.setItem('token', result.token);
    setUser(result.user);

    return { success: true };
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
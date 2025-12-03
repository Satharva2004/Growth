import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

const API_BASE = 'https://goals-backend-brown.vercel.app/api';

interface UserProfile {
  name?: string | null;
  email?: string | null;
}

interface AuthContextType {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string, profile?: UserProfile | null) => Promise<void>;
  updateProfile: (profile: UserProfile | null) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Safe storage shim: localStorage on web, in-memory on native
  let memTokenRef: { value: string | null } = (global as any).__authMemTokenRef || { value: null };
  (global as any).__authMemTokenRef = memTokenRef;
  let memRefreshTokenRef: { value: string | null } = (global as any).__authMemRefreshTokenRef || { value: null };
  (global as any).__authMemRefreshTokenRef = memRefreshTokenRef;
  let memProfileRef: { value: string | null } = (global as any).__authMemProfileRef || { value: null };
  (global as any).__authMemProfileRef = memProfileRef;

  const storage = {
    getItem: async (key: string): Promise<string | null> => {
      if (Platform.OS === 'web') {
        const ls = typeof window !== 'undefined' && (window as any).localStorage ? (window as any).localStorage : null;
        return ls ? ls.getItem(key) : null;
      }
      if (key === 'authToken') {
        return memTokenRef.value;
      }
      if (key === 'authRefreshToken') {
        return memRefreshTokenRef.value;
      }
      if (key === 'authProfile') {
        return memProfileRef.value;
      }
      return null;
    },
    setItem: async (key: string, value: string): Promise<void> => {
      if (Platform.OS === 'web') {
        const ls = typeof window !== 'undefined' && (window as any).localStorage ? (window as any).localStorage : null;
        if (ls) ls.setItem(key, value);
        else {
          if (key === 'authToken') memTokenRef.value = value;
          if (key === 'authRefreshToken') memRefreshTokenRef.value = value;
          if (key === 'authProfile') memProfileRef.value = value;
        }
        return;
      }
      if (key === 'authToken') memTokenRef.value = value;
      if (key === 'authRefreshToken') memRefreshTokenRef.value = value;
      if (key === 'authProfile') memProfileRef.value = value;
    },
    removeItem: async (key: string): Promise<void> => {
      if (Platform.OS === 'web') {
        const ls = typeof window !== 'undefined' && (window as any).localStorage ? (window as any).localStorage : null;
        if (ls) ls.removeItem(key);
        else {
          if (key === 'authToken') memTokenRef.value = null;
          if (key === 'authRefreshToken') memRefreshTokenRef.value = null;
          if (key === 'authProfile') memProfileRef.value = null;
        }
        return;
      }
      if (key === 'authToken') memTokenRef.value = null;
      if (key === 'authRefreshToken') memRefreshTokenRef.value = null;
      if (key === 'authProfile') memProfileRef.value = null;
    },
  };

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await storage.getItem('authToken');
      const storedRefreshToken = await storage.getItem('authRefreshToken');
      const storedProfile = await storage.getItem('authProfile');
      if (storedToken) setToken(storedToken);
      if (storedRefreshToken) setRefreshToken(storedRefreshToken);
      if (storedProfile) {
        try {
          setUser(JSON.parse(storedProfile));
        } catch (error) {
          console.error('Failed to parse stored profile:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profile: UserProfile | null) => {
    try {
      if (profile) {
        await storage.setItem('authProfile', JSON.stringify(profile));
      } else {
        await storage.removeItem('authProfile');
      }
      setUser(profile);
    } catch (error) {
      console.error('Failed to persist profile:', error);
    }
  };

  const persistTokens = async (accessToken: string | null, refreshTokenValue: string | null) => {
    try {
      if (accessToken) await storage.setItem('authToken', accessToken);
      else await storage.removeItem('authToken');
      if (refreshTokenValue) await storage.setItem('authRefreshToken', refreshTokenValue);
      else await storage.removeItem('authRefreshToken');
      setToken(accessToken);
      setRefreshToken(refreshTokenValue);
    } catch (error) {
      console.error('Failed to persist tokens:', error);
      throw error;
    }
  };

  const login = async (newToken: string, newRefreshToken: string, profile?: UserProfile | null) => {
    try {
      await persistTokens(newToken, newRefreshToken);
      if (profile) {
        await updateProfile(profile);
      }
    } catch (error) {
      console.error('Failed to save auth session:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (refreshToken) {
        try {
          await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });
        } catch (error) {
          console.error('Failed to revoke refresh token:', error);
        }
      }
      await persistTokens(null, null);
      await updateProfile(null);
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  };

  const refreshSession = async (): Promise<string | null> => {
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }

      const result = await response.json();
      const newAccessToken = result.accessToken || result.token;
      const newRefresh = result.refreshToken;

      if (!newAccessToken || !newRefresh) {
        throw new Error('Invalid refresh response');
      }

      await persistTokens(newAccessToken, newRefresh);
      return newAccessToken;
    } catch (error) {
      console.error('Refresh session error:', error);
      await persistTokens(null, null);
      await updateProfile(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{ token, refreshToken, user, isLoading, login, logout, updateProfile, refreshSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

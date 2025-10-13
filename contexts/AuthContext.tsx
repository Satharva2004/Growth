import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

interface UserProfile {
  name?: string | null;
  email?: string | null;
}

interface AuthContextType {
  token: string | null;
  user: UserProfile | null;
  isLoading: boolean;
  login: (token: string, profile?: UserProfile | null) => Promise<void>;
  updateProfile: (profile: UserProfile | null) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Safe storage shim: localStorage on web, in-memory on native
  let memTokenRef: { value: string | null } = (global as any).__authMemTokenRef || { value: null };
  (global as any).__authMemTokenRef = memTokenRef;
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
          if (key === 'authProfile') memProfileRef.value = value;
        }
        return;
      }
      if (key === 'authToken') memTokenRef.value = value;
      if (key === 'authProfile') memProfileRef.value = value;
    },
    removeItem: async (key: string): Promise<void> => {
      if (Platform.OS === 'web') {
        const ls = typeof window !== 'undefined' && (window as any).localStorage ? (window as any).localStorage : null;
        if (ls) ls.removeItem(key);
        else {
          if (key === 'authToken') memTokenRef.value = null;
          if (key === 'authProfile') memProfileRef.value = null;
        }
        return;
      }
      if (key === 'authToken') memTokenRef.value = null;
      if (key === 'authProfile') memProfileRef.value = null;
    },
  };

  useEffect(() => {
    loadToken();
  }, []);

  const loadToken = async () => {
    try {
      const storedToken = await storage.getItem('authToken');
      const storedProfile = await storage.getItem('authProfile');
      if (storedToken) setToken(storedToken);
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

  const login = async (newToken: string, profile?: UserProfile | null) => {
    try {
      await storage.setItem('authToken', newToken);
      if (profile) {
        await updateProfile(profile);
      }
      setToken(newToken);
    } catch (error) {
      console.error('Failed to save token:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await storage.removeItem('authToken');
      await updateProfile(null);
      setToken(null);
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout, updateProfile }}>
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

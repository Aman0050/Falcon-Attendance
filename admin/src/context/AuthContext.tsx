import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  department?: string;
  designation?: string;
  profile_photo_url?: string;
  profilePhotoUrl?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (fields: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('falconToken') || localStorage.getItem('adminToken');
    if (storedToken) {
      axios
        .get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          const role = response.data.user.role?.toLowerCase();
          if (role === 'admin' || role === 'employee') {
            setToken(storedToken);
            setUser(response.data.user);
            // Migrate old token if exists
            if (!localStorage.getItem('falconToken')) {
              localStorage.setItem('falconToken', storedToken);
              localStorage.removeItem('adminToken');
            }
          } else {
            localStorage.removeItem('falconToken');
            localStorage.removeItem('adminToken');
          }
        })
        .catch(() => {
          localStorage.removeItem('falconToken');
          localStorage.removeItem('adminToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    const role = newUser.role?.toLowerCase();
    if (role === 'admin' || role === 'employee') {
      localStorage.setItem('falconToken', newToken);
      setToken(newToken);
      setUser(newUser);
    } else {
      throw new Error('Access denied. Invalid role.');
    }
  };

  const logout = () => {
    localStorage.removeItem('falconToken');
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : null));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

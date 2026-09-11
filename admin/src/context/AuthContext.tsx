import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

export interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
  roles?: string[];
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
  activeView: 'admin' | 'employee';
  setActiveView: (view: 'admin' | 'employee') => void;
  isDualRole: boolean;
  hasAdminRole: boolean;
  hasEmployeeRole: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getUserRoles = (u: User | null): string[] => {
  if (!u) return [];
  if (Array.isArray(u.roles) && u.roles.length > 0) {
    return u.roles.map((r) => r.toLowerCase());
  }
  return u.role ? [u.role.toLowerCase()] : [];
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveViewState] = useState<'admin' | 'employee'>('admin');

  const determineDefaultView = (u: User): 'admin' | 'employee' => {
    const userRoles = getUserRoles(u);
    const hasAdmin = userRoles.includes('admin');
    const hasEmployee = userRoles.includes('employee');
    const isDual = hasAdmin && hasEmployee;

    const savedView = localStorage.getItem('falconActiveView') as 'admin' | 'employee' | null;

    if (isDual) {
      if (savedView === 'admin' || savedView === 'employee') {
        return savedView;
      }
      return 'admin'; // default to admin for dual-role users
    } else if (hasAdmin) {
      return 'admin';
    } else if (hasEmployee) {
      return 'employee';
    }
    return 'employee';
  };

  const setActiveView = (view: 'admin' | 'employee') => {
    localStorage.setItem('falconActiveView', view);
    setActiveViewState(view);
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('falconToken') || localStorage.getItem('adminToken');
    if (storedToken) {
      axios
        .get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        })
        .then((response) => {
          const userData = response.data.user;
          const userRoles = getUserRoles(userData);
          if (userRoles.includes('admin') || userRoles.includes('employee')) {
            setToken(storedToken);
            setUser(userData);
            setActiveViewState(determineDefaultView(userData));

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
    const userRoles = getUserRoles(newUser);
    if (userRoles.includes('admin') || userRoles.includes('employee')) {
      localStorage.setItem('falconToken', newToken);
      setToken(newToken);
      setUser(newUser);
      const targetView = determineDefaultView(newUser);
      setActiveViewState(targetView);
      localStorage.setItem('falconActiveView', targetView);
    } else {
      throw new Error('Access denied. Invalid role.');
    }
  };

  const logout = () => {
    localStorage.removeItem('falconToken');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('falconActiveView');
    setToken(null);
    setUser(null);
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...fields } : null));
  };

  const roles = getUserRoles(user);
  const hasAdminRole = roles.includes('admin');
  const hasEmployeeRole = roles.includes('employee');
  const isDualRole = hasAdminRole && hasEmployeeRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isLoading,
        activeView,
        setActiveView,
        isDualRole,
        hasAdminRole,
        hasEmployeeRole,
      }}
    >
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

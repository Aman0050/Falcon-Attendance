import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

interface User {
  id: number;
  employee_id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define API URL. In a real app, use environment variables. 
// For local development on Android emulator, 10.0.2.2 points to host machine.
// For iOS Simulator, localhost works.
import { Platform } from 'react-native';
const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('userToken');
        if (storedToken) {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          
          if (response.data.user.role === 'EMPLOYEE' || response.data.user.role === 'ADMIN') {
            setToken(storedToken);
            setUser(response.data.user);
          } else {
            await SecureStore.deleteItemAsync('userToken');
          }
        }
      } catch (error) {
        console.error('Restore session failed:', error);
        await SecureStore.deleteItemAsync('userToken');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await SecureStore.setItemAsync('userToken', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
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

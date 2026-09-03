import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export const getProfile = async (token: string) => {
  try {
    const res = await axios.get(`${API_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'No internet connection. Please try again.' } };
  }
};

export const updateProfile = async (token: string, data: { phone?: string; profilePhotoUrl?: string }) => {
  try {
    const res = await axios.patch(`${API_URL}/api/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'No internet connection. Please try again.' } };
  }
};

export const changePassword = async (token: string, data: any) => {
  try {
    const res = await axios.patch(`${API_URL}/api/profile/change-password`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'No internet connection. Please try again.' } };
  }
};

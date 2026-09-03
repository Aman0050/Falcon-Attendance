import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export interface Notification {
  id: number;
  type: string;
  attendance_date: string;
  message: string;
  sent_at: string;
  read_at: string | null;
}

export const getNotifications = async (token: string) => {
  try {
    const res = await axios.get(`${API_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

export const markAsRead = async (id: number, token: string) => {
  try {
    const res = await axios.patch(`${API_URL}/api/notifications/${id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

export const markAllAsRead = async (token: string) => {
  try {
    const res = await axios.patch(`${API_URL}/api/notifications/read-all`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export interface LeaveBalance {
  leaveType: string;
  allocatedDays: number;
  usedDays: number;
  remainingDays: number;
}

export interface LeaveRequest {
  id: number;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
}

export const getLeaveBalances = async (token: string) => {
  try {
    const res = await axios.get(`${API_URL}/api/leave/balance`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

export const applyLeave = async (token: string, data: { leaveTypeId: number, startDate: string, endDate: string, reason: string }) => {
  try {
    const res = await axios.post(`${API_URL}/api/leave`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

export const getLeaveHistory = async (token: string, page = 1) => {
  try {
    const res = await axios.get(`${API_URL}/api/leave?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

export const cancelLeaveRequest = async (token: string, id: number) => {
  try {
    const res = await axios.patch(`${API_URL}/api/leave/${id}/cancel`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error: any) {
    return error.response?.data || { success: false, error: { message: 'Network error' } };
  }
};

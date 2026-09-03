import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export interface Employee {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone: string | null;
  department: string | null;
  designation: string | null;
  role: 'admin' | 'employee';
  status: 'active' | 'inactive';
  joiningDate: string | null;
}

const getAuthHeaders = async () => {
  const token = await SecureStore.getItemAsync('userToken');
  return {
    Authorization: `Bearer ${token}`,
  };
};

export const getEmployees = async () => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/api/admin/employees`, { headers });
  return response.data.data;
};

export const createEmployee = async (employeeData: any) => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/api/admin/employees`, employeeData, { headers });
  return response.data;
};

export const updateEmployeeStatus = async (id: number, status: 'active' | 'inactive') => {
  const headers = await getAuthHeaders();
  const response = await axios.patch(`${API_URL}/api/admin/employees/${id}/status`, { status }, { headers });
  return response.data;
};

export const resetPassword = async (id: number) => {
  const headers = await getAuthHeaders();
  const response = await axios.patch(`${API_URL}/api/admin/employees/${id}/reset-password`, {}, { headers });
  return response.data;
};

export const deleteEmployee = async (id: number) => {
  const headers = await getAuthHeaders();
  const response = await axios.delete(`${API_URL}/api/admin/employees/${id}`, { headers });
  return response.data;
};

export const editEmployee = async (id: number, employeeData: any) => {
  const headers = await getAuthHeaders();
  const response = await axios.patch(`${API_URL}/api/admin/employees/${id}`, employeeData, { headers });
  return response.data;
};

export const getAdminAttendance = async (date: string, search?: string, status?: string) => {
  const headers = await getAuthHeaders();
  let url = `${API_URL}/api/admin/attendance?limit=100`;
  if (date) url += `&date=${date}`;
  if (search) url += `&search=${search}`;
  if (status && status !== 'All') url += `&status=${status}`;
  
  const response = await axios.get(url, { headers });
  return response.data.data;
};

export const getAdminBaseUrl = () => API_URL;
export const getAdminAuthHeaders = getAuthHeaders;

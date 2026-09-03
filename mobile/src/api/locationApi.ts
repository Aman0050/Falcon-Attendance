import axios from 'axios';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000');

export interface LocationValidationResponse {
  success: boolean;
  data?: {
    insideOffice: boolean;
    distanceMeters: number;
    allowedRadiusMeters: number;
    accuracyMeters: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export const validateLocationWithServer = async (
  latitude: number,
  longitude: number,
  accuracy: number,
  token: string
): Promise<LocationValidationResponse> => {
  try {
    const response = await axios.post(
      `${API_URL}/api/attendance/location/validate`,
      { latitude, longitude, accuracy },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  } catch (error: any) {
    if (error.response && error.response.data) {
      return error.response.data;
    }
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to the server to validate location.',
      }
    };
  }
};

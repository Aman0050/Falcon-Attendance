import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken } from '../api/notificationApi';

// Set global notification presentation options when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for Expo Push Notifications and save token to backend
 */
export async function registerForPushNotificationsAsync(authToken: string): Promise<string | null> {
  if (!authToken) return null;

  try {
    // 1. Android Notification Channel configuration
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('falcon-default', {
        name: 'Falcon Attendance Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2563EB',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    // 2. Physical device check
    if (!Device.isDevice) {
      console.log('[Push] Must use physical device for remote push notifications');
      return null;
    }

    // 3. Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('[Push] Push notification permission not granted');
      return null;
    }

    // 4. Get Project ID & Expo Push Token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId ??
      '8542a6b4-323b-4bac-b3e8-42a5ba83b624';

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenResponse.data;

    console.log('[Push] Registered Expo Push Token:', pushToken);

    // 5. Send push token to backend
    await registerPushToken(pushToken, Platform.OS, authToken);

    return pushToken;
  } catch (error) {
    console.error('[Push] Failed to register push token:', error);
    return null;
  }
}

/**
 * Handle notification tap navigation
 */
export function handleNotificationUrl(url?: string | null, navigate?: (screen: string) => void) {
  if (!url || !navigate) return;

  const normalized = url.toLowerCase();
  if (normalized.includes('attendance') || normalized.includes('check-in')) {
    navigate('Home');
  } else if (normalized.includes('leave')) {
    navigate('Leave');
  } else if (normalized.includes('notif') || normalized.includes('announcement')) {
    navigate('Notifications');
  } else {
    navigate('Notifications');
  }
}

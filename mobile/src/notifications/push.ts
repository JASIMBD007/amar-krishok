import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const DEVICE_KEY = "amarkrishok.deviceId";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true }),
});

async function deviceId() {
  const current = await AsyncStorage.getItem(DEVICE_KEY);
  if (current) return current;
  const created = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_KEY, created);
  return created;
}

export async function getDeviceRegistration() {
  const registration: { deviceId: string; platform: string; pushToken?: string } = { deviceId: await deviceId(), platform: Platform.OS };
  if (!Device.isDevice) return registration;
  try {
    const permission = await Notifications.requestPermissionsAsync();
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (permission.granted && projectId) registration.pushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    // Expo Go and devices without push services still receive in-app notifications by polling.
  }
  return registration;
}

export async function notificationDeepLink() {
  const response = await Notifications.getLastNotificationResponseAsync();
  const url = response?.notification.request.content.data.url;
  return typeof url === "string" ? url : null;
}

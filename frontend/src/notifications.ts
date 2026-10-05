import * as Notifications from 'expo-notifications';
import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'nur.reminder';

export type ReminderPref = { enabled: boolean; hour: number; minute: number };
export type PermState = 'granted' | 'denied' | 'blocked' | 'undetermined';

export const DEFAULT_PREF: ReminderPref = { enabled: false, hour: 20, minute: 0 };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const remindersSupported = Platform.OS !== 'web';

export async function loadPref(): Promise<ReminderPref> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    return raw ? { ...DEFAULT_PREF, ...JSON.parse(raw) } : DEFAULT_PREF;
  } catch {
    return DEFAULT_PREF;
  }
}

export async function savePref(pref: ReminderPref) {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(pref));
}

function toState(res: Notifications.NotificationPermissionsStatus): PermState {
  if (res.granted) return 'granted';
  if (res.status === 'undetermined') return 'undetermined';
  return res.canAskAgain ? 'denied' : 'blocked';
}

export async function getPermState(): Promise<PermState> {
  if (!remindersSupported) return 'blocked';
  return toState(await Notifications.getPermissionsAsync());
}

export async function requestPerm(): Promise<PermState> {
  if (!remindersSupported) return 'blocked';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (!current.canAskAgain) return 'blocked';
  return toState(await Notifications.requestPermissionsAsync());
}

export function openSettings() {
  Linking.openSettings();
}

export async function cancelReminders() {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleDailyReminder(
  hour: number,
  minute: number,
  content: { title: string; body: string },
) {
  if (!remindersSupported) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('nur-reminders', {
      name: 'Rappels Nūr',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#C9A961',
    });
  }
  await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: false },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: Platform.OS === 'android' ? 'nur-reminders' : undefined,
    },
  });
}

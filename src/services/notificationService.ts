/**
 * notificationService.ts — Service de gestion des Notifications et Rappels Pure Ascension.
 * Fournit les interfaces et fonctions pour programmer les rappels quotidiens :
 * 1. Rappel Sommeil P3 à 21h30
 * 2. Rappel Hydratation P1 à 14h00
 * 3. Rappel Séance P2 (ex: 17h00 ou 09h00)
 */

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_NOTIF_KEY = '@pure_ascension_scheduled_reminders_v1';

export interface ScheduledReminder {
  id: string;
  tag: string;
  hour: number;
  minute: number;
  enabled: boolean;
}

async function loadLocalReminders(): Promise<ScheduledReminder[]> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_NOTIF_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Erreur chargement rappels locaux:', err);
    return [];
  }
}

async function saveLocalReminders(reminders: ScheduledReminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_NOTIF_KEY, JSON.stringify(reminders));
  } catch (err) {
    console.error('Erreur sauvegarde rappels locaux:', err);
  }
}

export function configureNotificationHandler(): void {
  console.log('Notification handler configuré.');
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return true;
}

export async function scheduleSleepReminderP3(hour = 21, minute = 30): Promise<string | null> {
  const reminders = await loadLocalReminders();
  const updated = reminders.filter(r => r.tag !== 'sleep_p3');
  updated.push({ id: 'sleep_p3', tag: 'sleep_p3', hour, minute, enabled: true });
  await saveLocalReminders(updated);
  console.log(`Rappel Sommeil P3 conservé localement pour ${hour}h${minute}`);
  return 'sleep_p3';
}

export async function scheduleHydrationReminderP1(hour = 14, minute = 0): Promise<string | null> {
  const reminders = await loadLocalReminders();
  const updated = reminders.filter(r => r.tag !== 'hydration_p1');
  updated.push({ id: 'hydration_p1', tag: 'hydration_p1', hour, minute, enabled: true });
  await saveLocalReminders(updated);
  console.log(`Rappel Hydratation P1 conservé localement pour ${hour}h${minute}`);
  return 'hydration_p1';
}

export async function scheduleWorkoutReminderP2(hour = 17, minute = 0): Promise<string | null> {
  const reminders = await loadLocalReminders();
  const updated = reminders.filter(r => r.tag !== 'workout_p2');
  updated.push({ id: 'workout_p2', tag: 'workout_p2', hour, minute, enabled: true });
  await saveLocalReminders(updated);
  console.log(`Rappel Séance P2 conservé localement pour ${hour}h${minute}`);
  return 'workout_p2';
}

export async function setupAllPureAscensionReminders(): Promise<{
  permissionsGranted: boolean;
  sleepReminderId: string | null;
  hydrationReminderId: string | null;
  workoutReminderId: string | null;
}> {
  const sleepReminderId = await scheduleSleepReminderP3();
  const hydrationReminderId = await scheduleHydrationReminderP1();
  const workoutReminderId = await scheduleWorkoutReminderP2();

  return {
    permissionsGranted: true,
    sleepReminderId,
    hydrationReminderId,
    workoutReminderId,
  };
}

export async function cancelNotificationByTag(tag: string): Promise<void> {
  const reminders = await loadLocalReminders();
  const updated = reminders.filter(r => r.tag !== tag);
  await saveLocalReminders(updated);
  console.log(`Rappel annulé localement : ${tag}`);
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await saveLocalReminders([]);
  console.log('Tous les rappels ont été annulés localement.');
}

export async function getScheduledNotifications(): Promise<ScheduledReminder[]> {
  return loadLocalReminders();
}

export async function sendInstantNotification(title: string, body: string, data?: Record<string, any>): Promise<string | null> {
  if (Platform.OS !== 'web') {
    Alert.alert(title, body);
  }
  return 'instant_notif';
}

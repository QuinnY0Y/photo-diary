import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { addDays, diaryDateFor, orderedHours, parseDateKey } from '../domain/diaryTime';
import type { DiaryConfig, PhotoEntry } from '../domain/types';
import type { NotificationService, NotificationStatus, NotificationTarget } from './NotificationService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function actualSlotDate(diaryDate: string, startHour: number, index: number): Date {
  const value = parseDateKey(diaryDate);
  const absoluteHour = startHour + index;
  value.setDate(value.getDate() + Math.floor(absoluteHour / 24));
  value.setHours(absoluteHour % 24, 0, 0, 0);
  return value;
}

function targetFromData(data: Record<string, unknown>): NotificationTarget | null {
  return typeof data.diaryDate === 'string' && typeof data.hour === 'number'
    ? { diaryDate: data.diaryDate, hour: data.hour }
    : null;
}

export class NativeNotificationService implements NotificationService {
  private async configureChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('hourly-diary', {
        name: '整点照片提醒',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 160, 100, 160],
        lightColor: '#E86F61',
      });
    }
  }

  private async status(): Promise<NotificationStatus> {
    const permissions = await Notifications.getPermissionsAsync();
    return permissions.granted ? 'granted' : 'denied';
  }

  async requestAndSync(config: DiaryConfig, photos: PhotoEntry[]): Promise<NotificationStatus> {
    await this.configureChannel();
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) return 'denied';
    return this.sync(config, photos);
  }

  async sync(config: DiaryConfig, photos: PhotoEntry[]): Promise<NotificationStatus> {
    const status = await this.status();
    if (status !== 'granted') return status;
    await this.configureChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!config.notificationsEnabled) return status;

    const now = new Date();
    const firstDiaryDate = diaryDateFor(now, config.startHour);
    const hours = orderedHours(config.startHour);
    const occupied = new Set(photos.map((photo) => `${photo.diaryDate}:${photo.assignedHour}`));
    for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
      const diaryDate = addDays(firstDiaryDate, dayOffset);
      for (let index = 0; index < hours.length; index += 1) {
        const hour = hours[index];
        if (hour === undefined || occupied.has(`${diaryDate}:${hour}`)) continue;
        const date = actualSlotDate(diaryDate, config.startHour, index);
        if (date.getTime() <= now.getTime()) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '这一小时，值得留一张照片',
            body: `${String(hour).padStart(2, '0')}:00 的拍立得还空着`,
            data: { diaryDate, hour },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: Platform.OS === 'android' ? 'hourly-diary' : undefined,
          },
        });
      }
    }
    return status;
  }

  subscribe(onOpen: (target: NotificationTarget) => void): () => void {
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      const target = response ? targetFromData(response.notification.request.content.data ?? {}) : null;
      if (target) onOpen(target);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = targetFromData(response.notification.request.content.data ?? {});
      if (target) onOpen(target);
    });
    return () => subscription.remove();
  }
}

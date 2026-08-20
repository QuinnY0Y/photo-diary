import type { NotificationService } from './NotificationService';
import { NativeNotificationService } from './NotificationService.native';

export function createNotificationService(): NotificationService {
  return new NativeNotificationService();
}

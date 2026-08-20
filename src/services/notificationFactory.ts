import type { NotificationService } from './NotificationService';
import { WebNotificationService } from './NotificationService.web';

export function createNotificationService(): NotificationService {
  return new WebNotificationService();
}

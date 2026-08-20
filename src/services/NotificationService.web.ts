import type { DiaryConfig, PhotoEntry } from '../domain/types';
import type { NotificationService, NotificationStatus, NotificationTarget } from './NotificationService';

export class WebNotificationService implements NotificationService {
  async requestAndSync(_config: DiaryConfig, _photos: PhotoEntry[]): Promise<NotificationStatus> {
    if (typeof Notification === 'undefined') return 'unsupported';
    return (await Notification.requestPermission()) === 'granted' ? 'granted' : 'denied';
  }

  async sync(): Promise<NotificationStatus> {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission === 'granted' ? 'granted' : 'denied';
  }

  subscribe(_onOpen: (target: NotificationTarget) => void): () => void {
    return () => undefined;
  }
}

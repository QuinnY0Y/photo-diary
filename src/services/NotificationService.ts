import type { DiaryConfig, PhotoEntry } from '../domain/types';

export type NotificationStatus = 'granted' | 'denied' | 'unsupported';

export type NotificationTarget = { diaryDate: string; hour: number };

export interface NotificationService {
  requestAndSync(config: DiaryConfig, photos: PhotoEntry[]): Promise<NotificationStatus>;
  sync(config: DiaryConfig, photos: PhotoEntry[]): Promise<NotificationStatus>;
  subscribe(onOpen: (target: NotificationTarget) => void): () => void;
}

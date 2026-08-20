import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { diaryDateFor, isActiveHour, toDateKey } from '../domain/diaryTime';
import { makeId } from '../domain/id';
import { DEFAULT_CONFIG } from '../domain/types';
import type { DailyNote, DiaryConfig, PhotoEntry, RepositoryState, Tag } from '../domain/types';
import { createRepository } from '../data/repositoryFactory';
import { createMediaService } from '../services/mediaFactory';
import { createNotificationService } from '../services/notificationFactory';
import { createBackupService } from '../services/backupFactory';
import type { MediaService, PreparedPhoto } from '../services/MediaService';
import type { NotificationService, NotificationStatus, NotificationTarget } from '../services/NotificationService';

type SavePreparedOptions = {
  diaryDate?: string;
  hour?: number;
};

type DiaryContextValue = {
  state: RepositoryState;
  loading: boolean;
  error: string | null;
  processing: { active: boolean; completed: number; total: number; label: string };
  media: MediaService;
  notificationStatus: NotificationStatus | 'unknown';
  notificationTarget: NotificationTarget | null;
  clearNotificationTarget(): void;
  refresh(): Promise<void>;
  completeOnboarding(startHour: number, enableNotifications: boolean): Promise<void>;
  updateConfig(config: DiaryConfig): Promise<void>;
  capture(): Promise<PreparedPhoto[]>;
  pick(): Promise<PreparedPhoto[]>;
  savePrepared(photos: PreparedPhoto[], options?: SavePreparedOptions): Promise<PhotoEntry[]>;
  updatePhoto(photo: PhotoEntry): Promise<void>;
  deletePhoto(photo: PhotoEntry): Promise<void>;
  createTag(name: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<void>;
  deleteTag(id: string): Promise<void>;
  saveDailyNote(diaryDate: string, text: string): Promise<void>;
  exportBackup(passphrase: string): Promise<void>;
  importBackup(passphrase: string, mode: 'replace' | 'merge'): Promise<boolean>;
};

const initialState: RepositoryState = {
  config: { ...DEFAULT_CONFIG },
  photos: [],
  tags: [],
  dailyNotes: [],
};

const DiaryContext = createContext<DiaryContextValue | null>(null);

function colorPhoto(label: string, from: string, to: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1080" viewBox="0 0 900 1080"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="900" height="1080" fill="url(#g)"/><circle cx="690" cy="220" r="145" fill="white" opacity=".32"/><path d="M0 830 Q220 600 430 800 T900 650 V1080 H0Z" fill="white" opacity=".25"/><text x="70" y="970" font-family="sans-serif" font-size="72" fill="white">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const repository = useMemo(() => createRepository(), []);
  const media = useMemo(() => createMediaService(), []);
  const notifications = useMemo<NotificationService>(() => createNotificationService(), []);
  const backup = useMemo(() => createBackupService(), []);
  const [state, setState] = useState<RepositoryState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState<NotificationStatus | 'unknown'>('unknown');
  const [notificationTarget, setNotificationTarget] = useState<NotificationTarget | null>(null);
  const [processing, setProcessing] = useState({ active: false, completed: 0, total: 0, label: '' });

  const refresh = useCallback(async () => {
    const next = await repository.getState();
    setState(next);
  }, [repository]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        await repository.initialize();
        let next = await repository.getState();
        const wantsDemo =
          typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';
        if (wantsDemo && next.photos.length === 0) {
          const now = new Date();
          const diaryDate = diaryDateFor(now, 4);
          const moments = [
            ['晨光', '#F2A77D', '#D95964', 8, '阳台上的第一杯咖啡'],
            ['散步', '#74A99A', '#2F6E69', 12, '风很轻，绕湖走了一圈'],
            ['晚霞', '#8E6AAE', '#ED907D', 18, '今天的天空像一封信'],
          ] as const;
          const travel = await repository.createTag('散步');
          const daily = await repository.createTag('日常');
          await repository.savePhotos(
            moments.map(([label, from, to, hour, memo], index) => {
              const uri = colorPhoto(label, from, to);
              const captured = new Date(now);
              captured.setHours(hour, 12 + index * 7, 0, 0);
              return {
                id: makeId('demo'),
                uri,
                thumbnailUri: uri,
                capturedAt: captured.toISOString(),
                diaryDate,
                assignedHour: hour,
                location: {
                  latitude: 31.2304,
                  longitude: 121.4737,
                  label: index === 0 ? '家 · 阳台' : '上海 · 徐汇',
                  pendingResolution: false,
                },
                memo,
                tagIds: index === 1 ? [travel.id, daily.id] : [daily.id],
                isBackfill: false,
                createdAt: new Date().toISOString(),
              };
            }),
          );
          await repository.setConfig({ startHour: 4, onboardingComplete: true, notificationsEnabled: false });
          next = await repository.getState();
        }
        if (!mounted) return;
        setState(next);
        const status = await notifications.sync(next.config, next.photos);
        if (mounted) setNotificationStatus(status);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : '日记加载失败');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void initialize();
    const unsubscribe = notifications.subscribe((target) => setNotificationTarget(target));
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [notifications, repository]);

  const updateConfig = useCallback(
    async (config: DiaryConfig) => {
      await repository.setConfig(config);
      const next = await repository.getState();
      setState(next);
      const status = config.notificationsEnabled
        ? await notifications.requestAndSync(config, next.photos)
        : await notifications.sync(config, next.photos);
      setNotificationStatus(status);
      if (status === 'denied' && config.notificationsEnabled) {
        const corrected = { ...config, notificationsEnabled: false };
        await repository.setConfig(corrected);
        setState((current) => ({ ...current, config: corrected }));
      }
    },
    [notifications, repository],
  );

  const completeOnboarding = useCallback(
    async (startHour: number, enableNotifications: boolean) => {
      await updateConfig({ startHour, onboardingComplete: true, notificationsEnabled: enableNotifications });
    },
    [updateConfig],
  );

  const capture = useCallback(async () => media.capture(), [media]);
  const pick = useCallback(async () => media.pick(), [media]);

  const savePrepared = useCallback(
    async (prepared: PreparedPhoto[], options?: SavePreparedOptions) => {
      if (prepared.length === 0) return [];
      setProcessing({ active: true, completed: 0, total: prepared.length, label: '正在制作拍立得' });
      try {
        const inputs = prepared.map((photo) => {
          const captured = new Date(photo.capturedAt);
          const naturalHour = captured.getHours();
          const assignedHour =
            options?.hour ?? (isActiveHour(naturalHour, state.config.startHour) ? naturalHour : state.config.startHour);
          return {
            ...photo,
            isBackfill:
              photo.isBackfill ||
              (options?.hour !== undefined && options.hour !== naturalHour) ||
              (options?.diaryDate !== undefined && options.diaryDate !== diaryDateFor(captured, state.config.startHour)),
            diaryDate: options?.diaryDate ?? diaryDateFor(captured, state.config.startHour),
            assignedHour,
            memo: '',
            tagIds: [],
          };
        });
        const saved = await repository.savePhotos(inputs);
        setProcessing((current) => ({ ...current, completed: prepared.length }));
        const next = await repository.getState();
        setState(next);
        setNotificationStatus(await notifications.sync(next.config, next.photos));
        return saved;
      } finally {
        setProcessing((current) => ({ ...current, active: false }));
      }
    },
    [notifications, repository, state.config.startHour],
  );

  const updatePhoto = useCallback(
    async (photo: PhotoEntry) => {
      await repository.updatePhoto(photo);
      await refresh();
    },
    [refresh, repository],
  );

  const deletePhoto = useCallback(
    async (photo: PhotoEntry) => {
      await repository.deletePhoto(photo.id);
      await media.deleteFiles(photo.uri, photo.thumbnailUri);
      await refresh();
    },
    [media, refresh, repository],
  );

  const createTag = useCallback(
    async (name: string) => {
      const tag = await repository.createTag(name);
      await refresh();
      return tag;
    },
    [refresh, repository],
  );

  const renameTag = useCallback(
    async (id: string, name: string) => {
      await repository.renameTag(id, name);
      await refresh();
    },
    [refresh, repository],
  );

  const deleteTag = useCallback(
    async (id: string) => {
      await repository.deleteTag(id);
      await refresh();
    },
    [refresh, repository],
  );

  const saveDailyNote = useCallback(
    async (diaryDate: string, text: string) => {
      const note: DailyNote = { diaryDate, text, updatedAt: new Date().toISOString() };
      await repository.setDailyNote(note);
      setState((current) => ({
        ...current,
        dailyNotes: [...current.dailyNotes.filter((item) => item.diaryDate !== diaryDate), note],
      }));
    },
    [repository],
  );

  const exportBackup = useCallback(
    async (passphrase: string) => {
      setProcessing({ active: true, completed: 0, total: 1, label: '正在加密备份' });
      try {
        const snapshot = await repository.exportSnapshot();
        const payload = await backup.collect(snapshot);
        await backup.export(payload, passphrase);
        setProcessing((current) => ({ ...current, completed: 1 }));
      } finally {
        setProcessing((current) => ({ ...current, active: false }));
      }
    },
    [backup, repository],
  );

  const importBackup = useCallback(
    async (passphrase: string, mode: 'replace' | 'merge') => {
      setProcessing({ active: true, completed: 0, total: 1, label: '正在校验并恢复' });
      try {
        const payload = await backup.import(passphrase);
        if (!payload) return false;
        const snapshot = await backup.restoreAssets(payload);
        await repository.importSnapshot(snapshot, mode);
        await refresh();
        setProcessing((current) => ({ ...current, completed: 1 }));
        return true;
      } finally {
        setProcessing((current) => ({ ...current, active: false }));
      }
    },
    [backup, refresh, repository],
  );

  const value: DiaryContextValue = {
    state,
    loading,
    error,
    processing,
    media,
    notificationStatus,
    notificationTarget,
    clearNotificationTarget: () => setNotificationTarget(null),
    refresh,
    completeOnboarding,
    updateConfig,
    capture,
    pick,
    savePrepared,
    updatePhoto,
    deletePhoto,
    createTag,
    renameTag,
    deleteTag,
    saveDailyNote,
    exportBackup,
    importBackup,
  };

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary(): DiaryContextValue {
  const value = useContext(DiaryContext);
  if (!value) throw new Error('useDiary 必须在 DiaryProvider 内使用');
  return value;
}

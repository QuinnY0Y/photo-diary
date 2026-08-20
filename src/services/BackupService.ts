import type { DiarySnapshot } from '../domain/types';

export type BackupPayload = {
  snapshot: DiarySnapshot;
  assets: Record<string, { original: string; thumbnail: string }>;
};

export interface BackupService {
  export(payload: BackupPayload, passphrase: string): Promise<void>;
  import(passphrase: string): Promise<BackupPayload | null>;
  collect(snapshot: DiarySnapshot): Promise<BackupPayload>;
  restoreAssets(payload: BackupPayload): Promise<DiarySnapshot>;
}

import type { DiarySnapshot } from '../domain/types';
import { decryptBackup, encryptBackup } from './BackupCodec';
import type { BackupPayload, BackupService } from './BackupService';

async function asDataUrl(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('照片读取失败'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export class WebBackupService implements BackupService {
  async collect(snapshot: DiarySnapshot): Promise<BackupPayload> {
    const assets: BackupPayload['assets'] = {};
    for (const photo of snapshot.photos) {
      assets[photo.id] = {
        original: await asDataUrl(photo.uri),
        thumbnail: await asDataUrl(photo.thumbnailUri),
      };
    }
    return { snapshot, assets };
  }

  async export(payload: BackupPayload, passphrase: string): Promise<void> {
    const encrypted = await encryptBackup(payload, passphrase);
    const url = URL.createObjectURL(new Blob([encrypted], { type: 'application/octet-stream' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `photo-diary-${new Date().toISOString().slice(0, 10)}.photodiary`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async import(passphrase: string): Promise<BackupPayload | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.photodiary,application/octet-stream';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        void file.text().then((raw) => decryptBackup(raw, passphrase)).then(resolve).catch(reject);
      };
      input.click();
    });
  }

  async restoreAssets(payload: BackupPayload): Promise<DiarySnapshot> {
    return {
      ...payload.snapshot,
      photos: payload.snapshot.photos.map((photo) => {
        const asset = payload.assets[photo.id];
        if (!asset) throw new Error(`备份缺少照片文件：${photo.id}`);
        return { ...photo, uri: asset.original, thumbnailUri: asset.thumbnail };
      }),
    };
  }
}

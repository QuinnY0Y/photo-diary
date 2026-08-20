import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import type { DiarySnapshot } from '../domain/types';
import { decryptBackup, encryptBackup } from './BackupCodec';
import type { BackupPayload, BackupService } from './BackupService';

const restoreDirectory = `${FileSystem.documentDirectory}restored/`;

export class NativeBackupService implements BackupService {
  async collect(snapshot: DiarySnapshot): Promise<BackupPayload> {
    const assets: BackupPayload['assets'] = {};
    for (const photo of snapshot.photos) {
      assets[photo.id] = {
        original: await FileSystem.readAsStringAsync(photo.uri, { encoding: FileSystem.EncodingType.Base64 }),
        thumbnail: await FileSystem.readAsStringAsync(photo.thumbnailUri, { encoding: FileSystem.EncodingType.Base64 }),
      };
    }
    return { snapshot, assets };
  }

  async export(payload: BackupPayload, passphrase: string): Promise<void> {
    const encrypted = await encryptBackup(payload, passphrase);
    const name = `photo-diary-${new Date().toISOString().slice(0, 10)}.photodiary`;
    const uri = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.writeAsStringAsync(uri, encrypted, { encoding: FileSystem.EncodingType.UTF8 });
    if (!(await Sharing.isAvailableAsync())) throw new Error('当前设备无法打开系统分享面板');
    await Sharing.shareAsync(uri, { mimeType: 'application/octet-stream', dialogTitle: '导出加密照片日记备份' });
  }

  async import(passphrase: string): Promise<BackupPayload | null> {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (result.canceled) return null;
    const raw = await FileSystem.readAsStringAsync(result.assets[0]?.uri ?? '', { encoding: FileSystem.EncodingType.UTF8 });
    return decryptBackup(raw, passphrase);
  }

  async restoreAssets(payload: BackupPayload): Promise<DiarySnapshot> {
    await FileSystem.makeDirectoryAsync(restoreDirectory, { intermediates: true });
    const photos = [];
    for (const photo of payload.snapshot.photos) {
      const asset = payload.assets[photo.id];
      if (!asset) throw new Error(`备份缺少照片文件：${photo.id}`);
      const original = `${restoreDirectory}${photo.id}.jpg`;
      const thumbnail = `${restoreDirectory}${photo.id}-thumb.jpg`;
      await FileSystem.writeAsStringAsync(original, asset.original, { encoding: FileSystem.EncodingType.Base64 });
      await FileSystem.writeAsStringAsync(thumbnail, asset.thumbnail, { encoding: FileSystem.EncodingType.Base64 });
      photos.push({ ...photo, uri: original, thumbnailUri: thumbnail });
    }
    return { ...payload.snapshot, photos };
  }
}

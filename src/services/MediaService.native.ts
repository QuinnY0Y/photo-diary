import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { makeId } from '../domain/id';
import type { PhotoLocation } from '../domain/types';
import type { LocationService, MediaPermissionError, MediaService, PreparedPhoto } from './MediaService';

const photoDirectory = `${FileSystem.documentDirectory}photos/`;
const thumbDirectory = `${FileSystem.documentDirectory}thumbnails/`;

async function ensureDirectories(): Promise<void> {
  await FileSystem.makeDirectoryAsync(photoDirectory, { intermediates: true });
  await FileSystem.makeDirectoryAsync(thumbDirectory, { intermediates: true });
}

function permissionError(permission: 'camera' | 'library'): MediaPermissionError {
  const error = new Error(permission === 'camera' ? '需要相机权限才能拍照' : '需要相册权限才能选择照片') as MediaPermissionError;
  error.permission = permission;
  return error;
}

function exifDate(exif: Record<string, unknown> | null | undefined): Date | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTimeDigitized ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;
  const match = raw.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const value = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour, minute, second);
  return Number.isNaN(value.getTime()) ? null : value;
}

function exifLocation(exif: Record<string, unknown> | null | undefined): PhotoLocation | null {
  const latitude = Number(exif?.GPSLatitude);
  const longitude = Number(exif?.GPSLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, label: null, pendingResolution: true };
}

async function prepareAsset(
  asset: ImagePicker.ImagePickerAsset,
  isBackfill: boolean,
  fallbackLocation: PhotoLocation | null,
): Promise<PreparedPhoto> {
  await ensureDirectories();
  const id = makeId('photo');
  const originalUri = `${photoDirectory}${id}.jpg`;
  const thumbnailUri = `${thumbDirectory}${id}.jpg`;
  await FileSystem.copyAsync({ from: asset.uri, to: originalUri });
  try {
    const thumbnail = await ImageManipulator.manipulateAsync(
      originalUri,
      [{ resize: { width: 640 } }],
      { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG },
    );
    await FileSystem.moveAsync({ from: thumbnail.uri, to: thumbnailUri });
  } catch (error) {
    await FileSystem.deleteAsync(originalUri, { idempotent: true });
    throw error;
  }
  const captured = isBackfill ? exifDate(asset.exif) ?? new Date() : new Date();
  return {
    id,
    uri: originalUri,
    thumbnailUri,
    capturedAt: captured.toISOString(),
    location: exifLocation(asset.exif) ?? fallbackLocation,
    isBackfill,
    createdAt: new Date().toISOString(),
  };
}

export class NativeLocationService implements LocationService {
  async currentLocation(): Promise<PhotoLocation | null> {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return null;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      try {
        const result = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = result[0];
        const label = place
          ? [place.name, place.district, place.city].filter(Boolean).filter((value, index, all) => all.indexOf(value) === index).join(' · ')
          : null;
        return { latitude, longitude, label: label || null, pendingResolution: !label };
      } catch {
        return { latitude, longitude, label: null, pendingResolution: true };
      }
    } catch {
      return null;
    }
  }
}

export class NativeMediaService implements MediaService {
  private location = new NativeLocationService();

  async capture(): Promise<PreparedPhoto[]> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw permissionError('camera');
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      exif: true,
    });
    if (result.canceled) return [];
    const location = await this.location.currentLocation();
    return Promise.all(result.assets.map((asset) => prepareAsset(asset, false, location)));
  }

  async pick(): Promise<PreparedPhoto[]> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw permissionError('library');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      quality: 1,
      exif: true,
    });
    if (result.canceled) return [];
    return Promise.all(result.assets.map((asset) => prepareAsset(asset, true, null)));
  }

  async deleteFiles(uri: string, thumbnailUri: string): Promise<void> {
    await Promise.all([
      FileSystem.deleteAsync(uri, { idempotent: true }),
      FileSystem.deleteAsync(thumbnailUri, { idempotent: true }),
    ]);
  }
}

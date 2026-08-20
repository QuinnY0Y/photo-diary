import * as ImagePicker from 'expo-image-picker';

import { makeId } from '../domain/id';
import type { PhotoLocation } from '../domain/types';
import type { LocationService, MediaService, PreparedPhoto } from './MediaService';

export class WebLocationService implements LocationService {
  async currentLocation(): Promise<PhotoLocation | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) =>
          resolve({
            latitude: coords.latitude,
            longitude: coords.longitude,
            label: null,
            pendingResolution: true,
          }),
        () => resolve(null),
        { timeout: 4000, maximumAge: 60_000 },
      );
    });
  }
}

function prepare(asset: ImagePicker.ImagePickerAsset, isBackfill: boolean): PreparedPhoto {
  const now = new Date();
  return {
    id: makeId('photo'),
    uri: asset.uri,
    thumbnailUri: asset.uri,
    capturedAt: now.toISOString(),
    location: null,
    isBackfill,
    createdAt: now.toISOString(),
  };
}

export class WebMediaService implements MediaService {
  async capture(): Promise<PreparedPhoto[]> {
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    return result.canceled ? [] : result.assets.map((asset) => prepare(asset, false));
  }

  async pick(): Promise<PreparedPhoto[]> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      orderedSelection: true,
      quality: 1,
    });
    return result.canceled ? [] : result.assets.map((asset) => prepare(asset, true));
  }

  async deleteFiles(): Promise<void> {
    // Browser-selected object URLs are owned by the browser; metadata removal is sufficient here.
  }
}

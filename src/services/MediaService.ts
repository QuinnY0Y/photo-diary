import type { PhotoLocation, SavePhotoInput } from '../domain/types';

export type PreparedPhoto = Pick<
  SavePhotoInput,
  'id' | 'uri' | 'thumbnailUri' | 'capturedAt' | 'location' | 'isBackfill' | 'createdAt'
>;

export interface MediaService {
  capture(): Promise<PreparedPhoto[]>;
  pick(): Promise<PreparedPhoto[]>;
  deleteFiles(uri: string, thumbnailUri: string): Promise<void>;
}

export interface LocationService {
  currentLocation(): Promise<PhotoLocation | null>;
}

export type MediaPermissionError = Error & {
  permission: 'camera' | 'library';
};

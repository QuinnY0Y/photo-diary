import type {
  DailyNote,
  DiaryConfig,
  DiarySnapshot,
  PhotoEntry,
  RepositoryState,
  SavePhotoInput,
  Tag,
} from '../domain/types';

export interface DiaryRepository {
  initialize(): Promise<void>;
  getState(): Promise<RepositoryState>;
  getConfig(): Promise<DiaryConfig>;
  setConfig(config: DiaryConfig): Promise<void>;
  savePhotos(inputs: SavePhotoInput[]): Promise<PhotoEntry[]>;
  updatePhoto(photo: PhotoEntry): Promise<void>;
  deletePhoto(id: string): Promise<void>;
  createTag(name: string): Promise<Tag>;
  renameTag(id: string, name: string): Promise<void>;
  deleteTag(id: string): Promise<void>;
  setDailyNote(note: DailyNote): Promise<void>;
  exportSnapshot(): Promise<DiarySnapshot>;
  importSnapshot(snapshot: DiarySnapshot, mode: 'replace' | 'merge'): Promise<void>;
}

import type { DiaryRepository } from './DiaryRepository';
import { DEFAULT_CONFIG } from '../domain/types';
import type {
  DailyNote,
  DiaryConfig,
  DiarySnapshot,
  PhotoEntry,
  RepositoryState,
  SavePhotoInput,
  Tag,
} from '../domain/types';
import { makeId } from '../domain/id';

const STORAGE_KEY = 'photo-diary:v1';

const emptyState = (): RepositoryState => ({
  config: { ...DEFAULT_CONFIG },
  photos: [],
  tags: [],
  dailyNotes: [],
});

export class WebDiaryRepository implements DiaryRepository {
  private memory = emptyState();

  async initialize(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      this.memory = JSON.parse(raw) as RepositoryState;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private persist(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    }
  }

  async getState(): Promise<RepositoryState> {
    return structuredClone(this.memory);
  }

  async getConfig(): Promise<DiaryConfig> {
    return { ...this.memory.config };
  }

  async setConfig(config: DiaryConfig): Promise<void> {
    this.memory.config = { ...config };
    this.persist();
  }

  async savePhotos(inputs: SavePhotoInput[]): Promise<PhotoEntry[]> {
    const created = inputs.map((input) => ({
      ...input,
      tags: input.tagIds
        .map((id) => this.memory.tags.find((tag) => tag.id === id))
        .filter((tag): tag is Tag => Boolean(tag)),
    }));
    this.memory.photos.push(...created);
    this.persist();
    return structuredClone(created);
  }

  async updatePhoto(photo: PhotoEntry): Promise<void> {
    const index = this.memory.photos.findIndex((item) => item.id === photo.id);
    if (index < 0) throw new Error('照片记录不存在');
    this.memory.photos[index] = structuredClone(photo);
    this.persist();
  }

  async deletePhoto(id: string): Promise<void> {
    this.memory.photos = this.memory.photos.filter((photo) => photo.id !== id);
    this.persist();
  }

  async createTag(name: string): Promise<Tag> {
    const normalized = name.trim();
    const existing = this.memory.tags.find(
      (tag) => tag.name.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
    );
    if (existing) return { ...existing };
    const tag = { id: makeId('tag'), name: normalized, createdAt: new Date().toISOString() };
    this.memory.tags.push(tag);
    this.persist();
    return tag;
  }

  async renameTag(id: string, name: string): Promise<void> {
    const tag = this.memory.tags.find((item) => item.id === id);
    if (!tag) throw new Error('Tag 不存在');
    tag.name = name.trim();
    this.memory.photos.forEach((photo) => {
      photo.tags.forEach((photoTag) => {
        if (photoTag.id === id) photoTag.name = tag.name;
      });
    });
    this.persist();
  }

  async deleteTag(id: string): Promise<void> {
    this.memory.tags = this.memory.tags.filter((tag) => tag.id !== id);
    this.memory.photos.forEach((photo) => {
      photo.tags = photo.tags.filter((tag) => tag.id !== id);
    });
    this.persist();
  }

  async setDailyNote(note: DailyNote): Promise<void> {
    const index = this.memory.dailyNotes.findIndex((item) => item.diaryDate === note.diaryDate);
    if (index >= 0) this.memory.dailyNotes[index] = { ...note };
    else this.memory.dailyNotes.push({ ...note });
    this.persist();
  }

  async exportSnapshot(): Promise<DiarySnapshot> {
    return {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      ...(await this.getState()),
    };
  }

  async importSnapshot(snapshot: DiarySnapshot, mode: 'replace' | 'merge'): Promise<void> {
    if (snapshot.schemaVersion !== 1) throw new Error('不支持的备份版本');
    if (mode === 'replace') {
      this.memory = {
        config: snapshot.config,
        photos: snapshot.photos,
        tags: snapshot.tags,
        dailyNotes: snapshot.dailyNotes,
      };
    } else {
      const tagMap = new Map(this.memory.tags.map((tag) => [tag.id, tag]));
      snapshot.tags.forEach((tag) => tagMap.set(tag.id, tag));
      const photoMap = new Map(this.memory.photos.map((photo) => [photo.id, photo]));
      snapshot.photos.forEach((photo) => photoMap.set(photo.id, photo));
      const noteMap = new Map(this.memory.dailyNotes.map((note) => [note.diaryDate, note]));
      snapshot.dailyNotes.forEach((note) => noteMap.set(note.diaryDate, note));
      this.memory = {
        config: this.memory.config,
        photos: [...photoMap.values()],
        tags: [...tagMap.values()],
        dailyNotes: [...noteMap.values()],
      };
    }
    this.persist();
  }
}

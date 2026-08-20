import * as SQLite from 'expo-sqlite';

import type { DiaryRepository } from './DiaryRepository';
import { DEFAULT_CONFIG } from '../domain/types';
import type {
  DailyNote,
  DiaryConfig,
  DiarySnapshot,
  PhotoEntry,
  PhotoLocation,
  RepositoryState,
  SavePhotoInput,
  Tag,
} from '../domain/types';
import { makeId } from '../domain/id';

type PhotoRow = {
  id: string;
  uri: string;
  thumbnail_uri: string;
  captured_at: string;
  diary_date: string;
  assigned_hour: number;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  location_pending: number;
  memo: string;
  is_backfill: number;
  created_at: string;
};

type TagRow = { id: string; name: string; created_at: string };
type NoteRow = { diary_date: string; text: string; updated_at: string };
type SettingRow = { value: string };

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  uri TEXT NOT NULL,
  thumbnail_uri TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  diary_date TEXT NOT NULL,
  assigned_hour INTEGER NOT NULL,
  latitude REAL,
  longitude REAL,
  location_label TEXT,
  location_pending INTEGER NOT NULL DEFAULT 0,
  memo TEXT NOT NULL DEFAULT '',
  is_backfill INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_photos_day_hour ON photos(diary_date, assigned_hour, captured_at);
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS photo_tags (
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(photo_id, tag_id)
);
CREATE TABLE IF NOT EXISTS daily_notes (
  diary_date TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
PRAGMA user_version = 1;
`;

export class NativeDiaryRepository implements DiaryRepository {
  private db: SQLite.SQLiteDatabase | null = null;

  private database(): SQLite.SQLiteDatabase {
    if (!this.db) throw new Error('数据库尚未初始化');
    return this.db;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('photo-diary.db');
    await this.db.execAsync(SCHEMA);
    const existing = await this.db.getFirstAsync<SettingRow>(
      "SELECT value FROM settings WHERE key = 'config'",
    );
    if (!existing) await this.setConfig(DEFAULT_CONFIG);
  }

  private async tagsForPhoto(photoId: string): Promise<Tag[]> {
    const rows = await this.database().getAllAsync<TagRow>(
      `SELECT t.id, t.name, t.created_at
       FROM tags t JOIN photo_tags pt ON pt.tag_id = t.id
       WHERE pt.photo_id = ? ORDER BY t.name COLLATE NOCASE`,
      photoId,
    );
    return rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at }));
  }

  private async mapPhoto(row: PhotoRow): Promise<PhotoEntry> {
    const location: PhotoLocation | null =
      row.latitude === null || row.longitude === null
        ? null
        : {
            latitude: row.latitude,
            longitude: row.longitude,
            label: row.location_label,
            pendingResolution: Boolean(row.location_pending),
          };
    return {
      id: row.id,
      uri: row.uri,
      thumbnailUri: row.thumbnail_uri,
      capturedAt: row.captured_at,
      diaryDate: row.diary_date,
      assignedHour: row.assigned_hour,
      location,
      memo: row.memo,
      tags: await this.tagsForPhoto(row.id),
      isBackfill: Boolean(row.is_backfill),
      createdAt: row.created_at,
    };
  }

  async getState(): Promise<RepositoryState> {
    const db = this.database();
    const [photoRows, tagRows, noteRows, config] = await Promise.all([
      db.getAllAsync<PhotoRow>('SELECT * FROM photos ORDER BY captured_at ASC'),
      db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name COLLATE NOCASE'),
      db.getAllAsync<NoteRow>('SELECT * FROM daily_notes ORDER BY diary_date'),
      this.getConfig(),
    ]);
    const photos = await Promise.all(photoRows.map((row) => this.mapPhoto(row)));
    return {
      config,
      photos,
      tags: tagRows.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at })),
      dailyNotes: noteRows.map((row) => ({
        diaryDate: row.diary_date,
        text: row.text,
        updatedAt: row.updated_at,
      })),
    };
  }

  async getConfig(): Promise<DiaryConfig> {
    const row = await this.database().getFirstAsync<SettingRow>(
      "SELECT value FROM settings WHERE key = 'config'",
    );
    return row ? (JSON.parse(row.value) as DiaryConfig) : { ...DEFAULT_CONFIG };
  }

  async setConfig(config: DiaryConfig): Promise<void> {
    await this.database().runAsync(
      "INSERT INTO settings(key, value) VALUES('config', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      JSON.stringify(config),
    );
  }

  async savePhotos(inputs: SavePhotoInput[]): Promise<PhotoEntry[]> {
    const db = this.database();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const input of inputs) {
        const location = input.location;
        await tx.runAsync(
          `INSERT INTO photos(
            id, uri, thumbnail_uri, captured_at, diary_date, assigned_hour,
            latitude, longitude, location_label, location_pending, memo, is_backfill, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          input.id,
          input.uri,
          input.thumbnailUri,
          input.capturedAt,
          input.diaryDate,
          input.assignedHour,
          location?.latitude ?? null,
          location?.longitude ?? null,
          location?.label ?? null,
          location?.pendingResolution ? 1 : 0,
          input.memo,
          input.isBackfill ? 1 : 0,
          input.createdAt,
        );
        for (const tagId of input.tagIds) {
          await tx.runAsync('INSERT OR IGNORE INTO photo_tags(photo_id, tag_id) VALUES(?, ?)', input.id, tagId);
        }
      }
    });
    const state = await this.getState();
    const ids = new Set(inputs.map((input) => input.id));
    return state.photos.filter((photo) => ids.has(photo.id));
  }

  async updatePhoto(photo: PhotoEntry): Promise<void> {
    await this.database().withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `UPDATE photos SET diary_date = ?, assigned_hour = ?, latitude = ?, longitude = ?,
          location_label = ?, location_pending = ?, memo = ?, is_backfill = ? WHERE id = ?`,
        photo.diaryDate,
        photo.assignedHour,
        photo.location?.latitude ?? null,
        photo.location?.longitude ?? null,
        photo.location?.label ?? null,
        photo.location?.pendingResolution ? 1 : 0,
        photo.memo,
        photo.isBackfill ? 1 : 0,
        photo.id,
      );
      await tx.runAsync('DELETE FROM photo_tags WHERE photo_id = ?', photo.id);
      for (const tag of photo.tags) {
        await tx.runAsync('INSERT OR IGNORE INTO photo_tags(photo_id, tag_id) VALUES(?, ?)', photo.id, tag.id);
      }
    });
  }

  async deletePhoto(id: string): Promise<void> {
    await this.database().runAsync('DELETE FROM photos WHERE id = ?', id);
  }

  async createTag(name: string): Promise<Tag> {
    const normalized = name.trim();
    const existing = await this.database().getFirstAsync<TagRow>(
      'SELECT * FROM tags WHERE name = ? COLLATE NOCASE',
      normalized,
    );
    if (existing) return { id: existing.id, name: existing.name, createdAt: existing.created_at };
    const tag = { id: makeId('tag'), name: normalized, createdAt: new Date().toISOString() };
    await this.database().runAsync(
      'INSERT INTO tags(id, name, created_at) VALUES(?, ?, ?)',
      tag.id,
      tag.name,
      tag.createdAt,
    );
    return tag;
  }

  async renameTag(id: string, name: string): Promise<void> {
    await this.database().runAsync('UPDATE tags SET name = ? WHERE id = ?', name.trim(), id);
  }

  async deleteTag(id: string): Promise<void> {
    await this.database().runAsync('DELETE FROM tags WHERE id = ?', id);
  }

  async setDailyNote(note: DailyNote): Promise<void> {
    await this.database().runAsync(
      `INSERT INTO daily_notes(diary_date, text, updated_at) VALUES(?, ?, ?)
       ON CONFLICT(diary_date) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at`,
      note.diaryDate,
      note.text,
      note.updatedAt,
    );
  }

  async exportSnapshot(): Promise<DiarySnapshot> {
    return { schemaVersion: 1, exportedAt: new Date().toISOString(), ...(await this.getState()) };
  }

  async importSnapshot(snapshot: DiarySnapshot, mode: 'replace' | 'merge'): Promise<void> {
    if (snapshot.schemaVersion !== 1) throw new Error('不支持的备份版本');
    const db = this.database();
    await db.withExclusiveTransactionAsync(async (tx) => {
      if (mode === 'replace') {
        await tx.execAsync('DELETE FROM photo_tags; DELETE FROM photos; DELETE FROM tags; DELETE FROM daily_notes;');
      }
      for (const tag of snapshot.tags) {
        await tx.runAsync(
          `INSERT INTO tags(id, name, created_at) VALUES(?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name`,
          tag.id,
          tag.name,
          tag.createdAt,
        );
      }
      for (const photo of snapshot.photos) {
        await tx.runAsync(
          `INSERT OR REPLACE INTO photos(
            id, uri, thumbnail_uri, captured_at, diary_date, assigned_hour,
            latitude, longitude, location_label, location_pending, memo, is_backfill, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          photo.id,
          photo.uri,
          photo.thumbnailUri,
          photo.capturedAt,
          photo.diaryDate,
          photo.assignedHour,
          photo.location?.latitude ?? null,
          photo.location?.longitude ?? null,
          photo.location?.label ?? null,
          photo.location?.pendingResolution ? 1 : 0,
          photo.memo,
          photo.isBackfill ? 1 : 0,
          photo.createdAt,
        );
        await tx.runAsync('DELETE FROM photo_tags WHERE photo_id = ?', photo.id);
        for (const tag of photo.tags) {
          await tx.runAsync('INSERT OR IGNORE INTO photo_tags(photo_id, tag_id) VALUES(?, ?)', photo.id, tag.id);
        }
      }
      for (const note of snapshot.dailyNotes) {
        await tx.runAsync(
          'INSERT OR REPLACE INTO daily_notes(diary_date, text, updated_at) VALUES(?, ?, ?)',
          note.diaryDate,
          note.text,
          note.updatedAt,
        );
      }
    });
    await this.setConfig(mode === 'replace' ? snapshot.config : await this.getConfig());
  }
}

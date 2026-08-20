import { beforeEach, describe, expect, it } from 'vitest';

import { WebDiaryRepository } from './WebDiaryRepository';

describe('local diary repository', () => {
  let repository: WebDiaryRepository;

  beforeEach(async () => {
    repository = new WebDiaryRepository();
    await repository.initialize();
  });

  it('persists a photo with independent memo and multiple tags', async () => {
    const daily = await repository.createTag('日常');
    const walk = await repository.createTag('散步');
    const [photo] = await repository.savePhotos([
      {
        id: 'photo-1',
        uri: 'data:image/jpeg;base64,AA==',
        thumbnailUri: 'data:image/jpeg;base64,AA==',
        capturedAt: '2026-08-14T08:12:00.000Z',
        diaryDate: '2026-08-14',
        assignedHour: 8,
        location: null,
        memo: '清晨的一杯咖啡',
        tagIds: [daily.id, walk.id],
        isBackfill: false,
        createdAt: '2026-08-14T08:12:01.000Z',
      },
    ]);
    expect(photo?.memo).toBe('清晨的一杯咖啡');
    expect(photo?.tags.map((tag) => tag.name)).toEqual(['日常', '散步']);
  });

  it('renames and removes tags without deleting photos', async () => {
    const tag = await repository.createTag('旅行');
    const [photo] = await repository.savePhotos([
      {
        id: 'photo-2',
        uri: 'x',
        thumbnailUri: 'x',
        capturedAt: '2026-08-14T12:00:00.000Z',
        diaryDate: '2026-08-14',
        assignedHour: 12,
        location: null,
        memo: '',
        tagIds: [tag.id],
        isBackfill: true,
        createdAt: '2026-08-14T12:00:00.000Z',
      },
    ]);
    expect(photo).toBeDefined();
    await repository.renameTag(tag.id, '远行');
    expect((await repository.getState()).photos[0]?.tags[0]?.name).toBe('远行');
    await repository.deleteTag(tag.id);
    const state = await repository.getState();
    expect(state.photos).toHaveLength(1);
    expect(state.photos[0]?.tags).toHaveLength(0);
  });

  it('exports a versioned snapshot', async () => {
    const snapshot = await repository.exportSnapshot();
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

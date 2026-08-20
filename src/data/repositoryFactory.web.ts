import type { DiaryRepository } from './DiaryRepository';
import { WebDiaryRepository } from './WebDiaryRepository';

export function createRepository(): DiaryRepository {
  return new WebDiaryRepository();
}

import type { DiaryRepository } from './DiaryRepository';
import { NativeDiaryRepository } from './NativeDiaryRepository';

export function createRepository(): DiaryRepository {
  return new NativeDiaryRepository();
}

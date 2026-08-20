import type { DiaryRepository } from './DiaryRepository';
import { WebDiaryRepository } from './WebDiaryRepository';

// TypeScript fallback; Metro selects repositoryFactory.native.ts or .web.ts at runtime.
export function createRepository(): DiaryRepository {
  return new WebDiaryRepository();
}

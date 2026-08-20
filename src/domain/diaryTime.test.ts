import { describe, expect, it } from 'vitest';

import { diaryDateFor, isActiveHour, orderedHours, slotIndex } from './diaryTime';

describe('diary time rules', () => {
  it('creates exactly twenty ordered slots', () => {
    expect(orderedHours(4)).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    ]);
  });

  it('keeps after-midnight slots in the previous diary day', () => {
    const atOne = new Date(2026, 7, 15, 1, 30);
    expect(diaryDateFor(atOne, 8)).toBe('2026-08-14');
    expect(slotIndex(1, 8)).toBe(17);
  });

  it('rejects the four sleeping hours', () => {
    expect(isActiveHour(3, 4)).toBe(false);
    expect(isActiveHour(4, 4)).toBe(true);
    expect(isActiveHour(23, 4)).toBe(true);
  });
});

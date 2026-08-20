const pad = (value: number) => String(value).padStart(2, '0');

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1, 12, 0, 0, 0);
}

export function addDays(key: string, amount: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function diaryDateFor(date: Date, startHour: number): string {
  const copy = new Date(date);
  if (copy.getHours() < startHour) copy.setDate(copy.getDate() - 1);
  return toDateKey(copy);
}

export function orderedHours(startHour: number): number[] {
  return Array.from({ length: 20 }, (_, index) => (startHour + index) % 24);
}

export function slotIndex(hour: number, startHour: number): number {
  const value = (hour - startHour + 24) % 24;
  return value < 20 ? value : -1;
}

export function isActiveHour(hour: number, startHour: number): boolean {
  return slotIndex(hour, startHour) >= 0;
}

export function formatHour(hour: number): string {
  return `${pad(hour)}:00`;
}

export function formatCapturedTime(iso: string): string {
  const value = new Date(iso);
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function formatDateTitle(key: string): string {
  const date = parseDateKey(key);
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getMonth() + 1}月${date.getDate()}日 · ${weekdays[date.getDay()]}`;
}

export function weekAround(key: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(key, index - 3));
}

export function belongsToDiaryDay(date: Date, diaryDate: string, startHour: number): boolean {
  return diaryDateFor(date, startHour) === diaryDate && isActiveHour(date.getHours(), startHour);
}

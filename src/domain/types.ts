export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type PhotoLocation = Coordinates & {
  label: string | null;
  pendingResolution: boolean;
};

export type Tag = {
  id: string;
  name: string;
  createdAt: string;
};

export type PhotoEntry = {
  id: string;
  uri: string;
  thumbnailUri: string;
  capturedAt: string;
  diaryDate: string;
  assignedHour: number;
  location: PhotoLocation | null;
  memo: string;
  tags: Tag[];
  isBackfill: boolean;
  createdAt: string;
};

export type DailyNote = {
  diaryDate: string;
  text: string;
  updatedAt: string;
};

export type DiaryConfig = {
  startHour: number;
  onboardingComplete: boolean;
  notificationsEnabled: boolean;
};

export type DiarySnapshot = {
  schemaVersion: 1;
  exportedAt: string;
  config: DiaryConfig;
  photos: PhotoEntry[];
  tags: Tag[];
  dailyNotes: DailyNote[];
};

export type SavePhotoInput = Omit<PhotoEntry, 'tags'> & { tagIds: string[] };

export type RepositoryState = {
  config: DiaryConfig;
  photos: PhotoEntry[];
  tags: Tag[];
  dailyNotes: DailyNote[];
};

export const DEFAULT_CONFIG: DiaryConfig = {
  startHour: 4,
  onboardingComplete: false,
  notificationsEnabled: false,
};

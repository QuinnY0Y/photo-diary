import type { BackupService } from './BackupService';
import { NativeBackupService } from './BackupService.native';

export function createBackupService(): BackupService {
  return new NativeBackupService();
}

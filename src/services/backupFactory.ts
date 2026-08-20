import type { BackupService } from './BackupService';
import { WebBackupService } from './BackupService.web';

export function createBackupService(): BackupService {
  return new WebBackupService();
}

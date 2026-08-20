import type { MediaService } from './MediaService';
import { WebMediaService } from './MediaService.web';

export function createMediaService(): MediaService {
  return new WebMediaService();
}

import type { MediaService } from './MediaService';
import { NativeMediaService } from './MediaService.native';

export function createMediaService(): MediaService {
  return new NativeMediaService();
}

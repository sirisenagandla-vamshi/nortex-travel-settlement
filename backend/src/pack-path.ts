import { join } from 'path';

export function packDir() {
  return process.env.PACK_DIR || join(process.cwd(), '..', 'pack');
}

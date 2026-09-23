import { existsSync } from 'fs';
import { isAbsolute, join } from 'path';

export function packDir() {
  const fromEnv = process.env.PACK_DIR;
  const candidates = [
    fromEnv && isAbsolute(fromEnv) ? fromEnv : undefined,
    fromEnv ? join(process.cwd(), fromEnv) : undefined,
    fromEnv ? join(process.cwd(), '..', fromEnv) : undefined,
    join(process.cwd(), 'pack'),
    join(process.cwd(), '..', 'pack'),
    join(__dirname, '..', '..', 'pack'),
    join(__dirname, '..', '..', '..', 'pack'),
  ].filter((dir): dir is string => Boolean(dir));

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return fromEnv || join(process.cwd(), '..', 'pack');
}

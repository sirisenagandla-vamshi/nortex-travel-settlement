import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const src = join('frontend', 'dist');
if (!existsSync(src)) {
  throw new Error('frontend/dist missing — run the frontend build first');
}

for (const dest of [join('backend', 'public'), 'public']) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`copied frontend/dist -> ${dest}`);
}

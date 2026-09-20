import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const src = join('frontend', 'dist');
const dest = join('backend', 'public');
if (!existsSync(src)) {
  throw new Error('frontend/dist missing — run the frontend build first');
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('copied frontend/dist -> backend/public');

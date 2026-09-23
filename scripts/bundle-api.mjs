import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const nestEntry = join(process.cwd(), 'backend', 'dist', 'vercel.js');
if (!existsSync(nestEntry)) {
  const distDir = join(process.cwd(), 'backend', 'dist');
  const listing = existsSync(distDir) ? readdirSync(distDir).join(', ') : 'missing';
  throw new Error(`backend/dist/vercel.js missing after nest build. dist contents: ${listing}`);
}

await build({
  entryPoints: ['scripts/vercel-api-entry.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'api/index.js',
  allowOverwrite: true,
  logLevel: 'info',
  external: ['@prisma/client'],
  resolveExtensions: ['.js', '.cjs', '.mjs', '.json'],
});

function copyIfExists(src, dest) {
  if (!existsSync(src)) return;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`copied ${src} -> ${dest}`);
}

copyIfExists(join('backend', 'node_modules', '.prisma'), join('api', 'node_modules', '.prisma'));
copyIfExists(join('backend', 'node_modules', '@prisma'), join('api', 'node_modules', '@prisma'));
copyIfExists('pack', join('api', 'pack'));

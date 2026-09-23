import { build } from 'esbuild';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { dirname, join } from 'path';

function findVercelJs(distDir) {
  if (!existsSync(distDir)) return null;
  const files = readdirSync(distDir, { recursive: true }).map((f) => String(f).replace(/\\/g, '/'));
  const match = files.find((f) => f === 'vercel.js' || f.endsWith('/vercel.js'));
  return match ? join(distDir, match) : null;
}

const distDir = join(process.cwd(), 'backend', 'dist');
const nestEntry = findVercelJs(distDir);
if (!nestEntry) {
  const listing = existsSync(distDir)
    ? readdirSync(distDir, { recursive: true }).join(', ')
    : 'missing';
  throw new Error(`Nest vercel.js missing after nest build. dist contents: ${listing}`);
}

const stableEntry = join(distDir, 'vercel.js');
if (nestEntry !== stableEntry) {
  mkdirSync(dirname(stableEntry), { recursive: true });
  copyFileSync(nestEntry, stableEntry);
  console.log('copied', nestEntry, '->', stableEntry);
}
console.log('bundling Nest from', stableEntry);

await build({
  entryPoints: ['scripts/vercel-api-entry.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'api/index.js',
  allowOverwrite: true,
  logLevel: 'info',
  external: [
    '@prisma/client',
    '.prisma/client',
    '@nestjs/microservices',
    '@nestjs/microservices/microservices-module',
    '@nestjs/websockets',
    '@nestjs/websockets/socket-module',
    'class-transformer/storage',
  ],
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
copyIfExists(join('backend', 'node_modules', '.prisma'), join('node_modules', '.prisma'));
copyIfExists(join('backend', 'node_modules', '@prisma'), join('node_modules', '@prisma'));
copyIfExists('pack', join('api', 'pack'));

import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

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

import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';
import { join } from 'path';
import { packDir } from './pack-path';

export function configureApp(app: NestExpressApplication) {
  const raw = process.env.CORS_ORIGINS;
  if (!raw || raw === '*') {
    app.enableCors({ origin: true });
  } else {
    const origins = raw.split(',').map((s) => s.trim()).filter(Boolean);
    app.enableCors({ origin: origins.length ? origins : true });
  }
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useStaticAssets(join(packDir(), 'receipts'), { prefix: '/receipts/' });

  const publicDir = join(process.cwd(), 'public');
  if (existsSync(publicDir)) {
    app.useStaticAssets(publicDir);
    const http = app.getHttpAdapter().getInstance();
    http.get(/^(?!\/api|\/receipts).*/, (_req, res) => {
      res.sendFile(join(publicDir, 'index.html'));
    });
  }
}

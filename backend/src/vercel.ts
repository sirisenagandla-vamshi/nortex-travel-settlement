import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './create-app';

let cached: ((req: unknown, res: unknown) => unknown) | undefined;

export async function createNestServer() {
  if (cached) return cached;
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);
  await app.init();
  cached = app.getHttpAdapter().getInstance();
  return cached;
}

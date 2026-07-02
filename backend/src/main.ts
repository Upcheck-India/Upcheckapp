import { webcrypto } from 'crypto';
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = webcrypto;
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { TypeORMExceptionFilter } from './common/filters/typeorm-exception.filter';
import { assertSchemaReady } from './common/schema-guard';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Behind Render's reverse proxy, trust the X-Forwarded-For chain so
  // ThrottlerGuard (and req.ip generally) keys by real client IP instead of
  // the proxy's IP for every request — otherwise all users share one bucket.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Fail fast (with a loud log) if the DB schema is missing — prevents the
  // app from limping into per-request "relation does not exist" errors after
  // a fresh-DB deploy where migrations did not run.
  await assertSchemaReady(app.get(DataSource));

  app.use(cookieParser());

  const corsOrigin = process.env.CORS_ORIGIN || '*';
  app.enableCors({
    origin: corsOrigin === '*' ? true : corsOrigin.split(','),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: corsOrigin !== '*',
  });
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }));

  app.useGlobalFilters(new TypeORMExceptionFilter());

  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend listening on 0.0.0.0:${port}`);
  console.log(`CORS origin: ${corsOrigin}`);
}
bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});

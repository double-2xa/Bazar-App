import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { BRAND } from '@doublea/shared';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';
import helmet from 'helmet';
import { configuredCorsOrigins } from './config/environment';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(json({ limit: process.env.HTTP_BODY_LIMIT || '256kb' }));
  app.use(urlencoded({ extended: false, limit: process.env.HTTP_BODY_LIMIT || '256kb' }));
  const uploadsDirectory = resolve(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDirectory, {
    prefix: '/api/uploads/',
    maxAge: '1y',
    immutable: true,
    dotfiles: 'deny',
    index: false,
  });
  // Keep old image URLs working while clients and stored catalog records migrate
  // to the API-prefixed route used by production ingress configurations.
  app.useStaticAssets(uploadsDirectory, {
    prefix: '/uploads/',
    maxAge: '1y',
    immutable: true,
    dotfiles: 'deny',
    index: false,
  });
  app.enableCors({
    origin: configuredCorsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Guest-Order-Token',
    ],
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const port = process.env.API_PORT || 3001;
  const server = await app.listen(port);
  server.requestTimeout = Number(process.env.HTTP_REQUEST_TIMEOUT_MS || 30000);
  server.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 15000);
  server.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || 5000);
  console.log(`${BRAND.shopName} API running on http://localhost:${port}/api`);
}
bootstrap();

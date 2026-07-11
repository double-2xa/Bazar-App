import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { BRAND } from '@doublea/shared';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix('api');
  const port = process.env.API_PORT || 3001;
  await app.listen(port);
  console.log(`${BRAND.shopName} API running on http://localhost:${port}/api`);
}
bootstrap();

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function assertProductionSecrets() {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (isProd) {
      throw new Error('JWT_SECRET must be set to a strong value (32+ chars) in production');
    }
    Logger.warn('JWT_SECRET is weak or missing — acceptable only for local development');
  }
  if (isProd && /demo|change_me|dev_secret/i.test(secret || '')) {
    throw new Error('JWT_SECRET looks like a placeholder — refuse to start in production');
  }
}

async function bootstrap() {
  assertProductionSecrets();

  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swaggerEnabled = process.env.SWAGGER_ENABLED === 'true' || !isProd;
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('FSP IT Career API')
      .setDescription('API платформы обратного подбора IT-специалистов')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT || 3001);
  await app.listen(port, process.env.API_HOST || '0.0.0.0');
  Logger.log(`API listening on port ${port}${swaggerEnabled ? ' · docs /api/docs' : ''}`);
}

bootstrap();

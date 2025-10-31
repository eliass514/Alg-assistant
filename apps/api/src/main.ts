import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

import { AppModule } from '@app/app.module';
import { AppConfig } from '@config/app.config';
import { CorsConfig } from '@config/cors.config';
import { PrismaService } from '@prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.flushLogs();

  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app', { infer: true });
  const corsConfig = configService.get<CorsConfig>('cors', { infer: true });

  if (corsConfig?.enabled) {
    app.enableCors({
      origin: corsConfig.origins,
      credentials: corsConfig.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
      exposedHeaders: [
        'X-Total-Count',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new LoggerErrorInterceptor());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const globalPrefix = appConfig?.globalPrefix ?? 'api';
  app.setGlobalPrefix(globalPrefix);

  const documentConfig = new DocumentBuilder()
    .setTitle(appConfig?.name ?? 'API')
    .setDescription('REST API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, documentConfig);
  SwaggerModule.setup('docs', app, document);

  const port = appConfig?.port ?? 3000;
  await app.listen(port);

  const url = await app.getUrl();
  const logger = app.get(Logger);
  logger.log({ msg: 'Server is running', url }, 'Bootstrap');
  logger.log(
    { msg: 'Swagger UI available', docsUrl: `${url.replace(/\/$/, '')}/docs` },
    'Bootstrap',
  );
}

void bootstrap();

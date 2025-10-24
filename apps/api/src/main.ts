import 'reflect-metadata';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from '@app/app.module';
import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { LoggingInterceptor } from '@common/interceptors/logging.interceptor';
import { AppConfig } from '@config/app.config';
import { PrismaService } from '@prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prismaService = app.get(PrismaService);
  await prismaService.enableShutdownHooks(app);

  const configService = app.get(ConfigService);
  const appConfig = configService.get<AppConfig>('app', { infer: true });

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
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

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
  Logger.log(`Server is running at ${url}`, 'Bootstrap');
  Logger.log(`Swagger UI available at ${url.replace(/\/$/, '')}/docs`, 'Bootstrap');
}

void bootstrap();

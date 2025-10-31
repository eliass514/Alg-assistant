import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

import { HttpExceptionFilter } from '@common/filters/http-exception.filter';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import appConfig, { AppConfig } from '@config/app.config';
import authConfig from '@config/auth.config';
import storageConfig from '@config/storage.config';
import llmConfig from '@config/llm.config';
import corsConfig from '@config/cors.config';
import rateLimitConfig, { RateLimitConfig } from '@config/rate-limit.config';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { AiModule } from '@modules/ai/ai.module';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DocumentsModule } from '@modules/documents/documents.module';
import { DocumentTemplatesModule } from '@modules/document-templates/document-templates.module';
import { DocumentUploadsModule } from '@modules/document-uploads/document-uploads.module';
import { DocumentVerificationModule } from '@modules/document-verification/document-verification.module';
import { ServicesModule } from '@modules/services/services.module';
import { UsersModule } from '@modules/users/users.module';
import { AdminModule } from '@modules/admin/admin.module';
import { PrismaModule } from '@prisma/prisma.module';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFilePath = Array.from(
  new Set([
    `.env.${nodeEnv}.local`,
    `.env.${nodeEnv}`,
    '.env.local',
    '.env',
    join(__dirname, '..', '..', `.env.${nodeEnv}.local`),
    join(__dirname, '..', '..', `.env.${nodeEnv}`),
    join(__dirname, '..', '..', '.env.local'),
    join(__dirname, '..', '..', '.env'),
  ]),
);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath,
      load: [appConfig, authConfig, storageConfig, llmConfig, corsConfig, rateLimitConfig],
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const appConfig = configService.get<AppConfig>('app', { infer: true });
        const level = process.env.LOG_LEVEL ?? (appConfig?.env === 'production' ? 'info' : 'debug');

        return {
          pinoHttp: {
            level,
            autoLogging: {
              ignore: (req) => {
                const url = (req as { url?: string }).url ?? '';
                return url.includes('/health') || url.includes('/docs');
              },
            },
            customProps: (req) => {
              const castedReq = req as { id?: string; user?: { id?: string } };
              return {
                context: 'HTTP',
                requestId: castedReq.id,
                userId: castedReq.user?.id,
              };
            },
            redact: {
              paths: ['req.headers.authorization', 'req.headers.cookie'],
              remove: true,
            },
            genReqId: (req) => {
              const castedReq = req as { id?: string };
              if (castedReq.id) {
                return castedReq.id;
              }

              castedReq.id = randomUUID();
              return castedReq.id;
            },
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const rateLimitConf = configService.get<RateLimitConfig>('rateLimit', { infer: true });

        return {
          throttlers: [
            {
              ttl: (rateLimitConf?.ttl ?? 60) * 1000,
              limit: rateLimitConf?.limit ?? 100,
            },
          ],
        };
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    AppointmentsModule,
    DocumentsModule,
    DocumentTemplatesModule,
    DocumentUploadsModule,
    DocumentVerificationModule,
    AiModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

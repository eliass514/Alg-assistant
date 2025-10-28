import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import appConfig from '@config/app.config';
import authConfig from '@config/auth.config';
import storageConfig from '@config/storage.config';
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
import { PrismaModule } from '@prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env', '.env.local', '../../.env', '../../.env.local'],
      load: [appConfig, authConfig, storageConfig],
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
  ],
  controllers: [AppController],
  providers: [
    AppService,
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

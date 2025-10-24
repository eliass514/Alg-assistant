import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import appConfig from '@config/app.config';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { AiModule } from '@modules/ai/ai.module';
import { AppointmentsModule } from '@modules/appointments/appointments.module';
import { AuthModule } from '@modules/auth/auth.module';
import { DocumentsModule } from '@modules/documents/documents.module';
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
      load: [appConfig],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ServicesModule,
    AppointmentsModule,
    DocumentsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

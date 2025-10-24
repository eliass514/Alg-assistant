import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '@config/app.config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    const appConfig = this.configService.get<AppConfig>('app', { infer: true });

    return {
      status: 'ok',
      name: appConfig?.name ?? 'Acme API',
      environment: appConfig?.env ?? 'development',
      timestamp: new Date().toISOString(),
    };
  }
}

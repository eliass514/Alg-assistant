import { registerAs } from '@nestjs/config';

export interface AppConfig {
  name: string;
  env: string;
  port: number;
  globalPrefix: string;
}

export default registerAs<AppConfig>('app', () => {
  const parsedPort = Number.parseInt(process.env.PORT ?? '3000', 10);

  return {
    name: process.env.APP_NAME ?? 'Acme API',
    env: process.env.NODE_ENV ?? 'development',
    port: Number.isNaN(parsedPort) ? 3000 : parsedPort,
    globalPrefix: process.env.GLOBAL_PREFIX ?? 'api',
  };
});

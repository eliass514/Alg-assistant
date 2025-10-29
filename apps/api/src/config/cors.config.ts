import { registerAs } from '@nestjs/config';

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
  credentials: boolean;
}

export default registerAs<CorsConfig>('cors', () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOriginsEnv = process.env.CORS_ORIGINS;

  let origins: string[] = [];

  if (corsOriginsEnv) {
    origins = corsOriginsEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  } else if (isProduction) {
    throw new Error('CORS_ORIGINS must be set in production environment');
  } else {
    origins = ['http://localhost:3000', 'http://localhost:8080'];
  }

  return {
    enabled: true,
    origins,
    credentials: true,
  };
});

import { registerAs } from '@nestjs/config';

export interface AuthConfig {
  accessTokenSecret: string;
  accessTokenExpiresIn: number;
  refreshTokenSecret: string;
  refreshTokenExpiresIn: number;
  audience: string;
  issuer: string;
  bcryptSaltRounds: number;
  defaultUserRole: string;
}

const toNumberOrDefault = (value: string | undefined, defaultValue: number) => {
  const parsed = Number.parseInt(value ?? `${defaultValue}`, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

export default registerAs<AuthConfig>('auth', () => {
  const accessTokenExpiresIn = toNumberOrDefault(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN, 900);
  const refreshTokenExpiresIn = toNumberOrDefault(
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,
    60 * 60 * 24 * 7,
  );
  const bcryptSaltRounds = toNumberOrDefault(process.env.BCRYPT_SALT_ROUNDS, 10);

  return {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET ?? 'change-me-access',
    accessTokenExpiresIn,
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET ?? 'change-me-refresh',
    refreshTokenExpiresIn,
    audience: process.env.JWT_AUDIENCE ?? 'acme.api',
    issuer: process.env.JWT_ISSUER ?? 'acme.api',
    bcryptSaltRounds,
    defaultUserRole: process.env.DEFAULT_USER_ROLE ?? 'client',
  };
});

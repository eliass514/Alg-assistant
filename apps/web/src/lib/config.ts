/**
 * Application Configuration
 *
 * This module provides typed access to environment variables for the Next.js frontend.
 *
 * Environment Variable Types:
 * - Server-side only: Available during SSR, API routes, and build time
 * - Client-side: Variables prefixed with NEXT_PUBLIC_* are exposed to the browser
 *
 * Security Note: Never use NEXT_PUBLIC_ prefix for secrets or sensitive data.
 * These variables are embedded in the browser bundle and visible to all users.
 */

interface Config {
  /**
   * Runtime environment (development, production, test)
   * Available: Server-side only
   */
  nodeEnv: string;

  /**
   * Server-side API base URL for SSR and API routes
   * Example: http://backend:3000/api (Docker) or http://localhost:3001/api (local)
   * Available: Server-side only
   */
  apiBaseUrl: string;

  /**
   * Client-side API base URL for browser requests
   * Example: http://localhost:8080/api (Docker proxy) or https://api.example.com (production)
   * Available: Client-side and server-side
   */
  publicApiBaseUrl: string;
}

/**
 * Returns the server-side API base URL
 * Used for SSR, Server Components, and API routes
 *
 * @throws {Error} If API_BASE_URL is not configured
 */
function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getApiBaseUrl(): string {
  const rawUrl = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
  const url = rawUrl?.trim();

  if (!url) {
    throw new Error(
      'API_BASE_URL or NEXT_PUBLIC_API_BASE_URL must be set. ' +
        'See docs/ENVIRONMENT_VARIABLES.md for configuration details.',
    );
  }

  return normalizeUrl(url);
}

/**
 * Returns the client-side API base URL
 * Used for browser API calls
 *
 * @throws {Error} If NEXT_PUBLIC_API_BASE_URL is not configured
 */
function getPublicApiBaseUrl(): string {
  const rawUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL;
  const url = rawUrl?.trim();

  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_API_BASE_URL must be set for client-side API calls. ' +
        'See docs/ENVIRONMENT_VARIABLES.md for configuration details.',
    );
  }

  return normalizeUrl(url);
}

/**
 * Application configuration object
 * Provides typed access to all environment variables
 */
export const config: Config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiBaseUrl: getApiBaseUrl(),
  publicApiBaseUrl: getPublicApiBaseUrl(),
};

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return config.nodeEnv === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return config.nodeEnv === 'development';
}

/**
 * Check if running in test environment
 */
export function isTest(): boolean {
  return config.nodeEnv === 'test';
}

import { config as loadEnv } from 'dotenv';
import { join } from 'path';

// Load environment variables from the project root if available
loadEnv({ path: join(__dirname, '..', '..', '.env') });
loadEnv({ path: join(__dirname, '..', '..', '.env.test') });

process.env.NODE_ENV = 'test';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

jest.setTimeout(30000);

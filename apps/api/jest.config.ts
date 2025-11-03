import type { Config } from 'jest';

const config: Config = {
  rootDir: __dirname,
  testEnvironment: 'node',
  preset: 'ts-jest',
  testMatch: ['<rootDir>/src/**/*.spec.ts', '<rootDir>/test/**/*.e2e-spec.ts'],
  moduleFileExtensions: ['js', 'json', 'ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup-e2e.ts'],
  transformIgnorePatterns: ['/node_modules/(?!uuid|\\.pnpm/uuid)'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        isolatedModules: true,
      },
    ],
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@prisma/(?!client)(.*)$': '<rootDir>/src/prisma/$1',
    '^@acme/shared-dto$': '<rootDir>/../../packages/shared-dto/src',
    '^@acme/shared-dto/(.*)$': '<rootDir>/../../packages/shared-dto/src/$1',
  },
  collectCoverage: false,
};

export default config;

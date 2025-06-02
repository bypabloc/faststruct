/**
 * Configuración de Jest para FastStruct
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/test/**',
    '!src/templates/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/types$': '<rootDir>/src/types/index',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/services/(.*)$': '<rootDir>/src/services/$1',
    '^@/managers/(.*)$': '<rootDir>/src/managers/$1',
    '^@/commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/constants$': '<rootDir>/src/constants/index',
    '^@/constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@/providers/(.*)$': '<rootDir>/src/providers/$1',
    '^@/templates$': '<rootDir>/src/templates/index',
    '^@/templates/(.*)$': '<rootDir>/src/templates/$1',
    '^@/logger$': '<rootDir>/src/logger',
    '^vscode$': '<rootDir>/tests/__mocks__/vscode.ts'
  },
  modulePathIgnorePatterns: ['<rootDir>/out/'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowJs: true
      }
    }]
  }
};
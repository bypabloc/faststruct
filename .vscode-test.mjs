import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'unitTests',
    files: 'out/integration-tests/**/*.test.js',
    version: 'stable',
    workspaceFolder: './test-workspace',
    mocha: {
      ui: 'tdd',
      timeout: 20000,
      color: true,
    },
    // Disable extensions except our own for isolated testing
    launchArgs: ['--disable-extensions'],
  },
  {
    label: 'integrationTests',
    files: 'out/integration-tests/**/*.integration.test.js',
    version: 'stable',
    workspaceFolder: './test-workspace',
    mocha: {
      ui: 'tdd',
      timeout: 30000,
      color: true,
    },
  }
]);
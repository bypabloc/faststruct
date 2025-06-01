/**
 * Configuración global para los tests de FastStruct
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { jest } from '@jest/globals';

// Configurar timeout global para tests
jest.setTimeout(10000);

// Mock de vscode global
(global as any).vscode = require('./__mocks__/vscode');

// Limpiar mocks después de cada test
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

// Suprimir logs durante tests a menos que se especifique
if (process.env.SHOW_TEST_LOGS !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}
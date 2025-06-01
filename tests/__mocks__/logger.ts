/**
 * Mock del Logger para testing
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { jest } from '@jest/globals';

export class Logger {
  static debug = jest.fn();
  static info = jest.fn();
  static warn = jest.fn();
  static error = jest.fn();
  static clearOutputChannel = jest.fn();
  static showOutputChannel = jest.fn();
  static logUserAction = jest.fn();
  static logMessage = jest.fn();
}
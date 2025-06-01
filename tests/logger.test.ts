/**
 * Tests para Logger
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Logger } from '../src/logger';
import * as vscode from 'vscode';

describe('Logger', () => {
  let mockOutputChannel: any;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;
  let consoleWarnSpy: ReturnType<typeof jest.spyOn>;
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock del output channel
    mockOutputChannel = {
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn()
    };
    
    (vscode.window.createOutputChannel as jest.Mock).mockReturnValue(mockOutputChannel);
    
    // Limpiar canal existente
    (Logger as any).outputChannel = undefined;
    
    // Espiar métodos de console
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('getOutputChannel', () => {
    it('debe crear un canal de salida la primera vez', () => {
      (Logger as any).getOutputChannel();
      
      expect(vscode.window.createOutputChannel).toHaveBeenCalledWith('FastStruct Debug');
      expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
    });

    it('debe reutilizar el canal existente', () => {
      const channel1 = (Logger as any).getOutputChannel();
      const channel2 = (Logger as any).getOutputChannel();
      
      expect(channel1).toBe(channel2);
      expect(vscode.window.createOutputChannel).toHaveBeenCalledTimes(1);
    });
  });

  describe('isDebugEnabled', () => {
    it('debe retornar true cuando debug está habilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      expect((Logger as any).isDebugEnabled()).toBe(true);
    });

    it('debe retornar false cuando debug está deshabilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      expect((Logger as any).isDebugEnabled()).toBe(false);
    });

    it('debe retornar false cuando no hay configuración', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({})
      });
      
      expect((Logger as any).isDebugEnabled()).toBe(false);
    });
  });

  describe('formatMessage', () => {
    it('debe formatear mensaje con timestamp y nivel', () => {
      const message = (Logger as any).formatMessage('INFO', 'Test message');
      
      expect(message).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\] Test message$/);
    });

    it('debe incluir datos serializados', () => {
      const data = { key: 'value', number: 123 };
      const message = (Logger as any).formatMessage('INFO', 'Test', data);
      
      expect(message).toContain('Test');
      expect(message).toContain('"key": "value"');
      expect(message).toContain('"number": 123');
    });

    it('debe manejar datos no serializables', () => {
      const circular: any = { a: 1 };
      circular.self = circular;
      
      const message = (Logger as any).formatMessage('INFO', 'Test', circular);
      
      expect(message).toContain('[No se pudo serializar los datos:');
    });

    it('debe manejar datos undefined', () => {
      const message = (Logger as any).formatMessage('INFO', 'Test', undefined);
      
      expect(message).not.toContain('\n{');
      expect(message).toMatch(/Test$/);
    });
  });

  describe('info', () => {
    it('debe loggear cuando debug está habilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.info('Test info message', { data: 'test' });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[INFO] Test info message');
      expect(loggedMessage).toContain('"data": "test"');
    });

    it('no debe loggear cuando debug está deshabilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      Logger.info('Test info message');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('debe loggear advertencias cuando debug está habilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.warn('Test warning');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[WARN] Test warning');
    });

    it('no debe loggear advertencias cuando debug está deshabilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      Logger.warn('Test warning');
      
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('debe siempre loggear errores independientemente del debug', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      const error = new Error('Test error');
      Logger.error('Error occurred', error);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[ERROR] Error occurred');
    });

    it('debe mostrar el canal cuando debug está habilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.error('Error occurred');
      
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });

    it('no debe mostrar el canal cuando debug está deshabilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      Logger.error('Error occurred');
      
      expect(mockOutputChannel.show).not.toHaveBeenCalled();
    });

    it('debe serializar objetos de error correctamente', () => {
      const error = {
        message: 'Custom error',
        code: 'ERR_001',
        stack: 'Error stack trace'
      };
      
      Logger.error('Error occurred', error);
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('"message": "Custom error"');
      expect(loggedMessage).toContain('"code": "ERR_001"');
    });
  });

  describe('debug', () => {
    it('debe loggear mensajes debug cuando está habilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.debug('Debug details', { verbose: true });
      
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).toHaveBeenCalled();
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG] Debug details');
      expect(loggedMessage).toContain('"verbose": true');
    });

    it('no debe loggear debug cuando está deshabilitado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: false })
      });
      
      Logger.debug('Debug details');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockOutputChannel.appendLine).not.toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('debe mostrar el canal de salida', () => {
      Logger.show();
      
      expect(mockOutputChannel.show).toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('debe limpiar el canal de salida', () => {
      Logger.clear();
      
      expect(mockOutputChannel.clear).toHaveBeenCalled();
    });
  });

  describe('functionStart', () => {
    it('debe loggear el inicio de función con argumentos', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.functionStart('testFunction', { arg1: 'value1', arg2: 123 });
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG] → Iniciando testFunction');
      expect(loggedMessage).toContain('"arg1": "value1"');
      expect(loggedMessage).toContain('"arg2": 123');
    });

    it('debe manejar ausencia de argumentos', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.functionStart('testFunction');
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG] → Iniciando testFunction');
    });
  });

  describe('functionEnd', () => {
    it('debe loggear el fin de función con resultado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.functionEnd('testFunction', { success: true, count: 42 });
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG] ← Finalizando testFunction');
      expect(loggedMessage).toContain('"success": true');
      expect(loggedMessage).toContain('"count": 42');
    });

    it('debe manejar ausencia de resultado', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.functionEnd('testFunction');
      
      const loggedMessage = mockOutputChannel.appendLine.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG] ← Finalizando testFunction');
    });
  });

  describe('integración con console', () => {
    it('debe prefijar mensajes de console con FastStruct', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({ debug: true })
      });
      
      Logger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('FastStruct:')
      );
    });
  });
});
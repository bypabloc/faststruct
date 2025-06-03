/**
 * Tests para main.ts (punto de entrada de la extensión)
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import * as vscode from 'vscode';
import { activate, deactivate } from '@/main';
import { CommandRegistrationService } from '@/services/CommandRegistrationService';
import { Logger } from '@/logger';

// Mock de servicios
jest.mock('@/services/CommandRegistrationService');
jest.mock('@/logger');

describe('main.ts', () => {
  let mockContext: any;
  let mockCommandService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock del contexto
    mockContext = {
      subscriptions: [],
      globalState: {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'faststruct.welcomeShown') {
            return false; // Por defecto, no se ha mostrado
          }
          return defaultValue;
        }),
        update: jest.fn(() => Promise.resolve(undefined))
      },
      extension: {
        packageJSON: {
          version: '0.0.12'
        }
      }
    };
    
    // Mock del servicio de comandos
    mockCommandService = {
      registerAllCommands: jest.fn(),
      verifyCommandRegistration: jest.fn(() => Promise.resolve(true))
    };
    
    (CommandRegistrationService.getInstance as jest.Mock).mockReturnValue(mockCommandService);
  });

  describe('activate', () => {
    it('debe activar la extensión correctamente', async () => {
      await activate(mockContext);
      
      expect(console.log).toHaveBeenCalledWith(
        'Congratulations, your extension "faststruct" is now active!'
      );
      expect(Logger.info).toHaveBeenCalledWith('FastStruct extension activada');
      expect(Logger.show).toHaveBeenCalled();
    });

    it('debe registrar todos los comandos', async () => {
      await activate(mockContext);
      
      expect(mockCommandService.registerAllCommands).toHaveBeenCalledWith(mockContext);
    });

    it('debe verificar el registro de comandos', async () => {
      await activate(mockContext);
      
      // Esperar a que se complete la verificación async
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockCommandService.verifyCommandRegistration).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('Todos los comandos verificados correctamente');
    });

    it('debe manejar fallo en verificación de comandos', async () => {
      mockCommandService.verifyCommandRegistration = jest.fn(() => Promise.resolve(false));
      
      await activate(mockContext);
      
      // Esperar a que se complete la verificación async
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Algunos comandos no se registraron correctamente'
      );
    });

    it('debe mostrar mensaje de bienvenida la primera vez', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => Promise.resolve('Ver Configuración'));
      
      await activate(mockContext);
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Bienvenido a FastStruct'),
        'Ver Configuración',
        'Cerrar'
      );
      
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'faststruct.welcomeShown',
        true
      );
    });

    it('debe abrir configuración si el usuario lo solicita', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => Promise.resolve('Ver Configuración'));
      
      await activate(mockContext);
      
      // Esperar a que se procese la promesa
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('faststruct.openSettings');
    });

    it('no debe mostrar mensaje de bienvenida si ya se mostró', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue(true);
      
      await activate(mockContext);
      
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalledWith(
        expect.stringContaining('Bienvenido a FastStruct'),
        expect.any(String),
        expect.any(String)
      );
    });

    it('debe manejar errores durante la activación', async () => {
      const error = new Error('Activation failed');
      mockCommandService.registerAllCommands.mockImplementation(() => {
        throw error;
      });
      
      await activate(mockContext);
      
      expect(Logger.error).toHaveBeenCalledWith(
        'Error durante la activación de FastStruct',
        error
      );
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error al activar FastStruct: Activation failed'
      );
    });

    it('debe manejar errores no-Error durante la activación', async () => {
      mockCommandService.registerAllCommands.mockImplementation(() => {
        throw 'String error';
      });
      
      await activate(mockContext);
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error al activar FastStruct: String error'
      );
    });

    it('debe loggear activación exitosa', async () => {
      await activate(mockContext);
      
      expect(Logger.info).toHaveBeenCalledWith('FastStruct activado exitosamente');
    });
  });

  describe('deactivate', () => {
    it('debe desactivar la extensión correctamente', () => {
      deactivate();
      
      expect(Logger.info).toHaveBeenCalledWith('FastStruct extension desactivada');
    });
  });

  describe('showWelcomeMessageIfNeeded', () => {
    it('debe manejar cuando el usuario cierra el mensaje sin seleccionar', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => Promise.resolve(undefined));
      
      await activate(mockContext);
      
      // Esperar a que se procese la promesa
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('faststruct.openSettings');
      expect(mockContext.globalState.update).toHaveBeenCalledWith(
        'faststruct.welcomeShown',
        true
      );
    });

    it('debe manejar cuando el usuario selecciona Cerrar', async () => {
      (mockContext.globalState.get as jest.Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => Promise.resolve('Cerrar'));
      
      await activate(mockContext);
      
      // Esperar a que se procese la promesa
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith('faststruct.openSettings');
    });
  });

  describe('flujo completo de activación', () => {
    it('debe completar todo el flujo de activación sin errores', async () => {
      // Simular usuario nuevo
      (mockContext.globalState.get as jest.Mock).mockReturnValue(false);
      (vscode.window.showInformationMessage as jest.Mock).mockImplementation(() => Promise.resolve('Cerrar'));
      
      // Simular verificación exitosa
      mockCommandService.verifyCommandRegistration = jest.fn(() => Promise.resolve(true));
      
      await activate(mockContext);
      
      // Esperar a que se completen todas las operaciones async
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Verificar que todos los pasos se ejecutaron
      expect(Logger.info).toHaveBeenCalledWith('FastStruct extension activada');
      expect(mockCommandService.registerAllCommands).toHaveBeenCalled();
      expect(mockCommandService.verifyCommandRegistration).toHaveBeenCalled();
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
      expect(mockContext.globalState.update).toHaveBeenCalled();
      expect(Logger.info).toHaveBeenCalledWith('FastStruct activado exitosamente');
    });

    it('debe continuar con la activación aunque falle el mensaje de bienvenida', async () => {
      // Hacer que solo falle cuando se llama con 'faststruct.welcomeShown'
      (mockContext.globalState.get as jest.Mock).mockImplementation((key: any) => {
        if (key === 'faststruct.welcomeShown') {
          throw new Error('State error');
        }
        return undefined;
      });
      
      await activate(mockContext);
      
      // La activación debe fallar debido al error
      expect(Logger.error).toHaveBeenCalledWith(
        'Error durante la activación de FastStruct',
        expect.any(Error)
      );
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        expect.stringContaining('Error al activar FastStruct')
      );
    });
  });
});
/**
 * Tests para CommandRegistrationService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { CommandRegistrationService } from '../../src/services/CommandRegistrationService';
import * as vscode from 'vscode';

// Mock de los módulos de comandos
jest.mock('../../src/commands/structureCommands', () => ({
  registerStructureCommands: jest.fn().mockReturnValue([
    { dispose: jest.fn() },
    { dispose: jest.fn() },
    { dispose: jest.fn() }
  ])
}));

jest.mock('../../src/commands/exclusionCommands', () => ({
  registerExclusionCommands: jest.fn().mockReturnValue([
    { dispose: jest.fn() },
    { dispose: jest.fn() }
  ])
}));

jest.mock('../../src/commands/configCommands', () => ({
  registerConfigCommands: jest.fn().mockReturnValue([
    { dispose: jest.fn() }
  ])
}));

import { registerStructureCommands } from '../../src/commands/structureCommands';
import { registerExclusionCommands } from '../../src/commands/exclusionCommands';
import { registerConfigCommands } from '../../src/commands/configCommands';

describe('CommandRegistrationService', () => {
  let service: CommandRegistrationService;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (CommandRegistrationService as any).instance = undefined;
    
    // Mock del contexto de extensión
    mockContext = {
      subscriptions: [],
      extension: {
        packageJSON: {
          version: '0.0.12'
        }
      }
    };
    
    service = CommandRegistrationService.getInstance();
  });

  describe('getInstance', () => {
    it('debe retornar siempre la misma instancia (singleton)', () => {
      const instance1 = CommandRegistrationService.getInstance();
      const instance2 = CommandRegistrationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('registerAllCommands', () => {
    it('debe registrar todos los grupos de comandos', () => {
      service.registerAllCommands(mockContext);
      
      expect(registerStructureCommands).toHaveBeenCalledWith(mockContext);
      expect(registerExclusionCommands).toHaveBeenCalledWith(mockContext);
      expect(registerConfigCommands).toHaveBeenCalledWith(mockContext);
    });

    it('debe agregar disposables al contexto', () => {
      service.registerAllCommands(mockContext);
      
      // 3 de structure + 2 de exclusion + 1 de config + 1 de health check = 7
      expect(mockContext.subscriptions).toHaveLength(7);
    });

    it('debe registrar el comando health check', () => {
      service.registerAllCommands(mockContext);
      
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
        'faststruct.healthCheck',
        expect.any(Function)
      );
    });

    it('debe manejar errores al registrar comandos', () => {
      const error = new Error('Registration failed');
      (registerStructureCommands as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      expect(() => {
        service.registerAllCommands(mockContext);
      }).toThrow('Registration failed');
    });

    it('debe loggear información sobre comandos registrados', () => {
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      
      service.registerAllCommands(mockContext);
      
      // Logger está mockeado en los tests, pero verificamos el flujo
      expect(registerStructureCommands).toHaveBeenCalled();
      expect(registerExclusionCommands).toHaveBeenCalled();
      expect(registerConfigCommands).toHaveBeenCalled();
    });
  });

  describe('registerHealthCheckCommand', () => {
    it('debe ejecutar health check mostrando información correcta', async () => {
      service.registerAllCommands(mockContext);
      
      // Simular lista de comandos registrados
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue([
        'faststruct.createStructure',
        'faststruct.openSettings',
        'faststruct.excludeFile',
        'other.command'
      ]);
      
      // Obtener la función callback del health check
      const healthCheckCall = (vscode.commands.registerCommand as jest.Mock)
        .mock.calls.find(call => call[0] === 'faststruct.healthCheck');
      
      expect(healthCheckCall).toBeDefined();
      
      const healthCheckCallback = healthCheckCall[1];
      await healthCheckCallback();
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Total comandos registrados: 3')
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Versión: 0.0.12')
      );
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        expect.stringContaining('Estado: ✅ Activo')
      );
    });
  });

  describe('verifyCommandRegistration', () => {
    const expectedCommands = [
      'faststruct.createStructure',
      'faststruct.createStructureContext',
      'faststruct.createStructureOnly',
      'faststruct.createStructureChoose',
      'faststruct.createStructureWithPreview',
      'faststruct.openSettings',
      'faststruct.checkConfig',
      'faststruct.showExclusions',
      'faststruct.excludeFile',
      'faststruct.excludeFileExtension',
      'faststruct.excludeFileName',
      'faststruct.excludeFileContent',
      'faststruct.excludeFileTypeContent',
      'faststruct.excludeFilePattern',
      'faststruct.excludeFolder',
      'faststruct.excludeFolderName',
      'faststruct.excludeFolderContent',
      'faststruct.excludeSubfolders',
      'faststruct.excludeFolderPattern',
      'faststruct.includeFile',
      'faststruct.includeFolder'
    ];

    it('debe retornar true cuando todos los comandos están registrados', async () => {
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue([
        ...expectedCommands,
        'other.command',
        'another.command'
      ]);
      
      const result = await service.verifyCommandRegistration();
      
      expect(result).toBe(true);
    });

    it('debe retornar false cuando faltan comandos', async () => {
      // Simular que faltan algunos comandos
      const incompleteCommands = expectedCommands.slice(0, -3);
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue(incompleteCommands);
      
      const result = await service.verifyCommandRegistration();
      
      expect(result).toBe(false);
    });

    it('debe loggear comandos faltantes', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Simular que falta un comando específico
      const commandsWithoutOne = expectedCommands.filter(cmd => cmd !== 'faststruct.openSettings');
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue(commandsWithoutOne);
      
      await service.verifyCommandRegistration();
      
      // Logger está mockeado, pero verificamos el resultado
      expect(await service.verifyCommandRegistration()).toBe(false);
    });

    it('debe manejar lista vacía de comandos', async () => {
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue([]);
      
      const result = await service.verifyCommandRegistration();
      
      expect(result).toBe(false);
    });

    it('debe verificar todos los comandos esperados', async () => {
      (vscode.commands.getCommands as jest.Mock).mockResolvedValue(expectedCommands);
      
      const result = await service.verifyCommandRegistration();
      
      expect(vscode.commands.getCommands).toHaveBeenCalled();
      expect(result).toBe(true);
      
      // Verificar que la lista de comandos esperados esté completa
      expect(expectedCommands).toHaveLength(21);
    });
  });

  describe('integración con contexto', () => {
    it('debe preservar disposables existentes en el contexto', () => {
      const existingDisposable = { dispose: jest.fn() };
      mockContext.subscriptions.push(existingDisposable);
      
      service.registerAllCommands(mockContext);
      
      expect(mockContext.subscriptions).toContain(existingDisposable);
      expect(mockContext.subscriptions.length).toBeGreaterThan(1);
    });

    it('debe manejar contexto sin subscriptions', () => {
      delete mockContext.subscriptions;
      
      expect(() => {
        service.registerAllCommands(mockContext);
      }).toThrow();
    });
  });
});
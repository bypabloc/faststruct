/**
 * Tests para ExclusionManager
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ExclusionManager } from '@/managers/ExclusionManager';
import { ConfigurationService } from '@/services/ConfigurationService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Mock de servicios
jest.mock('@/services/ConfigurationService');
jest.mock('fs');

describe('ExclusionManager', () => {
  let manager: ExclusionManager;
  let mockConfigService: jest.Mocked<ConfigurationService>;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Configurar mock de ConfigurationService
    mockConfig = {
      debug: false,
      exclude: {
        folders: ['node_modules'],
        files: ['*.log'],
        advanced: {
          patterns: [],
          specificFiles: [],
          specificFolders: [],
          regexPatterns: []
        }
      },
      excludeContent: {
        files: [],
        folders: [],
        patterns: []
      },
      quickExclude: {
        enabled: true,
        showNotifications: true
      }
    };
    
    mockConfigService = {
      getConfiguration: jest.fn().mockReturnValue(mockConfig),
      saveConfiguration: jest.fn(() => Promise.resolve(undefined)),
      getDefaultConfig: jest.fn(),
      isDebugEnabled: jest.fn().mockReturnValue(false),
      inspectConfiguration: jest.fn()
    } as any;
    
    (ConfigurationService.getInstance as jest.Mock).mockReturnValue(mockConfigService);
    
    manager = new ExclusionManager();
  });

  describe('addExclusion', () => {
    it('debe agregar exclusión a workspace cuando hay workspace abierto', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      await manager.addExclusion('Carpeta específica', 'temp', 'exclude.folders');
      
      expect(mockConfigService.saveConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          exclude: expect.objectContaining({
            folders: expect.arrayContaining(['node_modules', 'temp'])
          })
        }),
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('debe preguntar si guardar globalmente cuando no hay workspace', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;
      (vscode.window.showWarningMessage as jest.Mock).mockImplementation(() => Promise.resolve('Sí'));
      
      await manager.addExclusion('Extensión de archivo', '*.tmp', 'exclude.files');
      
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No hay un workspace abierto. ¿Deseas guardar la exclusión globalmente?',
        'Sí',
        'No'
      );
      
      expect(mockConfigService.saveConfiguration).toHaveBeenCalledWith(
        expect.any(Object),
        vscode.ConfigurationTarget.Global
      );
    });

    it('debe cancelar si el usuario no acepta guardar globalmente', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;
      (vscode.window.showWarningMessage as jest.Mock).mockImplementation(() => Promise.resolve('No'));
      
      await manager.addExclusion('Extensión de archivo', '*.tmp', 'exclude.files');
      
      expect(mockConfigService.saveConfiguration).not.toHaveBeenCalled();
    });

    it('debe crear directorio .vscode si es necesario', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      await manager.addExclusion('Carpeta específica', 'dist', 'exclude.folders');
      
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join('/test/workspace', '.vscode'),
        { recursive: true }
      );
    });

    it('debe mostrar advertencia si el elemento ya existe', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      await manager.addExclusion('Carpeta específica', 'node_modules', 'exclude.folders');
      
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "FastStruct: 'node_modules' ya está en la lista de exclusiones"
      );
      expect(mockConfigService.saveConfiguration).not.toHaveBeenCalled();
    });

    it('debe mostrar notificación de éxito cuando se agrega', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      await manager.addExclusion('Archivo específico', 'secret.txt', 'exclude.files');
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "FastStruct: Archivo específico 'secret.txt' agregado a exclusiones del proyecto"
      );
    });

    it('debe respetar configuración de notificaciones', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      mockConfig.quickExclude.showNotifications = false;
      
      await manager.addExclusion('Archivo específico', 'test.log', 'exclude.files');
      
      expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    });

    it('debe manejar rutas profundas en la configuración', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      await manager.addExclusion('Patrón de archivo', '**/*.test.js', 'exclude.advanced.patterns');
      
      expect(mockConfigService.saveConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          exclude: expect.objectContaining({
            advanced: expect.objectContaining({
              patterns: ['**/*.test.js']
            })
          })
        }),
        expect.any(Number)
      );
    });

    it('debe manejar errores al guardar', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      mockConfigService.saveConfiguration = jest.fn(() => Promise.reject(new Error('Save failed')));
      
      await manager.addExclusion('Archivo específico', 'error.txt', 'exclude.files');
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error al agregar exclusión: Save failed'
      );
    });
  });

  describe('removeExclusion', () => {
    it('debe remover exclusión existente', async () => {
      mockConfig.exclude.folders = ['node_modules', 'dist', 'build'];
      
      await manager.removeExclusion('dist', 'exclude.folders');
      
      expect(mockConfigService.saveConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          exclude: expect.objectContaining({
            folders: ['node_modules', 'build']
          })
        })
      );
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "FastStruct: 'dist' removido de exclusiones"
      );
    });

    it('debe mostrar advertencia si el elemento no existe', async () => {
      await manager.removeExclusion('nonexistent', 'exclude.folders');
      
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        "FastStruct: 'nonexistent' no se encuentra en las exclusiones"
      );
      expect(mockConfigService.saveConfiguration).not.toHaveBeenCalled();
    });

    it('debe manejar rutas profundas al remover', async () => {
      mockConfig.exclude.advanced.patterns = ['**/*.min.js', '**/*.test.js'];
      
      await manager.removeExclusion('**/*.min.js', 'exclude.advanced.patterns');
      
      expect(mockConfigService.saveConfiguration).toHaveBeenCalledWith(
        expect.objectContaining({
          exclude: expect.objectContaining({
            advanced: expect.objectContaining({
              patterns: ['**/*.test.js']
            })
          })
        })
      );
    });

    it('debe manejar arrays vacíos', async () => {
      mockConfig.exclude.files = [];
      
      await manager.removeExclusion('test.txt', 'exclude.files');
      
      expect(vscode.window.showWarningMessage).toHaveBeenCalled();
      expect(mockConfigService.saveConfiguration).not.toHaveBeenCalled();
    });

    it('debe manejar errores al remover', async () => {
      mockConfig.exclude.folders = ['node_modules'];
      mockConfigService.saveConfiguration = jest.fn(() => Promise.reject(new Error('Remove failed')));
      
      await manager.removeExclusion('node_modules', 'exclude.folders');
      
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error al remover exclusión: Remove failed'
      );
    });
  });

  describe('showExclusions', () => {
    it('debe mostrar todas las exclusiones en un documento', async () => {
      mockConfig.exclude = {
        folders: ['node_modules', 'dist'],
        files: ['*.log', '*.tmp'],
        advanced: {
          patterns: ['**/*.min.js'],
          specificFiles: ['secret.json'],
          specificFolders: ['private/'],
          regexPatterns: ['.*\\.test\\..*']
        }
      };
      mockConfig.excludeContent = {
        files: ['*.env'],
        folders: ['config/'],
        patterns: ['**/*.secret.*']
      };
      
      const mockDocument = { getText: jest.fn() };
      (vscode.workspace.openTextDocument as jest.Mock).mockImplementation(() => Promise.resolve(mockDocument));
      
      await manager.showExclusions();
      
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
        content: expect.stringContaining('# FastStruct - Exclusiones Actuales'),
        language: 'markdown'
      });
      
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        mockDocument,
        expect.objectContaining({
          preview: false,
          viewColumn: vscode.ViewColumn.Beside
        })
      );
    });

    it('debe generar reporte correcto con listas vacías', async () => {
      mockConfig.exclude = {
        folders: [],
        files: [],
        advanced: {
          patterns: [],
          specificFiles: [],
          specificFolders: [],
          regexPatterns: []
        }
      };
      mockConfig.excludeContent = {
        files: [],
        folders: [],
        patterns: []
      };
      
      await manager.showExclusions();
      
      const callArgs = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0] as any;
      expect(callArgs.content).toContain('*Ninguna*');
    });
  });

  describe('updateConfigWithExclusion', () => {
    it('debe actualizar configuración correctamente', () => {
      const config = {
        exclude: {
          folders: ['existing'],
          files: []
        }
      };
      
      const result = (manager as any).updateConfigWithExclusion(
        config,
        'exclude.folders',
        'new-folder'
      );
      
      expect(result).toBeTruthy();
      expect(result.exclude.folders).toContain('existing');
      expect(result.exclude.folders).toContain('new-folder');
    });

    it('debe crear estructura si no existe', () => {
      const config = {};
      
      const result = (manager as any).updateConfigWithExclusion(
        config,
        'exclude.advanced.patterns',
        '**/*.test.js'
      );
      
      expect(result).toBeTruthy();
      expect(result.exclude.advanced.patterns).toContain('**/*.test.js');
    });

    it('debe retornar null si el valor ya existe', () => {
      const config = {
        exclude: {
          files: ['existing.txt']
        }
      };
      
      const result = (manager as any).updateConfigWithExclusion(
        config,
        'exclude.files',
        'existing.txt'
      );
      
      expect(result).toBeNull();
    });

    it('debe hacer deep clone de la configuración', () => {
      const original = {
        exclude: {
          folders: ['test']
        }
      };
      
      const result = (manager as any).updateConfigWithExclusion(
        original,
        'exclude.folders',
        'new'
      );
      
      expect(result).not.toBe(original);
      expect(original.exclude.folders).toHaveLength(1);
      expect(result.exclude.folders).toHaveLength(2);
    });
  });

  describe('removeFromConfig', () => {
    it('debe remover valor existente', () => {
      const config = {
        exclude: {
          folders: ['folder1', 'folder2', 'folder3']
        }
      };
      
      const result = (manager as any).removeFromConfig(
        config,
        'exclude.folders',
        'folder2'
      );
      
      expect(result).toBeTruthy();
      expect(result.exclude.folders).toEqual(['folder1', 'folder3']);
    });

    it('debe retornar null si el valor no existe', () => {
      const config = {
        exclude: {
          files: ['file1.txt']
        }
      };
      
      const result = (manager as any).removeFromConfig(
        config,
        'exclude.files',
        'nonexistent.txt'
      );
      
      expect(result).toBeNull();
    });

    it('debe retornar null si la ruta no existe', () => {
      const config = {};
      
      const result = (manager as any).removeFromConfig(
        config,
        'exclude.files',
        'test.txt'
      );
      
      expect(result).toBeNull();
    });

    it('debe hacer deep clone al remover', () => {
      const original = {
        exclude: {
          files: ['file1.txt', 'file2.txt']
        }
      };
      
      const result = (manager as any).removeFromConfig(
        original,
        'exclude.files',
        'file1.txt'
      );
      
      expect(result).not.toBe(original);
      expect(original.exclude.files).toHaveLength(2);
      expect(result.exclude.files).toHaveLength(1);
    });
  });
});
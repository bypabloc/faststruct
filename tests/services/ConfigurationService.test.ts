/**
 * Tests para ConfigurationService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ConfigurationService } from '../../src/services/ConfigurationService';
import * as vscode from 'vscode';

describe('ConfigurationService', () => {
  let service: ConfigurationService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Resetear singleton
    (ConfigurationService as any).instance = undefined;
    service = ConfigurationService.getInstance();
  });

  describe('getInstance', () => {
    it('debe retornar siempre la misma instancia (singleton)', () => {
      const instance1 = ConfigurationService.getInstance();
      const instance2 = ConfigurationService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('getConfiguration', () => {
    it('debe retornar la configuración con valores por defecto', () => {
      const config = service.getConfiguration();
      
      expect(config).toBeDefined();
      expect(config.debug).toBe(false);
      expect(config.exclude.folders).toContain('node_modules');
      expect(config.exclude.folders).toContain('.git');
      expect(config.exclude.files).toContain('*.log');
    });

    it('debe mergear configuración del usuario con valores por defecto', () => {
      const mockConfig = {
        debug: true,
        exclude: {
          folders: ['custom-folder'],
          files: ['*.custom'],
          advanced: {
            patterns: ['**/*.test.*'],
            specificFiles: [],
            specificFolders: [],
            regexPatterns: []
          }
        }
      };

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(mockConfig),
        update: jest.fn(),
        inspect: jest.fn()
      });

      const config = service.getConfiguration();
      
      expect(config.debug).toBe(true);
      expect(config.exclude.folders).toContain('custom-folder');
      expect(config.exclude.advanced.patterns).toContain('**/*.test.*');
    });

    it('debe aceptar workspaceFolder opcional', () => {
      const mockWorkspaceFolder = {
        uri: vscode.Uri.file('/test/workspace'),
        name: 'test-workspace',
        index: 0
      };

      service.getConfiguration(mockWorkspaceFolder as any);
      
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
        'faststruct',
        mockWorkspaceFolder.uri
      );
    });
  });

  describe('saveConfiguration', () => {
    it('debe guardar la configuración en el workspace por defecto', async () => {
      const testConfig = service.getDefaultConfig();
      testConfig.debug = true;

      const mockUpdate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'config') {
            return { debug: false };
          }
          return defaultValue;
        }),
        update: mockUpdate,
        inspect: jest.fn()
      });

      await service.saveConfiguration(testConfig);

      expect(mockUpdate).toHaveBeenCalledWith(
        'config',
        testConfig,
        vscode.ConfigurationTarget.Workspace
      );
    });

    it('debe permitir guardar globalmente', async () => {
      const testConfig = service.getDefaultConfig();
      
      const mockUpdate = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'config') {
            return { debug: false };
          }
          return defaultValue;
        }),
        update: mockUpdate,
        inspect: jest.fn()
      });

      await service.saveConfiguration(testConfig, vscode.ConfigurationTarget.Global);

      expect(mockUpdate).toHaveBeenCalledWith(
        'config',
        testConfig,
        vscode.ConfigurationTarget.Global
      );
    });

    it('debe manejar errores al guardar', async () => {
      const mockUpdate = jest.fn<() => Promise<void>>().mockRejectedValue(new Error('Save failed'));
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'config') {
            return { debug: false };
          }
          return defaultValue;
        }),
        update: mockUpdate,
        inspect: jest.fn()
      });

      await expect(service.saveConfiguration(service.getDefaultConfig()))
        .rejects.toThrow('Save failed');
    });
  });

  describe('getDefaultConfig', () => {
    it('debe retornar configuración por defecto válida', () => {
      const defaultConfig = service.getDefaultConfig();
      
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.debug).toBe(false);
      expect(defaultConfig.exclude).toBeDefined();
      expect(defaultConfig.exclude.folders).toBeInstanceOf(Array);
      expect(defaultConfig.exclude.files).toBeInstanceOf(Array);
      expect(defaultConfig.exclude.advanced).toBeDefined();
      expect(defaultConfig.excludeContent).toBeDefined();
      expect(defaultConfig.output).toBeDefined();
      expect(defaultConfig.output?.includeContent).toBe(true);
    });

    it('debe incluir todas las carpetas por defecto esperadas', () => {
      const defaultConfig = service.getDefaultConfig();
      const expectedFolders = [
        'node_modules', '.git', 'dist', 'build', 
        '.tmp', 'out', '.astro', '.unlighthouse'
      ];
      
      expectedFolders.forEach(folder => {
        expect(defaultConfig.exclude?.folders).toContain(folder);
      });
    });
  });

  describe('isDebugEnabled', () => {
    it('debe retornar false cuando debug está deshabilitado', () => {
      const mockConfig = { debug: false };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(mockConfig),
        update: jest.fn(),
        inspect: jest.fn()
      });

      expect(service.isDebugEnabled()).toBe(false);
    });

    it('debe retornar true cuando debug está habilitado', () => {
      const mockConfig = { debug: true };
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue(mockConfig),
        update: jest.fn(),
        inspect: jest.fn()
      });

      expect(service.isDebugEnabled()).toBe(true);
    });

    it('debe manejar configuración vacía', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn().mockReturnValue({}),
        update: jest.fn(),
        inspect: jest.fn()
      });

      expect(service.isDebugEnabled()).toBe(false);
    });
  });

  describe('inspectConfiguration', () => {
    it('debe retornar información de inspección de configuración', () => {
      const mockInspect = {
        globalValue: { debug: true },
        workspaceValue: { debug: false },
        defaultValue: service.getDefaultConfig()
      };

      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(),
        update: jest.fn(),
        inspect: jest.fn().mockReturnValue(mockInspect)
      });

      const inspection = service.inspectConfiguration();
      
      expect(inspection).toBe(mockInspect);
      expect(inspection?.globalValue).toEqual({ debug: true });
      expect(inspection?.workspaceValue).toEqual({ debug: false });
    });

    it('debe manejar cuando no hay configuración', () => {
      (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
        get: jest.fn(),
        update: jest.fn(),
        inspect: jest.fn().mockReturnValue(undefined)
      });

      const inspection = service.inspectConfiguration();
      
      expect(inspection).toBeUndefined();
    });
  });

  describe('mergeWithDefaults', () => {
    it('debe mantener arrays del usuario sin merge', () => {
      const userConfig = {
        exclude: {
          folders: ['my-folder'],
          files: ['my-file.txt']
        }
      };

      const merged = (service as any).mergeWithDefaults(userConfig);
      
      // Debe usar los arrays del usuario, no mergear con defaults
      expect(merged.exclude.folders).toEqual(['my-folder']);
      expect(merged.exclude.folders).not.toContain('node_modules');
      expect(merged.exclude.files).toEqual(['my-file.txt']);
    });

    it('debe usar valores por defecto para propiedades faltantes', () => {
      const userConfig = {
        debug: true
        // Falta exclude, excludeContent, output
      };

      const merged = (service as any).mergeWithDefaults(userConfig);
      const defaultConfig = service.getDefaultConfig();
      
      expect(merged.debug).toBe(true);
      expect(merged.exclude).toEqual(defaultConfig.exclude);
      expect(merged.excludeContent).toEqual(defaultConfig.excludeContent);
      expect(merged.output).toEqual(defaultConfig.output);
    });

    it('debe manejar configuración completamente vacía', () => {
      const merged = (service as any).mergeWithDefaults({});
      const defaultConfig = service.getDefaultConfig();
      
      expect(merged).toEqual(defaultConfig);
    });

    it('debe preservar valores falsy del usuario', () => {
      const userConfig = {
        debug: false,
        output: {
          includeContent: false,
          includeEmptyFolders: false,
          includeFileSize: false,
          includeLastModified: false
        }
      };

      const merged = (service as any).mergeWithDefaults(userConfig);
      
      expect(merged.debug).toBe(false);
      expect(merged.output?.includeContent).toBe(false);
      expect(merged.output?.includeEmptyFolders).toBe(false);
    });
  });
});
import * as vscode from 'vscode';
import { FastStructConfig } from '../types';
import { Logger } from '../logger';

/**
 * Servicio para manejar la configuración de FastStruct.
 * Aplica el principio SRP manejando solo la lógica de configuración.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class ConfigurationService {
  private static instance: ConfigurationService;
  
  /**
   * Obtiene la instancia singleton del servicio.
   * 
   * @returns Instancia del servicio de configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): ConfigurationService {
    if (!this.instance) {
      this.instance = new ConfigurationService();
    }
    return this.instance;
  }
  
  /**
   * Constructor privado para implementar patrón Singleton.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private constructor() {}
  
  /**
   * Obtiene la configuración completa de FastStruct.
   * 
   * @param workspaceFolder - Carpeta del workspace opcional
   * @returns Configuración completa con valores por defecto
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getConfiguration(workspaceFolder?: vscode.WorkspaceFolder): FastStructConfig {
    const config = vscode.workspace.getConfiguration('faststruct', workspaceFolder?.uri);
    const configFile = config.get<FastStructConfig>('config', {} as FastStructConfig);
    
    return this.mergeWithDefaults(configFile);
  }
  
  /**
   * Guarda la configuración en VS Code.
   * 
   * @param config - Configuración a guardar
   * @param target - Target de configuración (Workspace o Global)
   * @returns Promise que se resuelve cuando se guarda
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async saveConfiguration(
    config: FastStructConfig, 
    target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Workspace
  ): Promise<void> {
    const configuration = vscode.workspace.getConfiguration('faststruct');
    await configuration.update('config', config, target);
    Logger.info('Configuración guardada exitosamente', { target });
  }
  
  /**
   * Obtiene la configuración por defecto.
   * 
   * @returns Configuración por defecto
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getDefaultConfig(): FastStructConfig {
    return {
      debug: false,
      exclude: {
        folders: [
          'node_modules',
          '.git',
          'dist',
          'build',
          '.tmp',
          'out',
          '.astro',
          '.unlighthouse'
        ],
        files: [
          '*.log',
          '*.lock',
          'package-lock.json',
          'pnpm-lock.yaml',
          'yarn.lock'
        ],
        advanced: {
          patterns: ['**/*.min.js', '**/*.generated.*'],
          specificFiles: [],
          specificFolders: [],
          regexPatterns: []
        }
      },
      excludeContent: {
        files: ['*.config.js', 'db/data.ts'],
        folders: ['src/config', 'tests'],
        patterns: ['*.vsix', '**/*.secret.*', '**/.secrets**', '**/*/.env**']
      },
      quickExclude: {
        enabled: true,
        showNotifications: true
      },
      output: {
        includeContent: true,
        includeEmptyFolders: true,
        includeFileSize: false,
        includeLastModified: false
      }
    };
  }
  
  /**
   * Verifica si el modo debug está habilitado.
   * 
   * @param workspaceFolder - Carpeta del workspace opcional
   * @returns true si debug está habilitado
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public isDebugEnabled(workspaceFolder?: vscode.WorkspaceFolder): boolean {
    const config = this.getConfiguration(workspaceFolder);
    return config.debug === true;
  }
  
  /**
   * Inspecciona la configuración para determinar su ubicación.
   * 
   * @returns Objeto con información sobre la ubicación de la configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public inspectConfiguration() {
    const configuration = vscode.workspace.getConfiguration('faststruct');
    return configuration.inspect('config');
  }
  
  /**
   * Combina la configuración del usuario con los valores por defecto.
   * 
   * @param userConfig - Configuración del usuario
   * @returns Configuración completa con valores por defecto
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private mergeWithDefaults(userConfig: Partial<FastStructConfig>): FastStructConfig {
    const defaultConfig = this.getDefaultConfig();
    
    return {
      debug: userConfig.debug ?? defaultConfig.debug,
      exclude: {
        folders: userConfig.exclude?.folders || defaultConfig.exclude.folders,
        files: userConfig.exclude?.files || defaultConfig.exclude.files,
        advanced: {
          patterns: userConfig.exclude?.advanced?.patterns || defaultConfig.exclude.advanced.patterns,
          specificFiles: userConfig.exclude?.advanced?.specificFiles || defaultConfig.exclude.advanced.specificFiles,
          specificFolders: userConfig.exclude?.advanced?.specificFolders || defaultConfig.exclude.advanced.specificFolders,
          regexPatterns: userConfig.exclude?.advanced?.regexPatterns || defaultConfig.exclude.advanced.regexPatterns
        }
      },
      excludeContent: {
        files: userConfig.excludeContent?.files || defaultConfig.excludeContent.files,
        folders: userConfig.excludeContent?.folders || defaultConfig.excludeContent.folders,
        patterns: userConfig.excludeContent?.patterns || defaultConfig.excludeContent.patterns
      },
      quickExclude: userConfig.quickExclude || defaultConfig.quickExclude,
      output: userConfig.output || defaultConfig.output
    };
  }
}
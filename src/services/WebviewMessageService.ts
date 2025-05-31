import * as vscode from 'vscode';
import { Logger } from '../logger';
import { WebviewMessage, WebviewMessageHandler } from '../types/webview.types';
import { ConfigurationService } from './ConfigurationService';
import { GitignoreImportService } from './GitignoreImportService';
import { PatternTestService } from './PatternTestService';
import { ProjectStatsService } from './ProjectStatsService';

/**
 * Servicio para manejar mensajes del webview.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class WebviewMessageService {
  private static instance: WebviewMessageService;
  private handlers: Map<string, WebviewMessageHandler>;
  private configService: ConfigurationService;
  private gitignoreService: GitignoreImportService;
  private patternTestService: PatternTestService;
  private statsService: ProjectStatsService;
  
  public static getInstance(): WebviewMessageService {
    if (!this.instance) {
      this.instance = new WebviewMessageService();
    }
    return this.instance;
  }
  
  private constructor() {
    this.configService = ConfigurationService.getInstance();
    this.gitignoreService = GitignoreImportService.getInstance();
    this.patternTestService = PatternTestService.getInstance();
    this.statsService = ProjectStatsService.getInstance();
    this.handlers = new Map();
    this.registerHandlers();
  }
  
  /**
   * Registra los manejadores de mensajes.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private registerHandlers(): void {
    // Manejador para guardar configuración
    this.handlers.set('saveConfig', async (message, webview) => {
      await this.handleSaveConfig(message.config, webview);
    });
    
    // Manejador para cargar configuración
    this.handlers.set('loadConfig', async (message, webview) => {
      await this.handleLoadConfig(webview);
    });
    
    // Manejador para resetear configuración
    this.handlers.set('resetConfig', async (message, webview) => {
      await this.handleResetConfig(webview);
    });
    
    // Manejador para importar .gitignore
    this.handlers.set('importGitignore', async (message, webview) => {
      await this.handleImportGitignore(webview);
    });
    
    // Manejador para probar patrones
    this.handlers.set('testPattern', async (message, webview) => {
      await this.handleTestPattern(message.pattern, message.type, webview);
    });
    
    // Manejador para obtener estadísticas
    this.handlers.set('getStats', async (message, webview) => {
      await this.handleGetStats(webview);
    });
    
    // Manejador para logs
    this.handlers.set('log', async (message) => {
      this.handleLog(message.level, message.message, message.data);
    });
  }
  
  /**
   * Procesa un mensaje del webview.
   * 
   * @param message - Mensaje recibido
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async handleMessage(message: WebviewMessage, webview: vscode.Webview): Promise<void> {
    Logger.info('Mensaje recibido de webview', message);
    
    const handler = this.handlers.get(message.command);
    if (handler) {
      await handler(message, webview);
    } else {
      Logger.warn('Comando desconocido recibido', message);
    }
  }
  
  /**
   * Maneja el guardado de configuración.
   * 
   * @param config - Configuración a guardar
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleSaveConfig(config: any, webview: vscode.Webview): Promise<void> {
    try {
      // Verificar workspace
      let target: vscode.ConfigurationTarget;
      
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        const answer = await vscode.window.showWarningMessage(
          'No hay un workspace abierto. ¿Deseas guardar la configuración globalmente?',
          'Sí',
          'No'
        );
        
        if (answer !== 'Sí') {
          return;
        }
        target = vscode.ConfigurationTarget.Global;
      } else {
        target = vscode.ConfigurationTarget.Workspace;
      }
      
      await this.configService.saveConfiguration(config, target);
      
      const location = target === vscode.ConfigurationTarget.Workspace
        ? '.vscode/settings.json'
        : 'configuración global';
      
      vscode.window.showInformationMessage(`Configuración guardada en ${location}`);
      
      webview.postMessage({
        command: 'configSaved',
        success: true
      });
    } catch (error) {
      Logger.error('Error al guardar configuración', error);
      webview.postMessage({
        command: 'configSaved',
        success: false,
        error: error
      });
    }
  }
  
  /**
   * Maneja la carga de configuración.
   * 
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleLoadConfig(webview: vscode.Webview): Promise<void> {
    const inspect = this.configService.inspectConfiguration();
    let config: any;
    let source = 'default';
    
    if (inspect?.workspaceValue) {
      config = inspect.workspaceValue;
      source = 'workspace';
    } else if (inspect?.globalValue) {
      config = inspect.globalValue;
      source = 'global';
    } else {
      config = this.configService.getDefaultConfig();
      source = 'default';
    }
    
    webview.postMessage({
      command: 'loadConfig',
      config: config,
      source: source
    });
  }
  
  /**
   * Maneja el reseteo de configuración.
   * 
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleResetConfig(webview: vscode.Webview): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      '¿Estás seguro de que quieres restablecer toda la configuración a los valores por defecto?',
      'Sí',
      'No'
    );
    
    if (answer === 'Sí') {
      const defaultConfig = this.configService.getDefaultConfig();
      await this.configService.saveConfiguration(defaultConfig);
      
      webview.postMessage({
        command: 'loadConfig',
        config: defaultConfig
      });
    }
  }
  
  /**
   * Maneja la importación desde .gitignore.
   * 
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleImportGitignore(webview: vscode.Webview): Promise<void> {
    const result = await this.gitignoreService.importFromGitignore();
    if (result) {
      webview.postMessage({
        command: 'gitignoreImported',
        data: result
      });
    }
  }
  
  /**
   * Maneja la prueba de patrones.
   * 
   * @param pattern - Patrón a probar
   * @param type - Tipo de patrón
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleTestPattern(pattern: string, type: string, webview: vscode.Webview): Promise<void> {
    const result = await this.patternTestService.testPattern(pattern, type);
    webview.postMessage({
      command: 'patternTestResult',
      pattern: pattern,
      matches: result.matches,
      hasMore: result.hasMore
    });
  }
  
  /**
   * Maneja la obtención de estadísticas.
   * 
   * @param webview - Instancia del webview
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async handleGetStats(webview: vscode.Webview): Promise<void> {
    const stats = await this.statsService.getProjectStats();
    if (stats) {
      webview.postMessage({
        command: 'statsLoaded',
        stats: stats
      });
    }
  }
  
  /**
   * Maneja los logs del webview.
   * 
   * @param level - Nivel del log
   * @param message - Mensaje
   * @param data - Datos adicionales
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private handleLog(level: string, message: string, data?: any): void {
    switch (level) {
      case 'error':
        Logger.error(`[Webview] ${message}`, data);
        break;
      case 'warn':
        Logger.warn(`[Webview] ${message}`, data);
        break;
      default:
        Logger.info(`[Webview] ${message}`, data);
    }
  }
}
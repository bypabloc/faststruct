import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';
import { ConfigurationService } from '../services/ConfigurationService';
import { FileSystemService } from '../services/FileSystemService';
import { PatternMatcher } from '../utils/patternMatcher';
import { FastStructConfig, ExclusionStats } from '../types';

/**
 * Proveedor de webview para la interfaz de configuración de FastStruct.
 * 
 * Esta clase maneja la creación y gestión de la interfaz web para
 * configurar la extensión de manera visual e intuitiva.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class ConfigWebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private configService: ConfigurationService;
  private fileSystemService: FileSystemService;
  private patternMatcher: PatternMatcher;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configService = ConfigurationService.getInstance();
    this.fileSystemService = FileSystemService.getInstance();
    this.patternMatcher = PatternMatcher.getInstance();
    Logger.info('ConfigWebviewProvider inicializado');
  }

  /**
   * Muestra la interfaz de configuración en un panel webview.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public show() {
    Logger.functionStart('ConfigWebviewProvider.show');

    // Si ya existe un panel, lo enfocamos
    if (this.panel) {
      Logger.info('Panel existente encontrado, enfocando');
      this.panel.reveal();
      Logger.functionEnd('ConfigWebviewProvider.show', 'Panel enfocado');
      return;
    }

    // Verificar si existe configuración en el workspace
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      const inspect = this.configService.inspectConfiguration();

      if (!inspect?.workspaceValue) {
        vscode.window.showInformationMessage(
          'No se encontró configuración de FastStruct en este proyecto. Puedes crear una nueva configuración y guardarla.',
          'Entendido'
        );
      }
    }

    Logger.info('Creando nuevo panel webview');

    // Crear un nuevo panel
    this.panel = vscode.window.createWebviewPanel(
      'faststructConfig',
      'FastStruct Configuration',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        ],
      }
    );

    Logger.info('Panel creado, estableciendo contenido HTML');

    // Establecer el contenido HTML
    this.panel.webview.html = this.getWebviewContent();

    Logger.info('HTML establecido, configurando manejadores de mensajes');

    // Manejar mensajes desde la webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        Logger.info('Mensaje recibido de webview', message);

        switch (message.command) {
          case 'saveConfig':
            Logger.info('Comando saveConfig recibido');
            await this.saveConfiguration(message.config);
            break;
          case 'loadConfig':
            Logger.info('Comando loadConfig recibido');
            this.loadConfiguration();
            break;
          case 'resetConfig':
            Logger.info('Comando resetConfig recibido');
            await this.resetConfiguration();
            break;
          case 'importGitignore':
            Logger.info('Comando importGitignore recibido');
            await this.importFromGitignore();
            break;
          case 'testPattern':
            Logger.info('Comando testPattern recibido');
            await this.testPattern(message.pattern, message.type);
            break;
          case 'getStats':
            Logger.info('Comando getStats recibido');
            await this.getExclusionStats();
            break;
          case 'log':
            // Mensaje de log desde la webview
            if (message.level === 'error') {
              Logger.error(`[Webview] ${message.message}`, message.data);
            } else if (message.level === 'warn') {
              Logger.warn(`[Webview] ${message.message}`, message.data);
            } else {
              Logger.info(`[Webview] ${message.message}`, message.data);
            }
            break;
          default:
            Logger.warn('Comando desconocido recibido', message);
        }
      },
      undefined,
      this.context.subscriptions
    );

    // Limpiar cuando se cierre
    this.panel.onDidDispose(
      () => {
        Logger.info('Panel cerrado, limpiando recursos');
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions
    );

    Logger.info('Cargando configuración inicial');
    // Cargar configuración inicial
    this.loadConfiguration();

    // Cargar estadísticas
    this.getExclusionStats();

    Logger.functionEnd('ConfigWebviewProvider.show', 'Panel mostrado');
  }

  /**
   * Importa patrones desde .gitignore
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async importFromGitignore() {
    try {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        vscode.window.showWarningMessage('No hay un workspace abierto');
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const gitignorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');

      if (!fs.existsSync(gitignorePath)) {
        vscode.window.showWarningMessage(
          'No se encontró archivo .gitignore en el proyecto'
        );
        return;
      }

      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
      const lines = gitignoreContent.split('\n');

      const patterns: string[] = [];
      const folders: string[] = [];
      const files: string[] = [];

      lines.forEach((line) => {
        line = line.trim();

        // Ignorar líneas vacías y comentarios
        if (!line || line.startsWith('#')) return;

        // Detectar si es una carpeta
        if (line.endsWith('/')) {
          folders.push(line.slice(0, -1));
        }
        // Detectar si es un archivo específico
        else if (!line.includes('*') && !line.includes('/')) {
          files.push(line);
        }
        // Es un patrón
        else {
          patterns.push(line);
        }
      });

      this.panel?.webview.postMessage({
        command: 'gitignoreImported',
        data: {
          patterns,
          folders,
          files,
        },
      });

      vscode.window.showInformationMessage(
        `Importados ${patterns.length} patrones, ${folders.length} carpetas y ${files.length} archivos desde .gitignore`
      );
    } catch (error) {
      Logger.error('Error al importar desde .gitignore', error);
      vscode.window.showErrorMessage('Error al importar desde .gitignore');
    }
  }

  /**
   * Prueba un patrón contra los archivos del proyecto
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async testPattern(pattern: string, type: string) {
    try {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const matches: string[] = [];

      // Función para recorrer el directorio
      const walkDir = (dir: string, baseDir: string) => {
        const items = fs.readdirSync(dir, { withFileTypes: true });

        for (const item of items) {
          if (item.name === '.git' || item.name === 'node_modules') continue;

          const fullPath = path.join(dir, item.name);
          const relativePath = path
            .relative(baseDir, fullPath)
            .replace(/\\/g, '/');

          // Verificar si coincide con el patrón
          let shouldMatch = false;

          if (type === 'glob') {
            const { Minimatch } = require('minimatch');
            const mm = new Minimatch(pattern);
            shouldMatch = mm.match(relativePath) || mm.match(item.name);
          } else if (type === 'regex') {
            try {
              const regex = new RegExp(pattern);
              shouldMatch = regex.test(relativePath);
            } catch (e) {
              // Regex inválido
            }
          } else if (type === 'simple') {
            shouldMatch = item.name === pattern;
          }

          if (shouldMatch) {
            matches.push(relativePath);
          }

          // Recursivo para directorios
          if (item.isDirectory() && matches.length < 20) {
            walkDir(fullPath, baseDir);
          }
        }
      };

      walkDir(workspaceFolder.uri.fsPath, workspaceFolder.uri.fsPath);

      this.panel?.webview.postMessage({
        command: 'patternTestResult',
        pattern,
        matches: matches.slice(0, 20),
        hasMore: matches.length > 20,
      });
    } catch (error) {
      Logger.error('Error al probar patrón', error);
    }
  }

  /**
   * Obtiene estadísticas sobre las exclusiones
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async getExclusionStats() {
    try {
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        return;
      }

      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const config = this.configService.getConfiguration(workspaceFolder);

      let totalFiles = 0;
      let totalFolders = 0;
      let excludedFiles = 0;
      let excludedFolders = 0;
      let totalSize = 0;
      let excludedSize = 0;

      // Función para verificar exclusiones
      const isExcluded = (name: string, isDir: boolean): boolean => {
        const patterns = isDir
          ? config.exclude?.folders || []
          : config.exclude?.files || [];
        return patterns.some((pattern: string) => {
          if (pattern.includes('*')) {
            // Patrón simple
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(name);
          }
          return name === pattern;
        });
      };

      // Función para recorrer el directorio
      const walkDir = (dir: string) => {
        try {
          const items = fs.readdirSync(dir, { withFileTypes: true });

          for (const item of items) {
            const fullPath = path.join(dir, item.name);

            if (item.isDirectory()) {
              totalFolders++;
              if (isExcluded(item.name, true)) {
                excludedFolders++;
                continue;
              }
              walkDir(fullPath);
            } else {
              totalFiles++;
              const stats = fs.statSync(fullPath);
              totalSize += stats.size;

              if (isExcluded(item.name, false)) {
                excludedFiles++;
                excludedSize += stats.size;
              }
            }
          }
        } catch (e) {
          // Ignorar errores de permisos
        }
      };

      walkDir(workspaceFolder.uri.fsPath);

      const stats: ExclusionStats = {
        totalFiles,
        totalFolders,
        excludedFiles,
        excludedFolders,
        totalSize,
        excludedSize,
        percentExcludedFiles:
          totalFiles > 0 ? Math.round((excludedFiles / totalFiles) * 100) : 0,
        percentExcludedFolders:
          totalFolders > 0
            ? Math.round((excludedFolders / totalFolders) * 100)
            : 0,
        percentExcludedSize:
          totalSize > 0 ? Math.round((excludedSize / totalSize) * 100) : 0,
      };

      this.panel?.webview.postMessage({
        command: 'statsLoaded',
        stats,
      });
    } catch (error) {
      Logger.error('Error al obtener estadísticas', error);
    }
  }

  /**
   * Guarda la configuración en los settings de VS Code.
   *
   * @param config - Configuración a guardar
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async saveConfiguration(config: FastStructConfig) {
    Logger.functionStart('saveConfiguration', config);

    try {
      Logger.info('Actualizando configuración en VS Code');

      // Verificar si hay un workspace abierto
      let target: vscode.ConfigurationTarget;
      
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        const answer = await vscode.window.showWarningMessage(
          'No hay un workspace abierto. ¿Deseas guardar la configuración globalmente?',
          'Sí',
          'No'
        );

        if (answer !== 'Sí') {
          Logger.info('Guardado cancelado por el usuario');
          return;
        }

        target = vscode.ConfigurationTarget.Global;
      } else {
        // Verificar si ya existe configuración en el workspace
        const inspect = this.configService.inspectConfiguration();
        const hasWorkspaceConfig = inspect?.workspaceValue !== undefined;

        if (!hasWorkspaceConfig) {
          // No existe configuración en el workspace, preguntar si crear
          const answer = await vscode.window.showInformationMessage(
            'No se encontró configuración de FastStruct en este proyecto. ¿Deseas crear una configuración local?',
            'Sí, crear configuración',
            'Cancelar'
          );

          if (answer !== 'Sí, crear configuración') {
            Logger.info('Creación de configuración cancelada por el usuario');
            return;
          }
        }

        // Crear el directorio .vscode si no existe
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const vscodePath = path.join(workspaceFolder.uri.fsPath, '.vscode');

        if (!fs.existsSync(vscodePath)) {
          Logger.info('Creando directorio .vscode');
          fs.mkdirSync(vscodePath);
        }

        target = vscode.ConfigurationTarget.Workspace;
      }

      // Guardar configuración
      await this.configService.saveConfiguration(config, target);

      const location = target === vscode.ConfigurationTarget.Workspace
        ? path.join('.vscode', 'settings.json')
        : 'configuración global';

      vscode.window.showInformationMessage(
        `Configuración guardada en ${location}`
      );

      Logger.info('Configuración guardada exitosamente');

      // Notificar a la webview
      this.panel?.webview.postMessage({
        command: 'configSaved',
        success: true,
      });

      Logger.functionEnd('saveConfiguration', 'Éxito');
    } catch (error) {
      Logger.error('Error al guardar la configuración', error);
      vscode.window.showErrorMessage(
        `Error al guardar la configuración: ${error}`
      );

      this.panel?.webview.postMessage({
        command: 'configSaved',
        success: false,
        error: error,
      });

      Logger.functionEnd('saveConfiguration', 'Error');
    }
  }

  /**
   * Carga la configuración actual y la envía a la webview.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private loadConfiguration() {
    Logger.functionStart('loadConfiguration');

    const inspect = this.configService.inspectConfiguration();

    // Determinar la fuente de configuración
    let config: FastStructConfig;
    let source = 'default';

    if (inspect?.workspaceValue) {
      config = inspect.workspaceValue as FastStructConfig;
      source = 'workspace';
      Logger.info('Usando configuración del workspace');
    } else if (inspect?.globalValue) {
      config = inspect.globalValue as FastStructConfig;
      source = 'global';
      Logger.info('Usando configuración global');
    } else {
      config = this.configService.getDefaultConfig();
      source = 'default';
      Logger.info('Usando configuración por defecto');
    }

    Logger.info('Configuración cargada', config);

    const message = {
      command: 'loadConfig',
      config: config,
      source: source,
    };

    Logger.info('Enviando configuración a webview', message);
    this.panel?.webview.postMessage(message);

    Logger.functionEnd('loadConfiguration');
  }

  /**
   * Restablece la configuración a los valores por defecto.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async resetConfiguration() {
    Logger.functionStart('resetConfiguration');

    const answer = await vscode.window.showWarningMessage(
      '¿Estás seguro de que quieres restablecer toda la configuración a los valores por defecto?',
      'Sí',
      'No'
    );

    Logger.info('Respuesta del usuario', answer);

    if (answer === 'Sí') {
      const defaultConfig = this.configService.getDefaultConfig();
      Logger.info('Restableciendo a configuración por defecto', defaultConfig);

      await this.saveConfiguration(defaultConfig);

      this.panel?.webview.postMessage({
        command: 'loadConfig',
        config: defaultConfig,
      });
    }

    Logger.functionEnd('resetConfiguration');
  }

  /**
   * Genera el contenido HTML para la webview.
   * [NOTA: Este método mantiene el HTML original por ser muy extenso]
   *
   * @returns HTML string
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private getWebviewContent(): string {
    Logger.functionStart('getWebviewContent');

    const styleUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'configStyle.css')
    );

    const nonce = this.getNonce();

    Logger.info('URIs generadas', { styleUri: styleUri?.toString(), nonce });

    // [El HTML se mantiene igual que en el archivo original]
    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
          this.panel?.webview.cspSource
        } 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>FastStruct Configuration</title>
        <style>
          /* Estilos mejorados */
          :root {
            --sidebar-width: 260px;
            --section-spacing: 30px;
            --card-padding: 25px;
            --animation-speed: 0.3s;
            --tab-height: 48px;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }

          /* Layout principal */
          .main-layout {
            display: flex;
            height: 100%;
            position: relative;
          }

          /* Barra lateral */
          .sidebar {
            width: var(--sidebar-width);
            background-color: var(--vscode-sideBar-background);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            transition: transform var(--animation-speed) ease;
          }

          .sidebar-header {
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
          }

          .sidebar-header h2 {
            margin: 0;
            font-size: 1.2em;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .nav-menu {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
          }

          .nav-item {
            padding: 12px 20px;
            cursor: pointer;
            transition: all var(--transition-speed);
            display: flex;
            align-items: center;
            gap: 12px;
            color: var(--foreground);
            text-decoration: none;
            position: relative;
          }

          .nav-item:hover {
            background-color: var(--list-hover-background);
          }

          .nav-item.active {
            background-color: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }

          .nav-item.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background-color: var(--vscode-activityBarBadge-background);
          }

          .nav-icon {
            font-size: 1.2em;
            width: 24px;
            text-align: center;
          }

          /* Contenido principal */
          .content-area {
            flex: 1;
            overflow-y: auto;
            padding: 30px;
            background-color: var(--background);
          }

          .content-section {
            display: none;
            animation: fadeIn var(--animation-speed) ease;
          }

          .content-section.active {
            display: block;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }

          /* Cards mejoradas */
          .card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: var(--card-padding);
            margin-bottom: var(--section-spacing);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: box-shadow var(--transition-speed);
          }

          .card:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          }

          .card-header {
            margin-bottom: 20px;
          }

          .card-title {
            font-size: 1.3em;
            font-weight: 600;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .card-description {
            color: var(--vscode-descriptionForeground);
            font-size: 0.95em;
            line-height: 1.5;
          }

          /* Tabs */
          .tabs {
            display: flex;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 20px;
          }

          .tab {
            padding: 12px 24px;
            cursor: pointer;
            border: none;
            background: none;
            color: var(--foreground);
            font-size: 1em;
            transition: all var(--transition-speed);
            position: relative;
          }

          .tab:hover {
            background-color: var(--list-hover-background);
          }

          .tab.active {
            color: var(--vscode-activityBarBadge-background);
          }

          .tab.active::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 2px;
            background-color: var(--vscode-activityBarBadge-background);
          }

          .tab-content {
            display: none;
          }

          .tab-content.active {
            display: block;
          }

          /* Estadísticas */
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }

          .stat-card {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            transition: transform var(--transition-speed);
          }

          .stat-card:hover {
            transform: translateY(-2px);
          }

          .stat-value {
            font-size: 2em;
            font-weight: 700;
            color: var(--vscode-activityBarBadge-background);
            margin: 0;
          }

          .stat-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin-top: 5px;
          }

          /* Barra de progreso */
          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: var(--vscode-progressBar-background);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
          }

          .progress-fill {
            height: 100%;
            background-color: var(--vscode-activityBarBadge-background);
            transition: width var(--animation-speed);
          }

          /* Búsqueda */
          .search-box {
            position: relative;
            margin-bottom: 20px;
          }

          .search-input {
            width: 100%;
            padding: 10px 40px 10px 12px;
            background-color: var(--input-background);
            color: var(--input-foreground);
            border: 1px solid var(--input-border);
            border-radius: 6px;
            font-size: 1em;
          }

          .search-icon {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--vscode-descriptionForeground);
          }

          /* Lista mejorada */
          .enhanced-list {
            background-color: var(--input-background);
            border: 1px solid var(--input-border);
            border-radius: 6px;
            max-height: 300px;
            overflow-y: auto;
            margin-bottom: 15px;
          }

          .enhanced-list-item {
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            transition: background-color var(--transition-speed);
          }

          .enhanced-list-item:last-child {
            border-bottom: none;
          }

          .enhanced-list-item:hover {
            background-color: var(--list-hover-background);
          }

          .enhanced-list-item .item-content {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .enhanced-list-item .item-icon {
            color: var(--vscode-descriptionForeground);
          }

          .enhanced-list-item .item-text {
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 0.95em;
          }

          .enhanced-list-item .item-actions {
            display: flex;
            gap: 8px;
          }

          /* Botones mejorados */
          .btn-icon {
            background: none;
            border: none;
            color: var(--foreground);
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: all var(--transition-speed);
          }

          .btn-icon:hover {
            background-color: var(--list-hover-background);
          }

          .btn-icon.danger:hover {
            color: var(--error-foreground);
          }

          /* Toggle switch */
          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
          }

          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--vscode-input-background);
            transition: var(--transition-speed);
            border-radius: 24px;
            border: 1px solid var(--input-border);
          }

          .toggle-slider:before {
            position: absolute;
            content: "";
            height: 16px;
            width: 16px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: var(--transition-speed);
            border-radius: 50%;
          }

          input:checked + .toggle-slider {
            background-color: var(--vscode-activityBarBadge-background);
            border-color: var(--vscode-activityBarBadge-background);
          }

          input:checked + .toggle-slider:before {
            transform: translateX(20px);
          }

          /* Pattern tester */
          .pattern-tester {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
          }

          .pattern-input-group {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
          }

          .pattern-input-group input {
            flex: 1;
          }

          .test-results {
            max-height: 200px;
            overflow-y: auto;
            font-family: var(--vscode-editor-font-family, monospace);
            font-size: 0.9em;
          }

          .test-match {
            padding: 4px 8px;
            margin: 2px 0;
            background-color: var(--vscode-diffEditor-insertedTextBackground);
            border-radius: 3px;
          }

          /* Info banner */
          .info-banner {
            background-color: var(--vscode-editorInfo-background);
            border: 1px solid var(--vscode-editorInfo-border);
            border-radius: 6px;
            padding: 12px 16px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .info-banner-icon {
            color: var(--vscode-editorInfo-foreground);
            font-size: 1.2em;
          }

          .info-banner-text {
            flex: 1;
            color: var(--vscode-editorInfo-foreground);
            font-size: 0.95em;
          }

          /* Mobile responsive */
          @media (max-width: 768px) {
            .sidebar {
              position: fixed;
              z-index: 1000;
              height: 100%;
              transform: translateX(-100%);
            }

            .sidebar.mobile-open {
              transform: translateX(0);
            }

            .content-area {
              margin-left: 0;
            }

            .mobile-menu-toggle {
              display: block;
              position: fixed;
              top: 10px;
              left: 10px;
              z-index: 1001;
            }
          }

          @media (min-width: 769px) {
            .mobile-menu-toggle {
              display: none;
            }
          }
        </style>
    </head>
    <body>
        <div class="main-layout">
            <!-- Sidebar -->
            <aside class="sidebar" id="sidebar">
                <div class="sidebar-header">
                    <h2>⚙️ FastStruct</h2>
                </div>
                <nav class="nav-menu">
                    <a href="#" class="nav-item active" data-section="overview">
                        <span class="nav-icon">📊</span>
                        <span>Vista General</span>
                    </a>
                    <a href="#" class="nav-item" data-section="structure">
                        <span class="nav-icon">📁</span>
                        <span>Exclusiones de Estructura</span>
                    </a>
                    <a href="#" class="nav-item" data-section="content">
                        <span class="nav-icon">📝</span>
                        <span>Exclusiones de Contenido</span>
                    </a>
                    <a href="#" class="nav-item" data-section="output">
                        <span class="nav-icon">📤</span>
                        <span>Opciones de Salida</span>
                    </a>
                    <a href="#" class="nav-item" data-section="tools">
                        <span class="nav-icon">🛠️</span>
                        <span>Herramientas</span>
                    </a>
                </nav>
                <div class="sidebar-footer" style="padding: 20px; border-top: 1px solid var(--border-color);">
                    <button class="btn btn-primary" id="saveButton" style="width: 100%; margin-bottom: 10px;">
                        💾 Guardar Configuración
                    </button>
                    <div id="configSource" style="font-size: 0.85em; color: var(--vscode-descriptionForeground); text-align: center;"></div>
                </div>
            </aside>

            <!-- Mobile menu toggle -->
            <button class="mobile-menu-toggle btn-icon" id="mobileMenuToggle">
                ☰
            </button>

            <!-- Main content -->
            <main class="content-area">
                <!-- Vista General -->
                <section class="content-section active" id="overview-section">
                    <h1 style="margin-bottom: 30px;">Vista General de Configuración</h1>
                    
                    <div class="stats-grid" id="statsGrid">
                        <div class="stat-card">
                            <p class="stat-value">-</p>
                            <p class="stat-label">Archivos Totales</p>
                        </div>
                        <div class="stat-card">
                            <p class="stat-value">-</p>
                            <p class="stat-label">Archivos Excluidos</p>
                        </div>
                        <div class="stat-card">
                            <p class="stat-value">-</p>
                            <p class="stat-label">Carpetas Totales</p>
                        </div>
                        <div class="stat-card">
                            <p class="stat-value">-</p>
                            <p class="stat-label">Carpetas Excluidas</p>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📊 Impacto de las Exclusiones</h3>
                        </div>
                        <div class="stat-label">Archivos excluidos</div>
                        <div class="progress-bar">
                            <div class="progress-fill" id="filesProgress" style="width: 0%"></div>
                        </div>
                        <div style="margin-top: 20px;">
                            <div class="stat-label">Carpetas excluidas</div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="foldersProgress" style="width: 0%"></div>
                            </div>
                        </div>
                        <div style="margin-top: 20px;">
                            <div class="stat-label">Tamaño excluido</div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="sizeProgress" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🚀 Inicio Rápido</h3>
                            <p class="card-description">Acciones comunes para configurar FastStruct rápidamente</p>
                        </div>
                        <div style="display: grid; gap: 10px;">
                            <button class="btn btn-secondary" id="importGitignoreBtn">
                                📥 Importar desde .gitignore
                            </button>
                            <button class="btn btn-secondary" id="addCommonExclusionsBtn">
                                ➕ Agregar exclusiones comunes
                            </button>
                            <button class="btn btn-secondary" id="resetConfigBtn">
                                🔄 Restablecer configuración
                            </button>
                        </div>
                    </div>

                    <div class="info-banner">
                        <span class="info-banner-icon">ℹ️</span>
                        <span class="info-banner-text">
                            FastStruct te ayuda a generar documentación de la estructura de tu proyecto. 
                            Configura qué archivos y carpetas excluir para obtener resultados más limpios.
                        </span>
                    </div>
                </section>

                <!-- Exclusiones de Estructura -->
                <section class="content-section" id="structure-section">
                    <h1 style="margin-bottom: 30px;">Exclusiones de Estructura</h1>
                    
                    <div class="tabs">
                        <button class="tab active" data-tab="basic">Básicas</button>
                        <button class="tab" data-tab="advanced">Avanzadas</button>
                    </div>

                    <!-- Tab: Básicas -->
                    <div class="tab-content active" data-tab-content="basic">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📁 Carpetas a Excluir</h3>
                                <p class="card-description">Carpetas que no aparecerán en la estructura generada</p>
                            </div>
                            
                            <div class="search-box">
                                <input type="text" class="search-input" id="searchExcludeFolders" placeholder="Buscar carpetas...">
                                <span class="search-icon">🔍</span>
                            </div>
                            
                            <div class="enhanced-list" id="excludeFolders">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newExcludeFolder" placeholder="ej: node_modules" />
                                <button class="btn btn-primary" id="addExcludeFolder">➕ Agregar</button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📄 Archivos a Excluir</h3>
                                <p class="card-description">Patrones de archivos que no aparecerán en la estructura</p>
                            </div>
                            
                            <div class="search-box">
                                <input type="text" class="search-input" id="searchExcludeFiles" placeholder="Buscar archivos...">
                                <span class="search-icon">🔍</span>
                            </div>
                            
                            <div class="enhanced-list" id="excludeFiles">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newExcludeFile" placeholder="ej: *.log" />
                                <button class="btn btn-primary" id="addExcludeFile">➕ Agregar</button>
                            </div>
                        </div>
                    </div>

                    <!-- Tab: Avanzadas -->
                    <div class="tab-content" data-tab-content="advanced">
                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">🎯 Patrones Glob</h3>
                                <p class="card-description">Usa patrones glob para coincidencias más complejas</p>
                            </div>
                            
                            <div class="enhanced-list" id="advancedPatterns">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newAdvancedPattern" placeholder="ej: **/*.min.js" />
                                <button class="btn btn-primary" id="addAdvancedPattern">➕ Agregar</button>
                            </div>
                            
                            <div class="pattern-tester">
                                <h4 style="margin-top: 0;">Probar Patrón</h4>
                                <div class="pattern-input-group">
                                    <input type="text" id="testPattern" placeholder="Ingresa un patrón para probar">
                                    <button class="btn btn-secondary" id="testPatternBtn">Probar</button>
                                </div>
                                <div class="test-results" id="patternTestResults"></div>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📍 Archivos Específicos</h3>
                                <p class="card-description">Rutas exactas de archivos a excluir</p>
                            </div>
                            
                            <div class="enhanced-list" id="specificFiles">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newSpecificFile" placeholder="ej: src/config/secret.json" />
                                <button class="btn btn-primary" id="addSpecificFile">➕ Agregar</button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">📁 Carpetas Específicas</h3>
                                <p class="card-description">Rutas exactas de carpetas a excluir</p>
                            </div>
                            
                            <div class="enhanced-list" id="specificFolders">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newSpecificFolder" placeholder="ej: tests/fixtures/" />
                                <button class="btn btn-primary" id="addSpecificFolder">➕ Agregar</button>
                            </div>
                        </div>

                        <div class="card">
                            <div class="card-header">
                                <h3 class="card-title">🔤 Expresiones Regulares</h3>
                                <p class="card-description">Patrones regex para exclusiones más complejas</p>
                            </div>
                            
                            <div class="enhanced-list" id="regexPatterns">
                                <!-- Se llenará dinámicamente -->
                            </div>
                            
                            <div class="add-item">
                                <input type="text" id="newRegexPattern" placeholder="ej: src/.*\\.temp\\.*" />
                                <button class="btn btn-primary" id="addRegexPattern">➕ Agregar</button>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Exclusiones de Contenido -->
                <section class="content-section" id="content-section">
                    <h1 style="margin-bottom: 30px;">Exclusiones de Contenido</h1>
                    
                    <div class="info-banner">
                        <span class="info-banner-icon">💡</span>
                        <span class="info-banner-text">
                            Los elementos aquí configurados aparecerán en la estructura pero su contenido no se mostrará.
                            Útil para archivos sensibles o de configuración.
                        </span>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📄 Archivos sin Contenido</h3>
                            <p class="card-description">Archivos que aparecerán en la estructura pero sin mostrar su contenido</p>
                        </div>
                        
                        <div class="enhanced-list" id="contentFiles">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <div class="add-item">
                            <input type="text" id="newContentFile" placeholder="ej: *.env" />
                            <button class="btn btn-primary" id="addContentFile">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📁 Carpetas sin Contenido</h3>
                            <p class="card-description">Carpetas cuyos archivos no mostrarán contenido</p>
                        </div>
                        
                        <div class="enhanced-list" id="contentFolders">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <div class="add-item">
                            <input type="text" id="newContentFolder" placeholder="ej: src/config" />
                            <button class="btn btn-primary" id="addContentFolder">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🎯 Patrones de Contenido</h3>
                            <p class="card-description">Patrones para excluir contenido de múltiples archivos</p>
                        </div>
                        
                        <div class="enhanced-list" id="contentPatterns">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        
                        <div class="add-item">
                            <input type="text" id="newContentPattern" placeholder="ej: **/*.secret.*" />
                            <button class="btn btn-primary" id="addContentPattern">➕ Agregar</button>
                        </div>
                    </div>
                </section>

                <!-- Opciones de Salida -->
                <section class="content-section" id="output-section">
                    <h1 style="margin-bottom: 30px;">Opciones de Salida</h1>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">⚙️ Configuración General</h3>
                            <p class="card-description">Controla cómo se genera la salida de la estructura</p>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; justify-content: space-between;">
                                <span>
                                    <strong>Incluir contenido de archivos</strong>
                                    <div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-top: 4px;">
                                        Muestra el contenido de los archivos en la salida
                                    </div>
                                </span>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="includeContent" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px;">
                            <label style="display: flex; align-items: center; justify-content: space-between;">
                                <span>
                                    <strong>Incluir carpetas vacías</strong>
                                    <div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-top: 4px;">
                                        Muestra carpetas aunque no tengan archivos
                                    </div>
                                </span>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="includeEmptyFolders" checked>
                                    <span class="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px;">
                            <label style="display: flex; align-items: center; justify-content: space-between;">
                                <span>
                                    <strong>Mostrar tamaño de archivos</strong>
                                    <div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-top: 4px;">
                                        Agrega el tamaño de cada archivo en la estructura
                                    </div>
                                </span>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="includeFileSize">
                                    <span class="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                        
                        <div class="form-group" style="margin-top: 20px;">
                            <label style="display: flex; align-items: center; justify-content: space-between;">
                                <span>
                                    <strong>Mostrar fecha de modificación</strong>
                                    <div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-top: 4px;">
                                        Incluye la última fecha de modificación
                                    </div>
                                </span>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="includeLastModified">
                                    <span class="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🐛 Depuración</h3>
                            <p class="card-description">Opciones para solución de problemas</p>
                        </div>
                        
                        <div class="form-group">
                            <label style="display: flex; align-items: center; justify-content: space-between;">
                                <span>
                                    <strong>Modo debug</strong>
                                    <div style="color: var(--vscode-descriptionForeground); font-size: 0.9em; margin-top: 4px;">
                                        Muestra información detallada en la consola
                                    </div>
                                </span>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="debug">
                                    <span class="toggle-slider"></span>
                                </label>
                            </label>
                        </div>
                    </div>
                </section>

                <!-- Herramientas -->
                <section class="content-section" id="tools-section">
                    <h1 style="margin-bottom: 30px;">Herramientas</h1>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📥 Importar/Exportar</h3>
                            <p class="card-description">Guarda y restaura tu configuración</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button class="btn btn-secondary" id="exportButton">
                                📤 Exportar Configuración
                            </button>
                            <button class="btn btn-secondary" id="importButton">
                                📥 Importar Configuración
                            </button>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🧹 Mantenimiento</h3>
                            <p class="card-description">Acciones de mantenimiento de la configuración</p>
                        </div>
                        
                        <button class="btn btn-secondary" id="cleanDuplicatesBtn" style="width: 100%; margin-bottom: 10px;">
                            🔍 Limpiar Duplicados
                        </button>
                        
                        <button class="btn btn-secondary" id="sortPatternsBtn" style="width: 100%;">
                            🔤 Ordenar Patrones
                        </button>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">📚 Plantillas Comunes</h3>
                            <p class="card-description">Agrega exclusiones comunes con un clic</p>
                        </div>
                        
                        <div style="display: grid; gap: 10px;">
                            <button class="btn btn-secondary template-btn" data-template="node">
                                🟢 Node.js Project
                            </button>
                            <button class="btn btn-secondary template-btn" data-template="python">
                                🐍 Python Project
                            </button>
                            <button class="btn btn-secondary template-btn" data-template="java">
                                ☕ Java Project
                            </button>
                            <button class="btn btn-secondary template-btn" data-template="dotnet">
                                🔷 .NET Project
                            </button>
                        </div>
                    </div>
                </section>
            </main>
        </div>

        <!-- Notification container -->
        <div id="notificationContainer" style="position: fixed; top: 20px; right: 20px; z-index: 2000;"></div>

        <script nonce="${nonce}">
            ${this.getWebviewScript()}
        </script>
    </body>
    </html>`;

    Logger.functionEnd('getWebviewContent', 'HTML generado');
    return html;
  }

  /**
   * Genera el script JavaScript para la webview.
   * [NOTA: Este método mantiene el script original por ser muy extenso]
   *
   * @returns JavaScript como string
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private getWebviewScript(): string {
    // [El script se mantiene igual que en el archivo original]
    return `
    const vscode = acquireVsCodeApi();
    let currentConfig = {};
    
    // Función de logging que envía a la extensión
    function log(level, message, data) {
        console.log(\`[\${level}] \${message}\`, data);
        vscode.postMessage({
            command: 'log',
            level: level,
            message: message,
            data: data
        });
    }
    
    log('info', 'Script de webview iniciado');

    // Inicializar navegación
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.content-section');
        
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = item.dataset.section;
                
                // Actualizar clases activas
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
                
                // Mostrar sección correspondiente
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetSection + '-section') {
                        section.classList.add('active');
                    }
                });
            });
        });
    }

    // Inicializar tabs
    function initTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Actualizar tabs activos
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Mostrar contenido correspondiente
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.dataset.tabContent === targetTab) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }

    // Manejar mensajes desde la extensión
    window.addEventListener('message', event => {
        const message = event.data;
        log('info', 'Mensaje recibido', message);
        
        switch (message.command) {
            case 'loadConfig':
                currentConfig = message.config;
                log('info', 'Configuración cargada', currentConfig);
                updateUI();
                
                // Actualizar indicador de fuente de configuración
                if (message.source) {
                    const sourceEl = document.getElementById('configSource');
                    if (sourceEl) {
                        let sourceText = '';
                        let sourceIcon = '';
                        switch (message.source) {
                            case 'workspace':
                                sourceIcon = '📁';
                                sourceText = 'Proyecto';
                                break;
                            case 'global':
                                sourceIcon = '🌐';
                                sourceText = 'Global';
                                break;
                            case 'default':
                                sourceIcon = '📋';
                                sourceText = 'Por defecto';
                                break;
                        }
                        sourceEl.innerHTML = \`\${sourceIcon} \${sourceText}\`;
                    }
                }
                break;
            case 'configSaved':
                if (message.success) {
                    showNotification('Configuración guardada exitosamente', 'success');
                    // Recargar para actualizar el indicador de fuente
                    vscode.postMessage({ command: 'loadConfig' });
                } else {
                    showNotification('Error al guardar la configuración', 'error');
                }
                break;
            case 'gitignoreImported':
                if (message.data) {
                    // Agregar los patrones importados
                    const { patterns, folders, files } = message.data;
                    
                    // Agregar a las listas correspondientes
                    if (patterns.length > 0) {
                        currentConfig.exclude.advanced.patterns = [
                            ...new Set([...currentConfig.exclude.advanced.patterns, ...patterns])
                        ];
                    }
                    if (folders.length > 0) {
                        currentConfig.exclude.folders = [
                            ...new Set([...currentConfig.exclude.folders, ...folders])
                        ];
                    }
                    if (files.length > 0) {
                        currentConfig.exclude.files = [
                            ...new Set([...currentConfig.exclude.files, ...files])
                        ];
                    }
                    
                    updateUI();
                    showNotification('Patrones importados desde .gitignore', 'success');
                }
                break;
            case 'patternTestResult':
                displayPatternTestResults(message.pattern, message.matches, message.hasMore);
                break;
            case 'statsLoaded':
                updateStats(message.stats);
                break;
        }
    });

    // Actualizar estadísticas
    function updateStats(stats) {
        const statsGrid = document.getElementById('statsGrid');
        if (statsGrid && stats) {
            statsGrid.innerHTML = \`
                <div class="stat-card">
                    <p class="stat-value">\${stats.totalFiles.toLocaleString()}</p>
                    <p class="stat-label">Archivos Totales</p>
                </div>
                <div class="stat-card">
                    <p class="stat-value">\${stats.excludedFiles.toLocaleString()}</p>
                    <p class="stat-label">Archivos Excluidos</p>
                </div>
                <div class="stat-card">
                    <p class="stat-value">\${stats.totalFolders.toLocaleString()}</p>
                    <p class="stat-label">Carpetas Totales</p>
                </div>
                <div class="stat-card">
                    <p class="stat-value">\${stats.excludedFolders.toLocaleString()}</p>
                    <p class="stat-label">Carpetas Excluidas</p>
                </div>
            \`;
            
            // Actualizar barras de progreso
            document.getElementById('filesProgress').style.width = stats.percentExcludedFiles + '%';
            document.getElementById('foldersProgress').style.width = stats.percentExcludedFolders + '%';
            document.getElementById('sizeProgress').style.width = stats.percentExcludedSize + '%';
        }
    }

    // Mostrar resultados de prueba de patrón
    function displayPatternTestResults(pattern, matches, hasMore) {
        const resultsEl = document.getElementById('patternTestResults');
        if (!resultsEl) return;
        
        if (matches.length === 0) {
            resultsEl.innerHTML = '<div style="color: var(--vscode-descriptionForeground);">No se encontraron coincidencias</div>';
        } else {
            let html = '<div style="margin-bottom: 10px;">Coincidencias encontradas:</div>';
            matches.forEach(match => {
                html += \`<div class="test-match">\${match}</div>\`;
            });
            if (hasMore) {
                html += '<div style="color: var(--vscode-descriptionForeground); margin-top: 10px;">...y más</div>';
            }
            resultsEl.innerHTML = html;
        }
    }
    
    // Configurar event listeners usando addEventListener
    document.addEventListener('DOMContentLoaded', () => {
        log('info', 'DOM cargado, configurando event listeners');
        
        // Inicializar navegación y tabs
        initNavigation();
        initTabs();
        
        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        if (mobileMenuToggle && sidebar) {
            mobileMenuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
        
        // Botones de agregar para estructura
        document.getElementById('addExcludeFolder')?.addEventListener('click', () => {
            addItem('excludeFolders', 'newExcludeFolder');
        });
        
        document.getElementById('addExcludeFile')?.addEventListener('click', () => {
            addItem('excludeFiles', 'newExcludeFile');
        });
        
        document.getElementById('addAdvancedPattern')?.addEventListener('click', () => {
            addItem('advancedPatterns', 'newAdvancedPattern');
        });
        
        document.getElementById('addSpecificFile')?.addEventListener('click', () => {
            addItem('specificFiles', 'newSpecificFile');
        });
        
        document.getElementById('addSpecificFolder')?.addEventListener('click', () => {
            addItem('specificFolders', 'newSpecificFolder');
        });
        
        document.getElementById('addRegexPattern')?.addEventListener('click', () => {
            addItem('regexPatterns', 'newRegexPattern');
        });
        
        // Botones de agregar para contenido
        document.getElementById('addContentFile')?.addEventListener('click', () => {
            addItem('contentFiles', 'newContentFile');
        });
        
        document.getElementById('addContentFolder')?.addEventListener('click', () => {
            addItem('contentFolders', 'newContentFolder');
        });
        
        document.getElementById('addContentPattern')?.addEventListener('click', () => {
            addItem('contentPatterns', 'newContentPattern');
        });
        
        // Botones de acción principales
        document.getElementById('saveButton')?.addEventListener('click', saveConfiguration);
        document.getElementById('resetConfigBtn')?.addEventListener('click', resetConfiguration);
        document.getElementById('exportButton')?.addEventListener('click', exportConfiguration);
        document.getElementById('importButton')?.addEventListener('click', importConfiguration);
        
        // Botones de herramientas
        document.getElementById('importGitignoreBtn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'importGitignore' });
        });
        
        document.getElementById('cleanDuplicatesBtn')?.addEventListener('click', cleanDuplicates);
        document.getElementById('sortPatternsBtn')?.addEventListener('click', sortPatterns);
        
        // Test de patrones
        document.getElementById('testPatternBtn')?.addEventListener('click', () => {
            const pattern = document.getElementById('testPattern').value;
            if (pattern) {
                vscode.postMessage({ 
                    command: 'testPattern',
                    pattern: pattern,
                    type: 'glob'
                });
            }
        });
        
        // Plantillas
        document.querySelectorAll('.template-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                applyTemplate(btn.dataset.template);
            });
        });
        
        // Búsqueda
        setupSearch();
        
        // Toggle switches para opciones de salida
        document.getElementById('includeContent')?.addEventListener('change', (e) => {
            if (!currentConfig.output) currentConfig.output = {};
            currentConfig.output.includeContent = e.target.checked;
        });
        
        document.getElementById('includeEmptyFolders')?.addEventListener('change', (e) => {
            if (!currentConfig.output) currentConfig.output = {};
            currentConfig.output.includeEmptyFolders = e.target.checked;
        });
        
        document.getElementById('includeFileSize')?.addEventListener('change', (e) => {
            if (!currentConfig.output) currentConfig.output = {};
            currentConfig.output.includeFileSize = e.target.checked;
        });
        
        document.getElementById('includeLastModified')?.addEventListener('change', (e) => {
            if (!currentConfig.output) currentConfig.output = {};
            currentConfig.output.includeLastModified = e.target.checked;
        });
        
        // Debug toggle
        document.getElementById('debug')?.addEventListener('change', (e) => {
            currentConfig.debug = e.target.checked;
        });
        
        // Botón de agregar exclusiones comunes
        document.getElementById('addCommonExclusionsBtn')?.addEventListener('click', () => {
            const commonExclusions = {
                folders: ['node_modules', '.git', 'dist', 'build', '.tmp', 'out'],
                files: ['*.log', '*.lock', 'package-lock.json', 'yarn.lock'],
                patterns: ['**/*.min.js', '**/*.map', '**/.DS_Store']
            };
            
            currentConfig.exclude.folders = [
                ...new Set([...currentConfig.exclude.folders, ...commonExclusions.folders])
            ];
            currentConfig.exclude.files = [
                ...new Set([...currentConfig.exclude.files, ...commonExclusions.files])
            ];
            currentConfig.exclude.advanced.patterns = [
                ...new Set([...currentConfig.exclude.advanced.patterns, ...commonExclusions.patterns])
            ];
            
            updateUI();
            showNotification('Exclusiones comunes agregadas', 'success');
        });
        
        log('info', 'Event listeners configurados');
        
        // Cargar configuración inicial
        vscode.postMessage({ command: 'loadConfig' });
        vscode.postMessage({ command: 'getStats' });
    });
    
    // Event delegation para botones de eliminar
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('remove-btn')) {
            log('info', 'Click en botón eliminar', { target: e.target.className });
            
            const listItem = e.target.closest('.enhanced-list-item');
            if (!listItem) {
                log('error', 'No se encontró el elemento .enhanced-list-item');
                return;
            }
            
            const container = listItem.parentElement;
            if (!container) {
                log('error', 'No se encontró el contenedor');
                return;
            }
            
            const containerId = container.id;
            const index = Array.from(container.children).indexOf(listItem);
            
            log('info', 'Eliminando item', { containerId, index });
            removeItem(containerId, index);
        }
    });

    // Configurar búsqueda
    function setupSearch() {
        const searchInputs = document.querySelectorAll('.search-input');
        
        searchInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const searchTerm = e.target.value.toLowerCase();
                const targetListId = e.target.id.replace('search', '').charAt(0).toLowerCase() + e.target.id.replace('search', '').slice(1);
                const listItems = document.querySelectorAll(\`#\${targetListId} .enhanced-list-item\`);
                
                listItems.forEach(item => {
                    const text = item.querySelector('.item-text')?.textContent.toLowerCase() || '';
                    if (text.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }

    // Actualizar la interfaz con la configuración actual
    function updateUI() {
        log('info', 'Actualizando UI');
        
        try {
            // Opciones de salida
            const includeContentEl = document.getElementById('includeContent');
            if (includeContentEl) {
                includeContentEl.checked = currentConfig.output?.includeContent !== false;
            }
            
            const includeEmptyFoldersEl = document.getElementById('includeEmptyFolders');
            if (includeEmptyFoldersEl) {
                includeEmptyFoldersEl.checked = currentConfig.output?.includeEmptyFolders !== false;
            }
            
            const includeFileSizeEl = document.getElementById('includeFileSize');
            if (includeFileSizeEl) {
                includeFileSizeEl.checked = currentConfig.output?.includeFileSize === true;
            }
            
            const includeLastModifiedEl = document.getElementById('includeLastModified');
            if (includeLastModifiedEl) {
                includeLastModifiedEl.checked = currentConfig.output?.includeLastModified === true;
            }

            // Debug
            const debugCheckbox = document.getElementById('debug');
            if (debugCheckbox) {
                debugCheckbox.checked = currentConfig.debug || false;
                log('info', 'Debug checkbox actualizado', currentConfig.debug);
            }

            // Basic exclusions
            updateList('excludeFolders', currentConfig.exclude?.folders || []);
            updateList('excludeFiles', currentConfig.exclude?.files || []);

            // Advanced exclusions
            updateList('advancedPatterns', currentConfig.exclude?.advanced?.patterns || []);
            updateList('specificFiles', currentConfig.exclude?.advanced?.specificFiles || []);
            updateList('specificFolders', currentConfig.exclude?.advanced?.specificFolders || []);
            updateList('regexPatterns', currentConfig.exclude?.advanced?.regexPatterns || []);

            // Content exclusions
            updateList('contentFiles', currentConfig.excludeContent?.files || []);
            updateList('contentFolders', currentConfig.excludeContent?.folders || []);
            updateList('contentPatterns', currentConfig.excludeContent?.patterns || []);
            
            log('info', 'UI actualizada completamente');
        } catch (error) {
            log('error', 'Error actualizando UI', error);
        }
    }

    // Actualizar una lista en la UI con diseño mejorado
    function updateList(containerId, items) {
        log('info', 'Actualizando lista', { containerId, items });
        
        const container = document.getElementById(containerId);
        if (!container) {
            log('error', 'Contenedor no encontrado', containerId);
            return;
        }
        
        container.innerHTML = '';
        
        if (items.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">No hay elementos</div>';
            return;
        }
        
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'enhanced-list-item';
            
            // Determinar el icono según el tipo
            let icon = '📄';
            if (containerId.includes('Folder')) {
                icon = '📁';
            } else if (containerId.includes('Pattern') || containerId.includes('Regex')) {
                icon = '🎯';
            }
            
            itemEl.innerHTML = \`
                <div class="item-content">
                    <span class="item-icon">\${icon}</span>
                    <span class="item-text">\${item}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-icon remove-btn danger" title="Eliminar">🗑️</button>
                </div>
            \`;
            container.appendChild(itemEl);
        });
        
        log('info', 'Lista actualizada', { containerId, count: items.length });
    }

    // Agregar item a una lista
    function addItem(listId, inputId) {
        log('info', 'Agregando item', { listId, inputId });
        
        const input = document.getElementById(inputId);
        if (!input) {
            log('error', 'Input no encontrado', inputId);
            return;
        }
        
        const value = input.value.trim();
        log('info', 'Valor del input', value);
        
        if (!value) {
            log('warn', 'Valor vacío, cancelando');
            showNotification('El valor no puede estar vacío', 'warning');
            return;
        }

        // Obtener la lista actual
        const path = getConfigPath(listId);
        log('info', 'Path de configuración', path);
        
        const currentList = getNestedProperty(currentConfig, path) || [];
        log('info', 'Lista actual', currentList);
        
        // Verificar duplicados
        if (currentList.includes(value)) {
            log('warn', 'Valor duplicado', value);
            showNotification('Este valor ya existe en la lista', 'warning');
            return;
        }

        // Agregar el nuevo valor
        currentList.push(value);
        setNestedProperty(currentConfig, path, currentList);
        
        log('info', 'Valor agregado a la lista', { path, newList: currentList });
        
        // Actualizar UI
        updateList(listId, currentList);
        input.value = '';
        
        showNotification('Item agregado', 'success');
        
        // Actualizar estadísticas
        vscode.postMessage({ command: 'getStats' });
    }

    // Eliminar item de una lista
    function removeItem(listId, index) {
        log('info', 'Eliminando item', { listId, index });
        
        const path = getConfigPath(listId);
        const currentList = getNestedProperty(currentConfig, path) || [];
        
        log('info', 'Lista antes de eliminar', currentList);
        
        currentList.splice(index, 1);
        setNestedProperty(currentConfig, path, currentList);
        
        log('info', 'Lista después de eliminar', currentList);
        
        updateList(listId, currentList);
        showNotification('Item eliminado', 'info');
        
        // Actualizar estadísticas
        vscode.postMessage({ command: 'getStats' });
    }

    // Obtener la ruta de configuración para un ID de lista
    function getConfigPath(listId) {
        const paths = {
            'excludeFolders': 'exclude.folders',
            'excludeFiles': 'exclude.files',
            'advancedPatterns': 'exclude.advanced.patterns',
            'specificFiles': 'exclude.advanced.specificFiles',
            'specificFolders': 'exclude.advanced.specificFolders',
            'regexPatterns': 'exclude.advanced.regexPatterns',
            'contentFiles': 'excludeContent.files',
            'contentFolders': 'excludeContent.folders',
            'contentPatterns': 'excludeContent.patterns'
        };
        return paths[listId];
    }

    // Obtener propiedad anidada
    function getNestedProperty(obj, path) {
        const result = path.split('.').reduce((curr, prop) => curr?.[prop], obj);
        log('info', 'getNestedProperty', { path, result });
        return result;
    }

    // Establecer propiedad anidada
    function setNestedProperty(obj, path, value) {
        log('info', 'setNestedProperty', { path, value });
        
        const parts = path.split('.');
        const last = parts.pop();
        const target = parts.reduce((curr, prop) => {
            if (!curr[prop]) curr[prop] = {};
            return curr[prop];
        }, obj);
        target[last] = value;
    }

    // Guardar configuración
    function saveConfiguration() {
        log('info', 'Guardando configuración');
        
        // Actualizar debug
        const debugCheckbox = document.getElementById('debug');
        if (debugCheckbox) {
            currentConfig.debug = debugCheckbox.checked;
        }
        
        log('info', 'Configuración a guardar', currentConfig);
        
        // Enviar a la extensión
        vscode.postMessage({
            command: 'saveConfig',
            config: currentConfig
        });
    }

    // Restablecer configuración
    function resetConfiguration() {
        log('info', 'Restableciendo configuración');
        vscode.postMessage({ command: 'resetConfig' });
    }

    // Exportar configuración
    function exportConfiguration() {
        log('info', 'Exportando configuración');
        
        const dataStr = JSON.stringify(currentConfig, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportAnchor = document.createElement('a');
        exportAnchor.setAttribute('href', dataUri);
        exportAnchor.setAttribute('download', 'faststruct-config.json');
        exportAnchor.click();
        
        showNotification('Configuración exportada', 'success');
    }

    // Importar configuración
    function importConfiguration() {
        log('info', 'Importando configuración');
        
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) {
                log('warn', 'No se seleccionó archivo');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = event => {
                try {
                    const importedConfig = JSON.parse(event.target.result);
                    log('info', 'Configuración importada', importedConfig);
                    
                    currentConfig = importedConfig;
                    updateUI();
                    showNotification('Configuración importada exitosamente', 'success');
                    
                    // Actualizar estadísticas
                    vscode.postMessage({ command: 'getStats' });
                } catch (error) {
                    log('error', 'Error al parsear JSON', error);
                    showNotification('Error al importar la configuración', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Limpiar duplicados
    function cleanDuplicates() {
        let duplicatesRemoved = 0;
        
        // Función para eliminar duplicados de un array
        const removeDuplicates = (arr) => {
            const originalLength = arr.length;
            const unique = [...new Set(arr)];
            duplicatesRemoved += originalLength - unique.length;
            return unique;
        };
        
        // Limpiar todas las listas
        currentConfig.exclude.folders = removeDuplicates(currentConfig.exclude.folders);
        currentConfig.exclude.files = removeDuplicates(currentConfig.exclude.files);
        currentConfig.exclude.advanced.patterns = removeDuplicates(currentConfig.exclude.advanced.patterns);
        currentConfig.exclude.advanced.specificFiles = removeDuplicates(currentConfig.exclude.advanced.specificFiles);
        currentConfig.exclude.advanced.specificFolders = removeDuplicates(currentConfig.exclude.advanced.specificFolders);
        currentConfig.exclude.advanced.regexPatterns = removeDuplicates(currentConfig.exclude.advanced.regexPatterns);
        currentConfig.excludeContent.files = removeDuplicates(currentConfig.excludeContent.files);
        currentConfig.excludeContent.folders = removeDuplicates(currentConfig.excludeContent.folders);
        currentConfig.excludeContent.patterns = removeDuplicates(currentConfig.excludeContent.patterns);
        
        updateUI();
        
        if (duplicatesRemoved > 0) {
            showNotification(\`Se eliminaron \${duplicatesRemoved} duplicados\`, 'success');
        } else {
            showNotification('No se encontraron duplicados', 'info');
        }
    }

    // Ordenar patrones
    function sortPatterns() {
        // Ordenar todas las listas alfabéticamente
        currentConfig.exclude.folders.sort();
        currentConfig.exclude.files.sort();
        currentConfig.exclude.advanced.patterns.sort();
        currentConfig.exclude.advanced.specificFiles.sort();
        currentConfig.exclude.advanced.specificFolders.sort();
        currentConfig.exclude.advanced.regexPatterns.sort();
        currentConfig.excludeContent.files.sort();
        currentConfig.excludeContent.folders.sort();
        currentConfig.excludeContent.patterns.sort();
        
        updateUI();
        showNotification('Patrones ordenados alfabéticamente', 'success');
    }

    // Aplicar plantillas predefinidas
    function applyTemplate(templateName) {
        const templates = {
            node: {
                folders: ['node_modules', '.git', 'dist', 'build', 'coverage', '.npm', '.yarn'],
                files: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'package-lock.json', 'yarn.lock'],
                patterns: ['**/*.min.js', '**/*.map', '**/bundle.js']
            },
            python: {
                folders: ['__pycache__', '.git', 'venv', 'env', '.pytest_cache', '.mypy_cache', 'build', 'dist'],
                files: ['*.pyc', '*.pyo', '*.pyd', '.Python', '*.so', '*.egg-info'],
                patterns: ['**/__pycache__/**', '**/*.egg-info/**']
            },
            java: {
                folders: ['.git', 'target', 'out', 'build', '.gradle', '.idea', '.mvn'],
                files: ['*.class', '*.jar', '*.war', '*.ear', '.classpath', '.project'],
                patterns: ['**/target/**', '**/build/**']
            },
            dotnet: {
                folders: ['.git', 'bin', 'obj', '.vs', 'packages', 'TestResults'],
                files: ['*.dll', '*.exe', '*.pdb', '*.user', '*.cache'],
                patterns: ['**/bin/**', '**/obj/**']
            }
        };
        
        const template = templates[templateName];
        if (!template) return;
        
        // Agregar elementos de la plantilla sin duplicados
        currentConfig.exclude.folders = [
            ...new Set([...currentConfig.exclude.folders, ...template.folders])
        ];
        currentConfig.exclude.files = [
            ...new Set([...currentConfig.exclude.files, ...template.files])
        ];
        currentConfig.exclude.advanced.patterns = [
            ...new Set([...currentConfig.exclude.advanced.patterns, ...template.patterns])
        ];
        
        updateUI();
        showNotification(\`Plantilla "\${templateName}" aplicada\`, 'success');
        
        // Actualizar estadísticas
        vscode.postMessage({ command: 'getStats' });
    }

    // Mostrar notificación mejorada
    function showNotification(message, type) {
        log('info', 'Mostrando notificación', { message, type });
        
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.style.cssText = \`
            background-color: var(--vscode-\${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-background);
            border: 1px solid var(--vscode-\${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-border);
            color: var(--vscode-\${type === 'error' ? 'editorError' : type === 'warning' ? 'editorWarning' : 'editorInfo'}-foreground);
            padding: 12px 20px;
            border-radius: 6px;
            margin-bottom: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 300px;
            animation: slideIn 0.3s ease;
        \`;
        
        const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
        notification.innerHTML = \`<span>\${icon}</span><span>\${message}</span>\`;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Animaciones CSS
    const style = document.createElement('style');
    style.textContent = \`
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    \`;
    document.head.appendChild(style);
    `;
  }

  /**
   * Genera un nonce para seguridad CSP.
   *
   * @returns String aleatorio para nonce
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private getNonce(): string {
    let text = '';
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}

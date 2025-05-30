import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from './logger';

/**
 * Proveedor de webview para la interfaz de configuración de FastStruct.
 * 
 * Esta clase maneja la creación y gestión de la interfaz web para
 * configurar la extensión de manera visual e intuitiva.
 * 
 * @author Pablo Contreras
 * @created 2025/01/30
 */
export class ConfigWebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    Logger.info('ConfigWebviewProvider inicializado');
  }

  /**
   * Muestra la interfaz de configuración en un panel webview.
   * 
   * @author Pablo Contreras
   * @created 2025/01/30
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
          vscode.Uri.joinPath(this.context.extensionUri, 'media')
        ]
      }
    );

    Logger.info('Panel creado, estableciendo contenido HTML');

    // Establecer el contenido HTML
    this.panel.webview.html = this.getWebviewContent();

    Logger.info('HTML establecido, configurando manejadores de mensajes');

    // Manejar mensajes desde la webview
    this.panel.webview.onDidReceiveMessage(
      async message => {
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
    
    Logger.functionEnd('ConfigWebviewProvider.show', 'Panel mostrado');
  }

/**
 * Guarda la configuración en los settings de VS Code.
 * 
 * @param config - Configuración a guardar
 * @author Pablo Contreras
 * @created 2025/01/30
 */
private async saveConfiguration(config: any) {
  Logger.functionStart('saveConfiguration', config);
  
  const configuration = vscode.workspace.getConfiguration('faststruct');
  
  try {
    Logger.info('Actualizando configuración en VS Code');
    
    // Preguntar al usuario dónde guardar la configuración
    const saveLocation = await vscode.window.showQuickPick(
      [
        { label: 'Workspace', description: 'Guardar en .vscode/settings.json (solo este proyecto)', value: vscode.ConfigurationTarget.Workspace },
        { label: 'Usuario', description: 'Guardar globalmente (todos los proyectos)', value: vscode.ConfigurationTarget.Global }
      ],
      { placeHolder: '¿Dónde deseas guardar la configuración?' }
    );
    
    if (!saveLocation) {
      // El usuario canceló
      Logger.info('Guardado cancelado por el usuario');
      return;
    }
    
    // Guardar todo el objeto de configuración de una vez
    await configuration.update('config', config, saveLocation.value);
    
    Logger.info(`Configuración guardada exitosamente en ${saveLocation.label}`);
    
    // Mostrar mensaje de éxito con la ubicación
    vscode.window.showInformationMessage(`Configuración guardada exitosamente en ${saveLocation.label}`);
    
    // Notificar a la webview
    this.panel?.webview.postMessage({
      command: 'configSaved',
      success: true,
      location: saveLocation.label
    });
    
    Logger.functionEnd('saveConfiguration', 'Éxito');
  } catch (error) {
    Logger.error('Error al guardar la configuración', error);
    vscode.window.showErrorMessage(`Error al guardar la configuración: ${error}`);
    
    this.panel?.webview.postMessage({
      command: 'configSaved',
      success: false,
      error: error
    });
    
    Logger.functionEnd('saveConfiguration', 'Error');
  }
}

/**
 * Verifica y muestra información sobre la ubicación de la configuración actual.
 * 
 * @author Pablo Contreras
 * @created 2025/01/30
 */
private checkConfigurationLocation() {
  const configuration = vscode.workspace.getConfiguration('faststruct');
  const inspect = configuration.inspect('config');
  
  Logger.info('Inspección de configuración', inspect);
  
  let message = 'Configuración FastStruct:\n\n';
  
  if (inspect?.globalValue) {
    message += '✓ Configuración Global (Usuario) encontrada\n';
  }
  
  if (inspect?.workspaceValue) {
    message += '✓ Configuración de Workspace encontrada\n';
  }
  
  if (inspect?.workspaceFolderValue) {
    message += '✓ Configuración de Carpeta de Workspace encontrada\n';
  }
  
  if (inspect?.defaultValue) {
    message += '✓ Usando valores por defecto\n';
  }
  
  // Mostrar qué configuración tiene prioridad
  if (inspect?.workspaceFolderValue) {
    message += '\n📍 Usando: Configuración de Carpeta de Workspace';
  } else if (inspect?.workspaceValue) {
    message += '\n📍 Usando: Configuración de Workspace (.vscode/settings.json)';
  } else if (inspect?.globalValue) {
    message += '\n📍 Usando: Configuración Global de Usuario';
  } else {
    message += '\n📍 Usando: Valores por defecto';
  }
  
  vscode.window.showInformationMessage(message, { modal: true });
}

  /**
   * Carga la configuración actual y la envía a la webview.
   * 
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private loadConfiguration() {
    Logger.functionStart('loadConfiguration');
    
    const configuration = vscode.workspace.getConfiguration('faststruct');
    const config = configuration.get('config', this.getDefaultConfig());
    
    Logger.info('Configuración cargada', config);
    
    const message = {
      command: 'loadConfig',
      config: config
    };
    
    Logger.info('Enviando configuración a webview', message);
    this.panel?.webview.postMessage(message);
    
    Logger.functionEnd('loadConfiguration');
  }

  /**
   * Restablece la configuración a los valores por defecto.
   * 
   * @author Pablo Contreras
   * @created 2025/01/30
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
      const defaultConfig = this.getDefaultConfig();
      Logger.info('Restableciendo a configuración por defecto', defaultConfig);
      
      await this.saveConfiguration(defaultConfig);
      
      this.panel?.webview.postMessage({
        command: 'loadConfig',
        config: defaultConfig
      });
    }
    
    Logger.functionEnd('resetConfiguration');
  }

  /**
   * Obtiene la configuración por defecto.
   * 
   * @returns Objeto con la configuración por defecto
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private getDefaultConfig() {
    return {
      debug: false,
      exclude: {
        folders: [
          "node_modules",
          ".git",
          "dist",
          "build",
          ".tmp",
          "out",
          ".astro",
          ".unlighthouse"
        ],
        files: [
          "*.log",
          "*.lock",
          "package-lock.json",
          "pnpm-lock.yaml",
          "yarn.lock"
        ],
        advanced: {
          patterns: ["**/*.min.js", "**/*.generated.*"],
          specificFiles: [],
          specificFolders: [],
          regexPatterns: []
        }
      },
      excludeContent: {
        files: ["*.config.js", "db/data.ts"],
        folders: ["src/config", "tests"],
        patterns: [
          "*.vsix",
          "**/*.secret.*",
          "**/.secrets**",
          "**/*/.env**"
        ]
      }
    };
  }

  /**
   * Genera el contenido HTML para la webview.
   * 
   * @returns HTML string
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private getWebviewContent(): string {
    Logger.functionStart('getWebviewContent');
    
    const styleUri = this.panel?.webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'configStyle.css')
    );

    const nonce = this.getNonce();
    
    Logger.info('URIs generadas', { styleUri: styleUri?.toString(), nonce });

    const html = `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this.panel?.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>FastStruct Configuration</title>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>⚙️ FastStruct Configuration</h1>
                <p class="subtitle">Personaliza cómo FastStruct genera la estructura de tu proyecto</p>
            </header>

            <div class="config-sections">
                <!-- Debug Section -->
                <section class="config-section">
                    <h2>🐛 Depuración</h2>
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="debug" />
                            <span>Habilitar modo debug</span>
                        </label>
                        <p class="help-text">Muestra información detallada en la consola para solución de problemas</p>
                    </div>
                </section>

                <!-- Basic Exclusions -->
                <section class="config-section">
                    <h2>📁 Exclusiones Básicas</h2>
                    
                    <div class="form-group">
                        <label>Carpetas a Excluir</label>
                        <div class="list-container" id="excludeFolders">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newExcludeFolder" placeholder="ej: node_modules" />
                            <button id="addExcludeFolder">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Archivos a Excluir</label>
                        <div class="list-container" id="excludeFiles">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newExcludeFile" placeholder="ej: *.log" />
                            <button id="addExcludeFile">➕ Agregar</button>
                        </div>
                    </div>
                </section>

                <!-- Advanced Exclusions -->
                <section class="config-section">
                    <h2>🔧 Exclusiones Avanzadas</h2>
                    
                    <div class="form-group">
                        <label>Patrones Glob</label>
                        <p class="help-text">Usa patrones glob para coincidencias complejas</p>
                        <div class="list-container" id="advancedPatterns">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newAdvancedPattern" placeholder="ej: **/*.min.js" />
                            <button id="addAdvancedPattern">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Archivos Específicos</label>
                        <p class="help-text">Rutas relativas de archivos específicos</p>
                        <div class="list-container" id="specificFiles">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newSpecificFile" placeholder="ej: src/config/secret.json" />
                            <button id="addSpecificFile">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Carpetas Específicas</label>
                        <p class="help-text">Rutas relativas de carpetas específicas</p>
                        <div class="list-container" id="specificFolders">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newSpecificFolder" placeholder="ej: tests/fixtures/" />
                            <button id="addSpecificFolder">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Expresiones Regulares</label>
                        <p class="help-text">Patrones regex para exclusiones complejas</p>
                        <div class="list-container" id="regexPatterns">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newRegexPattern" placeholder="ej: src/.*\\.temp\\.*" />
                            <button id="addRegexPattern">➕ Agregar</button>
                        </div>
                    </div>
                </section>

                <!-- Content Exclusions -->
                <section class="config-section">
                    <h2>📝 Exclusiones de Contenido</h2>
                    <p class="section-description">Los archivos aparecerán en la estructura pero su contenido no se mostrará</p>
                    
                    <div class="form-group">
                        <label>Archivos</label>
                        <div class="list-container" id="contentFiles">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newContentFile" placeholder="ej: *.env" />
                            <button id="addContentFile">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Carpetas</label>
                        <div class="list-container" id="contentFolders">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newContentFolder" placeholder="ej: src/config" />
                            <button id="addContentFolder">➕ Agregar</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Patrones</label>
                        <div class="list-container" id="contentPatterns">
                            <!-- Se llenará dinámicamente -->
                        </div>
                        <div class="add-item">
                            <input type="text" id="newContentPattern" placeholder="ej: **/*.secret.*" />
                            <button id="addContentPattern">➕ Agregar</button>
                        </div>
                    </div>
                </section>
            </div>

            <div class="actions">
                <button class="btn btn-primary" id="saveButton">💾 Guardar Configuración</button>
                <button class="btn btn-secondary" id="resetButton">🔄 Restablecer</button>
                <button class="btn btn-secondary" id="exportButton">📤 Exportar</button>
                <button class="btn btn-secondary" id="importButton">📥 Importar</button>
            </div>
        </div>

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
   * 
   * @returns JavaScript como string
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private getWebviewScript(): string {
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

    // Manejar mensajes desde la extensión
    window.addEventListener('message', event => {
        const message = event.data;
        log('info', 'Mensaje recibido', message);
        
        switch (message.command) {
            case 'loadConfig':
                currentConfig = message.config;
                log('info', 'Configuración cargada', currentConfig);
                updateUI();
                break;
            case 'configSaved':
                if (message.success) {
                    showNotification('Configuración guardada exitosamente', 'success');
                } else {
                    showNotification('Error al guardar la configuración', 'error');
                }
                break;
        }
    });
    
    // Configurar event listeners usando addEventListener
    document.addEventListener('DOMContentLoaded', () => {
        log('info', 'DOM cargado, configurando event listeners');
        
        // Botones de agregar
        document.getElementById('addExcludeFolder')?.addEventListener('click', () => {
            log('info', 'Click en addExcludeFolder');
            addItem('excludeFolders', 'newExcludeFolder');
        });
        
        document.getElementById('addExcludeFile')?.addEventListener('click', () => {
            log('info', 'Click en addExcludeFile');
            addItem('excludeFiles', 'newExcludeFile');
        });
        
        document.getElementById('addAdvancedPattern')?.addEventListener('click', () => {
            log('info', 'Click en addAdvancedPattern');
            addItem('advancedPatterns', 'newAdvancedPattern');
        });
        
        document.getElementById('addSpecificFile')?.addEventListener('click', () => {
            log('info', 'Click en addSpecificFile');
            addItem('specificFiles', 'newSpecificFile');
        });
        
        document.getElementById('addSpecificFolder')?.addEventListener('click', () => {
            log('info', 'Click en addSpecificFolder');
            addItem('specificFolders', 'newSpecificFolder');
        });
        
        document.getElementById('addRegexPattern')?.addEventListener('click', () => {
            log('info', 'Click en addRegexPattern');
            addItem('regexPatterns', 'newRegexPattern');
        });
        
        document.getElementById('addContentFile')?.addEventListener('click', () => {
            log('info', 'Click en addContentFile');
            addItem('contentFiles', 'newContentFile');
        });
        
        document.getElementById('addContentFolder')?.addEventListener('click', () => {
            log('info', 'Click en addContentFolder');
            addItem('contentFolders', 'newContentFolder');
        });
        
        document.getElementById('addContentPattern')?.addEventListener('click', () => {
            log('info', 'Click en addContentPattern');
            addItem('contentPatterns', 'newContentPattern');
        });
        
        // Botones de acción
        document.getElementById('saveButton')?.addEventListener('click', saveConfiguration);
        document.getElementById('resetButton')?.addEventListener('click', resetConfiguration);
        document.getElementById('exportButton')?.addEventListener('click', exportConfiguration);
        document.getElementById('importButton')?.addEventListener('click', importConfiguration);
        
        log('info', 'Event listeners configurados');
        
        // Cargar configuración inicial
        vscode.postMessage({ command: 'loadConfig' });
    });
    
    // Event delegation para botones de eliminar
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList && e.target.classList.contains('remove-btn')) {
            log('info', 'Click en botón eliminar', { target: e.target.className });
            
            const listItem = e.target.closest('.list-item');
            if (!listItem) {
                log('error', 'No se encontró el elemento .list-item');
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

    // Actualizar la interfaz con la configuración actual
    function updateUI() {
        log('info', 'Actualizando UI');
        
        try {
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

    // Actualizar una lista en la UI
    function updateList(containerId, items) {
        log('info', 'Actualizando lista', { containerId, items });
        
        const container = document.getElementById(containerId);
        if (!container) {
            log('error', 'Contenedor no encontrado', containerId);
            return;
        }
        
        container.innerHTML = '';
        
        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'list-item';
            itemEl.innerHTML = \`
                <span>\${item}</span>
                <button class="remove-btn">❌</button>
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
        
        showNotification('Item agregado', 'info');
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
                } catch (error) {
                    log('error', 'Error al parsear JSON', error);
                    showNotification('Error al importar la configuración', 'error');
                }
            };
            
            reader.readAsText(file);
        };
        
        input.click();
    }

    // Mostrar notificación
    function showNotification(message, type) {
        log('info', 'Mostrando notificación', { message, type });
        
        const notification = document.createElement('div');
        notification.className = \`notification notification-\${type}\`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    `;
  }

  /**
   * Genera un nonce para seguridad CSP.
   * 
   * @returns String aleatorio para nonce
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
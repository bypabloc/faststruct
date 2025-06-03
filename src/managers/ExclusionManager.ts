import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { FastStructConfig, ExclusionType, ConfigPath } from '@/types';
import { ConfigurationService } from '@/services/ConfigurationService';
import { Logger } from '@/logger';

/**
 * Manejador de exclusiones dinámicas de FastStruct.
 * Gestiona la adición y eliminación de exclusiones en la configuración.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class ExclusionManager {
  private configService: ConfigurationService;
  
  /**
   * Constructor del manejador de exclusiones.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  constructor() {
    this.configService = ConfigurationService.getInstance();
  }
  
  /**
   * Agrega una exclusión a la configuración.
   * 
   * @param type - Tipo de exclusión
   * @param value - Valor a excluir
   * @param configPath - Ruta en la configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async addExclusion(type: ExclusionType, value: string, configPath: ConfigPath): Promise<void> {
    try {
      Logger.info(`Iniciando addExclusion: ${type} = ${value} en ${configPath}`);
      
      // Verificar workspace y preguntar si guardar globalmente
      const target = await this.determineConfigTarget();
      if (!target) return;
      
      // Crear directorio .vscode si es necesario
      if (target === vscode.ConfigurationTarget.Workspace) {
        await this.ensureVscodeDirectory();
      }
      
      // Obtener y actualizar configuración
      const config = this.configService.getConfiguration();
      const updatedConfig = this.updateConfigWithExclusion(config, configPath, value);
      
      if (!updatedConfig) {
        vscode.window.showWarningMessage(
          `FastStruct: '${value}' ya está en la lista de exclusiones`
        );
        return;
      }
      
      // Guardar configuración
      await this.configService.saveConfiguration(updatedConfig, target);
      
      // Mostrar notificación si está habilitado
      if (updatedConfig.quickExclude?.showNotifications !== false) {
        const location = target === vscode.ConfigurationTarget.Workspace 
          ? 'proyecto' 
          : 'globalmente';
        vscode.window.showInformationMessage(
          `FastStruct: ${type} '${value}' agregado a exclusiones del ${location}`
        );
      }
      
      Logger.info(`Exclusión agregada exitosamente: ${type} = ${value} en ${configPath}`);
    } catch (error) {
      Logger.error('Error al agregar exclusión', error);
      vscode.window.showErrorMessage(
        `Error al agregar exclusión: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Remueve una exclusión de la configuración.
   * 
   * @param value - Valor a remover
   * @param configPath - Ruta en la configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async removeExclusion(value: string, configPath: ConfigPath): Promise<void> {
    try {
      const config = this.configService.getConfiguration();
      const updatedConfig = this.removeFromConfig(config, configPath, value);
      
      if (!updatedConfig) {
        vscode.window.showWarningMessage(
          `FastStruct: '${value}' no se encuentra en las exclusiones`
        );
        return;
      }
      
      await this.configService.saveConfiguration(updatedConfig);
      
      vscode.window.showInformationMessage(
        `FastStruct: '${value}' removido de exclusiones`
      );
      
      Logger.info(`Exclusión removida: ${value} de ${configPath}`);
    } catch (error) {
      Logger.error('Error al remover exclusión', error);
      vscode.window.showErrorMessage(
        `Error al remover exclusión: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  
  /**
   * Muestra todas las exclusiones actuales en un documento.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async showExclusions(): Promise<void> {
    const config = this.configService.getConfiguration();
    const content = this.generateExclusionsReport(config);
    
    const document = await vscode.workspace.openTextDocument({
      content: content,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });
  }
  
  /**
   * Determina el target de configuración (Workspace o Global).
   * 
   * @returns Target de configuración o undefined si se cancela
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async determineConfigTarget(): Promise<vscode.ConfigurationTarget | undefined> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      const answer = await vscode.window.showWarningMessage(
        'No hay un workspace abierto. ¿Deseas guardar la exclusión globalmente?',
        'Sí',
        'No'
      );
      
      return answer === 'Sí' ? vscode.ConfigurationTarget.Global : undefined;
    }
    
    return vscode.ConfigurationTarget.Workspace;
  }
  
  /**
   * Asegura que el directorio .vscode existe en el workspace.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async ensureVscodeDirectory(): Promise<void> {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return;
    }
    
    const workspaceFolder = vscode.workspace.workspaceFolders[0];
    const vscodePath = path.join(workspaceFolder.uri.fsPath, '.vscode');
    
    if (!fs.existsSync(vscodePath)) {
      Logger.info(`Creando directorio .vscode en ${vscodePath}`);
      fs.mkdirSync(vscodePath, { recursive: true });
    }
  }
  
  /**
   * Actualiza la configuración con una nueva exclusión.
   * 
   * @param config - Configuración actual
   * @param configPath - Ruta en la configuración
   * @param value - Valor a agregar
   * @returns Configuración actualizada o null si ya existe
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private updateConfigWithExclusion(
    config: FastStructConfig,
    configPath: ConfigPath,
    value: string
  ): FastStructConfig | null {
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    const pathParts = configPath.split('.');
    
    // Navegar a la propiedad correcta
    let current: any = newConfig;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Obtener el array y verificar si ya existe
    const lastPart = pathParts[pathParts.length - 1];
    if (!current[lastPart] || !Array.isArray(current[lastPart])) {
      current[lastPart] = [];
    }
    
    if (current[lastPart].includes(value)) {
      return null; // Ya existe
    }
    
    current[lastPart].push(value);
    return newConfig;
  }
  
  /**
   * Remueve un valor de la configuración.
   * 
   * @param config - Configuración actual
   * @param configPath - Ruta en la configuración
   * @param value - Valor a remover
   * @returns Configuración actualizada o null si no existe
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private removeFromConfig(
    config: FastStructConfig,
    configPath: ConfigPath,
    value: string
  ): FastStructConfig | null {
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    const pathParts = configPath.split('.');
    
    // Navegar a la propiedad correcta
    let current: any = newConfig;
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        return null;
      }
      current = current[pathParts[i]];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    if (!current[lastPart] || !Array.isArray(current[lastPart])) {
      return null;
    }
    
    const index = current[lastPart].indexOf(value);
    if (index === -1) {
      return null;
    }
    
    current[lastPart].splice(index, 1);
    return newConfig;
  }
  
  /**
   * Genera un reporte de todas las exclusiones actuales.
   * 
   * @param config - Configuración de FastStruct
   * @returns Reporte en formato Markdown
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private generateExclusionsReport(config: FastStructConfig): string {
    let content = '# FastStruct - Exclusiones Actuales\n\n';
    
    content += '## Exclusiones de Estructura\n\n';
    
    content += '### Carpetas\n';
    content += config.exclude.folders.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '### Archivos\n';
    content += config.exclude.files.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '### Exclusiones Avanzadas\n\n';
    
    content += '#### Patrones\n';
    content += config.exclude.advanced.patterns.map(p => `- ${p}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '#### Archivos Específicos\n';
    content += config.exclude.advanced.specificFiles.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '#### Carpetas Específicas\n';
    content += config.exclude.advanced.specificFolders.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '#### Expresiones Regulares\n';
    content += config.exclude.advanced.regexPatterns.map(r => `- ${r}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '## Exclusiones de Contenido\n\n';
    
    content += '### Archivos\n';
    content += config.excludeContent.files.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '### Carpetas\n';
    content += config.excludeContent.folders.map(f => `- ${f}`).join('\n') || '*Ninguna*';
    content += '\n\n';
    
    content += '### Patrones\n';
    content += config.excludeContent.patterns.map(p => `- ${p}`).join('\n') || '*Ninguna*';
    
    return content;
  }
}
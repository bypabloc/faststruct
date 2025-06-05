import * as vscode from 'vscode';
import { Logger } from '../logger';
import { registerStructureCommands } from '../commands/structureCommands';
import { registerExclusionCommands } from '../commands/exclusionCommands';
import { registerConfigCommands } from '../commands/configCommands';
import { registerBranchComparisonCommands } from '../commands/branchComparisonCommands';

/**
 * Servicio para registrar todos los comandos de la extensión.
 * Centraliza el registro de comandos siguiendo SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class CommandRegistrationService {
  private static instance: CommandRegistrationService;
  
  /**
   * Obtiene la instancia singleton del servicio.
   * 
   * @returns Instancia del servicio de registro de comandos
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): CommandRegistrationService {
    if (!this.instance) {
      this.instance = new CommandRegistrationService();
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
   * Registra todos los comandos de la extensión.
   * 
   * @param context - Contexto de la extensión
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public registerAllCommands(context: vscode.ExtensionContext): void {
    Logger.functionStart('registerAllCommands');
    
    try {
      // Registrar comandos de estructura
      const structureDisposables = registerStructureCommands(context);
      context.subscriptions.push(...structureDisposables);
      Logger.info(`${structureDisposables.length} comandos de estructura registrados`);
      
      // Registrar comandos de exclusión
      const exclusionDisposables = registerExclusionCommands(context);
      context.subscriptions.push(...exclusionDisposables);
      Logger.info(`${exclusionDisposables.length} comandos de exclusión registrados`);
      
      // Registrar comandos de configuración
      const configDisposables = registerConfigCommands(context);
      context.subscriptions.push(...configDisposables);
      Logger.info(`${configDisposables.length} comandos de configuración registrados`);
      
      // Registrar comandos de comparación de ramas
      registerBranchComparisonCommands(context);
      Logger.info('Comandos de comparación de ramas registrados');
      
      // Registrar comando de verificación de salud
      this.registerHealthCheckCommand(context);
      
      // Registrar comando para activar debug rápidamente
      this.registerEnableDebugCommand(context);
      
      Logger.functionEnd('registerAllCommands', 'Todos los comandos registrados exitosamente');
    } catch (error) {
      Logger.error('Error registrando comandos', error);
      throw error;
    }
  }
  
  /**
   * Registra un comando de verificación de salud para debugging.
   * 
   * @param context - Contexto de la extensión
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private registerHealthCheckCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
      'faststruct.healthCheck',
      async () => {
        const commands = await vscode.commands.getCommands();
        const faststructCommands = commands.filter(cmd => cmd.startsWith('faststruct.'));
        
        // Obtener configuración actual
        const config = vscode.workspace.getConfiguration('faststruct');
        const faststructConfig = config.get('config', {}) as any;
        const isDebugEnabled = faststructConfig.debug === true;
        
        // Forzar mostrar el canal de output
        Logger.show();
        
        // Log siempre para verificar que funciona (usando console.log y Logger.error)
        console.log('[FastStruct] Health Check - Debug:', isDebugEnabled);
        console.log('[FastStruct] Extension Path:', context.extensionPath);
        try {
          console.log('[FastStruct] Extension URI:', context.extensionUri?.toString() || 'N/A');
        } catch (error) {
          console.log('[FastStruct] Extension URI: Error getting URI');
        }
        
        // Verificar archivos críticos
        const fs = require('fs');
        const path = require('path');
        const criticalFiles = [
          'out/main.js',
          'out/templates/webview/configWebview.html',
          'out/templates/webview/configWebview.css',
          'out/templates/webview/configWebview.js'
        ];
        
        Logger.error('[HEALTH CHECK] Extension Path: ' + context.extensionPath);
        Logger.error('[HEALTH CHECK] Extension URI: ' + context.extensionUri.toString());
        Logger.error('[HEALTH CHECK] Verificando archivos críticos:');
        
        for (const file of criticalFiles) {
          const fullPath = path.join(context.extensionPath, file);
          const exists = fs.existsSync(fullPath);
          Logger.error(`[HEALTH CHECK]   ${file}: ${exists ? '✓ EXISTE' : '✗ NO EXISTE'}`);
          if (!exists && file.includes('out/')) {
            // Verificar si existe en src/
            const srcPath = fullPath.replace('/out/', '/src/').replace('.js', '.ts');
            if (fs.existsSync(srcPath)) {
              Logger.error(`[HEALTH CHECK]     -> Encontrado en src: ${srcPath}`);
            }
          }
        }
        
        // Usar Logger.error para que siempre se vea en el Output
        Logger.error(`[HEALTH CHECK] Debug Mode: ${isDebugEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
        
        const message = `
FastStruct Health Check:
- Total comandos registrados: ${faststructCommands.length}
- Debug Mode: ${isDebugEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}
- Versión: ${context.extension.packageJSON.version}
- Extension Path: ${context.extensionPath}
- Estado: ✅ Activo

⚠️ Importante: Revisa el panel Output → FastStruct Debug para ver detalles de archivos
        `.trim();
        
        vscode.window.showInformationMessage(message, 'Ver Output').then(selection => {
          if (selection === 'Ver Output') {
            Logger.show();
          }
        });
        
        // Si debug está habilitado, hacer logs normales
        if (isDebugEnabled) {
          Logger.info('Health check ejecutado con DEBUG habilitado', { 
            commandCount: faststructCommands.length,
            version: context.extension.packageJSON.version,
            extensionPath: context.extensionPath,
            config: faststructConfig
          });
          Logger.debug('Configuración completa:', faststructConfig);
        } else {
          // Ayudar al usuario a habilitar debug
          Logger.error('[HEALTH CHECK] Para ver logs de debug, configura faststruct.config.debug: true');
        }
      }
    );
    
    context.subscriptions.push(disposable);
  }
  
  /**
   * Verifica si todos los comandos están registrados correctamente.
   * 
   * @returns Promise que resuelve a true si todos los comandos están registrados
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async verifyCommandRegistration(): Promise<boolean> {
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
      'faststruct.includeFolder',
      'faststruct.compareBranches',
      'faststruct.compareBranchesWithCurrent',
      'faststruct.compareBranchesStructure',
      'faststruct.listBranches'
    ];
    
    const registeredCommands = await vscode.commands.getCommands();
    const missingCommands = expectedCommands.filter(
      cmd => !registeredCommands.includes(cmd)
    );
    
    if (missingCommands.length > 0) {
      Logger.error('Comandos faltantes', missingCommands);
      return false;
    }
    
    Logger.info('Todos los comandos verificados correctamente');
    return true;
  }
  
  /**
   * Registra un comando para activar el modo debug rápidamente.
   * 
   * @param context - Contexto de la extensión
   * @author Pablo Contreras
   * @created 2025/01/30
   */
  private registerEnableDebugCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand(
      'faststruct.enableDebug',
      async () => {
        try {
          const config = vscode.workspace.getConfiguration('faststruct');
          const currentConfig = config.get('config', {}) as any;
          
          // Activar debug
          const updatedConfig = { ...currentConfig, debug: true };
          await config.update('config', updatedConfig, vscode.ConfigurationTarget.Workspace);
          
          // Confirmar que se activó
          Logger.forceShow('🐛 Modo DEBUG activado! Los logs ahora serán visibles en este canal.');
          Logger.info('Debug mode habilitado por el usuario via comando');
          
          vscode.window.showInformationMessage(
            '✅ Modo DEBUG activado! Revisa el panel Output → FastStruct Debug para ver los logs.',
            'Ver Logs'
          ).then(selection => {
            if (selection === 'Ver Logs') {
              Logger.show();
            }
          });
          
        } catch (error) {
          Logger.error('Error activando el modo debug', error);
          vscode.window.showErrorMessage('Error al activar debug mode. Revisa el Output para más detalles.');
        }
      }
    );
    
    context.subscriptions.push(disposable);
  }
}
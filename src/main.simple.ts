import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Logger } from "@/logger";

/**
 * Función de activación simplificada para debug.
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('FastStruct ACTIVANDO - Version Simple');
  
  // Crear output channel inmediatamente
  const outputChannel = vscode.window.createOutputChannel('FastStruct');
  outputChannel.show();
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('FastStruct Extension - ACTIVANDO (SIMPLE)');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
  outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
  outputChannel.appendLine('='.repeat(60));
  
  try {
    // Inicializar Logger
    outputChannel.appendLine('1. Inicializando Logger...');
    Logger.forceShow("FastStruct extension activada exitosamente! Para ver logs detallados, habilita 'faststruct.config.debug' en Settings");
    outputChannel.appendLine('✓ Logger inicializado');

    // Registrar comandos principales
    outputChannel.appendLine('2. Registrando comandos principales...');
    
    // Health Check
    const healthCheckCommand = vscode.commands.registerCommand('faststruct.healthCheck', () => {
      const commands = vscode.commands.getCommands().then(cmds => {
        const faststructCmds = cmds.filter(cmd => cmd.startsWith('faststruct.'));
        const config = vscode.workspace.getConfiguration('faststruct');
        const faststructConfig = config.get('config', {}) as any;
        
        outputChannel.appendLine('=== HEALTH CHECK ===');
        outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
        outputChannel.appendLine(`Commands registered: ${faststructCmds.length}`);
        outputChannel.appendLine(`Debug enabled: ${faststructConfig.debug || false}`);
        outputChannel.appendLine('='.repeat(40));
        
        vscode.window.showInformationMessage(
          `FastStruct Health Check OK! ${faststructCmds.length} comandos registrados. Ver Output para detalles.`,
          'Ver Output'
        ).then(selection => {
          if (selection === 'Ver Output') {
            outputChannel.show();
          }
        });
      });
    });
    
    // Enable Debug
    const enableDebugCommand = vscode.commands.registerCommand('faststruct.enableDebug', async () => {
      try {
        const config = vscode.workspace.getConfiguration('faststruct');
        const currentConfig = config.get('config', {}) as any;
        const updatedConfig = { ...currentConfig, debug: true };
        await config.update('config', updatedConfig, vscode.ConfigurationTarget.Workspace);
        
        outputChannel.appendLine('✓ Modo DEBUG activado!');
        Logger.forceShow('🐛 Modo DEBUG activado! Los logs ahora serán visibles en este canal.');
        
        vscode.window.showInformationMessage(
          '✅ Modo DEBUG activado! Revisa el panel Output → FastStruct Debug para ver los logs.',
          'Ver Logs'
        ).then(selection => {
          if (selection === 'Ver Logs') {
            Logger.show();
          }
        });
      } catch (error) {
        outputChannel.appendLine(`✗ ERROR activando debug: ${error}`);
        vscode.window.showErrorMessage('Error al activar debug mode.');
      }
    });
    
    // Create Structure (funcional básico)
    const createStructureCommand = vscode.commands.registerCommand('faststruct.createStructure', async () => {
      outputChannel.appendLine('Create Structure command ejecutado');
      
      try {
        // Obtener workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
          vscode.window.showErrorMessage('No se encontró workspace abierto. Abre una carpeta primero.');
          return;
        }
        
        const uri = workspaceFolders[0].uri;
        const folderPath = uri.fsPath;
        outputChannel.appendLine(`Generando estructura para: ${folderPath}`);
        
        // Generar estructura básica
        const structure = await generateBasicStructure(folderPath, outputChannel);
        
        outputChannel.appendLine(`Estructura generada (${structure.length} caracteres)`);
        
        // Mostrar en un nuevo documento
        const document = await vscode.workspace.openTextDocument({
          content: structure,
          language: 'markdown'
        });
        
        await vscode.window.showTextDocument(document, {
          preview: false,
          viewColumn: vscode.ViewColumn.Beside
        });
        
        // Mostrar mensaje de éxito
        const folderName = path.basename(folderPath);
        vscode.window.showInformationMessage(
          `✅ Estructura generada exitosamente para: ${folderName}`,
          'Ver Output'
        ).then(selection => {
          if (selection === 'Ver Output') {
            outputChannel.show();
          }
        });
        
        outputChannel.appendLine('✓ Estructura mostrada en nuevo documento');
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`✗ ERROR generando estructura: ${errorMsg}`);
        vscode.window.showErrorMessage(
          `Error generando estructura: ${errorMsg}`,
          'Ver Output'
        ).then(selection => {
          if (selection === 'Ver Output') {
            outputChannel.show();
          }
        });
      }
    });
    
    // Create Structure Context (con contenido)
    const createStructureContextCommand = vscode.commands.registerCommand('faststruct.createStructureContext', async (uri?: vscode.Uri) => {
      await createStructureWithOptions(uri, { includeContent: true }, outputChannel);
    });
    
    // Create Structure Only (sin contenido)
    const createStructureOnlyCommand = vscode.commands.registerCommand('faststruct.createStructureOnly', async (uri?: vscode.Uri) => {
      await createStructureWithOptions(uri, { includeContent: false }, outputChannel);
    });
    
    // Test command
    const testCommand = vscode.commands.registerCommand('faststruct.test', () => {
      outputChannel.appendLine('TEST COMMAND EJECUTADO!');
      vscode.window.showInformationMessage('FastStruct TEST OK!');
    });
    
    // Registrar todos los comandos
    context.subscriptions.push(
      healthCheckCommand,
      enableDebugCommand, 
      createStructureCommand,
      createStructureContextCommand,
      createStructureOnlyCommand,
      testCommand,
      outputChannel
    );
    
    outputChannel.appendLine('✓ Comandos principales registrados');
    outputChannel.appendLine('✓ FastStruct activado correctamente (modo simple)');
    
    // Mostrar notificación de éxito
    vscode.window.showInformationMessage('FastStruct activado correctamente');
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`✗ ERROR: ${errorMsg}`);
    console.error('FastStruct activation error:', error);
  }
}

/**
 * Genera estructura básica de archivos usando solo APIs nativas.
 */
async function generateBasicStructure(folderPath: string, outputChannel: vscode.OutputChannel): Promise<string> {
  outputChannel.appendLine('Generando estructura básica...');
  
  const excludedDirs = ['node_modules', '.git', 'dist', 'build', 'out', '.tmp', '.vscode'];
  const excludedFiles = ['.DS_Store', 'Thumbs.db', '*.log'];
  
  function shouldExclude(name: string, isDirectory: boolean): boolean {
    if (isDirectory) {
      return excludedDirs.includes(name) || name.startsWith('.');
    } else {
      return excludedFiles.some(pattern => {
        if (pattern.includes('*')) {
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(name);
        }
        return name === pattern;
      }) || name.startsWith('.');
    }
  }
  
  function buildTree(dirPath: string, prefix: string = '', level: number = 0): string {
    if (level > 5) return ''; // Limitar profundidad
    
    try {
      const items = fs.readdirSync(dirPath);
      let result = '';
      
      items.forEach((item, index) => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        
        if (shouldExclude(item, stats.isDirectory())) {
          return; // Skip excluded items
        }
        
        result += `${prefix}${connector}${item}\n`;
        
        if (stats.isDirectory() && level < 3) {
          result += buildTree(itemPath, nextPrefix, level + 1);
        }
      });
      
      return result;
    } catch (error) {
      outputChannel.appendLine(`Error leyendo directorio ${dirPath}: ${error}`);
      return '';
    }
  }
  
  const projectName = path.basename(folderPath);
  const timestamp = new Date().toLocaleString();
  
  let structure = `# FastStruct - Estructura del Proyecto\n\n`;
  structure += `**Proyecto:** ${projectName}\n`;
  structure += `**Generado:** ${timestamp}\n`;
  structure += `**Ruta:** \`${folderPath}\`\n\n`;
  structure += `## Estructura de Archivos\n\n\`\`\`\n`;
  structure += `${projectName}/\n`;
  structure += buildTree(folderPath);
  structure += `\`\`\`\n\n`;
  structure += `---\n*Generado por FastStruct Extension*`;
  
  return structure;
}

/**
 * Función auxiliar para crear estructura con opciones específicas.
 */
async function createStructureWithOptions(
  uri: vscode.Uri | undefined,
  options: { includeContent: boolean },
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Determinar URI si no se proporciona
    if (!uri) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        uri = workspaceFolders[0].uri;
      } else {
        vscode.window.showErrorMessage(
          'No se encontró carpeta seleccionada ni workspace abierto.'
        );
        return;
      }
    }
    
    const folderPath = uri.fsPath;
    const contentType = options.includeContent ? 'con contenido' : 'solo estructura';
    outputChannel.appendLine(`Generando estructura ${contentType} para: ${folderPath}`);
    
    // Generar estructura básica
    const structure = await generateBasicStructure(folderPath, outputChannel);
    
    outputChannel.appendLine(`Estructura generada (${structure.length} caracteres)`);
    
    // Mostrar en un nuevo documento
    const document = await vscode.workspace.openTextDocument({
      content: structure,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });
    
    // Mostrar mensaje de éxito
    const folderName = path.basename(folderPath);
    const message = options.includeContent
      ? `Estructura con contenido generada para: ${folderName}`
      : `Estructura generada para: ${folderName}`;
    
    vscode.window.showInformationMessage(`✅ ${message}`);
    outputChannel.appendLine(`✓ ${message}`);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`✗ ERROR: ${errorMsg}`);
    vscode.window.showErrorMessage(
      `Error generando estructura: ${errorMsg}`,
      'Ver Output'
    ).then(selection => {
      if (selection === 'Ver Output') {
        outputChannel.show();
      }
    });
  }
}

/**
 * Función de desactivación.
 */
export function deactivate() {
  console.log('FastStruct DESACTIVANDO');
}
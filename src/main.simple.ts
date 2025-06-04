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

    // Settings commands
    const openSettingsCommand = vscode.commands.registerCommand('faststruct.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'faststruct');
      outputChannel.appendLine('Abriendo configuración de FastStruct');
    });

    const checkConfigCommand = vscode.commands.registerCommand('faststruct.checkConfig', () => {
      const config = vscode.workspace.getConfiguration('faststruct');
      const faststructConfig = config.get('config', {}) as any;
      const inspect = config.inspect('config');
      
      outputChannel.appendLine('=== CONFIGURACIÓN ===');
      outputChannel.appendLine(`Workspace: ${inspect?.workspaceValue ? 'SÍ' : 'NO'}`);
      outputChannel.appendLine(`Global: ${inspect?.globalValue ? 'SÍ' : 'NO'}`);
      outputChannel.appendLine(`Debug: ${faststructConfig.debug || false}`);
      outputChannel.appendLine('='.repeat(40));
      
      const hasWorkspace = !!inspect?.workspaceValue;
      const message = hasWorkspace 
        ? '✅ Configuración encontrada en el workspace'
        : '⚠️ No hay configuración específica del proyecto. Usando configuración global/default.';
      
      vscode.window.showInformationMessage(message, 'Ver Output').then(selection => {
        if (selection === 'Ver Output') {
          outputChannel.show();
        }
      });
    });

    const exportConfigCommand = vscode.commands.registerCommand('faststruct.exportConfig', async () => {
      try {
        const config = vscode.workspace.getConfiguration('faststruct');
        const faststructConfig = config.get('config', {});
        
        const configString = JSON.stringify(faststructConfig, null, 2);
        const document = await vscode.workspace.openTextDocument({
          content: configString,
          language: 'json'
        });
        
        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage('✅ Configuración exportada. Guarda el archivo donde desees.');
        outputChannel.appendLine('✓ Configuración exportada a nuevo documento');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error exportando configuración: ${errorMsg}`);
        outputChannel.appendLine(`✗ Error exportando: ${errorMsg}`);
      }
    });

    const importConfigCommand = vscode.commands.registerCommand('faststruct.importConfig', async () => {
      try {
        const fileUri = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'JSON': ['json']
          },
          openLabel: 'Importar configuración'
        });

        if (!fileUri || fileUri.length === 0) {
          return;
        }

        const document = await vscode.workspace.openTextDocument(fileUri[0]);
        const content = document.getText();
        const importedConfig = JSON.parse(content);

        const config = vscode.workspace.getConfiguration('faststruct');
        await config.update('config', importedConfig, vscode.ConfigurationTarget.Workspace);

        vscode.window.showInformationMessage('✅ Configuración importada exitosamente al workspace');
        outputChannel.appendLine('✓ Configuración importada al workspace');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Error importando configuración: ${errorMsg}`);
        outputChannel.appendLine(`✗ Error importando: ${errorMsg}`);
      }
    });

    const resetConfigCommand = vscode.commands.registerCommand('faststruct.resetConfig', async () => {
      const response = await vscode.window.showWarningMessage(
        '¿Estás seguro de que quieres resetear la configuración de FastStruct?',
        'Sí, resetear',
        'Cancelar'
      );

      if (response === 'Sí, resetear') {
        try {
          const config = vscode.workspace.getConfiguration('faststruct');
          await config.update('config', undefined, vscode.ConfigurationTarget.Workspace);
          await config.update('config', undefined, vscode.ConfigurationTarget.Global);
          
          vscode.window.showInformationMessage('✅ Configuración reseteada exitosamente');
          outputChannel.appendLine('✓ Configuración reseteada');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`Error reseteando configuración: ${errorMsg}`);
          outputChannel.appendLine(`✗ Error reseteando: ${errorMsg}`);
        }
      }
    });

    // Structure commands with options
    const createStructureChooseCommand = vscode.commands.registerCommand('faststruct.createStructureChoose', async (uri?: vscode.Uri) => {
      const options = await vscode.window.showQuickPick([
        { label: '📝 Con contenido de archivos', description: 'Incluye el contenido de los archivos', value: 'content' },
        { label: '📁 Solo estructura', description: 'Solo nombres de archivos y carpetas', value: 'structure' },
        { label: '👁️ Con vista previa', description: 'Muestra preview antes de generar', value: 'preview' }
      ], {
        placeHolder: 'Selecciona el tipo de estructura a generar'
      });

      if (!options) return;

      switch (options.value) {
        case 'content':
          await createStructureWithOptions(uri, { includeContent: true }, outputChannel);
          break;
        case 'structure':
          await createStructureWithOptions(uri, { includeContent: false }, outputChannel);
          break;
        case 'preview':
          await createStructureWithPreview(uri, outputChannel);
          break;
      }
    });

    const createStructureWithPreviewCommand = vscode.commands.registerCommand('faststruct.createStructureWithPreview', async (uri?: vscode.Uri) => {
      await createStructureWithPreview(uri, outputChannel);
    });

    // Show exclusions command
    const showExclusionsCommand = vscode.commands.registerCommand('faststruct.showExclusions', () => {
      const config = vscode.workspace.getConfiguration('faststruct');
      const faststructConfig = config.get('config', {}) as any;
      
      let exclusionsText = '# FastStruct - Exclusiones Actuales\n\n';
      
      if (faststructConfig.exclude?.folders?.length) {
        exclusionsText += '## Carpetas Excluidas\n';
        faststructConfig.exclude.folders.forEach((folder: string) => {
          exclusionsText += `- ${folder}\n`;
        });
        exclusionsText += '\n';
      }
      
      if (faststructConfig.exclude?.files?.length) {
        exclusionsText += '## Archivos Excluidos\n';
        faststructConfig.exclude.files.forEach((file: string) => {
          exclusionsText += `- ${file}\n`;
        });
        exclusionsText += '\n';
      }
      
      if (!faststructConfig.exclude?.folders?.length && !faststructConfig.exclude?.files?.length) {
        exclusionsText += 'No hay exclusiones configuradas.\n\n';
        exclusionsText += 'Para configurar exclusiones, usa:\n';
        exclusionsText += '- Clic derecho en archivos/carpetas → FastStruct → Excluir...\n';
        exclusionsText += '- Comando: FastStruct: Open Settings\n';
      }
      
      vscode.workspace.openTextDocument({
        content: exclusionsText,
        language: 'markdown'
      }).then(doc => {
        vscode.window.showTextDocument(doc, { preview: false });
      });
      
      outputChannel.appendLine('✓ Exclusiones mostradas');
    });

    // Basic exclusion commands
    const excludeFileCommand = vscode.commands.registerCommand('faststruct.excludeFile', async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('Selecciona un archivo primero');
        return;
      }
      
      const fileName = path.basename(uri.fsPath);
      const config = vscode.workspace.getConfiguration('faststruct');
      const currentConfig = config.get('config', {}) as any;
      
      if (!currentConfig.exclude) currentConfig.exclude = {};
      if (!currentConfig.exclude.files) currentConfig.exclude.files = [];
      
      if (!currentConfig.exclude.files.includes(fileName)) {
        currentConfig.exclude.files.push(fileName);
        await config.update('config', currentConfig, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`✅ Archivo "${fileName}" excluido`);
        outputChannel.appendLine(`✓ Archivo excluido: ${fileName}`);
      } else {
        vscode.window.showInformationMessage(`El archivo "${fileName}" ya está excluido`);
      }
    });

    const excludeFolderCommand = vscode.commands.registerCommand('faststruct.excludeFolder', async (uri?: vscode.Uri) => {
      if (!uri) {
        vscode.window.showErrorMessage('Selecciona una carpeta primero');
        return;
      }
      
      const folderName = path.basename(uri.fsPath);
      const config = vscode.workspace.getConfiguration('faststruct');
      const currentConfig = config.get('config', {}) as any;
      
      if (!currentConfig.exclude) currentConfig.exclude = {};
      if (!currentConfig.exclude.folders) currentConfig.exclude.folders = [];
      
      if (!currentConfig.exclude.folders.includes(folderName)) {
        currentConfig.exclude.folders.push(folderName);
        await config.update('config', currentConfig, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`✅ Carpeta "${folderName}" excluida`);
        outputChannel.appendLine(`✓ Carpeta excluida: ${folderName}`);
      } else {
        vscode.window.showInformationMessage(`La carpeta "${folderName}" ya está excluida`);
      }
    });
    
    // Registrar todos los comandos
    context.subscriptions.push(
      healthCheckCommand,
      enableDebugCommand, 
      createStructureCommand,
      createStructureContextCommand,
      createStructureOnlyCommand,
      createStructureChooseCommand,
      createStructureWithPreviewCommand,
      openSettingsCommand,
      checkConfigCommand,
      exportConfigCommand,
      importConfigCommand,
      resetConfigCommand,
      showExclusionsCommand,
      excludeFileCommand,
      excludeFolderCommand,
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
 * Función para crear estructura con vista previa.
 */
async function createStructureWithPreview(
  uri: vscode.Uri | undefined,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Determinar URI si no se proporciona
    if (!uri) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        uri = workspaceFolders[0].uri;
      } else {
        vscode.window.showErrorMessage('No se encontró carpeta seleccionada ni workspace abierto.');
        return;
      }
    }
    
    const folderPath = uri.fsPath;
    outputChannel.appendLine(`Generando vista previa para: ${folderPath}`);
    
    // Generar estructura básica
    const structure = await generateBasicStructure(folderPath, outputChannel);
    
    // Mostrar preview en una ventana temporal
    const previewDocument = await vscode.workspace.openTextDocument({
      content: structure,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(previewDocument, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside
    });
    
    // Preguntar al usuario qué hacer
    const action = await vscode.window.showInformationMessage(
      '¿Qué quieres hacer con esta estructura?',
      'Guardar como archivo',
      'Copiar al portapapeles',
      'Generar versión final',
      'Cancelar'
    );
    
    switch (action) {
      case 'Guardar como archivo':
        const folderName = path.basename(folderPath);
        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(`${folderName}-structure.md`),
          filters: {
            'Markdown': ['md'],
            'Text': ['txt']
          }
        });
        
        if (saveUri) {
          await vscode.workspace.fs.writeFile(saveUri, Buffer.from(structure, 'utf8'));
          vscode.window.showInformationMessage(`✅ Estructura guardada en: ${saveUri.fsPath}`);
          outputChannel.appendLine(`✓ Estructura guardada en: ${saveUri.fsPath}`);
        }
        break;
        
      case 'Copiar al portapapeles':
        await vscode.env.clipboard.writeText(structure);
        vscode.window.showInformationMessage('✅ Estructura copiada al portapapeles');
        outputChannel.appendLine('✓ Estructura copiada al portapapeles');
        break;
        
      case 'Generar versión final':
        // Cerrar preview y mostrar versión final
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        const finalDocument = await vscode.workspace.openTextDocument({
          content: structure,
          language: 'markdown'
        });
        await vscode.window.showTextDocument(finalDocument, { preview: false });
        vscode.window.showInformationMessage('✅ Versión final generada');
        outputChannel.appendLine('✓ Versión final generada');
        break;
        
      case 'Cancelar':
      default:
        await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
        outputChannel.appendLine('✓ Vista previa cancelada');
        break;
    }
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`✗ ERROR en vista previa: ${errorMsg}`);
    vscode.window.showErrorMessage(`Error en vista previa: ${errorMsg}`);
  }
}

/**
 * Función de desactivación.
 */
export function deactivate() {
  console.log('FastStruct DESACTIVANDO');
}
import * as vscode from 'vscode';
import * as path from 'path';
import { StructureGeneratorService } from '@/services/StructureGeneratorService';
import { ConfigurationService } from '@/services/ConfigurationService';
import { Logger } from '@/logger';

/**
 * Registra todos los comandos relacionados con la generación de estructura.
 * 
 * @param context - Contexto de la extensión
 * @returns Array de disposables
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function registerStructureCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const structureGenerator = StructureGeneratorService.getInstance();
  const configService = ConfigurationService.getInstance();
  
  // Comando para crear estructura con contenido
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.createStructureContext',
      async (uri: vscode.Uri) => {
        await createStructureWithOptions(uri, { includeContent: true });
      }
    )
  );
  
  // Comando para crear solo estructura sin contenido
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.createStructureOnly',
      async (uri: vscode.Uri) => {
        await createStructureWithOptions(uri, { includeContent: false });
      }
    )
  );
  
  // Comando alternativo para crear estructura (paleta de comandos)
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.createStructure',
      async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          await vscode.commands.executeCommand(
            'faststruct.createStructureContext',
            workspaceFolders[0].uri
          );
        } else {
          vscode.window.showErrorMessage('No se encontró carpeta de workspace.');
        }
      }
    )
  );
  
  // Comando para elegir qué tipo de estructura generar
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.createStructureChoose',
      async (uri: vscode.Uri) => {
        const options = [
          {
            label: '$(file-text) Estructura con contenido',
            description: 'Incluye el contenido de los archivos',
            value: 'content'
          },
          {
            label: '$(list-tree) Solo estructura',
            description: 'Solo muestra la estructura de carpetas y archivos',
            value: 'structure'
          }
        ];
        
        const selected = await vscode.window.showQuickPick(options, {
          placeHolder: '¿Qué tipo de estructura deseas generar?',
          canPickMany: false
        });
        
        if (selected) {
          if (selected.value === 'content') {
            await vscode.commands.executeCommand('faststruct.createStructureContext', uri);
          } else {
            await vscode.commands.executeCommand('faststruct.createStructureOnly', uri);
          }
        }
      }
    )
  );
  
  // Comando para crear estructura con vista previa
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.createStructureWithPreview',
      async (uri: vscode.Uri) => {
        if (!uri) {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            uri = workspaceFolders[0].uri;
          } else {
            vscode.window.showErrorMessage('No se encontró carpeta seleccionada o workspace.');
            return;
          }
        }
        
        try {
          const folderPath = uri.fsPath;
          const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
          const config = configService.getConfiguration(workspaceFolder);
          
          // Obtener vista previa
          const preview = structureGenerator.getStructurePreview(folderPath, config);
          
          const answer = await vscode.window.showInformationMessage(
            `Se generará la estructura con ${preview.totalCount} elementos. ¿Continuar?`,
            'Sí, generar',
            'Ver configuración',
            'Cancelar'
          );
          
          if (answer === 'Sí, generar') {
            await vscode.commands.executeCommand('faststruct.createStructureContext', uri);
          } else if (answer === 'Ver configuración') {
            await vscode.commands.executeCommand('faststruct.openSettings');
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Error: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    )
  );
  
  return disposables;
}

/**
 * Función auxiliar para crear estructura con opciones específicas.
 * 
 * @param uri - URI de la carpeta
 * @param options - Opciones de generación
 * @author Pablo Contreras
 * @created 2025/01/31
 */
async function createStructureWithOptions(
  uri: vscode.Uri | undefined,
  options: { includeContent: boolean }
): Promise<void> {
  const structureGenerator = StructureGeneratorService.getInstance();
  const configService = ConfigurationService.getInstance();
  
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
  
  try {
    const folderPath = uri.fsPath;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    const config = configService.getConfiguration(workspaceFolder);
    
    // Generar estructura
    const output = structureGenerator.generateStructure({
      basePath: folderPath,
      includeContent: options.includeContent,
      config: config
    });
    
    // Mostrar en un nuevo documento
    const document = await vscode.workspace.openTextDocument({
      content: output,
      language: 'markdown'
    });
    
    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside
    });
    
    // Mostrar mensaje de éxito
    const message = options.includeContent
      ? `Estructura con contenido generada para: ${path.basename(folderPath)}`
      : `Estructura generada para: ${path.basename(folderPath)}`;
    
    vscode.window.showInformationMessage(message);
    
    Logger.info('Estructura generada exitosamente', {
      path: folderPath,
      includeContent: options.includeContent
    });
  } catch (error) {
    vscode.window.showErrorMessage(
      `Error generando estructura: ${error instanceof Error ? error.message : String(error)}`
    );
    Logger.error('Error generando estructura', error);
  }
}
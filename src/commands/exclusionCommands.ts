import * as vscode from 'vscode';
import * as path from 'path';
import { ExclusionManager } from '@/managers/ExclusionManager';
import { Logger } from '@/logger';

/**
 * Registra todos los comandos relacionados con exclusiones.
 * 
 * @param context - Contexto de la extensión
 * @returns Array de disposables
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function registerExclusionCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const exclusionManager = new ExclusionManager();
  
  // Comandos para exclusión de archivos
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFile',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        
        await exclusionManager.addExclusion(
          'Archivo específico',
          relativePath,
          'exclude.advanced.specificFiles'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFileExtension',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const extension = path.extname(uri.fsPath);
        if (!extension) {
          vscode.window.showWarningMessage('El archivo no tiene extensión');
          return;
        }
        
        const pattern = `*${extension}`;
        await exclusionManager.addExclusion(
          'Extensión de archivo',
          pattern,
          'exclude.files'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFileName',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const fileName = path.basename(uri.fsPath);
        await exclusionManager.addExclusion(
          'Nombre de archivo',
          fileName,
          'exclude.files'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFileContent',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        
        await exclusionManager.addExclusion(
          'Contenido de archivo',
          relativePath,
          'excludeContent.files'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFileTypeContent',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const extension = path.extname(uri.fsPath);
        if (!extension) {
          vscode.window.showWarningMessage('El archivo no tiene extensión');
          return;
        }
        
        const pattern = `*${extension}`;
        await exclusionManager.addExclusion(
          'Contenido por extensión',
          pattern,
          'excludeContent.patterns'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFilePattern',
      async () => {
        const pattern = await vscode.window.showInputBox({
          prompt: 'Ingrese el patrón de archivos a excluir (ej: **/*.test.js)',
          placeHolder: '**/*.test.js',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'El patrón no puede estar vacío';
            }
            return null;
          }
        });
        
        if (pattern) {
          await exclusionManager.addExclusion(
            'Patrón de archivo',
            pattern,
            'exclude.advanced.patterns'
          );
        }
      }
    )
  );
  
  // Comandos para exclusión de carpetas
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFolder',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        
        await exclusionManager.addExclusion(
          'Carpeta específica',
          relativePath,
          'exclude.advanced.specificFolders'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFolderName',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const folderName = path.basename(uri.fsPath);
        await exclusionManager.addExclusion(
          'Nombre de carpeta',
          folderName,
          'exclude.folders'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFolderContent',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        
        await exclusionManager.addExclusion(
          'Contenido de carpeta',
          relativePath,
          'excludeContent.folders'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeSubfolders',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        const pattern = `${relativePath}/**/`;
        
        await exclusionManager.addExclusion(
          'Subcarpetas',
          pattern,
          'exclude.advanced.patterns'
        );
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.excludeFolderPattern',
      async () => {
        const pattern = await vscode.window.showInputBox({
          prompt: 'Ingrese el patrón de carpetas a excluir (ej: **/temp/)',
          placeHolder: '**/temp/',
          validateInput: (value) => {
            if (!value || value.trim() === '') {
              return 'El patrón no puede estar vacío';
            }
            return null;
          }
        });
        
        if (pattern) {
          await exclusionManager.addExclusion(
            'Patrón de carpeta',
            pattern,
            'exclude.advanced.patterns'
          );
        }
      }
    )
  );
  
  // Comandos para incluir (remover exclusiones)
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.includeFile',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        const fileName = path.basename(uri.fsPath);
        
        // Buscar en todas las posibles ubicaciones y remover
        await exclusionManager.removeExclusion(relativePath, 'exclude.advanced.specificFiles');
        await exclusionManager.removeExclusion(fileName, 'exclude.files');
        await exclusionManager.removeExclusion(relativePath, 'excludeContent.files');
      }
    )
  );
  
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.includeFolder',
      async (uri: vscode.Uri) => {
        if (!uri) return;
        
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        if (!workspaceFolder) return;
        
        const relativePath = path
          .relative(workspaceFolder.uri.fsPath, uri.fsPath)
          .replace(/\\/g, '/');
        const folderName = path.basename(uri.fsPath);
        
        // Buscar en todas las posibles ubicaciones y remover
        await exclusionManager.removeExclusion(relativePath, 'exclude.advanced.specificFolders');
        await exclusionManager.removeExclusion(folderName, 'exclude.folders');
        await exclusionManager.removeExclusion(relativePath, 'excludeContent.folders');
      }
    )
  );
  
  // Comando para mostrar exclusiones
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.showExclusions',
      async () => {
        await exclusionManager.showExclusions();
      }
    )
  );
  
  Logger.info('Comandos de exclusión registrados', { count: disposables.length });
  return disposables;
}
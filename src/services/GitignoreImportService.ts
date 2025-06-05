import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';

/**
 * Servicio para importar exclusiones desde .gitignore.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class GitignoreImportService {
  private static instance: GitignoreImportService;
  
  public static getInstance(): GitignoreImportService {
    if (!this.instance) {
      this.instance = new GitignoreImportService();
    }
    return this.instance;
  }
  
  private constructor() {}
  
  /**
   * Importa patrones desde el archivo .gitignore.
   * 
   * @returns Resultado de la importación o null si falla
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async importFromGitignore(): Promise<{
    patterns: string[];
    folders: string[];
    files: string[];
  } | null> {
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        vscode.window.showWarningMessage('No hay un workspace abierto');
        return null;
      }
      
      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const gitignorePath = path.join(workspaceFolder.uri.fsPath, '.gitignore');
      
      if (!fs.existsSync(gitignorePath)) {
        vscode.window.showWarningMessage('No se encontró archivo .gitignore en el proyecto');
        return null;
      }
      
      const content = fs.readFileSync(gitignorePath, 'utf8');
      const result = this.parseGitignore(content);
      
      vscode.window.showInformationMessage(
        `Importados ${result.patterns.length} patrones, ${result.folders.length} carpetas y ${result.files.length} archivos desde .gitignore`
      );
      
      return result;
    } catch (error) {
      Logger.error('Error al importar desde .gitignore', error);
      vscode.window.showErrorMessage('Error al importar desde .gitignore');
      return null;
    }
  }
  
  /**
   * Parsea el contenido de un archivo .gitignore.
   * 
   * @param content - Contenido del archivo
   * @returns Patrones organizados por tipo
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private parseGitignore(content: string): {
    patterns: string[];
    folders: string[];
    files: string[];
  } {
    const lines = content.split('\n');
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
    
    return {
      patterns: [...new Set(patterns)],
      folders: [...new Set(folders)],
      files: [...new Set(files)]
    };
  }
}
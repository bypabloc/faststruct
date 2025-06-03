import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '@/logger';
import { PatternMatcher } from '@/utils/patternMatcher';

/**
 * Servicio para probar patrones de exclusión.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class PatternTestService {
  private static instance: PatternTestService;
  private patternMatcher: PatternMatcher;
  
  public static getInstance(): PatternTestService {
    if (!this.instance) {
      this.instance = new PatternTestService();
    }
    return this.instance;
  }
  
  private constructor() {
    this.patternMatcher = PatternMatcher.getInstance();
  }
  
  /**
   * Prueba un patrón contra los archivos del proyecto.
   * 
   * @param pattern - Patrón a probar
   * @param type - Tipo de patrón (glob, regex, simple)
   * @returns Resultado de la prueba
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async testPattern(
    pattern: string,
    type: string
  ): Promise<{ matches: string[]; hasMore: boolean }> {
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return { matches: [], hasMore: false };
      }
      
      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const files = await this.collectProjectFiles(workspaceFolder.uri.fsPath);
      
      const matches = this.patternMatcher.testPattern(pattern, files, type as any);
      
      return {
        matches: matches.slice(0, 20),
        hasMore: matches.length > 20
      };
    } catch (error) {
      Logger.error('Error al probar patrón', error);
      return { matches: [], hasMore: false };
    }
  }
  
  /**
   * Recolecta todos los archivos del proyecto.
   * 
   * @param basePath - Ruta base del proyecto
   * @returns Lista de rutas relativas
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async collectProjectFiles(basePath: string): Promise<string[]> {
    const files: string[] = [];
    const maxFiles = 1000; // Límite para evitar problemas de rendimiento
    
    const walkDir = (dir: string) => {
      if (files.length >= maxFiles) return;
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          if (item.name === '.git' || item.name === 'node_modules') continue;
          
          const fullPath = path.join(dir, item.name);
          const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
          
          files.push(relativePath);
          
          if (item.isDirectory() && files.length < maxFiles) {
            walkDir(fullPath);
          }
        }
      } catch (error) {
        // Ignorar errores de permisos
      }
    };
    
    walkDir(basePath);
    return files;
  }
}
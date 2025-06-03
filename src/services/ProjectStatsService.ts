import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@/logger';
import { ConfigurationService } from '@/services/ConfigurationService';
import { ExclusionStats } from '@/types';

/**
 * Servicio para obtener estadísticas del proyecto.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class ProjectStatsService {
  private static instance: ProjectStatsService;
  private configService: ConfigurationService;
  
  public static getInstance(): ProjectStatsService {
    if (!this.instance) {
      this.instance = new ProjectStatsService();
    }
    return this.instance;
  }
  
  private constructor() {
    this.configService = ConfigurationService.getInstance();
  }
  
  /**
   * Obtiene estadísticas sobre las exclusiones del proyecto.
   * 
   * @returns Estadísticas de exclusión
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async getProjectStats(): Promise<ExclusionStats | null> {
    try {
      if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        return null;
      }
      
      const workspaceFolder = vscode.workspace.workspaceFolders[0];
      const config = this.configService.getConfiguration(workspaceFolder);
      
      const stats = {
        totalFiles: 0,
        totalFolders: 0,
        excludedFiles: 0,
        excludedFolders: 0,
        totalSize: 0,
        excludedSize: 0,
        percentExcludedFiles: 0,
        percentExcludedFolders: 0,
        percentExcludedSize: 0
      };
      
      await this.calculateStats(workspaceFolder.uri.fsPath, config, stats);
      
      // Calcular porcentajes
      stats.percentExcludedFiles = stats.totalFiles > 0 
        ? Math.round((stats.excludedFiles / stats.totalFiles) * 100) 
        : 0;
      stats.percentExcludedFolders = stats.totalFolders > 0 
        ? Math.round((stats.excludedFolders / stats.totalFolders) * 100) 
        : 0;
      stats.percentExcludedSize = stats.totalSize > 0 
        ? Math.round((stats.excludedSize / stats.totalSize) * 100) 
        : 0;
      
      return stats;
    } catch (error) {
      Logger.error('Error al obtener estadísticas', error);
      return null;
    }
  }
  
  /**
   * Calcula las estadísticas recursivamente.
   * 
   * @param dirPath - Directorio a analizar
   * @param config - Configuración de FastStruct
   * @param stats - Objeto de estadísticas a actualizar
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async calculateStats(
    dirPath: string, 
    config: any, 
    stats: ExclusionStats
  ): Promise<void> {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          stats.totalFolders++;
          
          if (this.isExcluded(item.name, true, config)) {
            stats.excludedFolders++;
            continue;
          }
          
          await this.calculateStats(fullPath, config, stats);
        } else {
          stats.totalFiles++;
          const stat = fs.statSync(fullPath);
          stats.totalSize += stat.size;
          
          if (this.isExcluded(item.name, false, config)) {
            stats.excludedFiles++;
            stats.excludedSize += stat.size;
          }
        }
      }
    } catch (error) {
      // Ignorar errores de permisos
    }
  }
  
  /**
   * Verifica si un elemento está excluido.
   * 
   * @param name - Nombre del elemento
   * @param isDir - Si es directorio
   * @param config - Configuración
   * @returns true si está excluido
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private isExcluded(name: string, isDir: boolean, config: any): boolean {
    const patterns = isDir
      ? config.exclude?.folders || []
      : config.exclude?.files || [];
    
    return patterns.some((pattern: string) => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(name);
      }
      return name === pattern;
    });
  }
}
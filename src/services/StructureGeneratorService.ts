import * as path from 'path';
import { TreeItem, FastStructConfig, StructureGenerationOptions } from '../types';
import { FileSystemService } from './FileSystemService';
import { OutputFormatterService } from './OutputFormatterService';
import { Logger } from '../logger';

/**
 * Servicio para generar la estructura del proyecto.
 * Coordina la lectura de archivos y el formato de salida.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class StructureGeneratorService {
  private static instance: StructureGeneratorService;
  private fileSystemService: FileSystemService;
  private outputFormatter: OutputFormatterService;
  
  /**
   * Obtiene la instancia singleton del servicio.
   * 
   * @returns Instancia del servicio generador de estructura
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): StructureGeneratorService {
    if (!this.instance) {
      this.instance = new StructureGeneratorService();
    }
    return this.instance;
  }
  
  /**
   * Constructor privado para implementar patrón Singleton.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private constructor() {
    this.fileSystemService = FileSystemService.getInstance();
    this.outputFormatter = OutputFormatterService.getInstance();
  }
  
  /**
   * Genera la estructura completa del proyecto.
   * 
   * @param options - Opciones de generación
   * @returns Estructura formateada como texto
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public generateStructure(options: StructureGenerationOptions): string {
    Logger.functionStart('generateStructure', {
      basePath: options.basePath,
      includeContent: options.includeContent
    });
    
    try {
      // Leer la estructura del directorio
      const structure = this.fileSystemService.readDirectoryStructure(
        options.basePath,
        options.config
      );
      
      // Crear el item raíz
      const rootItem: TreeItem = {
        name: path.basename(options.basePath),
        type: 'directory',
        children: structure,
        path: options.basePath
      };
      
      // Generar la salida formateada
      const output = this.outputFormatter.formatFullOutput(
        [rootItem],
        options.basePath,
        options.config,
        options.includeContent
      );
      
      Logger.functionEnd('generateStructure', 'Estructura generada exitosamente');
      return output;
    } catch (error) {
      Logger.error('Error generando estructura', error);
      throw error;
    }
  }
  
  /**
   * Cuenta los archivos y carpetas en una estructura.
   * 
   * @param structure - Estructura a contar
   * @returns Objeto con conteos
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public countItems(structure: TreeItem[]): { fileCount: number; folderCount: number } {
    let fileCount = 0;
    let folderCount = 0;
    
    const count = (items: TreeItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          fileCount++;
        } else {
          folderCount++;
          if (item.children) {
            count(item.children);
          }
        }
      }
    };
    
    count(structure);
    return { fileCount, folderCount };
  }
  
  /**
   * Obtiene una vista previa de la estructura (primeros N elementos).
   * 
   * @param basePath - Ruta base del proyecto
   * @param config - Configuración de FastStruct
   * @param maxItems - Número máximo de elementos a mostrar
   * @returns Vista previa de la estructura
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getStructurePreview(
    basePath: string,
    config: FastStructConfig,
    maxItems: number = 10
  ): { items: string[]; totalCount: number } {
    const structure = this.fileSystemService.readDirectoryStructure(basePath, config);
    const items: string[] = [];
    let totalCount = 0;
    
    const collectItems = (treeItems: TreeItem[], parentPath: string = '') => {
      for (const item of treeItems) {
        if (items.length >= maxItems) break;
        
        const relativePath = parentPath ? `${parentPath}/${item.name}` : item.name;
        items.push(`${item.type === 'directory' ? '📁' : '📄'} ${relativePath}`);
        totalCount++;
        
        if (item.type === 'directory' && item.children) {
          collectItems(item.children, relativePath);
        }
      }
    };
    
    collectItems(structure);
    
    // Contar elementos restantes
    const { fileCount, folderCount } = this.countItems(structure);
    totalCount = fileCount + folderCount;
    
    return { items, totalCount };
  }
}
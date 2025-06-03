import * as path from 'path';
import { TreeItem, FastStructConfig } from '@/types';
import { FileSystemService } from '@/services/FileSystemService';
import { PatternMatcher } from '@/utils/patternMatcher';
import { AI_STRUCTURE_GUIDE, STRUCTURE_ONLY_GUIDE } from '@/constants';
import { formatFileSize } from '@/utils/fileUtils';
import { Logger } from '@/logger';

/**
 * Servicio para formatear la salida de la estructura.
 * Maneja la generación de texto y formato visual.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class OutputFormatterService {
  private static instance: OutputFormatterService;
  private fileSystemService: FileSystemService;
  private patternMatcher: PatternMatcher;
  
  /**
   * Obtiene la instancia singleton del servicio.
   * 
   * @returns Instancia del servicio formateador
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): OutputFormatterService {
    if (!this.instance) {
      this.instance = new OutputFormatterService();
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
    this.patternMatcher = PatternMatcher.getInstance();
  }
  
  /**
   * Formatea la salida completa con estructura y contenido.
   * 
   * @param items - Elementos del árbol
   * @param basePath - Ruta base del proyecto
   * @param config - Configuración de FastStruct
   * @param includeContent - Si incluir el contenido de archivos
   * @returns Salida formateada
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public formatFullOutput(
    items: TreeItem[],
    basePath: string,
    config: FastStructConfig,
    includeContent: boolean = true
  ): string {
    // Generar encabezado
    let result = includeContent ? AI_STRUCTURE_GUIDE : STRUCTURE_ONLY_GUIDE;
    
    // Generar árbol
    result += this.generateTreeText(items, config);
    result += '\n\n';
    
    // Agregar contenido si está habilitado
    if (includeContent && config.output?.includeContent !== false) {
      result += this.generateFileContents(items, basePath, config);
    }
    
    return result;
  }
  
  /**
   * Genera el texto del árbol de estructura.
   * 
   * @param items - Elementos del árbol
   * @param config - Configuración de FastStruct
   * @param prefix - Prefijo para la indentación
   * @param isLast - Si es el último elemento
   * @returns Texto del árbol
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public generateTreeText(
    items: TreeItem[],
    config: FastStructConfig,
    prefix: string = '',
    isLast: boolean = true
  ): string {
    if (items.length === 0) return '';
    
    let result = '';
    
    items.forEach((item, index) => {
      const isLastItem = index === items.length - 1;
      const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
      
      // Generar línea del elemento
      result += prefix + (isLastItem ? '└── ' : '├── ');
      result += this.formatTreeItem(item, config);
      result += '\n';
      
      // Procesar hijos si es directorio
      if (item.type === 'directory' && item.children) {
        result += this.generateTreeText(
          item.children,
          config,
          newPrefix,
          isLastItem
        );
      }
    });
    
    return result;
  }
  
  /**
   * Formatea un elemento del árbol con información adicional.
   * 
   * @param item - Elemento a formatear
   * @param config - Configuración de FastStruct
   * @returns Elemento formateado
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private formatTreeItem(item: TreeItem, config: FastStructConfig): string {
    let result = '';
    
    // Agregar icono y nombre
    if (item.type === 'directory') {
      result += `📁${item.name}`;
      
      // Agregar información adicional de carpeta
      if (config.output?.includeFileSize || config.output?.includeLastModified) {
        const info: string[] = [];
        
        if (item.children) {
          const fileCount = item.children.filter(c => c.type === 'file').length;
          const folderCount = item.children.filter(c => c.type === 'directory').length;
          if (fileCount > 0 || folderCount > 0) {
            info.push(`${fileCount} files, ${folderCount} folders`);
          }
        }
        
        if (info.length > 0) {
          result += ` (${info.join(', ')})`;
        }
      }
    } else {
      result += item.name;
      
      // Agregar información adicional del archivo
      if ((config.output?.includeFileSize || config.output?.includeLastModified) && item.path) {
        const info: string[] = [];
        const stats = this.fileSystemService.getFileStats(item.path);
        
        if (stats) {
          if (config.output?.includeFileSize) {
            info.push(formatFileSize(stats.size));
          }
          
          if (config.output?.includeLastModified) {
            info.push(stats.mtime.toLocaleDateString());
          }
        }
        
        if (info.length > 0) {
          result += ` (${info.join(', ')})`;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Genera el contenido de los archivos.
   * 
   * @param items - Elementos del árbol
   * @param basePath - Ruta base del proyecto
   * @param config - Configuración de FastStruct
   * @returns Contenido formateado
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private generateFileContents(
    items: TreeItem[],
    basePath: string,
    config: FastStructConfig
  ): string {
    let fileContents = '';
    
    const processItems = (treeItems: TreeItem[]) => {
      for (const item of treeItems) {
        if (!item.path) continue;
        
        const relativePath = path.relative(basePath, item.path);
        
        if (item.type === 'file') {
          fileContents += `Path: ${relativePath}\n`;
          
          // Verificar si el contenido debe excluirse
          if (this.patternMatcher.shouldExcludeContent(
            item.path,
            'file',
            config,
            basePath
          )) {
            fileContents += 'Content: [Content excluded by configuration]\n\n';
            continue;
          }
          
          // Leer y agregar contenido
          const { content, error } = this.fileSystemService.readFile(item.path);
          if (error) {
            fileContents += `Content: [${error}]\n\n`;
          } else if (content !== null) {
            fileContents += `Content:\n\`\`\`\n${content}\n\`\`\`\n\n`;
          }
        } else if (item.type === 'directory' && item.children) {
          // Verificar si el contenido del directorio debe excluirse
          if (this.patternMatcher.shouldExcludeContent(
            item.path,
            'directory',
            config,
            basePath
          )) {
            fileContents += `Directory: ${relativePath}\n`;
            fileContents += '[Content of this directory is excluded by configuration]\n\n';
            continue;
          }
          
          // Procesar hijos
          processItems(item.children);
        }
      }
    };
    
    processItems(items);
    return fileContents;
  }
}
import * as fs from 'fs';
import * as path from 'path';
import { TreeItem, FileReadResult, FastStructConfig } from '@/types';
import { Logger } from '@/logger';
import { BINARY_EXTENSIONS } from '@/constants';
import { PatternMatcher } from '@/utils/patternMatcher';

/**
 * Servicio para manejar operaciones del sistema de archivos.
 * Aplica SRP manejando solo la lectura y análisis de archivos.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class FileSystemService {
  private static instance: FileSystemService;
  private patternMatcher: PatternMatcher;
  
  /**
   * Obtiene la instancia singleton del servicio.
   * 
   * @returns Instancia del servicio de sistema de archivos
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): FileSystemService {
    if (!this.instance) {
      this.instance = new FileSystemService();
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
    this.patternMatcher = PatternMatcher.getInstance();
  }
  
  /**
   * Lee la estructura de directorios recursivamente.
   * 
   * @param dirPath - Ruta del directorio a leer
   * @param config - Configuración de FastStruct
   * @param basePath - Ruta base del proyecto
   * @returns Array de elementos del árbol
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public readDirectoryStructure(
    dirPath: string,
    config: FastStructConfig,
    basePath: string = dirPath
  ): TreeItem[] {
    try {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      const structure: TreeItem[] = [];
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        // Verificar si debe excluirse
        if (this.patternMatcher.shouldExclude(
          fullPath,
          item.name,
          item.isDirectory() ? 'directory' : 'file',
          config,
          basePath
        )) {
          continue;
        }
        
        if (item.isDirectory()) {
          const children = this.readDirectoryStructure(fullPath, config, basePath);
          
          // Excluir carpetas vacías si está configurado
          if (!config.output?.includeEmptyFolders && children.length === 0) {
            continue;
          }
          
          structure.push({
            name: item.name,
            type: 'directory',
            children: children,
            path: fullPath
          });
        } else {
          structure.push({
            name: item.name,
            type: 'file',
            path: fullPath
          });
        }
      }
      
      return this.sortStructure(structure);
    } catch (error) {
      Logger.error(`Error leyendo directorio ${dirPath}`, error);
      return [];
    }
  }
  
  /**
   * Lee el contenido de un archivo de forma segura.
   * 
   * @param filePath - Ruta del archivo
   * @returns Resultado de la lectura
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public readFile(filePath: string): FileReadResult {
    try {
      // Verificar si es binario
      if (this.isFileBinary(filePath)) {
        return { content: null, error: 'Binary file' };
      }
      
      // Leer contenido
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Verificar caracteres no imprimibles
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content)) {
        return { content: null, error: 'Binary file' };
      }
      
      return { content };
    } catch (error) {
      Logger.debug(`Error leyendo archivo ${filePath}`, error);
      return { content: null, error: 'Binary file' };
    }
  }
  
  /**
   * Obtiene estadísticas de un archivo.
   * 
   * @param filePath - Ruta del archivo
   * @returns Estadísticas del archivo o null si hay error
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getFileStats(filePath: string): fs.Stats | null {
    try {
      return fs.statSync(filePath);
    } catch (error) {
      Logger.debug(`Error obteniendo stats de ${filePath}`, error);
      return null;
    }
  }
  
  /**
   * Verifica si un archivo es binario.
   * 
   * @param filePath - Ruta del archivo
   * @returns true si el archivo es binario
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private isFileBinary(filePath: string): boolean {
    // Verificar extensión
    const ext = path.extname(filePath).toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) {
      return true;
    }
    
    try {
      // Leer primeros bytes
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, 'r');
      const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);
      
      // Verificar firmas de archivos binarios
      return this.checkBinarySignatures(buffer, bytesRead);
    } catch (error) {
      return true; // En caso de error, asumir binario
    }
  }
  
  /**
   * Verifica las firmas de archivos binarios conocidos.
   * 
   * @param buffer - Buffer con los primeros bytes del archivo
   * @param bytesRead - Número de bytes leídos
   * @returns true si se detecta una firma binaria
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private checkBinarySignatures(buffer: Buffer, bytesRead: number): boolean {
    const signatures: { [key: string]: number[] } = {
      // Imágenes
      PNG: [0x89, 0x50, 0x4e, 0x47],
      GIF: [0x47, 0x49, 0x46, 0x38],
      JPEG: [0xff, 0xd8, 0xff],
      BMP: [0x42, 0x4d],
      WEBP: [0x52, 0x49, 0x46, 0x46],
      // Archivos comprimidos
      ZIP: [0x50, 0x4b, 0x03, 0x04],
      RAR: [0x52, 0x61, 0x72, 0x21],
      GZIP: [0x1f, 0x8b],
      // PDF
      PDF: [0x25, 0x50, 0x44, 0x46]
    };
    
    // Verificar firmas conocidas
    for (const signature of Object.values(signatures)) {
      if (signature.every((byte, i) => buffer[i] === byte)) {
        return true;
      }
    }
    
    // Verificar bytes nulos o caracteres de control
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0x00 || (buffer[i] < 0x09 && buffer[i] !== 0x0a)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Ordena la estructura de archivos y carpetas.
   * 
   * @param items - Items a ordenar
   * @returns Items ordenados (carpetas primero, luego archivos)
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private sortStructure(items: TreeItem[]): TreeItem[] {
    return items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === 'directory' ? -1 : 1;
    });
  }
}
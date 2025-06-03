/**
 * Tipos de configuración para FastStruct.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

/**
 * Configuración de exclusiones avanzadas.
 */
export interface ExclusionConfig {
  /** Patrones glob para exclusión */
  patterns: string[];
  /** Archivos específicos a excluir */
  specificFiles: string[];
  /** Carpetas específicas a excluir */
  specificFolders: string[];
  /** Expresiones regulares para exclusión */
  regexPatterns: string[];
}

/**
 * Configuración de exclusión de contenido.
 */
export interface ContentExclusionConfig {
  /** Archivos cuyo contenido no se mostrará */
  files: string[];
  /** Carpetas cuyo contenido no se mostrará */
  folders: string[];
  /** Patrones para excluir contenido */
  patterns: string[];
}

/**
 * Configuración de exclusión rápida.
 */
export interface QuickExcludeConfig {
  /** Si las exclusiones rápidas están habilitadas */
  enabled: boolean;
  /** Si mostrar notificaciones al agregar exclusiones */
  showNotifications: boolean;
}

/**
 * Opciones de salida para la estructura generada.
 */
export interface OutputConfig {
  /** Si incluir el contenido de los archivos */
  includeContent: boolean;
  /** Si incluir carpetas vacías */
  includeEmptyFolders: boolean;
  /** Si mostrar el tamaño de los archivos */
  includeFileSize: boolean;
  /** Si mostrar la fecha de última modificación */
  includeLastModified: boolean;
}

/**
 * Configuración principal de FastStruct.
 */
export interface FastStructConfig {
  /** Modo debug habilitado */
  debug: boolean;
  /** Configuración de exclusiones */
  exclude: {
    /** Carpetas a excluir */
    folders: string[];
    /** Archivos a excluir */
    files: string[];
    /** Exclusiones avanzadas */
    advanced: ExclusionConfig;
  };
  /** Configuración de exclusión de contenido */
  excludeContent: ContentExclusionConfig;
  /** Configuración de exclusión rápida */
  quickExclude?: QuickExcludeConfig;
  /** Opciones de salida */
  output?: OutputConfig;
}

/**
 * Representa un elemento en la estructura del árbol de archivos.
 */
export interface TreeItem {
  /** Nombre del archivo o directorio */
  name: string;
  /** Tipo de elemento */
  type: "file" | "directory";
  /** Elementos hijos (solo para directorios) */
  children?: TreeItem[];
  /** Ruta completa del elemento */
  path?: string;
}

/**
 * Resultado de la lectura de un archivo.
 */
export interface FileReadResult {
  /** Contenido del archivo si se pudo leer */
  content: string | null;
  /** Mensaje de error si falló la lectura */
  error?: string;
}

/**
 * Opciones para generar la estructura.
 */
export interface StructureGenerationOptions {
  /** Si incluir el contenido de los archivos */
  includeContent: boolean;
  /** Ruta base del proyecto */
  basePath: string;
  /** Configuración de FastStruct */
  config: FastStructConfig;
}

/**
 * Estadísticas de exclusión.
 */
export interface ExclusionStats {
  totalFiles: number;
  totalFolders: number;
  excludedFiles: number;
  excludedFolders: number;
  totalSize: number;
  excludedSize: number;
  percentExcludedFiles: number;
  percentExcludedFolders: number;
  percentExcludedSize: number;
}

/**
 * Tipo de exclusión para el menú contextual.
 */
export type ExclusionType = 
  | "Archivo específico"
  | "Extensión de archivo"
  | "Nombre de archivo"
  | "Contenido de archivo"
  | "Contenido por extensión"
  | "Patrón de archivo"
  | "Carpeta específica"
  | "Nombre de carpeta"
  | "Contenido de carpeta"
  | "Subcarpetas"
  | "Patrón de carpeta";

/**
 * Ruta de configuración para exclusiones.
 */
export type ConfigPath = 
  | "exclude.folders"
  | "exclude.files"
  | "exclude.advanced.patterns"
  | "exclude.advanced.specificFiles"
  | "exclude.advanced.specificFolders"
  | "exclude.advanced.regexPatterns"
  | "excludeContent.files"
  | "excludeContent.folders"
  | "excludeContent.patterns";

import * as path from 'path';

/**
 * Utilidades para manejo de rutas de archivos.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

/**
 * Normaliza una ruta para uso consistente en diferentes sistemas operativos.
 * 
 * @param filePath - Ruta a normalizar
 * @returns Ruta normalizada con separadores forward slash
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function normalizePath(filePath: string): string {
  return path.normalize(filePath)
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/'); // Collapse multiple slashes
}

/**
 * Obtiene la ruta relativa normalizada.
 * 
 * @param from - Ruta base
 * @param to - Ruta destino
 * @returns Ruta relativa normalizada
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function getRelativePath(from: string, to: string): string {
  return normalizePath(path.relative(from, to));
}

/**
 * Verifica si una ruta es absoluta.
 * 
 * @param filePath - Ruta a verificar
 * @returns true si la ruta es absoluta
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Une múltiples segmentos de ruta de forma segura.
 * 
 * @param paths - Segmentos de ruta a unir
 * @returns Ruta unida y normalizada
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function joinPaths(...paths: string[]): string {
  return normalizePath(path.join(...paths));
}

/**
 * Obtiene el directorio padre de una ruta.
 * 
 * @param filePath - Ruta del archivo o directorio
 * @returns Ruta del directorio padre
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function getParentDirectory(filePath: string): string {
  return normalizePath(path.dirname(filePath));
}

/**
 * Verifica si una ruta está dentro de otra.
 * 
 * @param parentPath - Ruta padre
 * @param childPath - Ruta a verificar
 * @returns true si childPath está dentro de parentPath
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function isPathInside(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}
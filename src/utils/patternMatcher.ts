import { Minimatch } from 'minimatch';
import * as path from 'path';
import { FastStructConfig } from '@/types';
import { Logger } from '@/logger';

/**
 * Utilidad para manejar coincidencias de patrones de exclusión.
 * Centraliza toda la lógica de matching siguiendo DRY.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class PatternMatcher {
  private static instance: PatternMatcher;
  
  /**
   * Obtiene la instancia singleton.
   * 
   * @returns Instancia del PatternMatcher
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public static getInstance(): PatternMatcher {
    if (!this.instance) {
      this.instance = new PatternMatcher();
    }
    return this.instance;
  }
  
  /**
   * Constructor privado para implementar patrón Singleton.
   * 
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private constructor() {}
  
  /**
   * Verifica si un elemento debe excluirse de la estructura.
   * 
   * @param itemPath - Ruta del elemento
   * @param name - Nombre del elemento
   * @param type - Tipo de elemento (file o directory)
   * @param config - Configuración de FastStruct
   * @param basePath - Ruta base del proyecto
   * @returns true si debe excluirse
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public shouldExclude(
    itemPath: string,
    name: string,
    type: 'file' | 'directory',
    config: FastStructConfig,
    basePath: string
  ): boolean {
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
    
    if (config.debug) {
      Logger.debug(`Verificando exclusión para: ${relativePath}`);
    }
    
    // Verificar patrones básicos
    if (this.matchesBasicPatterns(name, type, config)) {
      if (config.debug) {
        Logger.debug(`Excluido por patrón básico: ${name}`);
      }
      return true;
    }
    
    // Verificar rutas específicas
    if (this.matchesSpecificPath(itemPath, type, config, basePath)) {
      if (config.debug) {
        Logger.debug(`Excluido por ruta específica: ${relativePath}`);
      }
      return true;
    }
    
    // Verificar expresiones regulares
    if (this.matchesRegexPatterns(relativePath, config.exclude.advanced.regexPatterns)) {
      if (config.debug) {
        Logger.debug(`Excluido por expresión regular: ${relativePath}`);
      }
      return true;
    }
    
    // Verificar patrones avanzados
    if (this.matchesAdvancedPatterns(relativePath, config.exclude.advanced.patterns)) {
      if (config.debug) {
        Logger.debug(`Excluido por patrón avanzado: ${relativePath}`);
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * Verifica si el contenido de un elemento debe excluirse.
   * 
   * @param itemPath - Ruta del elemento
   * @param type - Tipo de elemento
   * @param config - Configuración de FastStruct
   * @param basePath - Ruta base del proyecto
   * @returns true si el contenido debe excluirse
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public shouldExcludeContent(
    itemPath: string,
    type: 'file' | 'directory',
    config: FastStructConfig,
    basePath: string
  ): boolean {
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, '/');
    const name = path.basename(itemPath);
    
    if (config.debug) {
      Logger.debug(`Verificando exclusión de contenido para: ${relativePath}`);
    }
    
    // Verificar archivos/carpetas específicos
    if (type === 'file' && config.excludeContent.files.includes(relativePath)) {
      return true;
    }
    
    if (type === 'directory' && config.excludeContent.folders.includes(relativePath)) {
      return true;
    }
    
    // Verificar patrones de contenido
    for (const pattern of config.excludeContent.patterns) {
      const mm = new Minimatch(pattern, { dot: true });
      if (mm.match(relativePath) || mm.match(name)) {
        if (config.debug) {
          Logger.debug(`Contenido excluido por patrón: ${pattern}`);
        }
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Verifica coincidencias con patrones básicos.
   * 
   * @param name - Nombre del elemento
   * @param type - Tipo de elemento
   * @param config - Configuración de FastStruct
   * @returns true si coincide con algún patrón básico
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private matchesBasicPatterns(
    name: string,
    type: 'file' | 'directory',
    config: FastStructConfig
  ): boolean {
    const patterns = type === 'directory' ? config.exclude.folders : config.exclude.files;
    
    return patterns.some(pattern => {
      // Si el patrón contiene caracteres especiales, usar minimatch
      if (pattern.includes('*') || pattern.includes('?') || pattern.includes('[')) {
        const mm = new Minimatch(pattern, { dot: true });
        return mm.match(name);
      }
      // Si no, comparación exacta
      return name === pattern;
    });
  }
  
  /**
   * Verifica coincidencias con rutas específicas.
   * 
   * @param itemPath - Ruta del elemento
   * @param type - Tipo de elemento
   * @param config - Configuración de FastStruct
   * @param basePath - Ruta base
   * @returns true si coincide con alguna ruta específica
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private matchesSpecificPath(
    itemPath: string,
    type: 'file' | 'directory',
    config: FastStructConfig,
    basePath: string
  ): boolean {
    const specificPaths = type === 'file' 
      ? config.exclude.advanced.specificFiles 
      : config.exclude.advanced.specificFolders;
    
    const normalizedItemPath = path
      .normalize(path.relative(basePath, itemPath))
      .replace(/\\/g, '/')
      .replace(/\/$/, ''); // Remove trailing slash
    
    return specificPaths.some(specificPath => {
      const normalizedSpecificPath = path
        .normalize(specificPath)
        .replace(/\\/g, '/')
        .replace(/\/$/, ''); // Remove trailing slash
      
      return normalizedItemPath === normalizedSpecificPath ||
             normalizedItemPath.startsWith(normalizedSpecificPath + '/') ||
             normalizedItemPath.endsWith('/' + normalizedSpecificPath) ||
             normalizedItemPath.includes('/' + normalizedSpecificPath + '/');
    });
  }
  
  /**
   * Verifica coincidencias con expresiones regulares.
   * 
   * @param relativePath - Ruta relativa del elemento
   * @param patterns - Patrones de expresiones regulares
   * @returns true si coincide con alguna expresión regular
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private matchesRegexPatterns(relativePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(relativePath);
      } catch (e) {
        Logger.warn(`Expresión regular inválida: ${pattern}`, e);
        return false;
      }
    });
  }
  
  /**
   * Verifica coincidencias con patrones avanzados glob.
   * 
   * @param relativePath - Ruta relativa del elemento
   * @param patterns - Patrones glob avanzados
   * @returns true si coincide con algún patrón
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private matchesAdvancedPatterns(relativePath: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      const mm = new Minimatch(pattern, { dot: true });
      return mm.match(relativePath);
    });
  }
  
  /**
   * Prueba un patrón contra una lista de archivos.
   * 
   * @param pattern - Patrón a probar
   * @param files - Lista de archivos
   * @param type - Tipo de patrón (glob, regex, simple)
   * @returns Lista de archivos que coinciden
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public testPattern(
    pattern: string,
    files: string[],
    type: 'glob' | 'regex' | 'simple' = 'glob'
  ): string[] {
    const matches: string[] = [];
    
    for (const file of files) {
      let shouldMatch = false;
      
      switch (type) {
        case 'glob':
          const mm = new Minimatch(pattern, { dot: true });
          shouldMatch = mm.match(file) || mm.match(path.basename(file));
          break;
          
        case 'regex':
          try {
            const regex = new RegExp(pattern);
            shouldMatch = regex.test(file);
          } catch (e) {
            // Regex inválido
          }
          break;
          
        case 'simple':
          shouldMatch = path.basename(file) === pattern;
          break;
      }
      
      if (shouldMatch) {
        matches.push(file);
      }
    }
    
    return matches;
  }
}
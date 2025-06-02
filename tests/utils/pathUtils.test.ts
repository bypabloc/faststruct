/**
 * Tests para pathUtils
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect } from '@jest/globals';
import * as path from 'path';
import {
  normalizePath,
  getRelativePath,
  isAbsolutePath,
  joinPaths,
  getParentDirectory,
  isPathInside
} from '@/utils/pathUtils';

describe('pathUtils', () => {
  // Detectar el sistema operativo para tests específicos de plataforma
  const isWindows = process.platform === 'win32';

  describe('normalizePath', () => {
    it('debe normalizar rutas con backslashes a forward slashes', () => {
      expect(normalizePath('C:\\Users\\test\\file.txt')).toBe('C:/Users/test/file.txt');
      expect(normalizePath('src\\components\\Button.jsx')).toBe('src/components/Button.jsx');
    });

    it('debe mantener rutas con forward slashes sin cambios', () => {
      expect(normalizePath('/home/user/project')).toBe('/home/user/project');
      expect(normalizePath('src/index.js')).toBe('src/index.js');
    });

    it('debe normalizar rutas con separadores mixtos', () => {
      expect(normalizePath('C:\\Users/test\\project/src\\index.js')).toBe('C:/Users/test/project/src/index.js');
    });

    it('debe manejar rutas con múltiples separadores consecutivos', () => {
      expect(normalizePath('src//components///Button.jsx')).toBe('src/components/Button.jsx');
      expect(normalizePath('C:\\\\Users\\\\test')).toBe('C:/Users/test');
    });

    it('debe manejar rutas con . y ..', () => {
      expect(normalizePath('./src/../lib/index.js')).toBe('lib/index.js');
      expect(normalizePath('src/./components/./Button.jsx')).toBe('src/components/Button.jsx');
    });

    it('debe manejar rutas vacías', () => {
      expect(normalizePath('')).toBe('.');
    });
  });

  describe('getRelativePath', () => {
    it('debe obtener ruta relativa entre dos rutas absolutas', () => {
      const from = isWindows ? 'C:\\project' : '/project';
      const to = isWindows ? 'C:\\project\\src\\index.js' : '/project/src/index.js';
      
      expect(getRelativePath(from, to)).toBe('src/index.js');
    });

    it('debe obtener ruta relativa con navegación hacia arriba', () => {
      const from = isWindows ? 'C:\\project\\src\\components' : '/project/src/components';
      const to = isWindows ? 'C:\\project\\lib\\utils.js' : '/project/lib/utils.js';
      
      expect(getRelativePath(from, to)).toBe('../../lib/utils.js');
    });

    it('debe manejar rutas en el mismo directorio', () => {
      const from = isWindows ? 'C:\\project\\src' : '/project/src';
      const to = isWindows ? 'C:\\project\\src\\index.js' : '/project/src/index.js';
      
      expect(getRelativePath(from, to)).toBe('index.js');
    });

    it('debe manejar rutas idénticas', () => {
      const samePath = isWindows ? 'C:\\project\\src' : '/project/src';
      
      expect(getRelativePath(samePath, samePath)).toBe('.');
    });

    it('debe normalizar el resultado con forward slashes', () => {
      if (isWindows) {
        expect(getRelativePath('C:\\a\\b', 'C:\\x\\y')).toBe('../../x/y');
      }
    });
  });

  describe('isAbsolutePath', () => {
    it('debe identificar rutas absolutas correctamente', () => {
      if (isWindows) {
        expect(isAbsolutePath('C:\\Users\\test')).toBe(true);
        expect(isAbsolutePath('D:\\project')).toBe(true);
        expect(isAbsolutePath('\\\\server\\share')).toBe(true);
      } else {
        expect(isAbsolutePath('/home/user')).toBe(true);
        expect(isAbsolutePath('/usr/local/bin')).toBe(true);
      }
    });

    it('debe identificar rutas relativas correctamente', () => {
      expect(isAbsolutePath('src/index.js')).toBe(false);
      expect(isAbsolutePath('./file.txt')).toBe(false);
      expect(isAbsolutePath('../parent/file.txt')).toBe(false);
      expect(isAbsolutePath('file.txt')).toBe(false);
    });

    it('debe manejar rutas vacías', () => {
      expect(isAbsolutePath('')).toBe(false);
    });
  });

  describe('joinPaths', () => {
    it('debe unir segmentos de ruta correctamente', () => {
      expect(joinPaths('src', 'components', 'Button.jsx')).toBe('src/components/Button.jsx');
      expect(joinPaths('/home', 'user', 'project')).toBe('/home/user/project');
    });

    it('debe manejar segmentos con separadores', () => {
      expect(joinPaths('src/', '/components/', '/Button.jsx')).toBe('src/components/Button.jsx');
      expect(joinPaths('src\\', '\\components', 'Button.jsx')).toBe('src/components/Button.jsx');
    });

    it('debe manejar segmentos vacíos', () => {
      expect(joinPaths('src', '', 'index.js')).toBe('src/index.js');
      expect(joinPaths('', 'src', 'index.js')).toBe('src/index.js');
    });

    it('debe manejar un solo segmento', () => {
      expect(joinPaths('src')).toBe('src');
    });

    it('debe manejar sin argumentos', () => {
      expect(joinPaths()).toBe('.');
    });

    it('debe preservar rutas absolutas', () => {
      if (isWindows) {
        expect(joinPaths('C:\\project', 'src')).toBe('C:/project/src');
      } else {
        expect(joinPaths('/project', 'src')).toBe('/project/src');
      }
    });

    it('debe resolver . y ..', () => {
      expect(joinPaths('src', '..', 'lib')).toBe('lib');
      expect(joinPaths('src', '.', 'components')).toBe('src/components');
    });
  });

  describe('getParentDirectory', () => {
    it('debe obtener el directorio padre de un archivo', () => {
      expect(getParentDirectory('/home/user/file.txt')).toBe('/home/user');
      expect(getParentDirectory('src/components/Button.jsx')).toBe('src/components');
    });

    it('debe obtener el directorio padre de un directorio', () => {
      expect(getParentDirectory('/home/user/project')).toBe('/home/user');
      expect(getParentDirectory('src/components')).toBe('src');
    });

    it('debe manejar rutas con trailing slash', () => {
      expect(getParentDirectory('/home/user/project/')).toBe('/home/user');
      expect(getParentDirectory('src/components/')).toBe('src');
    });

    it('debe manejar rutas en la raíz', () => {
      if (isWindows) {
        expect(getParentDirectory('C:\\')).toBe('C:/');
        expect(getParentDirectory('C:\\file.txt')).toBe('C:/');
      } else {
        expect(getParentDirectory('/')).toBe('/');
        expect(getParentDirectory('/file.txt')).toBe('/');
      }
    });

    it('debe manejar rutas relativas simples', () => {
      expect(getParentDirectory('file.txt')).toBe('.');
      expect(getParentDirectory('src')).toBe('.');
    });

    it('debe normalizar el resultado', () => {
      if (isWindows) {
        expect(getParentDirectory('C:\\Users\\test\\file.txt')).toBe('C:/Users/test');
      }
    });
  });

  describe('isPathInside', () => {
    it('debe detectar cuando una ruta está dentro de otra', () => {
      expect(isPathInside('/project', '/project/src/index.js')).toBe(true);
      expect(isPathInside('/project', '/project/src')).toBe(true);
      expect(isPathInside('/project/src', '/project/src/components/Button.jsx')).toBe(true);
    });

    it('debe detectar cuando una ruta NO está dentro de otra', () => {
      expect(isPathInside('/project', '/other/project')).toBe(false);
      expect(isPathInside('/project/src', '/project/lib')).toBe(false);
      expect(isPathInside('/a/b/c', '/a/b')).toBe(false);
    });

    it('debe manejar rutas idénticas', () => {
      expect(isPathInside('/project', '/project')).toBe(false);
      expect(isPathInside('/a/b/c', '/a/b/c')).toBe(false);
    });

    it('debe manejar rutas relativas', () => {
      expect(isPathInside('src', 'src/components/Button.jsx')).toBe(true);
      expect(isPathInside('src/components', 'src/utils')).toBe(false);
    });

    it('debe manejar rutas con . y ..', () => {
      expect(isPathInside('/project', '/project/./src')).toBe(true);
      expect(isPathInside('/project', '/project/../other')).toBe(false);
    });

    it('debe funcionar con rutas de Windows', () => {
      if (isWindows) {
        expect(isPathInside('C:\\project', 'C:\\project\\src')).toBe(true);
        expect(isPathInside('C:\\project', 'D:\\project')).toBe(false);
      }
    });

    it('debe ser case-sensitive en sistemas Unix', () => {
      if (!isWindows) {
        expect(isPathInside('/Project', '/project/src')).toBe(false);
      }
    });
  });
});
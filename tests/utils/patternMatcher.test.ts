/**
 * Tests para PatternMatcher
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PatternMatcher } from '../../src/utils/patternMatcher';
import { FastStructConfig } from '../../src/types';

// Mock Logger
jest.mock('../../src/logger', () => ({
  Logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;
  let mockConfig: FastStructConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (PatternMatcher as any).instance = undefined;
    matcher = PatternMatcher.getInstance();
    
    mockConfig = {
      debug: false,
      exclude: {
        folders: ['node_modules', '.git', 'dist'],
        files: ['*.log', '*.lock', 'package-lock.json'],
        advanced: {
          patterns: ['**/*.min.js', '**/*.generated.*'],
          specificFiles: ['src/config/secret.json'],
          specificFolders: ['tests/fixtures/'],
          regexPatterns: ['.*\\.temp\\..*']
        }
      },
      excludeContent: {
        files: ['*.env', 'config.js'],
        folders: ['src/config', 'secrets'],
        patterns: ['**/*.secret.*', '**/.env*']
      }
    };
  });

  describe('getInstance', () => {
    it('debe retornar siempre la misma instancia (singleton)', () => {
      const instance1 = PatternMatcher.getInstance();
      const instance2 = PatternMatcher.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('shouldExclude', () => {
    describe('exclusión de carpetas', () => {
      it('debe excluir carpetas por nombre exacto', () => {
        const result = matcher.shouldExclude(
          '/project/node_modules',
          'node_modules',
          'directory',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir carpetas por patrón glob', () => {
        const result = matcher.shouldExclude(
          '/project/build',
          'build',
          'directory',
          { ...mockConfig, exclude: { ...mockConfig.exclude, folders: ['build*'] } },
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir carpetas específicas por ruta', () => {
        const result = matcher.shouldExclude(
          '/project/tests/fixtures/',
          'fixtures',
          'directory',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('no debe excluir carpetas no configuradas', () => {
        const result = matcher.shouldExclude(
          '/project/src',
          'src',
          'directory',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(false);
      });
    });

    describe('exclusión de archivos', () => {
      it('debe excluir archivos por extensión', () => {
        const result = matcher.shouldExclude(
          '/project/error.log',
          'error.log',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir archivos por nombre exacto', () => {
        const result = matcher.shouldExclude(
          '/project/package-lock.json',
          'package-lock.json',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir archivos por patrón avanzado', () => {
        const result = matcher.shouldExclude(
          '/project/js/app.min.js',
          'app.min.js',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir archivos por archivo específico', () => {
        const result = matcher.shouldExclude(
          '/project/src/config/secret.json',
          'secret.json',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('debe excluir archivos por expresión regular', () => {
        const result = matcher.shouldExclude(
          '/project/file.temp.bak',
          'file.temp.bak',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(true);
      });

      it('no debe excluir archivos no configurados', () => {
        const result = matcher.shouldExclude(
          '/project/src/index.js',
          'index.js',
          'file',
          mockConfig,
          '/project'
        );
        
        expect(result).toBe(false);
      });
    });

    describe('manejo de rutas', () => {
      it('debe normalizar rutas con backslashes', () => {
        const result = matcher.shouldExclude(
          'C:\\project\\node_modules',
          'node_modules',
          'directory',
          mockConfig,
          'C:\\project'
        );
        
        expect(result).toBe(true);
      });

      it('debe manejar rutas relativas correctamente', () => {
        const result = matcher.shouldExclude(
          '/root/project/deep/tests/fixtures/',
          'fixtures',
          'directory',
          mockConfig,
          '/root/project'
        );
        
        expect(result).toBe(true);
      });
    });

    describe('modo debug', () => {
      it('debe loggear cuando debug está habilitado', () => {
        const { Logger } = require('../../src/logger');
        mockConfig.debug = true;
        
        matcher.shouldExclude(
          '/project/node_modules',
          'node_modules',
          'directory',
          mockConfig,
          '/project'
        );
        
        // Verificar que Logger.debug fue llamado
        expect(Logger.debug).toHaveBeenCalled();
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Verificando exclusión'));
      });
    });
  });

  describe('shouldExcludeContent', () => {
    it('debe excluir contenido de archivos específicos', () => {
      const result = matcher.shouldExcludeContent(
        '/project/config.js',
        'file',
        mockConfig,
        '/project'
      );
      
      expect(result).toBe(true);
    });

    it('debe excluir contenido de carpetas específicas', () => {
      const result = matcher.shouldExcludeContent(
        '/project/src/config',
        'directory',
        mockConfig,
        '/project'
      );
      
      expect(result).toBe(true);
    });

    it('debe excluir contenido por patrones', () => {
      const result = matcher.shouldExcludeContent(
        '/project/keys.secret.json',
        'file',
        mockConfig,
        '/project'
      );
      
      expect(result).toBe(true);
    });

    it('debe excluir contenido de archivos .env', () => {
      const result = matcher.shouldExcludeContent(
        '/project/.env.production',
        'file',
        mockConfig,
        '/project'
      );
      
      expect(result).toBe(true);
    });

    it('no debe excluir contenido no configurado', () => {
      const result = matcher.shouldExcludeContent(
        '/project/src/index.js',
        'file',
        mockConfig,
        '/project'
      );
      
      expect(result).toBe(false);
    });
  });

  describe('testPattern', () => {
    const files = [
      'src/index.js',
      'src/app.min.js',
      'src/components/Button.jsx',
      'test/unit/app.test.js',
      'node_modules/lodash/index.js',
      'dist/bundle.js',
      'config.env',
      '.env.local',
      'README.md',
      'package-lock.json'
    ];

    describe('tipo glob', () => {
      it('debe encontrar archivos por patrón glob simple', () => {
        const matches = matcher.testPattern('*.md', files, 'glob');
        
        expect(matches).toContain('README.md');
        expect(matches).toHaveLength(1);
      });

      it('debe encontrar archivos por patrón glob con **', () => {
        const matches = matcher.testPattern('**/*.test.js', files, 'glob');
        
        expect(matches).toContain('test/unit/app.test.js');
        expect(matches).toHaveLength(1);
      });

      it('debe encontrar múltiples archivos', () => {
        const matches = matcher.testPattern('*env*', files, 'glob');
        
        expect(matches).toContain('config.env');
        expect(matches).toContain('.env.local');
        expect(matches).toHaveLength(2);
      });

      it('debe retornar array vacío si no hay coincidencias', () => {
        const matches = matcher.testPattern('*.xyz', files, 'glob');
        
        expect(matches).toEqual([]);
      });
    });

    describe('tipo regex', () => {
      it('debe encontrar archivos por expresión regular', () => {
        const matches = matcher.testPattern('.*\\.min\\.js$', files, 'regex');
        
        expect(matches).toContain('src/app.min.js');
        expect(matches).toHaveLength(1);
      });

      it('debe manejar regex complejos', () => {
        const matches = matcher.testPattern('^src/.*\\.jsx?$', files, 'regex');
        
        expect(matches).toContain('src/index.js');
        expect(matches).toContain('src/app.min.js');
        expect(matches).toContain('src/components/Button.jsx');
        expect(matches).toHaveLength(3);
      });

      it('debe manejar regex inválidos', () => {
        const matches = matcher.testPattern('[invalid(regex', files, 'regex');
        
        expect(matches).toEqual([]);
      });
    });

    describe('tipo simple', () => {
      it('debe encontrar archivos por nombre exacto', () => {
        const matches = matcher.testPattern('README.md', files, 'simple');
        
        expect(matches).toContain('README.md');
        expect(matches).toHaveLength(1);
      });

      it('debe coincidir solo con el nombre base', () => {
        const matches = matcher.testPattern('index.js', files, 'simple');
        
        expect(matches).toContain('src/index.js');
        expect(matches).toContain('node_modules/lodash/index.js');
        expect(matches).toHaveLength(2);
      });

      it('no debe usar wildcards en modo simple', () => {
        const matches = matcher.testPattern('*.js', files, 'simple');
        
        expect(matches).toEqual([]);
      });
    });
  });

  describe('matchesBasicPatterns', () => {
    it('debe coincidir con patrones con wildcards', () => {
      const result = (matcher as any).matchesBasicPatterns(
        'error.log',
        'file',
        mockConfig
      );
      
      expect(result).toBe(true);
    });

    it('debe coincidir con nombres exactos', () => {
      const result = (matcher as any).matchesBasicPatterns(
        'package-lock.json',
        'file',
        mockConfig
      );
      
      expect(result).toBe(true);
    });

    it('debe diferenciar entre archivos y carpetas', () => {
      const fileResult = (matcher as any).matchesBasicPatterns(
        'node_modules',
        'file',
        mockConfig
      );
      
      const folderResult = (matcher as any).matchesBasicPatterns(
        'node_modules',
        'directory',
        mockConfig
      );
      
      expect(fileResult).toBe(false);
      expect(folderResult).toBe(true);
    });
  });

  describe('matchesRegexPatterns', () => {
    it('debe coincidir con expresiones regulares válidas', () => {
      const result = (matcher as any).matchesRegexPatterns(
        'file.temp.bak',
        ['.*\\.temp\\..*']
      );
      
      expect(result).toBe(true);
    });

    it('debe manejar expresiones regulares inválidas', () => {
      const { Logger } = require('../../src/logger');
      
      const result = (matcher as any).matchesRegexPatterns(
        'file.txt',
        ['[invalid(regex']
      );
      
      expect(result).toBe(false);
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Expresión regular inválida'),
        expect.any(Error)
      );
    });

    it('debe probar múltiples expresiones regulares', () => {
      const result = (matcher as any).matchesRegexPatterns(
        'test.spec.js',
        ['.*\\.temp\\..*', '.*\\.spec\\..*', '.*\\.test\\..*']
      );
      
      expect(result).toBe(true);
    });
  });
});
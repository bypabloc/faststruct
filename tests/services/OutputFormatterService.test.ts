/**
 * Tests para OutputFormatterService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { OutputFormatterService } from '@/services/OutputFormatterService';
import { FileSystemService } from '@/services/FileSystemService';
import { PatternMatcher } from '@/utils/patternMatcher';
import { TreeItem, FastStructConfig } from '@/types';
import { AI_STRUCTURE_GUIDE, STRUCTURE_ONLY_GUIDE } from '@/constants';

// Mock de servicios
jest.mock('@/services/FileSystemService');
jest.mock('@/utils/patternMatcher');

describe('OutputFormatterService', () => {
  let service: OutputFormatterService;
  let mockFileSystemService: jest.Mocked<FileSystemService>;
  let mockPatternMatcher: jest.Mocked<PatternMatcher>;
  let mockConfig: FastStructConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (OutputFormatterService as any).instance = undefined;
    
    // Configurar mocks
    mockFileSystemService = {
      readFile: jest.fn(),
      getFileStats: jest.fn()
    } as any;
    
    mockPatternMatcher = {
      shouldExcludeContent: jest.fn().mockReturnValue(false)
    } as any;
    
    (FileSystemService.getInstance as jest.Mock).mockReturnValue(mockFileSystemService);
    (PatternMatcher.getInstance as jest.Mock).mockReturnValue(mockPatternMatcher);
    
    service = OutputFormatterService.getInstance();
    
    mockConfig = {
      debug: false,
      exclude: {
        folders: [],
        files: [],
        advanced: {
          patterns: [],
          specificFiles: [],
          specificFolders: [],
          regexPatterns: []
        }
      },
      excludeContent: {
        files: [],
        folders: [],
        patterns: []
      },
      output: {
        includeContent: true,
        includeEmptyFolders: true,
        includeFileSize: false,
        includeLastModified: false
      }
    };
  });

  describe('getInstance', () => {
    it('debe retornar siempre la misma instancia (singleton)', () => {
      const instance1 = OutputFormatterService.getInstance();
      const instance2 = OutputFormatterService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('formatFullOutput', () => {
    const mockItems: TreeItem[] = [
      {
        name: 'project',
        type: 'directory',
        path: '/test/project',
        children: [
          {
            name: 'src',
            type: 'directory',
            path: '/test/project/src',
            children: [
              {
                name: 'index.js',
                type: 'file',
                path: '/test/project/src/index.js'
              }
            ]
          },
          {
            name: 'README.md',
            type: 'file',
            path: '/test/project/README.md'
          }
        ]
      }
    ];

    it('debe generar salida con contenido cuando includeContent es true', () => {
      mockFileSystemService.readFile.mockReturnValue({
        content: 'console.log("Hello");',
        error: undefined
      });
      
      const result = service.formatFullOutput(mockItems, '/test/project', mockConfig, true);
      
      expect(result).toContain(AI_STRUCTURE_GUIDE);
      expect(result).toContain('Path: src/index.js');
      expect(result).toContain('console.log("Hello");');
    });

    it('debe generar salida sin contenido cuando includeContent es false', () => {
      const result = service.formatFullOutput(mockItems, '/test/project', mockConfig, false);
      
      expect(result).toContain(STRUCTURE_ONLY_GUIDE);
      expect(result).not.toContain('Path:');
      expect(result).not.toContain('Content:');
    });

    it('debe respetar la configuración output.includeContent', () => {
      mockConfig.output!.includeContent = false;
      
      const result = service.formatFullOutput(mockItems, '/test/project', mockConfig, true);
      
      // Should not contain actual file paths (Path: src/index.js)
      expect(result).not.toContain('Path: src/index.js');
      expect(result).not.toContain('Path: README.md');
      // But the guide text explaining the format is OK
      expect(result).toContain('AI File Structure Analysis Guide');
    });

    it('debe generar árbol de estructura correctamente', () => {
      const result = service.formatFullOutput(mockItems, '/test/project', mockConfig, false);
      
      expect(result).toContain('└── 📁project');
      expect(result).toContain('├── 📁src');
      expect(result).toContain('│   └── index.js');
      expect(result).toContain('└── README.md');
    });
  });

  describe('generateTreeText', () => {
    it('debe generar árbol simple correctamente', () => {
      const items: TreeItem[] = [
        { name: 'file1.txt', type: 'file' },
        { name: 'file2.txt', type: 'file' }
      ];
      
      const result = service.generateTreeText(items, mockConfig);
      
      expect(result).toBe('├── file1.txt\n└── file2.txt\n');
    });

    it('debe generar árbol con carpetas y archivos', () => {
      const items: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          children: [
            { name: 'index.js', type: 'file' }
          ]
        },
        { name: 'README.md', type: 'file' }
      ];
      
      const result = service.generateTreeText(items, mockConfig);
      
      expect(result).toContain('├── 📁src');
      expect(result).toContain('│   └── index.js');
      expect(result).toContain('└── README.md');
    });

    it('debe manejar árbol vacío', () => {
      const result = service.generateTreeText([], mockConfig);
      
      expect(result).toBe('');
    });

    it('debe generar árbol profundamente anidado', () => {
      const items: TreeItem[] = [
        {
          name: 'level1',
          type: 'directory',
          children: [
            {
              name: 'level2',
              type: 'directory',
              children: [
                {
                  name: 'level3',
                  type: 'directory',
                  children: [
                    { name: 'deep.txt', type: 'file' }
                  ]
                }
              ]
            }
          ]
        }
      ];
      
      const result = service.generateTreeText(items, mockConfig);
      
      expect(result).toContain('└── 📁level1');
      expect(result).toContain('    └── 📁level2');
      expect(result).toContain('        └── 📁level3');
      expect(result).toContain('            └── deep.txt');
    });

    it('debe incluir información adicional cuando está configurado', () => {
      mockConfig.output!.includeFileSize = true;
      mockConfig.output!.includeLastModified = true;
      
      mockFileSystemService.getFileStats.mockReturnValue({
        size: 1024,
        mtime: new Date('2025-01-31'),
        isFile: () => true,
        isDirectory: () => false
      } as any);
      
      const items: TreeItem[] = [
        { name: 'file.txt', type: 'file', path: '/test/file.txt' }
      ];
      
      const result = service.generateTreeText(items, mockConfig);
      
      expect(result).toContain('file.txt (1.0 KB,');
    });

    it('debe mostrar conteo de elementos en carpetas', () => {
      mockConfig.output!.includeFileSize = true;
      
      const items: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          children: [
            { name: 'file1.js', type: 'file' },
            { name: 'file2.js', type: 'file' },
            { name: 'utils', type: 'directory', children: [] }
          ]
        }
      ];
      
      const result = service.generateTreeText(items, mockConfig);
      
      expect(result).toContain('📁src (2 files, 1 folders)');
    });
  });

  describe('generateFileContents', () => {
    it('debe generar contenido de archivos', () => {
      const items: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          path: '/test/src',
          children: [
            {
              name: 'index.js',
              type: 'file',
              path: '/test/src/index.js'
            }
          ]
        }
      ];
      
      mockFileSystemService.readFile.mockReturnValue({
        content: 'const app = "Hello";'
      });
      
      const result = (service as any).generateFileContents(items, '/test', mockConfig);
      
      expect(result).toContain('Path: src/index.js');
      expect(result).toContain('Content:\n```\nconst app = "Hello";\n```');
    });

    it('debe excluir contenido cuando está configurado', () => {
      const items: TreeItem[] = [
        {
          name: 'config.js',
          type: 'file',
          path: '/test/config.js'
        }
      ];
      
      mockPatternMatcher.shouldExcludeContent.mockReturnValue(true);
      
      const result = (service as any).generateFileContents(items, '/test', mockConfig);
      
      expect(result).toContain('Path: config.js');
      expect(result).toContain('[Content excluded by configuration]');
    });

    it('debe manejar archivos binarios', () => {
      const items: TreeItem[] = [
        {
          name: 'image.png',
          type: 'file',
          path: '/test/image.png'
        }
      ];
      
      mockFileSystemService.readFile.mockReturnValue({
        content: null,
        error: 'Binary file'
      });
      
      const result = (service as any).generateFileContents(items, '/test', mockConfig);
      
      expect(result).toContain('Path: image.png');
      expect(result).toContain('[Binary file]');
    });

    it('debe manejar errores de lectura', () => {
      const items: TreeItem[] = [
        {
          name: 'error.txt',
          type: 'file',
          path: '/test/error.txt'
        }
      ];
      
      mockFileSystemService.readFile.mockReturnValue({
        content: null,
        error: 'Permission denied'
      });
      
      const result = (service as any).generateFileContents(items, '/test', mockConfig);
      
      expect(result).toContain('[Permission denied]');
    });

    it('debe excluir contenido de carpetas completas', () => {
      const items: TreeItem[] = [
        {
          name: 'secrets',
          type: 'directory',
          path: '/test/secrets',
          children: [
            {
              name: 'api-key.txt',
              type: 'file',
              path: '/test/secrets/api-key.txt'
            }
          ]
        }
      ];
      
      mockPatternMatcher.shouldExcludeContent
        .mockReturnValueOnce(true) // Para la carpeta
        .mockReturnValueOnce(false); // Para el archivo
      
      const result = (service as any).generateFileContents(items, '/test', mockConfig);
      
      expect(result).toContain('Directory: secrets');
      expect(result).toContain('[Content of this directory is excluded by configuration]');
      expect(result).not.toContain('api-key.txt');
    });
  });

  describe('formatTreeItem', () => {
    it('debe formatear carpetas con icono', () => {
      const item: TreeItem = {
        name: 'src',
        type: 'directory',
        children: []
      };
      
      const result = (service as any).formatTreeItem(item, mockConfig);
      
      expect(result).toBe('📁src');
    });

    it('debe formatear archivos sin icono', () => {
      const item: TreeItem = {
        name: 'index.js',
        type: 'file'
      };
      
      const result = (service as any).formatTreeItem(item, mockConfig);
      
      expect(result).toBe('index.js');
    });

    it('debe incluir tamaño de archivo cuando está configurado', () => {
      mockConfig.output!.includeFileSize = true;
      
      const item: TreeItem = {
        name: 'large.txt',
        type: 'file',
        path: '/test/large.txt'
      };
      
      mockFileSystemService.getFileStats.mockReturnValue({
        size: 1048576, // 1 MB
        mtime: new Date()
      } as any);
      
      const result = (service as any).formatTreeItem(item, mockConfig);
      
      expect(result).toContain('large.txt (1.0 MB)');
    });

    it('debe incluir fecha de modificación cuando está configurado', () => {
      mockConfig.output!.includeLastModified = true;
      
      const item: TreeItem = {
        name: 'old.txt',
        type: 'file',
        path: '/test/old.txt'
      };
      
      const testDate = new Date('2025-01-31');
      mockFileSystemService.getFileStats.mockReturnValue({
        size: 100,
        mtime: testDate
      } as any);
      
      const result = (service as any).formatTreeItem(item, mockConfig);
      
      expect(result).toContain('old.txt (');
      expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('debe manejar archivos sin path', () => {
      mockConfig.output!.includeFileSize = true;
      
      const item: TreeItem = {
        name: 'no-path.txt',
        type: 'file'
        // Sin path
      };
      
      const result = (service as any).formatTreeItem(item, mockConfig);
      
      expect(result).toBe('no-path.txt');
    });
  });
});
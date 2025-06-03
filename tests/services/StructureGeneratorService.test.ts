/**
 * Tests para StructureGeneratorService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { StructureGeneratorService } from '@/services/StructureGeneratorService';
import { FileSystemService } from '@/services/FileSystemService';
import { OutputFormatterService } from '@/services/OutputFormatterService';
import { FastStructConfig, TreeItem } from '@/types';
import * as path from 'path';

// Mock de servicios
jest.mock('@/services/FileSystemService');
jest.mock('@/services/OutputFormatterService');

describe('StructureGeneratorService', () => {
  let service: StructureGeneratorService;
  let mockFileSystemService: jest.Mocked<FileSystemService>;
  let mockOutputFormatter: jest.Mocked<OutputFormatterService>;
  let mockConfig: FastStructConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (StructureGeneratorService as any).instance = undefined;
    
    // Configurar mocks
    mockFileSystemService = {
      readDirectoryStructure: jest.fn(),
      readFile: jest.fn(),
      getFileStats: jest.fn()
    } as any;
    
    mockOutputFormatter = {
      formatFullOutput: jest.fn(),
      generateTreeText: jest.fn()
    } as any;
    
    (FileSystemService.getInstance as jest.Mock).mockReturnValue(mockFileSystemService);
    (OutputFormatterService.getInstance as jest.Mock).mockReturnValue(mockOutputFormatter);
    
    service = StructureGeneratorService.getInstance();
    
    mockConfig = {
      debug: false,
      exclude: {
        folders: ['node_modules'],
        files: ['*.log'],
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
      const instance1 = StructureGeneratorService.getInstance();
      const instance2 = StructureGeneratorService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateStructure', () => {
    it('debe generar estructura correctamente', () => {
      const mockStructure: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          path: '/project/src',
          children: [
            {
              name: 'index.js',
              type: 'file',
              path: '/project/src/index.js'
            }
          ]
        }
      ];
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      mockOutputFormatter.formatFullOutput.mockReturnValue('Formatted output');
      
      const result = service.generateStructure({
        basePath: '/project',
        includeContent: true,
        config: mockConfig
      });
      
      expect(mockFileSystemService.readDirectoryStructure).toHaveBeenCalledWith(
        '/project',
        mockConfig
      );
      
      expect(mockOutputFormatter.formatFullOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'project',
            type: 'directory',
            children: mockStructure
          })
        ]),
        '/project',
        mockConfig,
        true
      );
      
      expect(result).toBe('Formatted output');
    });

    it('debe crear item raíz con nombre del directorio base', () => {
      mockFileSystemService.readDirectoryStructure.mockReturnValue([]);
      mockOutputFormatter.formatFullOutput.mockReturnValue('');
      
      service.generateStructure({
        basePath: '/home/user/my-project',
        includeContent: false,
        config: mockConfig
      });
      
      expect(mockOutputFormatter.formatFullOutput).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'my-project',
            type: 'directory',
            path: '/home/user/my-project'
          })
        ]),
        expect.any(String),
        expect.any(Object),
        false
      );
    });

    it('debe manejar errores del FileSystemService', () => {
      mockFileSystemService.readDirectoryStructure.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      expect(() => {
        service.generateStructure({
          basePath: '/project',
          includeContent: true,
          config: mockConfig
        });
      }).toThrow('Permission denied');
    });

    it('debe pasar correctamente la opción includeContent', () => {
      mockFileSystemService.readDirectoryStructure.mockReturnValue([]);
      mockOutputFormatter.formatFullOutput.mockReturnValue('');
      
      // Test con includeContent = false
      service.generateStructure({
        basePath: '/project',
        includeContent: false,
        config: mockConfig
      });
      
      expect(mockOutputFormatter.formatFullOutput).toHaveBeenLastCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        false
      );
      
      // Test con includeContent = true
      service.generateStructure({
        basePath: '/project',
        includeContent: true,
        config: mockConfig
      });
      
      expect(mockOutputFormatter.formatFullOutput).toHaveBeenLastCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        true
      );
    });
  });

  describe('countItems', () => {
    it('debe contar archivos y carpetas correctamente', () => {
      const structure: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          children: [
            { name: 'index.js', type: 'file' },
            { name: 'utils.js', type: 'file' },
            {
              name: 'components',
              type: 'directory',
              children: [
                { name: 'Button.jsx', type: 'file' }
              ]
            }
          ]
        },
        { name: 'README.md', type: 'file' }
      ];
      
      const result = service.countItems(structure);
      
      expect(result.fileCount).toBe(4); // index.js, utils.js, Button.jsx, README.md
      expect(result.folderCount).toBe(2); // src, components
    });

    it('debe contar estructura vacía', () => {
      const result = service.countItems([]);
      
      expect(result.fileCount).toBe(0);
      expect(result.folderCount).toBe(0);
    });

    it('debe contar estructura profundamente anidada', () => {
      const structure: TreeItem[] = [
        {
          name: 'root',
          type: 'directory',
          children: [
            {
              name: 'level1',
              type: 'directory',
              children: [
                {
                  name: 'level2',
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
      
      const result = service.countItems(structure);
      
      expect(result.fileCount).toBe(1);
      expect(result.folderCount).toBe(3);
    });

    it('debe manejar carpetas sin children', () => {
      const structure: TreeItem[] = [
        {
          name: 'empty-dir',
          type: 'directory'
          // Sin children
        }
      ];
      
      const result = service.countItems(structure);
      
      expect(result.fileCount).toBe(0);
      expect(result.folderCount).toBe(1);
    });
  });

  describe('getStructurePreview', () => {
    it('debe generar vista previa con elementos limitados', () => {
      const mockStructure: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          children: Array(15).fill(null).map((_, i) => ({
            name: `file${i}.js`,
            type: 'file' as const
          }))
        }
      ];
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      
      const preview = service.getStructurePreview('/project', mockConfig, 10);
      
      expect(preview.items).toHaveLength(10);
      expect(preview.totalCount).toBe(16); // 1 carpeta + 15 archivos
      expect(preview.items[0]).toContain('📁 src');
      expect(preview.items[1]).toContain('📄 src/file0.js');
    });

    it('debe usar iconos correctos para archivos y carpetas', () => {
      const mockStructure: TreeItem[] = [
        { name: 'folder', type: 'directory', children: [] },
        { name: 'file.txt', type: 'file' }
      ];
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      
      const preview = service.getStructurePreview('/project', mockConfig);
      
      expect(preview.items[0]).toMatch(/^📁 folder$/);
      expect(preview.items[1]).toMatch(/^📄 file\.txt$/);
    });

    it('debe respetar el límite máximo de elementos', () => {
      const mockStructure: TreeItem[] = Array(20).fill(null).map((_, i) => ({
        name: `file${i}.txt`,
        type: 'file' as const
      }));
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      
      const preview = service.getStructurePreview('/project', mockConfig, 5);
      
      expect(preview.items).toHaveLength(5);
      expect(preview.totalCount).toBe(20);
    });

    it('debe manejar rutas anidadas correctamente', () => {
      const mockStructure: TreeItem[] = [
        {
          name: 'src',
          type: 'directory',
          children: [
            {
              name: 'components',
              type: 'directory',
              children: [
                { name: 'Button.jsx', type: 'file' }
              ]
            }
          ]
        }
      ];
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      
      const preview = service.getStructurePreview('/project', mockConfig);
      
      expect(preview.items).toContain('📁 src');
      expect(preview.items).toContain('📁 src/components');
      expect(preview.items).toContain('📄 src/components/Button.jsx');
    });

    it('debe usar maxItems por defecto de 10', () => {
      const mockStructure: TreeItem[] = Array(15).fill(null).map((_, i) => ({
        name: `file${i}.txt`,
        type: 'file' as const
      }));
      
      mockFileSystemService.readDirectoryStructure.mockReturnValue(mockStructure);
      
      const preview = service.getStructurePreview('/project', mockConfig);
      
      expect(preview.items).toHaveLength(10);
    });
  });
});
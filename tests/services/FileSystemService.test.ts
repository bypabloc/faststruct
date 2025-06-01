/**
 * Tests para FileSystemService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FileSystemService } from '../../src/services/FileSystemService';
import { FastStructConfig } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Mock de fs
jest.mock('fs');

describe('FileSystemService', () => {
  let service: FileSystemService;
  let mockConfig: FastStructConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    (FileSystemService as any).instance = undefined;
    service = FileSystemService.getInstance();
    
    mockConfig = {
      debug: false,
      exclude: {
        folders: ['node_modules', '.git'],
        files: ['*.log'],
        advanced: {
          patterns: ['**/*.min.js'],
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
      const instance1 = FileSystemService.getInstance();
      const instance2 = FileSystemService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('readDirectoryStructure', () => {
    it('debe leer estructura de directorio correctamente', () => {
      const mockFiles = [
        { name: 'index.js', isDirectory: () => false },
        { name: 'utils', isDirectory: () => true },
        { name: 'README.md', isDirectory: () => false }
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        name: 'utils',
        type: 'directory',
        children: [],
        path: path.join('/test/dir', 'utils')
      });
      expect(result[1].type).toBe('file');
      expect(result[2].type).toBe('file');
    });

    it('debe excluir carpetas según configuración', () => {
      const mockFiles = [
        { name: 'src', isDirectory: () => true },
        { name: 'node_modules', isDirectory: () => true },
        { name: '.git', isDirectory: () => true }
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('src');
      expect(result.find(item => item.name === 'node_modules')).toBeUndefined();
      expect(result.find(item => item.name === '.git')).toBeUndefined();
    });

    it('debe excluir archivos según patrones', () => {
      const mockFiles = [
        { name: 'app.js', isDirectory: () => false },
        { name: 'app.min.js', isDirectory: () => false },
        { name: 'error.log', isDirectory: () => false }
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('app.js');
    });

    it('debe leer recursivamente subcarpetas', () => {
      const mockRootFiles = [
        { name: 'src', isDirectory: () => true }
      ];
      const mockSrcFiles = [
        { name: 'index.js', isDirectory: () => false }
      ];

      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce(mockRootFiles)
        .mockReturnValueOnce(mockSrcFiles);

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('src');
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].name).toBe('index.js');
    });

    it('debe excluir carpetas vacías si está configurado', () => {
      const mockFiles = [
        { name: 'empty-dir', isDirectory: () => true },
        { name: 'file.txt', isDirectory: () => false }
      ];

      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce(mockFiles)
        .mockReturnValueOnce([]); // empty-dir está vacío

      mockConfig.output!.includeEmptyFolders = false;

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file.txt');
    });

    it('debe manejar errores de lectura', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result).toEqual([]);
    });

    it('debe ordenar elementos (carpetas primero, luego archivos)', () => {
      const mockFiles = [
        { name: 'z-file.txt', isDirectory: () => false },
        { name: 'a-file.txt', isDirectory: () => false },
        { name: 'z-folder', isDirectory: () => true },
        { name: 'a-folder', isDirectory: () => true }
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);

      const result = service.readDirectoryStructure('/test/dir', mockConfig);

      expect(result[0].name).toBe('a-folder');
      expect(result[1].name).toBe('z-folder');
      expect(result[2].name).toBe('a-file.txt');
      expect(result[3].name).toBe('z-file.txt');
    });
  });

  describe('readFile', () => {
    it('debe leer contenido de archivo de texto', () => {
      (fs.readFileSync as jest.Mock).mockReturnValue('console.log("Hello");');
      (fs.openSync as jest.Mock).mockReturnValue(1);
      (fs.readSync as jest.Mock).mockReturnValue(8);
      (fs.closeSync as jest.Mock).mockReturnValue(undefined);

      const result = service.readFile('/test/file.js');

      expect(result.content).toBe('console.log("Hello");');
      expect(result.error).toBeUndefined();
    });

    it('debe detectar archivos binarios por extensión', () => {
      const result = service.readFile('/test/image.png');

      expect(result.content).toBeNull();
      expect(result.error).toBe('Binary file');
    });

    it('debe detectar archivos binarios por contenido', () => {
      const binaryContent = String.fromCharCode(0, 1, 2, 3);
      (fs.readFileSync as jest.Mock).mockReturnValue(binaryContent);

      const result = service.readFile('/test/file.bin');

      expect(result.content).toBeNull();
      expect(result.error).toBe('Binary file');
    });

    it('debe detectar archivos binarios por firma', () => {
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      (fs.openSync as jest.Mock).mockReturnValue(1);
      (fs.readSync as jest.Mock).mockImplementation((fd, buffer) => {
        pngSignature.copy(buffer);
        return 4;
      });

      const result = service.readFile('/test/file.unknown');

      expect(result.content).toBeNull();
      expect(result.error).toBe('Binary file');
    });

    it('debe manejar errores de lectura', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const result = service.readFile('/test/missing.txt');

      expect(result.content).toBeNull();
      expect(result.error).toBe('Binary file');
    });

    it('debe detectar múltiples tipos de firmas binarias', () => {
      const signatures = [
        { name: 'ZIP', bytes: [0x50, 0x4b, 0x03, 0x04] },
        { name: 'PDF', bytes: [0x25, 0x50, 0x44, 0x46] },
        { name: 'JPEG', bytes: [0xff, 0xd8, 0xff] }
      ];

      signatures.forEach(sig => {
        const buffer = Buffer.from(sig.bytes);
        (fs.openSync as jest.Mock).mockReturnValue(1);
        (fs.readSync as jest.Mock).mockImplementation((fd, buf) => {
          buffer.copy(buf);
          return sig.bytes.length;
        });

        const result = service.readFile(`/test/file.${sig.name.toLowerCase()}`);

        expect(result.content).toBeNull();
        expect(result.error).toBe('Binary file');
      });
    });
  });

  describe('getFileStats', () => {
    it('debe obtener estadísticas de archivo', () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2025-01-31'),
        isFile: () => true,
        isDirectory: () => false
      };

      (fs.statSync as jest.Mock).mockReturnValue(mockStats);

      const stats = service.getFileStats('/test/file.txt');

      expect(stats).toBe(mockStats);
      expect(stats?.size).toBe(1024);
    });

    it('debe retornar null si hay error', () => {
      (fs.statSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found');
      });

      const stats = service.getFileStats('/test/missing.txt');

      expect(stats).toBeNull();
    });
  });

  describe('isFileBinary', () => {
    it('debe identificar extensiones binarias conocidas', () => {
      const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.exe', 
        '.dll', '.zip', '.rar', '.mp3', '.mp4'
      ];

      binaryExtensions.forEach(ext => {
        const result = (service as any).isFileBinary(`/test/file${ext}`);
        expect(result).toBe(true);
      });
    });

    it('debe identificar archivos de texto por extensión', () => {
      const textExtensions = ['.txt', '.js', '.ts', '.json', '.md', '.html'];

      textExtensions.forEach(ext => {
        (fs.openSync as jest.Mock).mockReturnValue(1);
        (fs.readSync as jest.Mock).mockReturnValue(8);
        (fs.closeSync as jest.Mock).mockReturnValue(undefined);
        
        const result = (service as any).isFileBinary(`/test/file${ext}`);
        expect(result).toBe(false);
      });
    });

    it('debe manejar errores al leer primeros bytes', () => {
      (fs.openSync as jest.Mock).mockImplementation(() => {
        throw new Error('Cannot open file');
      });

      const result = (service as any).isFileBinary('/test/file.txt');
      
      expect(result).toBe(true); // Por defecto asume binario si hay error
    });
  });

  describe('sortStructure', () => {
    it('debe ordenar carpetas antes que archivos', () => {
      const items = [
        { name: 'file.txt', type: 'file' as const, path: '/file.txt' },
        { name: 'folder', type: 'directory' as const, path: '/folder', children: [] },
        { name: 'another.js', type: 'file' as const, path: '/another.js' }
      ];

      const sorted = (service as any).sortStructure(items);

      expect(sorted[0].type).toBe('directory');
      expect(sorted[1].type).toBe('file');
      expect(sorted[2].type).toBe('file');
    });

    it('debe ordenar alfabéticamente dentro del mismo tipo', () => {
      const items = [
        { name: 'z-folder', type: 'directory' as const, path: '/z', children: [] },
        { name: 'a-folder', type: 'directory' as const, path: '/a', children: [] },
        { name: 'z.txt', type: 'file' as const, path: '/z.txt' },
        { name: 'a.txt', type: 'file' as const, path: '/a.txt' }
      ];

      const sorted = (service as any).sortStructure(items);

      expect(sorted[0].name).toBe('a-folder');
      expect(sorted[1].name).toBe('z-folder');
      expect(sorted[2].name).toBe('a.txt');
      expect(sorted[3].name).toBe('z.txt');
    });
  });
});
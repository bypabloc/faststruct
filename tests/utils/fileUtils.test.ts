/**
 * Tests para fileUtils
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect } from '@jest/globals';
import { 
  formatFileSize, 
  getMimeType, 
  isTextFile, 
  sanitizeFilename,
  formatModifiedDate 
} from '../../src/utils/fileUtils';

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('debe formatear bytes correctamente', () => {
      expect(formatFileSize(0)).toBe('0.0 B');
      expect(formatFileSize(100)).toBe('100.0 B');
      expect(formatFileSize(1023)).toBe('1023.0 B');
    });

    it('debe formatear kilobytes correctamente', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 10)).toBe('10.0 KB');
    });

    it('debe formatear megabytes correctamente', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 1.5)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 10.7)).toBe('10.7 MB');
    });

    it('debe formatear gigabytes correctamente', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 2.3)).toBe('2.3 GB');
    });

    it('debe formatear terabytes correctamente', () => {
      expect(formatFileSize(1024 * 1024 * 1024 * 1024)).toBe('1.0 TB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 5.5)).toBe('5.5 TB');
    });

    it('debe manejar números negativos', () => {
      expect(formatFileSize(-100)).toBe('-100.0 B');
      expect(formatFileSize(-1024)).toBe('-1.0 KB');
    });
  });

  describe('getMimeType', () => {
    describe('archivos de texto', () => {
      it('debe retornar tipos MIME correctos para archivos de texto', () => {
        expect(getMimeType('.txt')).toBe('text/plain');
        expect(getMimeType('txt')).toBe('text/plain');
        expect(getMimeType('.md')).toBe('text/markdown');
        expect(getMimeType('.json')).toBe('application/json');
        expect(getMimeType('.xml')).toBe('application/xml');
        expect(getMimeType('.yaml')).toBe('application/x-yaml');
        expect(getMimeType('.yml')).toBe('application/x-yaml');
      });
    });

    describe('archivos de código', () => {
      it('debe retornar tipos MIME correctos para lenguajes de programación', () => {
        expect(getMimeType('.js')).toBe('text/javascript');
        expect(getMimeType('.ts')).toBe('text/typescript');
        expect(getMimeType('.jsx')).toBe('text/jsx');
        expect(getMimeType('.tsx')).toBe('text/tsx');
        expect(getMimeType('.py')).toBe('text/x-python');
        expect(getMimeType('.java')).toBe('text/x-java');
        expect(getMimeType('.c')).toBe('text/x-c');
        expect(getMimeType('.cpp')).toBe('text/x-c++');
        expect(getMimeType('.cs')).toBe('text/x-csharp');
        expect(getMimeType('.go')).toBe('text/x-go');
        expect(getMimeType('.rs')).toBe('text/x-rust');
      });
    });

    describe('archivos web', () => {
      it('debe retornar tipos MIME correctos para archivos web', () => {
        expect(getMimeType('.html')).toBe('text/html');
        expect(getMimeType('.htm')).toBe('text/html');
        expect(getMimeType('.css')).toBe('text/css');
        expect(getMimeType('.scss')).toBe('text/x-scss');
        expect(getMimeType('.sass')).toBe('text/x-sass');
        expect(getMimeType('.less')).toBe('text/x-less');
      });
    });

    describe('imágenes', () => {
      it('debe retornar tipos MIME correctos para imágenes', () => {
        expect(getMimeType('.jpg')).toBe('image/jpeg');
        expect(getMimeType('.jpeg')).toBe('image/jpeg');
        expect(getMimeType('.png')).toBe('image/png');
        expect(getMimeType('.gif')).toBe('image/gif');
        expect(getMimeType('.webp')).toBe('image/webp');
        expect(getMimeType('.svg')).toBe('image/svg+xml');
        expect(getMimeType('.ico')).toBe('image/x-icon');
      });
    });

    describe('archivos comprimidos', () => {
      it('debe retornar tipos MIME correctos para archivos comprimidos', () => {
        expect(getMimeType('.zip')).toBe('application/zip');
        expect(getMimeType('.rar')).toBe('application/x-rar-compressed');
        expect(getMimeType('.7z')).toBe('application/x-7z-compressed');
        expect(getMimeType('.tar')).toBe('application/x-tar');
        expect(getMimeType('.gz')).toBe('application/gzip');
      });
    });

    it('debe manejar extensiones en mayúsculas', () => {
      expect(getMimeType('.TXT')).toBe('text/plain');
      expect(getMimeType('.JPG')).toBe('image/jpeg');
    });

    it('debe retornar text/plain para extensiones desconocidas', () => {
      expect(getMimeType('.xyz')).toBe('text/plain');
      expect(getMimeType('.unknown')).toBe('text/plain');
    });
  });

  describe('isTextFile', () => {
    it('debe identificar archivos de texto correctamente', () => {
      expect(isTextFile('.txt')).toBe(true);
      expect(isTextFile('.js')).toBe(true);
      expect(isTextFile('.json')).toBe(true);
      expect(isTextFile('.xml')).toBe(true);
      expect(isTextFile('.yaml')).toBe(true);
      expect(isTextFile('.yml')).toBe(true);
      expect(isTextFile('.md')).toBe(true);
      expect(isTextFile('.html')).toBe(true);
      expect(isTextFile('.css')).toBe(true);
    });

    it('debe identificar archivos no-texto correctamente', () => {
      expect(isTextFile('.jpg')).toBe(false);
      expect(isTextFile('.png')).toBe(false);
      expect(isTextFile('.pdf')).toBe(false);
      expect(isTextFile('.exe')).toBe(false);
      expect(isTextFile('.zip')).toBe(false);
      expect(isTextFile('.mp3')).toBe(false);
      expect(isTextFile('.mp4')).toBe(false);
    });

    it('debe manejar extensiones desconocidas como texto', () => {
      expect(isTextFile('.xyz')).toBe(true);
      expect(isTextFile('.unknown')).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('debe remover caracteres no válidos', () => {
      expect(sanitizeFilename('file<name>.txt')).toBe('file_name_.txt');
      expect(sanitizeFilename('file:name|test')).toBe('file_name_test');
      expect(sanitizeFilename('file/name\\test')).toBe('file_name_test');
    });

    it('debe remover caracteres de control', () => {
      expect(sanitizeFilename('file\x00name.txt')).toBe('file_name.txt');
      expect(sanitizeFilename('file\x1Fname.txt')).toBe('file_name.txt');
    });

    it('debe manejar nombres con múltiples caracteres inválidos', () => {
      expect(sanitizeFilename('*file?<name>:test|.txt')).toBe('_file__name__test_.txt');
    });

    it('debe preservar nombres válidos', () => {
      expect(sanitizeFilename('valid-file_name.txt')).toBe('valid-file_name.txt');
      expect(sanitizeFilename('file.name.with.dots.txt')).toBe('file.name.with.dots.txt');
    });

    it('debe manejar nombres vacíos', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('debe manejar nombres solo con caracteres inválidos', () => {
      expect(sanitizeFilename('<>:"/\\|?*')).toBe('_________');
    });
  });

  describe('formatModifiedDate', () => {
    it('debe formatear fecha correctamente', () => {
      const date = new Date('2025-01-31T14:30:00');
      const formatted = formatModifiedDate(date);
      
      // El formato exacto depende del locale del sistema
      expect(formatted).toContain('2025');
      expect(formatted).toContain('31');
    });

    it('debe incluir hora en el formato', () => {
      const date = new Date('2025-01-31T14:30:45');
      const formatted = formatModifiedDate(date);
      
      // Verificar que incluye información de hora
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it('debe manejar diferentes fechas', () => {
      const date1 = new Date('2025-12-25T09:15:00');
      const date2 = new Date('2025-01-01T00:00:00');
      
      const formatted1 = formatModifiedDate(date1);
      const formatted2 = formatModifiedDate(date2);
      
      expect(formatted1).not.toBe(formatted2);
      expect(formatted1).toContain('2025');
      expect(formatted2).toContain('2025');
    });

    it('debe manejar fechas inválidas', () => {
      const invalidDate = new Date('invalid');
      const formatted = formatModifiedDate(invalidDate);
      
      // Las fechas inválidas devuelven "Invalid Date"
      expect(formatted).toContain('Invalid Date');
    });
  });
});
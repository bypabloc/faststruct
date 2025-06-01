/**
 * Tests para GitignoreImportService
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { GitignoreImportService } from '../../src/services/GitignoreImportService';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');

describe('GitignoreImportService', () => {
  let service: GitignoreImportService;

  beforeEach(() => {
    jest.clearAllMocks();
    (GitignoreImportService as any).instance = undefined;
    service = GitignoreImportService.getInstance();
  });

  describe('getInstance', () => {
    it('debe retornar siempre la misma instancia (singleton)', () => {
      const instance1 = GitignoreImportService.getInstance();
      const instance2 = GitignoreImportService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('importFromGitignore', () => {
    it('debe importar patrones desde .gitignore correctamente', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      const gitignoreContent = `
# Comentario
node_modules/
*.log
*.tmp

# Build
dist/
build/

# IDE
.vscode/
.idea

# Archivos específicos
config.local.js
secrets.json

# Patrones complejos
**/*.backup
src/**/*.test.js
`;
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(gitignoreContent);
      
      const result = await service.importFromGitignore();
      
      expect(result).toBeDefined();
      expect(result!.folders).toContain('node_modules');
      expect(result!.folders).toContain('dist');
      expect(result!.folders).toContain('build');
      expect(result!.folders).toContain('.vscode');
      expect(result!.folders).toContain('.idea');
      
      expect(result!.files).toContain('*.log');
      expect(result!.files).toContain('*.tmp');
      expect(result!.files).toContain('config.local.js');
      expect(result!.files).toContain('secrets.json');
      
      expect(result!.patterns).toContain('**/*.backup');
      expect(result!.patterns).toContain('src/**/*.test.js');
    });

    it('debe mostrar mensaje cuando no hay workspace', async () => {
      (vscode.workspace.workspaceFolders as any) = undefined;
      
      const result = await service.importFromGitignore();
      
      expect(result).toBeNull();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No hay un workspace abierto'
      );
    });

    it('debe mostrar mensaje cuando no existe .gitignore', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = await service.importFromGitignore();
      
      expect(result).toBeNull();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No se encontró archivo .gitignore en el proyecto'
      );
    });

    it('debe manejar errores al leer el archivo', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = await service.importFromGitignore();
      
      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Error al importar desde .gitignore'
      );
    });

    it('debe mostrar mensaje de éxito con conteos correctos', async () => {
      (vscode.workspace.workspaceFolders as any) = [{
        uri: { fsPath: '/test/workspace' }
      }];
      
      const gitignoreContent = `
node_modules/
dist/
*.log
**/*.backup
`;
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(gitignoreContent);
      
      await service.importFromGitignore();
      
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Importados 1 patrones, 2 carpetas y 1 archivos desde .gitignore'
      );
    });
  });

  describe('parseGitignore', () => {
    it('debe parsear líneas correctamente', () => {
      const content = `
# Carpetas
node_modules/
dist/
.cache/

# Archivos
*.log
package-lock.json

# Patrones
**/*.min.js
src/**/*.test.js

# Líneas vacías y comentarios que deben ignorarse

# Más comentarios
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.folders).toEqual(['node_modules', 'dist', '.cache']);
      expect(result.files).toEqual(['*.log', 'package-lock.json']);
      expect(result.patterns).toEqual(['**/*.min.js', 'src/**/*.test.js']);
    });

    it('debe ignorar líneas vacías y comentarios', () => {
      const content = `
# Este es un comentario

# Otro comentario
node_modules/

    # Comentario con espacios
*.log
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.folders).toEqual(['node_modules']);
      expect(result.files).toEqual(['*.log']);
      expect(result.patterns).toEqual([]);
    });

    it('debe manejar carpetas con trailing slash', () => {
      const content = `
src/
dist/
build/
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.folders).toEqual(['src', 'dist', 'build']);
      expect(result.folders).not.toContain('src/');
    });

    it('debe detectar patrones vs archivos simples', () => {
      const content = `
# Archivos simples (sin * ni /)
config.json
secrets.env
.eslintrc

# Patrones
*.log
**/*.backup
src/*.js
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.files).toEqual(['config.json', 'secrets.env', '.eslintrc']);
      expect(result.patterns).toEqual(['*.log', '**/*.backup', 'src/*.js']);
    });

    it('debe eliminar duplicados', () => {
      const content = `
node_modules/
dist/
node_modules/
*.log
*.log
dist/
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.folders).toEqual(['node_modules', 'dist']);
      expect(result.files).toEqual(['*.log']);
    });

    it('debe manejar espacios en blanco correctamente', () => {
      const content = `
  node_modules/  
    *.log    
  dist/  
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.folders).toEqual(['node_modules', 'dist']);
      expect(result.files).toEqual(['*.log']);
    });

    it('debe manejar patrones con paths', () => {
      const content = `
src/components/*.test.js
docs/**/*.md
config/*.local.json
`;
      
      const result = (service as any).parseGitignore(content);
      
      expect(result.patterns).toEqual([
        'src/components/*.test.js',
        'docs/**/*.md',
        'config/*.local.json'
      ]);
      expect(result.files).toEqual([]);
      expect(result.folders).toEqual([]);
    });

    it('debe manejar archivo vacío', () => {
      const result = (service as any).parseGitignore('');
      
      expect(result.folders).toEqual([]);
      expect(result.files).toEqual([]);
      expect(result.patterns).toEqual([]);
    });
  });
});
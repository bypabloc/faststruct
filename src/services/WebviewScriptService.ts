import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';

/**
 * Servicio para manejar los scripts del webview.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class WebviewScriptService {
  private static instance: WebviewScriptService;
  
  public static getInstance(): WebviewScriptService {
    if (!this.instance) {
      this.instance = new WebviewScriptService();
    }
    return this.instance;
  }
  
  private constructor() {}
  
  /**
   * Obtiene el script principal del webview.
   * 
   * @param extensionUri - URI de la extensión
   * @returns Script como string
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getWebviewScript(extensionUri: vscode.Uri): string {
    try {
      const scriptPath = vscode.Uri.joinPath(
        extensionUri,
        'src',
        'templates',
        'webview',
        'configWebview.js'
      );
      
      return fs.readFileSync(scriptPath.fsPath, 'utf8');
    } catch (error) {
      Logger.error('Error cargando script del webview', error);
      return '';
    }
  }
  
  /**
   * Genera datos iniciales para el script.
   * 
   * @returns Objeto con datos iniciales
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public getInitialScriptData(): any {
    return {
      commands: {
        saveConfig: 'saveConfig',
        loadConfig: 'loadConfig',
        resetConfig: 'resetConfig',
        importGitignore: 'importGitignore',
        testPattern: 'testPattern',
        getStats: 'getStats',
        log: 'log'
      },
      templates: {
        node: {
          folders: ['node_modules', '.git', 'dist', 'build', 'coverage', '.npm', '.yarn'],
          files: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'package-lock.json', 'yarn.lock'],
          patterns: ['**/*.min.js', '**/*.map', '**/bundle.js']
        },
        python: {
          folders: ['__pycache__', '.git', 'venv', 'env', '.pytest_cache', '.mypy_cache', 'build', 'dist'],
          files: ['*.pyc', '*.pyo', '*.pyd', '.Python', '*.so', '*.egg-info'],
          patterns: ['**/__pycache__/**', '**/*.egg-info/**']
        },
        java: {
          folders: ['.git', 'target', 'out', 'build', '.gradle', '.idea', '.mvn'],
          files: ['*.class', '*.jar', '*.war', '*.ear', '.classpath', '.project'],
          patterns: ['**/target/**', '**/build/**']
        },
        dotnet: {
          folders: ['.git', 'bin', 'obj', '.vs', 'packages', 'TestResults'],
          files: ['*.dll', '*.exe', '*.pdb', '*.user', '*.cache'],
          patterns: ['**/bin/**', '**/obj/**']
        }
      }
    };
  }
}
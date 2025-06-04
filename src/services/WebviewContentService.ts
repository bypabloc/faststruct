import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '@/logger';

/**
 * Servicio para generar el contenido HTML del webview.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class WebviewContentService {
  private static instance: WebviewContentService;
  
  public static getInstance(): WebviewContentService {
    if (!this.instance) {
      this.instance = new WebviewContentService();
    }
    return this.instance;
  }
  
  private constructor() {}
  
  /**
   * Genera el contenido HTML completo para el webview.
   * 
   * @param webview - Instancia del webview
   * @param extensionUri - URI de la extensión
   * @param nonce - Nonce para CSP
   * @returns HTML completo
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public generateHtml(
    webview: vscode.Webview,
    extensionUri: vscode.Uri,
    nonce: string
  ): string {
    // Generar URIs para los recursos
    // Intentar encontrar el CSS en múltiples ubicaciones
    let styleUri: vscode.Uri | undefined;
    const cssPaths = [
      vscode.Uri.joinPath(extensionUri, 'out', 'templates', 'webview', 'configWebview.css'),
      vscode.Uri.joinPath(extensionUri, 'src', 'templates', 'webview', 'configWebview.css'),
      vscode.Uri.joinPath(extensionUri, 'templates', 'webview', 'configWebview.css')
    ];
    
    for (const cssPath of cssPaths) {
      if (fs.existsSync(cssPath.fsPath)) {
        styleUri = webview.asWebviewUri(cssPath);
        Logger.info(`CSS encontrado en: ${cssPath.fsPath}`);
        break;
      }
    }
    
    if (!styleUri) {
      Logger.error('No se pudo encontrar configWebview.css');
      styleUri = webview.asWebviewUri(cssPaths[0]); // Usar la primera ruta como fallback
    }
    
    // Cargar el template HTML
    const htmlTemplate = this.loadTemplate('configWebview.html', extensionUri);
    
    // Cargar el contenido del script JavaScript
    const scriptContent = this.loadTemplate('configWebview.js', extensionUri);
    
    // Reemplazar variables en el template
    return htmlTemplate
      .replace(/\${webview.cspSource}/g, webview.cspSource)
      .replace(/\${nonce}/g, nonce)
      .replace(/\${styleUri}/g, styleUri.toString())
      .replace(/\${scriptContent}/g, scriptContent);
  }
  
  /**
   * Carga un template desde el sistema de archivos.
   * 
   * @param filename - Nombre del archivo
   * @param extensionUri - URI de la extensión
   * @returns Contenido del template
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private loadTemplate(filename: string, extensionUri: vscode.Uri): string {
    // Intentar múltiples rutas posibles
    const possiblePaths = [
      // Producción (VSIX instalado)
      vscode.Uri.joinPath(extensionUri, 'out', 'templates', 'webview', filename),
      // Desarrollo (si por alguna razón se ejecuta desde src)
      vscode.Uri.joinPath(extensionUri, 'src', 'templates', 'webview', filename),
      // Legacy path (por compatibilidad)
      vscode.Uri.joinPath(extensionUri, 'templates', 'webview', filename)
    ];
    
    for (const templatePath of possiblePaths) {
      try {
        if (fs.existsSync(templatePath.fsPath)) {
          Logger.info(`Template ${filename} encontrado en: ${templatePath.fsPath}`);
          return fs.readFileSync(templatePath.fsPath, 'utf8');
        }
      } catch (error) {
        // Continuar con la siguiente ruta
      }
    }
    
    Logger.error(`No se pudo encontrar el template ${filename} en ninguna ruta conocida`);
    Logger.error(`Extension URI: ${extensionUri.fsPath}`);
    Logger.error(`Rutas intentadas:`);
    possiblePaths.forEach(path => {
      Logger.error(`  - ${path.fsPath}`);
    });
    return '';
  }
  
  /**
   * Genera un nonce para seguridad CSP.
   * 
   * @returns String aleatorio para nonce
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public generateNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
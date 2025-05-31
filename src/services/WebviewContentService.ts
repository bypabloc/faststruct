import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';

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
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'templates', 'webview', 'configWebview.css')
    );
    
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
    const templatePath = vscode.Uri.joinPath(
      extensionUri,
      'src',
      'templates',
      'webview',
      filename
    );
    
    try {
      return fs.readFileSync(templatePath.fsPath, 'utf8');
    } catch (error) {
      Logger.error(`Error cargando template ${filename}`, error);
      return '';
    }
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
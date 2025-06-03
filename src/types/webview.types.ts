/**
 * Tipos para el sistema de webview.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

import * as vscode from 'vscode';

/**
 * Mensaje enviado desde el webview.
 */
export interface WebviewMessage {
  command: string;
  [key: string]: any;
}

/**
 * Manejador de mensajes del webview.
 */
export type WebviewMessageHandler = (
  message: WebviewMessage,
  webview: vscode.Webview
) => Promise<void> | void;

/**
 * Resultado de importación de gitignore.
 */
export interface GitignoreImportResult {
  patterns: string[];
  folders: string[];
  files: string[];
}

/**
 * Resultado de prueba de patrón.
 */
export interface PatternTestResult {
  matches: string[];
  hasMore: boolean;
}
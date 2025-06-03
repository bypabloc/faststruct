/**
 * Mock de la API de VS Code para testing
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { jest } from '@jest/globals';

// Mock console.log si no está definido
if (typeof console.log !== 'function') {
  global.console = {
    ...global.console,
    log: jest.fn(),
  };
}

const vscode = {
  // Uri mock
  Uri: {
    file: jest.fn((path: string) => ({
      fsPath: path,
      path: path,
      scheme: 'file',
      authority: '',
      query: '',
      fragment: '',
      with: jest.fn(),
      toString: jest.fn(() => `file://${path}`),
    })),
    joinPath: jest.fn((uri: any, ...paths: string[]) => ({
      fsPath: [uri.fsPath, ...paths].join('/'),
      path: [uri.path, ...paths].join('/'),
      scheme: 'file',
      authority: '',
      query: '',
      fragment: '',
      with: jest.fn(),
      toString: jest.fn(() => `file://${[uri.fsPath, ...paths].join('/')}`),
    })),
  },

  // Window mock
  window: {
    showInformationMessage: jest.fn(() => Promise.resolve(undefined)),
    showWarningMessage: jest.fn(() => Promise.resolve(undefined)),
    showErrorMessage: jest.fn(() => Promise.resolve(undefined)),
    showInputBox: jest.fn(() => Promise.resolve(undefined)),
    showQuickPick: jest.fn(() => Promise.resolve(undefined)),
    showSaveDialog: jest.fn(() => Promise.resolve(undefined)),
    showOpenDialog: jest.fn(() => Promise.resolve(undefined)),
    createOutputChannel: jest.fn(() => ({
      appendLine: jest.fn(),
      append: jest.fn(),
      clear: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
      dispose: jest.fn(),
    })),
    createWebviewPanel: jest.fn(() => ({
      webview: {
        html: '',
        onDidReceiveMessage: jest.fn(),
        postMessage: jest.fn(),
        asWebviewUri: jest.fn((uri) => uri),
        cspSource: 'https://localhost',
      },
      onDidDispose: jest.fn(),
      reveal: jest.fn(),
      dispose: jest.fn(),
    })),
    activeTextEditor: undefined,
    showTextDocument: jest.fn((_document: any, _options?: any) => Promise.resolve({
      document: {
        getText: jest.fn(() => ''),
      },
    })) as any,
  },

  // Workspace mock
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'config') {
          return {
            debug: false,
            exclude: {
              folders: ['node_modules', '.git'],
              files: ['*.log'],
              advanced: {
                patterns: [],
                specificFiles: [],
                specificFolders: [],
                regexPatterns: [],
              },
            },
            excludeContent: {
              files: [],
              folders: [],
              patterns: [],
            },
            output: {
              includeContent: true,
              includeEmptyFolders: true,
              includeFileSize: false,
              includeLastModified: false,
            },
          };
        }
        return defaultValue;
      }),
      update: jest.fn((_key: string, _value: any, _target?: any) => Promise.resolve(undefined)),
      inspect: jest.fn(() => ({
        globalValue: undefined,
        workspaceValue: undefined,
        defaultValue: {},
      })),
    })),
    workspaceFolders: [{
      uri: {
        fsPath: '/test/workspace',
        path: '/test/workspace',
        scheme: 'file',
      },
      name: 'test-workspace',
      index: 0,
    }],
    getWorkspaceFolder: jest.fn((_uri) => ({
      uri: {
        fsPath: '/test/workspace',
        path: '/test/workspace',
        scheme: 'file',
      },
      name: 'test-workspace',
      index: 0,
    })),
    openTextDocument: jest.fn(() => Promise.resolve({
      getText: jest.fn(() => ''),
      languageId: 'plaintext',
      uri: { fsPath: '/test/file.txt' },
    })) as any,
    fs: {
      readFile: jest.fn(() => Promise.resolve(Buffer.from(''))),
      writeFile: jest.fn(() => Promise.resolve(undefined)),
    },
  },

  // Commands mock
  commands: {
    registerCommand: jest.fn((_command: string, _callback: Function) => ({
      dispose: jest.fn(),
    })),
    executeCommand: jest.fn(() => Promise.resolve(undefined)),
    getCommands: jest.fn(() => Promise.resolve([
      'faststruct.createStructure',
      'faststruct.createStructureContext',
      'faststruct.openSettings',
    ])) as any,
  },

  // Configuration targets
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },

  // ViewColumn
  ViewColumn: {
    One: 1,
    Two: 2,
    Three: 3,
    Active: -1,
    Beside: -2,
  },

  // EndOfLine
  EndOfLine: {
    LF: 1,
    CRLF: 2,
  },

  // Extension context mock
  ExtensionContext: class {
    subscriptions: any[] = [];
    workspaceState = {
      get: jest.fn(),
      update: jest.fn(),
      keys: jest.fn(() => Promise.resolve([])),
    };
    globalState = {
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
      update: jest.fn((_key: string, _value: any, _target?: any) => Promise.resolve(undefined)),
      keys: jest.fn(() => Promise.resolve([])),
      setKeysForSync: jest.fn(),
    };
    secrets = {
      get: jest.fn(() => Promise.resolve(undefined)),
      store: jest.fn(() => Promise.resolve(undefined)),
      delete: jest.fn(() => Promise.resolve(undefined)),
      onDidChange: jest.fn(),
    };
    extensionPath = '/test/extension';
    extensionUri = {
      fsPath: '/test/extension',
      path: '/test/extension',
      scheme: 'file',
    };
    environmentVariableCollection = {
      persistent: true,
      replace: jest.fn(),
      append: jest.fn(),
      prepend: jest.fn(),
      get: jest.fn(),
      forEach: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    };
    asAbsolutePath = jest.fn((relativePath: string) => `/test/extension/${relativePath}`);
    storageUri = { fsPath: '/test/storage', path: '/test/storage', scheme: 'file' };
    storagePath = '/test/storage';
    globalStorageUri = { fsPath: '/test/global-storage', path: '/test/global-storage', scheme: 'file' };
    globalStoragePath = '/test/global-storage';
    logUri = { fsPath: '/test/logs', path: '/test/logs', scheme: 'file' };
    logPath = '/test/logs';
    extensionMode = 3;
    extension = {
      id: 'test.faststruct',
      extensionUri: { fsPath: '/test/extension', path: '/test/extension', scheme: 'file' },
      extensionPath: '/test/extension',
      isActive: true,
      packageJSON: {
        version: '0.0.12',
      },
      exports: undefined,
      activate: jest.fn(),
      extensionKind: 1,
    };
  },

  // Extensions mock
  extensions: {
    getExtension: jest.fn((_id: string) => ({
      isActive: true,
      exports: {},
    })),
  },
};

// Export para que TypeScript reconozca el módulo
export = vscode;
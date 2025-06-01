/**
 * Mock de la API de VS Code para testing
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
import { jest } from '@jest/globals';

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
    showInformationMessage: (jest.fn() as any).mockResolvedValue(undefined),
    showWarningMessage: (jest.fn() as any).mockResolvedValue(undefined),
    showErrorMessage: (jest.fn() as any).mockResolvedValue(undefined),
    showInputBox: (jest.fn() as any).mockResolvedValue(undefined),
    showQuickPick: (jest.fn() as any).mockResolvedValue(undefined),
    showSaveDialog: (jest.fn() as any).mockResolvedValue(undefined),
    showOpenDialog: (jest.fn() as any).mockResolvedValue(undefined),
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
    showTextDocument: (jest.fn() as any).mockResolvedValue({
      document: {
        getText: jest.fn(() => ''),
      },
    }),
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
      update: (jest.fn() as any).mockResolvedValue(undefined),
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
    openTextDocument: (jest.fn() as any).mockResolvedValue({
      getText: jest.fn(() => ''),
      languageId: 'plaintext',
      uri: { fsPath: '/test/file.txt' },
    }),
    fs: {
      readFile: (jest.fn() as any).mockResolvedValue(Buffer.from('')),
      writeFile: (jest.fn() as any).mockResolvedValue(undefined),
    },
  },

  // Commands mock
  commands: {
    registerCommand: jest.fn((_command: string, _callback: Function) => ({
      dispose: jest.fn(),
    })),
    executeCommand: (jest.fn() as any).mockResolvedValue(undefined),
    getCommands: (jest.fn() as any).mockResolvedValue([
      'faststruct.createStructure',
      'faststruct.createStructureContext',
      'faststruct.openSettings',
    ]),
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

  // Extension context mock
  ExtensionContext: class {
    subscriptions: any[] = [];
    workspaceState = {
      get: jest.fn(),
      update: jest.fn(),
    };
    globalState = {
      get: jest.fn((_key: string, defaultValue?: any) => defaultValue),
      update: (jest.fn() as any).mockResolvedValue(undefined),
    };
    extensionPath = '/test/extension';
    extensionUri = {
      fsPath: '/test/extension',
      path: '/test/extension',
      scheme: 'file',
    };
    extension = {
      packageJSON: {
        version: '0.0.12',
      },
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
export default vscode;
export { vscode };
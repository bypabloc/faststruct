import * as vscode from 'vscode';
import { GitOperationsService } from '../../src/services/GitOperationsService';
import { Logger } from '../../src/logger';
import { exec } from 'child_process';

// Mock dependencies
jest.mock('../../src/logger');
jest.mock('child_process', () => ({
  exec: jest.fn()
}));
jest.mock('util', () => ({
  promisify: jest.fn((fn) => {
    return jest.fn((...args) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err: any, result: any) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    });
  })
}));

describe('GitOperationsService', () => {
  let service: GitOperationsService;

  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    (GitOperationsService as any).instance = undefined;
    
    // Mock vscode workspace
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: { fsPath: '/test/workspace' } }],
      configurable: true
    });
    
    // Get service instance
    service = GitOperationsService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = GitOperationsService.getInstance();
      const instance2 = GitOperationsService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('getWorkspaceRoot', () => {
    it('should return workspace root when workspace is available', () => {
      const result = service.getWorkspaceRoot();
      
      expect(result).toBe('/test/workspace');
    });

    it('should return null when no workspace is available', () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: null,
        configurable: true
      });
      
      const result = service.getWorkspaceRoot();
      
      expect(result).toBe(null);
    });
  });

  // Basic integration tests without complex mocks
  describe('basic functionality', () => {
    it('should be properly initialized', () => {
      expect(service).toBeInstanceOf(GitOperationsService);
      expect(service.getWorkspaceRoot()).toBe('/test/workspace');
    });

    it('should handle commands that require workspace', async () => {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: null,
        configurable: true
      });

      await expect(service.executeGitCommand('git status')).rejects.toThrow('No workspace folder open');
    });
  });
});
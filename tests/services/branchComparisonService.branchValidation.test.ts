import * as vscode from 'vscode';
import { BranchComparisonService } from '@/services/BranchComparisonService';
import { Logger } from '@/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

// Mock dependencies
jest.mock('@/logger');
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

describe('BranchComparisonService - Branch Validation', () => {
  let service: BranchComparisonService;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    (BranchComparisonService as any).instance = undefined;
    
    // Mock exec
    mockExec = exec as jest.MockedFunction<typeof exec>;
    
    // Get service instance
    service = BranchComparisonService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('compareBranches with branch validation', () => {
    it('should show error when source branch does not exist', async () => {
      // Mock branch verification - source branch doesn't exist
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify non-existent-branch')) {
          callback(new Error('fatal: unknown revision'), null);
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches('non-existent-branch', 'master');

      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Branch 'non-existent-branch' does not exist");
    });

    it('should show error when target branch does not exist', async () => {
      // Mock branch verification - target branch doesn't exist
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify dev')) {
          callback(null, { stdout: 'abc123', stderr: '' });
        } else if (command.includes('git rev-parse --verify non-existent-target')) {
          callback(new Error('fatal: unknown revision'), null);
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches('dev', 'non-existent-target');

      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Branch 'non-existent-target' does not exist");
    });

    it('should proceed with comparison when both branches exist', async () => {
      // Mock successful branch verification and comparison
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          callback(null, { stdout: 'abc123', stderr: '' });
        } else if (command.includes('git diff --find-renames --name-status')) {
          callback(null, { stdout: 'M\tfile1.ts\nA\tfile2.ts\n', stderr: '' });
        } else if (command.includes('git diff master...dev')) {
          callback(null, { stdout: 'diff content', stderr: '' });
        } else if (command.includes('git diff --numstat')) {
          callback(null, { stdout: '10\t5\tfile1.ts\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches('dev', 'master');

      expect(result).not.toBeNull();
      expect(result?.sourceBranch).toBe('dev');
      expect(result?.targetBranch).toBe('master');
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should handle common branch naming issues', async () => {
      // Test case where user tries to use 'main' but repo has 'master'
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify main')) {
          callback(new Error('fatal: unknown revision'), null);
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches('dev', 'main');

      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Branch 'main' does not exist");
    });
  });

  describe('generateStructureComparison with branch validation', () => {
    it('should validate branches before generating structure comparison', async () => {
      // Mock branch verification failure
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify invalid-branch')) {
          callback(new Error('fatal: unknown revision'), null);
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.generateStructureComparison('invalid-branch', 'master');

      expect(result).toBeNull();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith("Branch 'invalid-branch' does not exist");
    });

    it('should proceed with structure comparison when branches exist', async () => {
      // Mock successful branch verification
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          callback(null, { stdout: 'abc123', stderr: '' });
        } else if (command.includes('git diff --name-only')) {
          callback(null, { stdout: 'src/file1.ts\nsrc/file2.ts\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.generateStructureComparison('feature', 'master');

      expect(result).not.toBeNull();
      expect(result).toContain('**Rama base:** master');
      expect(result).toContain('**Rama con cambios:** feature');
    });
  });

  describe('edge cases', () => {
    it('should handle branches with special characters', async () => {
      const specialBranchName = 'feature/test-123';
      
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes(`git rev-parse --verify ${specialBranchName}`)) {
          callback(null, { stdout: 'abc123', stderr: '' });
        } else if (command.includes('git rev-parse --verify master')) {
          callback(null, { stdout: 'def456', stderr: '' });
        } else if (command.includes('git diff')) {
          callback(null, { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches(specialBranchName, 'master');

      expect(result).not.toBeNull();
      expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
    });

    it('should handle when comparing branches results in zero changes', async () => {
      // Mock branches at same commit
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          callback(null, { stdout: 'abc123', stderr: '' }); // Same commit for both
        } else if (command.includes('git diff')) {
          callback(null, { stdout: '', stderr: '' }); // No differences
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
        return {} as any;
      });

      const result = await service.compareBranches('dev', 'master');

      expect(result).not.toBeNull();
      expect(result?.filesChanged).toHaveLength(0);
      expect(result?.summary.totalFiles).toBe(0);
    });
  });
});
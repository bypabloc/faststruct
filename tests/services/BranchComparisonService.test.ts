import * as vscode from 'vscode';
import { BranchComparisonService } from '../../src/services/BranchComparisonService';
import { Logger } from '../../src/logger';
import { exec } from 'child_process';
import { promisify } from 'util';

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

describe('BranchComparisonService', () => {
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

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = BranchComparisonService.getInstance();
      const instance2 = BranchComparisonService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create a new instance if none exists', () => {
      expect(service).toBeInstanceOf(BranchComparisonService);
    });
  });

  describe('getAvailableBranches', () => {
    it('should return list of available branches', async () => {
      // Arrange
      const mockBranches = '* main\n  feature/test\n  develop\n  feature/branch-comparison';
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        // Handle both (command, callback) and (command, options, callback) signatures
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        callback(null, { stdout: mockBranches, stderr: '' });
        return {} as any;
      });

      // Act
      const branches = await service.getAvailableBranches();

      // Assert
      expect(branches).toEqual([
        { name: 'main', isCurrent: true },
        { name: 'feature/test', isCurrent: false },
        { name: 'develop', isCurrent: false },
        { name: 'feature/branch-comparison', isCurrent: false }
      ]);
      expect(Logger.functionStart).toHaveBeenCalledWith('getAvailableBranches');
      expect(Logger.functionEnd).toHaveBeenCalled();
    });

    it('should handle git command errors gracefully', async () => {
      // Arrange
      const errorMessage = 'fatal: not a git repository';
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        callback(new Error(errorMessage), null);
        return {} as any;
      });

      // Act
      const branches = await service.getAvailableBranches();

      // Assert
      expect(branches).toEqual([]);
      expect(Logger.error).toHaveBeenCalledWith(
        'Error getting git branches', 
        expect.any(Error)
      );
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to get git branches. Make sure you are in a git repository.'
      );
    });

    it('should handle empty branch list', async () => {
      // Arrange
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        callback(null, { stdout: '', stderr: '' });
        return {} as any;
      });

      // Act
      const branches = await service.getAvailableBranches();

      // Assert
      expect(branches).toEqual([]);
    });

    it('should return empty array when no workspace is open', async () => {
      // Arrange
      (vscode.workspace.workspaceFolders as any) = undefined;

      // Act
      const branches = await service.getAvailableBranches();

      // Assert
      expect(branches).toEqual([]);
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No workspace folder open'
      );
    });
  });

  describe('compareBranches', () => {
    const mockWorkspaceFolder = {
      uri: { fsPath: '/test/workspace' }
    };

    beforeEach(() => {
      (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];
    });

    it('should return comparison data between two branches', async () => {
      // Arrange
      const sourceBranch = 'feature/test';
      const targetBranch = 'main';
      const mockDiffOutput = `
diff --git a/src/newFile.ts b/src/newFile.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/newFile.ts
@@ -0,0 +1,5 @@
+export class NewClass {
+  constructor() {
+    console.log('New feature');
+  }
+}
diff --git a/src/existingFile.ts b/src/existingFile.ts
index abcdef..789012 100644
--- a/src/existingFile.ts
+++ b/src/existingFile.ts
@@ -10,3 +10,7 @@ export class ExistingClass {
     console.log('Existing method');
   }
 }
+
+export function newFunction() {
+  return 'New functionality';
+}`;

      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        if (command.includes('--name-status')) {
          callback(null, { 
            stdout: 'A\tsrc/newFile.ts\nM\tsrc/existingFile.ts', 
            stderr: '' 
          });
        } else if (command.includes('--stat')) {
          callback(null, { 
            stdout: ' src/newFile.ts      | 5 +++++\n src/existingFile.ts | 4 ++++\n 2 files changed, 9 insertions(+)', 
            stderr: '' 
          });
        } else {
          callback(null, { stdout: mockDiffOutput, stderr: '' });
        }
        return {} as any;
      });

      // Act
      const result = await service.compareBranches(sourceBranch, targetBranch);

      // Assert
      expect(result).toBeDefined();
      expect(result?.sourceBranch).toBe(sourceBranch);
      expect(result?.targetBranch).toBe(targetBranch);
      expect(result?.filesChanged).toHaveLength(2);
      expect(result?.filesChanged).toContainEqual({
        path: 'src/newFile.ts',
        status: 'added',
        additions: 5,
        deletions: 0
      });
      expect(result?.filesChanged).toContainEqual({
        path: 'src/existingFile.ts',
        status: 'modified',
        additions: 4,
        deletions: 0
      });
      expect(result?.summary.totalFiles).toBe(2);
      expect(result?.summary.additions).toBe(9);
      expect(result?.summary.deletions).toBe(0);
    });

    it('should handle invalid branch names', async () => {
      // Arrange
      const invalidBranch = 'non-existent-branch';
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        callback(new Error('fatal: bad revision'), null);
        return {} as any;
      });

      // Act
      const result = await service.compareBranches(invalidBranch, 'main');

      // Assert
      expect(result).toBeNull();
      expect(Logger.error).toHaveBeenCalled();
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to compare branches. Make sure both branches exist.'
      );
    });

    it('should handle same branch comparison', async () => {
      // Arrange
      const branch = 'main';

      // Act
      const result = await service.compareBranches(branch, branch);

      // Assert
      expect(result).toBeNull();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Cannot compare a branch with itself'
      );
    });

    it('should handle no workspace folder', async () => {
      // Arrange
      (vscode.workspace.workspaceFolders as any) = undefined;

      // Act
      const result = await service.compareBranches('branch1', 'branch2');

      // Assert
      expect(result).toBeNull();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No workspace folder open'
      );
    });
  });

  describe('generateComparisonOutput', () => {
    it('should generate formatted output for branch comparison', async () => {
      // Arrange
      const comparisonData = {
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        filesChanged: [
          {
            path: 'src/newFile.ts',
            status: 'added' as const,
            additions: 10,
            deletions: 0
          },
          {
            path: 'src/modifiedFile.ts',
            status: 'modified' as const,
            additions: 5,
            deletions: 3
          },
          {
            path: 'src/deletedFile.ts',
            status: 'deleted' as const,
            additions: 0,
            deletions: 15
          }
        ],
        summary: {
          totalFiles: 3,
          additions: 15,
          deletions: 18,
          filesAdded: 1,
          filesModified: 1,
          filesDeleted: 1
        },
        diffContent: 'Full diff content here...'
      };

      // Act
      const output = await service.generateComparisonOutput(comparisonData);

      // Assert
      expect(output).toContain('# Branch Comparison');
      expect(output).toContain('**Source Branch:** feature/test');
      expect(output).toContain('**Target Branch:** main');
      expect(output).toContain('## Summary');
      expect(output).toContain('- **Total Files Changed:** 3');
      expect(output).toContain('- **Additions:** 15 lines');
      expect(output).toContain('- **Deletions:** 18 lines');
      expect(output).toContain('- **Files Added:** 1');
      expect(output).toContain('- **Files Modified:** 1');
      expect(output).toContain('- **Files Deleted:** 1');
      expect(output).toContain('## Files Changed');
      expect(output).toContain('### Added Files');
      expect(output).toContain('- `src/newFile.ts` (+10, -0)');
      expect(output).toContain('### Modified Files');
      expect(output).toContain('- `src/modifiedFile.ts` (+5, -3)');
      expect(output).toContain('### Deleted Files');
      expect(output).toContain('- `src/deletedFile.ts` (+0, -15)');
    });

    it('should handle empty comparison data', async () => {
      // Arrange
      const comparisonData = {
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        filesChanged: [],
        summary: {
          totalFiles: 0,
          additions: 0,
          deletions: 0,
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0
        },
        diffContent: ''
      };

      // Act
      const output = await service.generateComparisonOutput(comparisonData);

      // Assert
      expect(output).toContain('No differences found between branches');
    });

    it('should include diff content when showDiff option is true', async () => {
      // Arrange
      const comparisonData = {
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        filesChanged: [{
          path: 'test.ts',
          status: 'modified' as const,
          additions: 1,
          deletions: 1
        }],
        summary: {
          totalFiles: 1,
          additions: 1,
          deletions: 1,
          filesAdded: 0,
          filesModified: 1,
          filesDeleted: 0
        },
        diffContent: 'diff --git a/test.ts b/test.ts\n...'
      };

      // Act
      const output = await service.generateComparisonOutput(comparisonData, { showDiff: true });

      // Assert
      expect(output).toContain('## Full Diff');
      expect(output).toContain('```diff');
      expect(output).toContain(comparisonData.diffContent);
    });
  });

  describe('selectBranchesForComparison', () => {
    it('should prompt user to select source and target branches', async () => {
      // Arrange
      const branches = [
        { name: 'main', isCurrent: true },
        { name: 'feature/test', isCurrent: false },
        { name: 'develop', isCurrent: false }
      ];
      
      jest.spyOn(service, 'getAvailableBranches').mockResolvedValue(branches);
      
      (vscode.window.showQuickPick as jest.Mock)
        .mockResolvedValueOnce({ label: 'feature/test', description: '' })
        .mockResolvedValueOnce({ label: 'main', description: '(current)' });

      // Act
      const result = await service.selectBranchesForComparison();

      // Assert
      expect(result).toEqual({
        sourceBranch: 'feature/test',
        targetBranch: 'main'
      });
      expect(vscode.window.showQuickPick).toHaveBeenCalledTimes(2);
    });

    it('should return null if user cancels branch selection', async () => {
      // Arrange
      jest.spyOn(service, 'getAvailableBranches').mockResolvedValue([
        { name: 'main', isCurrent: true }
      ]);
      
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValueOnce(undefined);

      // Act
      const result = await service.selectBranchesForComparison();

      // Assert
      expect(result).toBeNull();
    });

    it('should handle insufficient branches', async () => {
      // Arrange
      jest.spyOn(service, 'getAvailableBranches').mockResolvedValue([
        { name: 'main', isCurrent: true }
      ]);

      // Act
      const result = await service.selectBranchesForComparison();

      // Assert
      expect(result).toBeNull();
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'Need at least 2 branches to compare'
      );
    });
  });
});
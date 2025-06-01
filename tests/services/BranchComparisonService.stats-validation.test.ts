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

describe('BranchComparisonService - Statistics Validation', () => {
  let service: BranchComparisonService;
  let mockExec: jest.MockedFunction<typeof exec>;

  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    (BranchComparisonService as any).instance = undefined;
    
    // Mock exec
    mockExec = exec as jest.MockedFunction<typeof exec>;
    
    // Mock workspace folders
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      value: [{ uri: { fsPath: '/mock/workspace' } }],
      configurable: true
    });
    
    // Get service instance
    service = BranchComparisonService.getInstance();
  });

  describe('File Statistics Validation', () => {
    it('should never return (0,0) statistics for modified files', async () => {
      // Mock git commands to simulate a modified file scenario
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          // Branch validation - both branches exist
          callback(null, { stdout: 'valid-hash', stderr: '' });
        } else if (command.includes('git diff --find-renames --name-status')) {
          // Return a modified file
          callback(null, { stdout: 'M\tpackage.json', stderr: '' });
        } else if (command.includes('git diff target...source') && !command.includes('--')) {
          // Full diff content
          callback(null, { stdout: 'diff content here', stderr: '' });
        } else if (command.includes('git diff target...source -- "package.json"')) {
          // Diff for specific file - this is where the analysis happens
          callback(null, { 
            stdout: `diff --git a/package.json b/package.json
index 123abc4..def5678 100644
--- a/package.json
+++ b/package.json
@@ -1,10 +1,15 @@
 {
   "name": "test-package",
-  "version": "1.0.0",
+  "version": "1.1.0",
   "scripts": {
-    "test": "jest"
+    "test": "jest",
+    "build": "tsc"
   }
+  "dependencies": {
+    "lodash": "^4.17.21"
+  }
 }
`,
            stderr: ''
          });
        }
        return {} as any;
      });

      const result = await service.compareBranches('source', 'target');

      expect(result).not.toBeNull();
      expect(result!.filesChanged).toHaveLength(1);
      
      const modifiedFile = result!.filesChanged[0];
      expect(modifiedFile.status).toBe('modified');
      expect(modifiedFile.path).toBe('package.json');
      
      // The critical validation: modified files should NEVER have (0,0) statistics
      expect(modifiedFile.additions + modifiedFile.deletions).toBeGreaterThan(0);
      expect(modifiedFile.additions === 0 && modifiedFile.deletions === 0).toBe(false);
      
      // For this specific diff, we should have both additions and deletions
      expect(modifiedFile.additions).toBeGreaterThan(0);
      expect(modifiedFile.deletions).toBeGreaterThan(0);
    });

    it('should ensure added files have only positive additions', async () => {
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          callback(null, { stdout: 'valid-hash', stderr: '' });
        } else if (command.includes('git diff --find-renames --name-status')) {
          callback(null, { stdout: 'A\tnew-file.ts', stderr: '' });
        } else if (command.includes('git diff target...source') && !command.includes('--')) {
          callback(null, { stdout: 'diff content here', stderr: '' });
        } else if (command.includes('git diff target...source -- "new-file.ts"')) {
          callback(null, { 
            stdout: `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..123abc4
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,10 @@
+export class NewClass {
+  constructor() {
+    console.log('Hello');
+  }
+
+  method() {
+    return true;
+  }
+}
`,
            stderr: ''
          });
        }
        return {} as any;
      });

      const result = await service.compareBranches('source', 'target');

      expect(result).not.toBeNull();
      expect(result!.filesChanged).toHaveLength(1);
      
      const addedFile = result!.filesChanged[0];
      expect(addedFile.status).toBe('added');
      expect(addedFile.additions).toBeGreaterThan(0);
      expect(addedFile.deletions).toBe(0);
    });

    it('should ensure deleted files have only positive deletions', async () => {
      mockExec.mockImplementation((command: any, options: any, callback?: any) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        
        if (command.includes('git rev-parse --verify')) {
          callback(null, { stdout: 'valid-hash', stderr: '' });
        } else if (command.includes('git diff --find-renames --name-status')) {
          callback(null, { stdout: 'D\told-file.ts', stderr: '' });
        } else if (command.includes('git diff target...source') && !command.includes('--')) {
          callback(null, { stdout: 'diff content here', stderr: '' });
        } else if (command.includes('git diff target...source -- "old-file.ts"')) {
          callback(null, { 
            stdout: `diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index 123abc4..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,8 +0,0 @@
-export class OldClass {
-  constructor() {
-    console.log('Goodbye');
-  }
-
-  oldMethod() {
-    return false;
-  }
-}
`,
            stderr: ''
          });
        }
        return {} as any;
      });

      const result = await service.compareBranches('source', 'target');

      expect(result).not.toBeNull();
      expect(result!.filesChanged).toHaveLength(1);
      
      const deletedFile = result!.filesChanged[0];
      expect(deletedFile.status).toBe('deleted');
      expect(deletedFile.additions).toBe(0);
      expect(deletedFile.deletions).toBeGreaterThan(0);
    });
  });
});
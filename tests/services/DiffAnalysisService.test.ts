import { DiffAnalysisService } from '@/services/DiffAnalysisService';
import { GitOperationsService } from '@/services/GitOperationsService';
import { Logger } from '@/logger';

// Mock dependencies
jest.mock('@/logger');
jest.mock('@/services/GitOperationsService');

describe('DiffAnalysisService', () => {
  let service: DiffAnalysisService;
  let mockGitOpsService: jest.Mocked<GitOperationsService>;

  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    
    // Reset singleton instances
    (DiffAnalysisService as any).instance = undefined;
    (GitOperationsService as any).instance = undefined;
    
    // Mock GitOperationsService
    mockGitOpsService = {
      getFileLineCount: jest.fn(),
    } as any;
    (GitOperationsService.getInstance as jest.Mock).mockReturnValue(mockGitOpsService);
    
    // Get service instance
    service = DiffAnalysisService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = DiffAnalysisService.getInstance();
      const instance2 = DiffAnalysisService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('extractFileStatsFromCompleteDiff', () => {
    it('should extract file statistics from complete diff', () => {
      const diffContent = `diff --git a/file1.ts b/file1.ts
index 1234567..7890abc 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,3 +1,4 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
 const d = 5;
diff --git a/file2.ts b/file2.ts
index 2345678..8901bcd 100644
--- a/file2.ts
+++ b/file2.ts
@@ -1,2 +1,1 @@
-const old = true;
 const new = false;`;

      const result = service.extractFileStatsFromCompleteDiff(diffContent);

      expect(result).toEqual({
        'file1.ts': { additions: 2, deletions: 1 },
        'file2.ts': { additions: 0, deletions: 1 }
      });
    });

    it('should handle diff with no changes', () => {
      const diffContent = '';

      const result = service.extractFileStatsFromCompleteDiff(diffContent);

      expect(result).toEqual({});
    });

    it('should handle diff with only headers', () => {
      const diffContent = `diff --git a/file1.ts b/file1.ts
index 1234567..7890abc 100644
--- a/file1.ts
+++ b/file1.ts`;

      const result = service.extractFileStatsFromCompleteDiff(diffContent);

      expect(result).toEqual({
        'file1.ts': { additions: 0, deletions: 0 }
      });
    });
  });

  describe('analyzeDiffStatistics', () => {
    it('should analyze diff statistics correctly', () => {
      const diffContent = `diff --git a/test.js b/test.js
index 1234567..7890abc
--- a/test.js
+++ b/test.js
@@ -1,5 +1,6 @@
 const unchanged = true;
-const removed = false;
+const added = true;
+const anotherAdded = false;
 const alsoUnchanged = null;`;

      const result = service.analyzeDiffStatistics(diffContent);

      expect(result).toEqual({
        additions: 2,
        deletions: 1
      });
    });

    it('should handle diff without hunks but with content', () => {
      const diffContent = `+added line
-removed line
+another added line`;

      const result = service.analyzeDiffStatistics(diffContent);

      expect(result).toEqual({
        additions: 2,
        deletions: 1
      });
    });

    it('should ignore diff headers', () => {
      const diffContent = `diff --git a/test.js b/test.js
index 1234567..7890abc
--- a/test.js
+++ b/test.js
@@ -1,2 +1,2 @@
-old line
+new line`;

      const result = service.analyzeDiffStatistics(diffContent);

      expect(result).toEqual({
        additions: 1,
        deletions: 1
      });
    });

    it('should handle metadata lines correctly', () => {
      const diffContent = `diff --git a/test.js b/test.js
index 1234567..7890abc
--- a/test.js
+++ b/test.js
@@ -1,2 +1,2 @@
-old line
+new line
\\ No newline at end of file`;

      const result = service.analyzeDiffStatistics(diffContent);

      expect(result).toEqual({
        additions: 1,
        deletions: 1
      });
    });
  });

  describe('parseFileChangesFromCompleteDiff', () => {
    beforeEach(() => {
      mockGitOpsService.getFileLineCount.mockResolvedValue(10);
    });

    it('should parse file changes with statistics', async () => {
      const nameStatus = `M\tsrc/modified.ts
A\tsrc/added.ts
D\tsrc/deleted.ts
R90\tsrc/old.ts\tsrc/renamed.ts`;

      const diffContent = `diff --git a/src/modified.ts b/src/modified.ts
index 1234567..7890abc
--- a/src/modified.ts
+++ b/src/modified.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
-const c = 3;
diff --git a/src/added.ts b/src/added.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/added.ts
@@ -0,0 +1,2 @@
+const new = true;
+const file = false;`;

      const result = await service.parseFileChangesFromCompleteDiff(
        nameStatus,
        diffContent,
        'main',
        'feature'
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        path: 'src/modified.ts',
        status: 'modified',
        additions: 1,
        deletions: 1,
        oldPath: undefined,
        similarity: undefined
      });
      expect(result[1]).toEqual({
        path: 'src/added.ts',
        status: 'added',
        additions: 2,
        deletions: 0,
        oldPath: undefined,
        similarity: undefined
      });
      expect(result[2]).toEqual({
        path: 'src/deleted.ts',
        status: 'deleted',
        additions: 0,
        deletions: 10, // From mocked getFileLineCount
        oldPath: undefined,
        similarity: undefined
      });
      expect(result[3]).toEqual({
        path: 'src/renamed.ts',
        status: 'renamed',
        additions: 0,
        deletions: 0,
        oldPath: 'src/old.ts',
        similarity: 90
      });
    });

    it('should handle copied files', async () => {
      const nameStatus = `C100\tsrc/original.ts\tsrc/copied.ts`;
      const diffContent = '';

      const result = await service.parseFileChangesFromCompleteDiff(
        nameStatus,
        diffContent,
        'main',
        'feature'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'src/copied.ts',
        status: 'added',
        additions: 10, // From mocked getFileLineCount for added files
        deletions: 0,
        oldPath: undefined,
        similarity: undefined
      });
    });

    it('should handle fallback statistics for modified files with no diff stats', async () => {
      const nameStatus = `M\tsrc/file.ts`;
      const diffContent = ''; // No stats available

      const result = await service.parseFileChangesFromCompleteDiff(
        nameStatus,
        diffContent,
        'main',
        'feature'
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        path: 'src/file.ts',
        status: 'modified',
        additions: 1, // Fallback minimum for modified files
        deletions: 0,
        oldPath: undefined,
        similarity: undefined
      });
    });
  });

  describe('generateManualDiff', () => {
    it('should generate manual diff when git diff fails', () => {
      const targetContent = 'line1\nline2\nline3';
      const sourceContent = 'line1\nmodified line2\nline3\nline4';

      const result = service.generateManualDiff(
        'test.ts',
        targetContent,
        sourceContent
      );

      expect(result).toContain('--- a/test.ts');
      expect(result).toContain('+++ b/test.ts');
      expect(result).toContain('@@ -1,3 +1,4 @@');
    });

    it('should handle identical content', () => {
      const content = 'same content';

      const result = service.generateManualDiff(
        'test.ts',
        content,
        content
      );

      expect(result).toContain('# No visible differences found');
    });
  });
});
import { MoveDetectionService } from '@/services/MoveDetectionService';
import { Logger } from '@/logger';

// Mock dependencies
jest.mock('@/logger');

describe('MoveDetectionService', () => {
  let service: MoveDetectionService;

  beforeEach(() => {
    // Clear all instances and mocks
    jest.clearAllMocks();
    
    // Reset singleton instance
    (MoveDetectionService as any).instance = undefined;
    
    // Get service instance
    service = MoveDetectionService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = MoveDetectionService.getInstance();
      const instance2 = MoveDetectionService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('detectMovedLines', () => {
    it('should not detect moved lines in new files', () => {
      const diffContent = `diff --git a/scripts/generate-svg-icons.js b/scripts/generate-svg-icons.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/scripts/generate-svg-icons.js
@@ -0,0 +1,3 @@
+// scripts/generate-svg-icons.js
+const fs = require('fs');
+import path from 'node:path'`;

      const result = service.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(0); // No moved lines in new files
      expect(result.processedDiff).toContain('+// scripts/generate-svg-icons.js');
    });

    it('should handle files with only deletions', () => {
      const diffContent = `diff --git a/file.js b/file.js
index 1234567..0000000
--- a/file.js
+++ /dev/null
@@ -1,3 +0,0 @@
-/* eslint-disable enforce-typescript-only/enforce-typescript-only */
-
- import something from 'somewhere'`;

      const result = service.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(0);
      expect(result.processedDiff).toContain('-/* eslint-disable enforce-typescript-only/enforce-typescript-only */');
    });

    it('should detect moved lines correctly', () => {
      const diffContent = `diff --git a/package.json b/package.json
index 1234567..7890abc
--- a/package.json
+++ b/package.json
@@ -1,5 +1,5 @@
   "scripts": {
-    "build": "nuxt build",
     "dev": "nuxt dev --port 3000",
+    "build": "nuxt build",
     "typecheck": "tsc --noEmit"`;

      const result = service.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(1); // "build" line was moved
      expect(result.processedDiff).toContain('○    "build": "nuxt build",');
    });

    it('should preserve context lines without modification', () => {
      const diffContent = `diff --git a/eslint.config.js b/eslint.config.js
index 1234567..7890abc
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -1,4 +1,4 @@
-import eslintConfigEnforceTypescriptOnly from '@enforce-typescript-only/eslint-config'
 import process from 'node:process'
+import eslintConfigEnforceTypescriptOnly from '@enforce-typescript-only/eslint-config'
 const enforceScriptSetupTs = await import('./rules/enforce-script-setup-ts.js')`;

      const result = service.detectMovedLines(diffContent);
      
      // Context lines should be preserved with space prefix
      expect(result.processedDiff).toContain(' import process from \'node:process\'');
      expect(result.processedDiff).toContain(' const enforceScriptSetupTs = await import(\'./rules/enforce-script-setup-ts.js\')');
    });

    it('should handle complex diff with multiple operations', () => {
      const diffContent = `diff --git a/complex.js b/complex.js
index 1234567..7890abc
--- a/complex.js
+++ b/complex.js
@@ -1,8 +1,8 @@
 import React from 'react';
-const oldFunction = () => {};
+const newFunction = () => {};
 
 // This line stays
-const movedLine = "I was moved";
 const unchangedLine = "I stay here";
+const movedLine = "I was moved";
 
 export default MyComponent;`;

      const result = service.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(1); // movedLine was moved
      expect(result.processedDiff).toContain('○const movedLine = "I was moved";');
      expect(result.processedDiff).toContain('-const oldFunction = () => {};');
      expect(result.processedDiff).toContain('+const newFunction = () => {};');
    });
  });

  describe('analyzeDiffStatisticsWithMoveDetection', () => {
    it('should correctly exclude moved lines from statistics', () => {
      const diffContent = `diff --git a/test.js b/test.js
index 1234567..7890abc
--- a/test.js
+++ b/test.js
@@ -1,5 +1,5 @@
-const line1 = "moved";
 const line2 = "unchanged";
+const line1 = "moved";
-const line3 = "deleted";
+const line4 = "added";`;

      const result = service.analyzeDiffStatisticsWithMoveDetection(diffContent);
      
      expect(result.movedLines).toBe(1); // line1 was moved
      expect(result.additions).toBe(1); // line4 was added
      expect(result.deletions).toBe(1); // line3 was deleted
    });
  });

  describe('areLinesRelated', () => {
    it('should detect related lines with high similarity', () => {
      const line1 = 'const myVariable = "old value";';
      const line2 = 'const myVariable = "new value";';
      
      const result = service.areLinesRelated(line1, line2);
      
      expect(result).toBe(true);
    });

    it('should not detect unrelated lines', () => {
      const line1 = 'import React from "react";';
      const line2 = 'const unrelated = 42;';
      
      const result = service.areLinesRelated(line1, line2);
      
      expect(result).toBe(false);
    });

    it('should not relate very short lines', () => {
      const line1 = 'a';
      const line2 = 'b';
      
      const result = service.areLinesRelated(line1, line2);
      
      expect(result).toBe(false);
    });
  });

  describe('isLikelyReorganization', () => {
    it('should detect reorganization in package.json', () => {
      const result = service.isLikelyReorganization('package.json', 5, 5);
      
      expect(result).toBe(true);
    });

    it('should detect reorganization in config files', () => {
      const result = service.isLikelyReorganization('eslint.config.js', 3, 3);
      
      expect(result).toBe(true);
    });

    it('should detect reorganization with balanced small changes', () => {
      const result = service.isLikelyReorganization('some-file.js', 2, 2);
      
      expect(result).toBe(true);
    });

    it('should not detect reorganization for large unbalanced changes', () => {
      const result = service.isLikelyReorganization('some-file.js', 50, 5);
      
      expect(result).toBe(false);
    });
  });
});
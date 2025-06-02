import { MoveDetectionService } from '../../src/services/MoveDetectionService';
import { FileTreeService } from '../../src/services/FileTreeService';
import { Logger } from '../../src/logger';

// Mock dependencies
jest.mock('../../src/logger');

describe('MoveDetectionService - Move Detection', () => {
  let moveService: MoveDetectionService;
  let treeService: FileTreeService;

  beforeEach(() => {
    // Reset singleton instances
    (MoveDetectionService as any).instance = undefined;
    (FileTreeService as any).instance = undefined;
    
    moveService = MoveDetectionService.getInstance();
    treeService = FileTreeService.getInstance();
    jest.clearAllMocks();
  });

  describe('detectMovedLines', () => {
    it('should not detect moved lines in new files', () => {
      // This is the case of generate-svg-icons.js - a new file with only additions
      const diffContent = `diff --git a/app/scripts/generate-svg-icons.js b/app/scripts/generate-svg-icons.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/app/scripts/generate-svg-icons.js
+// scripts/generate-svg-icons.js
+/**
+ * Script para generar un archivo JSON con los iconos SVG precargados
+ * Este script se ejecuta antes de la compilación/generación
+ */
+import fs from 'node:fs'
+import path from 'node:path'`;

      const result = moveService.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(0); // No moved lines in new files
      expect(result.processedDiff).toContain('+// scripts/generate-svg-icons.js');
      expect(result.processedDiff).toContain('+/**');
      expect(result.processedDiff).not.toContain('○'); // No moved line markers
    });

    it('should handle files with only deletions (no eslint comment)', () => {
      const diffContent = `diff --git a/app/scripts/file.js b/app/scripts/file.js
--- a/app/scripts/file.js
+++ b/app/scripts/file.js
-/* eslint-disable enforce-typescript-only/enforce-typescript-only */
 // Rest of the file content
 import something from 'somewhere'`;

      const result = moveService.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(0);
      expect(result.processedDiff).toContain('-/* eslint-disable enforce-typescript-only/enforce-typescript-only */');
      expect(result.processedDiff).toContain(' // Rest of the file content');
      expect(result.processedDiff).not.toContain('○');
    });
    it('should detect moved lines correctly', () => {
      const diffContent = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
-    "build": "nuxt build",
     "postinstall": "pnpm generate:icons && nuxt prepare",
     "lint": "eslint --ext .ts,.js,.vue",
+    "build": "nuxt build",
     "typecheck": "tsc --noEmit"`;

      const result = moveService.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(1); // "build" line was moved
      expect(result.processedDiff).toContain('○    "build": "nuxt build",');
      expect(result.processedDiff).not.toContain('+    "build": "nuxt build",');
    });

    it('should preserve context lines without modification', () => {
      const diffContent = `diff --git a/eslint.config.mjs b/eslint.config.mjs
--- a/eslint.config.mjs
+++ b/eslint.config.mjs
 ]
+  '.*/rules/.*',
+  '.*/scripts/.*',
 // Reglas originales
 const enforceScriptSetupTs = await import('./rules/enforce-script-setup-ts.js')`;

      const result = moveService.detectMovedLines(diffContent);
      
      // Context lines should be preserved with space prefix
      expect(result.processedDiff).toContain(' ]');
      expect(result.processedDiff).toContain(' // Reglas originales');
      expect(result.processedDiff).toContain(' const enforceScriptSetupTs');
    });

    it('should handle mixed changes correctly', () => {
      const diffContent = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
-    "@nuxt/eslint": "1.4.0",
     "@nuxt/fonts": "0.11.4",
     "@nuxt/image": "1.10.0",
-    "@nuxt/schema": "^3.17.3",
+    "@nuxt/eslint": "1.4.1",
-    "@nuxt/scripts": "0.11.6",
+    "@nuxt/schema": "^3.17.4",
+    "@nuxt/scripts": "0.11.7",`;

      const result = moveService.detectMovedLines(diffContent);
      
      // Context lines (unchanged)
      expect(result.processedDiff).toContain('     "@nuxt/fonts": "0.11.4",');
      expect(result.processedDiff).toContain('     "@nuxt/image": "1.10.0",');
      
      // Removed lines
      expect(result.processedDiff).toContain('-    "@nuxt/eslint": "1.4.0",');
      expect(result.processedDiff).toContain('-    "@nuxt/schema": "^3.17.3",');
      
      // Added lines
      expect(result.processedDiff).toContain('+    "@nuxt/eslint": "1.4.1",');
      expect(result.processedDiff).toContain('+    "@nuxt/schema": "^3.17.4",');
    });
    
    it('should handle file with mixed additions and deletions correctly', () => {
      // Test for a file that has a deletion at the top and then additions
      // This simulates the real generate-svg-icons.js case
      const diffContent = `diff --git a/app/scripts/generate-svg-icons.js b/app/scripts/generate-svg-icons.js
--- a/app/scripts/generate-svg-icons.js
+++ b/app/scripts/generate-svg-icons.js
-/* eslint-disable enforce-typescript-only/enforce-typescript-only */
+// scripts/generate-svg-icons.js
+/**
+ * Script para generar un archivo JSON con los iconos SVG precargados
+ * Este script se ejecuta antes de la compilación/generación
+ */
+import fs from 'node:fs'`;

      const result = moveService.detectMovedLines(diffContent);
      
      // No lines should be detected as moved because they're all different
      expect(result.movedLinesCount).toBe(0);
      expect(result.processedDiff).toContain('-/* eslint-disable enforce-typescript-only/enforce-typescript-only */');
      expect(result.processedDiff).toContain('+// scripts/generate-svg-icons.js');
      expect(result.processedDiff).toContain('+/**');
      expect(result.processedDiff).not.toContain('○'); // No moved line markers
    });

    it('should skip hunk headers', () => {
      const diffContent = `@@ -1,5 +1,5 @@
-old line
+new line
 context line`;

      const result = moveService.detectMovedLines(diffContent);
      
      // Hunk headers should be removed
      expect(result.processedDiff).not.toContain('@@');
    });

    it('should handle incorrectly placed lines like seo:validate', () => {
      const diffContent = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
+    "reinstall": "rm -rf node_modules pnpm-lock.yaml .nuxt .output && pnpm store prune && pnpm install",
     "typecheck": "tsc --noEmit"
   },
   "dependencies": {
+    "seo:validate": "pnpm generate:sitemap && echo 'Sitemap validado correctamente'",
-    "@nuxt/eslint": "1.4.0",`;

      const result = moveService.detectMovedLines(diffContent);
      
      // seo:validate should be shown as added (incorrectly placed in dependencies)
      expect(result.processedDiff).toContain('+    "seo:validate":');
      
      // Context lines
      expect(result.processedDiff).toContain('     "typecheck": "tsc --noEmit"');
      expect(result.processedDiff).toContain('   },');
      expect(result.processedDiff).toContain('   "dependencies": {');
    });
  });

  describe('analyzeDiffStatisticsWithMoveDetection', () => {
    it('should return zero moved lines for new files', () => {
      const diffContent = `@@ -0,0 +1,10 @@
+// scripts/generate-svg-icons.js
+/**
+ * Script para generar un archivo JSON con los iconos SVG precargados
+ */
+import fs from 'node:fs'`;

      const result = moveService.analyzeDiffStatisticsWithMoveDetection(diffContent);
      
      expect(result.movedLines).toBe(0);
      expect(result.additions).toBe(5); // All lines are truly new
      expect(result.deletions).toBe(0);
    });

    it('should count moved lines separately from additions/deletions', () => {
      const diffContent = `@@ -1,10 +1,10 @@
-    "build": "nuxt build",
     "postinstall": "pnpm generate:icons && nuxt prepare",
     "lint": "eslint --ext .ts,.js,.vue",
+    "build": "nuxt build",
+    "new-script": "echo 'new'",
-    "old-script": "echo 'old'",`;

      const result = moveService.analyzeDiffStatisticsWithMoveDetection(diffContent);
      
      expect(result.movedLines).toBe(1); // "build" was moved
      expect(result.additions).toBe(1); // Only "new-script" is truly new
      expect(result.deletions).toBe(1); // Only "old-script" was truly deleted
    });

    it('should handle multiple moved lines', () => {
      const diffContent = `@@ -1,10 +1,10 @@
-    "script1": "value1",
-    "script2": "value2",
-    "script3": "value3",
     "unchanged": "value",
+    "script2": "value2",
+    "script1": "value1",
+    "script3": "value3",`;

      const result = moveService.analyzeDiffStatisticsWithMoveDetection(diffContent);
      
      expect(result.movedLines).toBe(3); // All three scripts were moved
      expect(result.additions).toBe(0); // No truly new lines
      expect(result.deletions).toBe(0); // No truly deleted lines
    });
  });

  describe('enhanceDiffWithMoveDetection', () => {
    it('should not add header when no moved lines detected', () => {
      const diffContent = `@@ -1,3 +1,3 @@
-old line
+new line
 context`;

      const result = moveService.enhanceDiffWithMoveDetection(diffContent);
      
      expect(result).not.toContain('# Nota:');
      expect(result).toContain('-old line');
      expect(result).toContain('+new line');
    });
  });

  describe('formatTreeStructureWithChanges', () => {
    it('should include moved lines count in file tree', () => {
      const tree = {
        'package.json': {
          type: 'file' as const,
          status: 'modified' as const,
          additions: 42,
          deletions: 35,
          movedLines: 7
        }
      };

      const result = treeService.formatTreeStructureWithChanges(tree);
      
      expect(result).toContain('📝 package.json (+42, -35, ○7)');
    });

    it('should not show moved lines when zero', () => {
      const tree = {
        'config.js': {
          type: 'file' as const,
          status: 'modified' as const,
          additions: 10,
          deletions: 5,
          movedLines: 0
        }
      };

      const result = treeService.formatTreeStructureWithChanges(tree);
      
      expect(result).toContain('📝 config.js (+10, -5)');
      expect(result).not.toContain('○0');
    });
  });
});
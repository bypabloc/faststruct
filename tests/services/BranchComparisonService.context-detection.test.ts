import { MoveDetectionService } from '../../src/services/MoveDetectionService';
import { Logger } from '../../src/logger';

// Mock dependencies
jest.mock('../../src/logger');

describe('MoveDetectionService - Context Detection', () => {
  let service: MoveDetectionService;

  beforeEach(() => {
    // Reset singleton instance
    (MoveDetectionService as any).instance = undefined;
    
    service = MoveDetectionService.getInstance();
    jest.clearAllMocks();
  });

  describe('detectMovedLines with context', () => {
    it('should correctly handle file with only one deletion and context lines', () => {
      // This is the real case of generate-svg-icons.js
      const diffContent = `diff --git a/app/scripts/generate-svg-icons.js b/app/scripts/generate-svg-icons.js
--- a/app/scripts/generate-svg-icons.js
+++ b/app/scripts/generate-svg-icons.js
-/* eslint-disable enforce-typescript-only/enforce-typescript-only */
 // scripts/generate-svg-icons.js
 /**
  * Script para generar un archivo JSON con los iconos SVG precargados
  * Este script se ejecuta antes de la compilación/generación
  */
 import fs from 'node:fs'
 import path from 'node:path'
 import { fileURLToPath } from 'node:url'`;

      const result = service.detectMovedLines(diffContent);
      
      // Should only have the deletion, rest are context lines
      expect(result.movedLinesCount).toBe(0);
      expect(result.processedDiff).toContain('-/* eslint-disable enforce-typescript-only/enforce-typescript-only */');
      
      // Context lines should start with space
      expect(result.processedDiff).toContain(' // scripts/generate-svg-icons.js');
      expect(result.processedDiff).toContain(' /**');
      expect(result.processedDiff).toContain('  * Script para generar un archivo JSON con los iconos SVG precargados');
      expect(result.processedDiff).toContain(' import fs from \'node:fs\'');
      
      // Should NOT contain + or ○ for these lines
      expect(result.processedDiff).not.toContain('+// scripts/generate-svg-icons.js');
      expect(result.processedDiff).not.toContain('○// scripts/generate-svg-icons.js');
    });

    it('should differentiate between moved and modified lines', () => {
      const diffContent = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
-    "test": "jest",
-    "build": "tsc",
     "lint": "eslint",
+    "test": "jest --coverage",
+    "build": "tsc",
     "format": "prettier"`;

      const result = service.detectMovedLines(diffContent);
      
      // "build" was moved (identical content)
      // "test" was modified (content changed)
      expect(result.movedLinesCount).toBe(1); // Only "build" is truly moved
      expect(result.processedDiff).toContain('○    "build": "tsc",'); // Moved line
      expect(result.processedDiff).toContain('-    "test": "jest",'); // Deleted line
      expect(result.processedDiff).toContain('+    "test": "jest --coverage",'); // Added line (modified)
      expect(result.processedDiff).toContain('     "lint": "eslint",'); // Context line
      expect(result.processedDiff).toContain('     "format": "prettier"'); // Context line
    });

    it('should handle modified and moved lines', () => {
      // When a line is both modified and moved to a different location
      const diffContent = `diff --git a/config.js b/config.js
--- a/config.js
+++ b/config.js
-export const API_URL = "http://localhost:3000";
 export const APP_NAME = "MyApp";
 export const VERSION = "1.0.0";
+export const API_URL = "https://api.example.com";`;

      const result = service.detectMovedLines(diffContent);
      
      // API_URL was modified AND moved
      expect(result.movedLinesCount).toBe(0); // Not counted as moved because content changed
      expect(result.processedDiff).toContain('-export const API_URL = "http://localhost:3000";');
      expect(result.processedDiff).toContain('+export const API_URL = "https://api.example.com";');
      expect(result.processedDiff).toContain(' export const APP_NAME = "MyApp";');
      expect(result.processedDiff).toContain(' export const VERSION = "1.0.0";');
    });

    it('should handle real git diff format with proper context', () => {
      // Real git diff includes line numbers and context
      const diffContent = `diff --git a/src/file.js b/src/file.js
index abc123..def456 100644
--- a/src/file.js
+++ b/src/file.js
@@ -10,7 +10,6 @@
 import React from 'react';
 import { useState } from 'react';
 
-// Old comment
 function Component() {
   const [state, setState] = useState(0);
   return <div>{state}</div>;`;

      const result = service.detectMovedLines(diffContent);
      
      expect(result.movedLinesCount).toBe(0);
      expect(result.processedDiff).toContain(' import React from \'react\';');
      expect(result.processedDiff).toContain(' import { useState } from \'react\';');
      expect(result.processedDiff).toContain(' ');
      expect(result.processedDiff).toContain('-// Old comment');
      expect(result.processedDiff).toContain(' function Component() {');
      expect(result.processedDiff).toContain('   const [state, setState] = useState(0);');
    });

    it('should not show duplicate lines in incorrect format', () => {
      // Test to ensure we don't get the duplicate line issue
      const diffContent = `diff --git a/app/file.js b/app/file.js
--- a/app/file.js
+++ b/app/file.js
-/* old header */
 // Comment line
 import something from 'somewhere';
 
 export function test() {
   return true;
 }`;

      const result = service.detectMovedLines(diffContent);
      
      // Count occurrences of the comment line
      const commentMatches = (result.processedDiff.match(/\/\/ Comment line/g) || []).length;
      expect(commentMatches).toBe(1); // Should appear only once
      
      // It should be a context line
      expect(result.processedDiff).toContain(' // Comment line');
      expect(result.processedDiff).not.toContain('+// Comment line');
      expect(result.processedDiff).not.toContain('○// Comment line');
    });
  });

  describe('Modified line detection', () => {
    it('should mark lines as modified when content changes but position moves', () => {
      const diffContent = `diff --git a/package.json b/package.json
--- a/package.json
+++ b/package.json
-    "version": "1.0.0",
-    "name": "old-name",
     "description": "Test",
+    "version": "1.0.1",
+    "name": "new-name",`;

      const result = service.detectMovedLines(diffContent);
      
      // Both version and name were modified, not just moved
      expect(result.processedDiff).toContain('-    "version": "1.0.0",');
      expect(result.processedDiff).toContain('+    "version": "1.0.1",');
      expect(result.processedDiff).toContain('-    "name": "old-name",');
      expect(result.processedDiff).toContain('+    "name": "new-name",');
      expect(result.processedDiff).toContain('     "description": "Test",');
      
      // Should not contain moved markers
      expect(result.processedDiff).not.toContain('○');
    });
  });
});
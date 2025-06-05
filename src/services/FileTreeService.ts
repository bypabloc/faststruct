import * as path from 'path';
import { Logger } from '../logger';
import { FileChange } from './DiffAnalysisService';
import { GitOperationsService } from './GitOperationsService';
import { MoveDetectionService } from './MoveDetectionService';

export interface TreeNodeWithChanges {
  type: 'file' | 'directory';
  status?: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
  movedLines?: number;
  modifiedMovedLines?: number;
  oldPath?: string;
  similarity?: number;
  [key: string]: any;
}

/**
 * Service for building and formatting file tree structures.
 * Handles tree construction and formatting following SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class FileTreeService {
  private static instance: FileTreeService;
  private gitOpsService: GitOperationsService;
  private moveDetectionService: MoveDetectionService;

  public static getInstance(): FileTreeService {
    if (!this.instance) {
      this.instance = new FileTreeService();
    }
    return this.instance;
  }

  private constructor() {
    this.gitOpsService = GitOperationsService.getInstance();
    this.moveDetectionService = MoveDetectionService.getInstance();
  }

  /**
   * Build a simple tree structure from file paths.
   * 
   * @param files - Array of file paths
   * @returns Tree structure
   */
  public buildFileTree(files: string[]): any {
    const tree: any = {};

    files.forEach((filePath) => {
      const parts = filePath.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = index === parts.length - 1 ? null : {};
        }
        if (index < parts.length - 1) {
          current = current[part];
        }
      });
    });

    return tree;
  }

  /**
   * Build a tree structure from file changes with status information.
   * 
   * @param filesChanged - Array of file changes
   * @param workspaceRoot - Workspace root path
   * @param targetBranch - Target branch name
   * @param sourceBranch - Source branch name
   * @returns Tree structure with change information
   */
  public async buildFileTreeWithChanges(
    filesChanged: FileChange[],
    workspaceRoot: string,
    targetBranch: string,
    sourceBranch: string
  ): Promise<Record<string, TreeNodeWithChanges>> {
    const tree: any = {};

    for (const fileChange of filesChanged) {
      const parts = fileChange.path.split('/');
      let current = tree;

      // Calculate moved lines for this file if possible
      let movedLines = 0;
      let modifiedMovedLines = 0;

      try {
        const fileDiff = await this.gitOpsService.getFileDiff(
          targetBranch,
          sourceBranch,
          fileChange.path
        );

        if (fileDiff) {
          const stats = this.moveDetectionService.analyzeDiffStatisticsWithMoveDetection(fileDiff);
          movedLines = stats.movedLines;
          modifiedMovedLines = stats.modifiedMovedLines;
        }
      } catch (error) {
        // Ignore errors, just don't show moved lines count
        Logger.debug(`Could not analyze moves for ${fileChange.path}`, error);
      }

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file, store the change information
          current[part] = {
            type: 'file',
            status: fileChange.status,
            additions: fileChange.additions,
            deletions: fileChange.deletions,
            movedLines,
            modifiedMovedLines,
            oldPath: fileChange.oldPath,
            similarity: fileChange.similarity,
          };
        } else {
          // It's a directory
          if (!current[part]) {
            current[part] = { type: 'directory' };
          }
          current = current[part];
        }
      });
    }

    return tree;
  }

  /**
   * Format tree structure for display.
   * 
   * @param tree - Tree structure
   * @param prefix - Prefix for indentation
   * @returns Formatted tree string
   */
  public formatTreeStructure(tree: any, prefix: string = ''): string {
    const entries = Object.entries(tree);
    let output = '';

    entries.forEach(([name, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';

      if (value === null) {
        // File
        output += `${prefix}${connector}${name}\n`;
      } else {
        // Directory
        output += `${prefix}${connector}📁 ${name}\n`;
        output += this.formatTreeStructure(value, prefix + extension);
      }
    });

    return output;
  }

  /**
   * Format tree structure with change information for display.
   * 
   * @param tree - Tree structure with change information
   * @param prefix - Prefix for indentation
   * @returns Formatted tree string with change icons
   */
  public formatTreeStructureWithChanges(
    tree: Record<string, TreeNodeWithChanges>,
    prefix: string = ''
  ): string {
    const entries = Object.entries(tree);
    let output = '';

    entries.forEach(([name, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';

      if (value && value.type === 'file') {
        // File with change information
        const icon = this.getChangeIcon(value.status || 'modified');
        let stats = `(+${value.additions || 0}, -${value.deletions || 0}`;

        // Add moved lines count if available
        if (value.movedLines && value.movedLines > 0) {
          stats += `, ○${value.movedLines}`;
        }
        if (value.modifiedMovedLines && value.modifiedMovedLines > 0) {
          stats += `, ●${value.modifiedMovedLines}`;
        }
        stats += ')';

        let nameWithInfo = name;

        // For renamed files, show both old and new names
        if (value.status === 'renamed' && value.oldPath) {
          const oldName = path.basename(value.oldPath);
          nameWithInfo = `${name} ← ${oldName}`;
        }

        output += `${prefix}${connector}${icon} ${nameWithInfo} ${stats}\n`;
      } else if (value && value.type === 'directory') {
        // Directory - remove the type property before recursing
        const { type, status, additions, deletions, ...children } = value;
        output += `${prefix}${connector}📁 ${name}\n`;
        output += this.formatTreeStructureWithChanges(
          children as Record<string, TreeNodeWithChanges>,
          prefix + extension
        );
      }
    });

    return output;
  }

  /**
   * Get icon for file change status.
   * 
   * @param status - File change status
   * @returns Icon string
   */
  public getChangeIcon(status: 'added' | 'modified' | 'deleted' | 'renamed'): string {
    switch (status) {
      case 'added':
        return '🆕'; // New file
      case 'modified':
        return '📝'; // Modified file
      case 'deleted':
        return '🗑️'; // Deleted file
      case 'renamed':
        return '📂'; // Moved/renamed file
      default:
        return '📄'; // Default file
    }
  }

  /**
   * Extract hunk information from diff content.
   * 
   * @param diffContent - Git diff content
   * @returns Array of hunk information
   */
  public extractHunkInfo(
    diffContent: string
  ): Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
  }> {
    const hunkPattern = /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/g;
    const hunks = [];
    let match;

    while ((match = hunkPattern.exec(diffContent)) !== null) {
      hunks.push({
        oldStart: parseInt(match[1], 10),
        oldCount: parseInt(match[2] || '1', 10),
        newStart: parseInt(match[3], 10),
        newCount: parseInt(match[4] || '1', 10),
      });
    }

    return hunks;
  }

  /**
   * Extract hunk information for a specific file from complete diff content.
   * 
   * @param diffContent - Complete git diff content
   * @param filePath - Path to the specific file
   * @returns Array of hunk information for the file
   */
  public extractHunkInfoFromCompleteDiff(
    diffContent: string,
    filePath: string
  ): Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
  }> {
    const lines = diffContent.split('\n');
    const hunks = [];
    let currentFile = '';
    let inTargetFile = false;

    for (const line of lines) {
      // Detect file diff start
      if (line.startsWith('diff --git')) {
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          currentFile = match[2]; // Use the "new" file path
          inTargetFile = currentFile === filePath;
        }
      }
      // Extract hunk headers for target file
      else if (inTargetFile && line.startsWith('@@')) {
        const hunkMatch = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
        if (hunkMatch) {
          hunks.push({
            oldStart: parseInt(hunkMatch[1], 10),
            oldCount: parseInt(hunkMatch[2] || '1', 10),
            newStart: parseInt(hunkMatch[3], 10),
            newCount: parseInt(hunkMatch[4] || '1', 10),
          });
        }
      }
    }

    return hunks;
  }
}
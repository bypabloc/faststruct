import { Logger } from '@/logger';
import { GitOperationsService } from '@/services/GitOperationsService';

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath?: string;
  similarity?: number;
}

export interface DiffStatistics {
  additions: number;
  deletions: number;
}

/**
 * Service for analyzing Git diffs and extracting statistics.
 * Handles all diff parsing and analysis logic following SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class DiffAnalysisService {
  private static instance: DiffAnalysisService;
  private gitOpsService: GitOperationsService;

  public static getInstance(): DiffAnalysisService {
    if (!this.instance) {
      this.instance = new DiffAnalysisService();
    }
    return this.instance;
  }

  private constructor() {
    this.gitOpsService = GitOperationsService.getInstance();
  }

  /**
   * Parse file changes from complete diff content with accurate statistics.
   * 
   * @param nameStatus - Git diff --name-status output
   * @param diffContent - Complete git diff output
   * @param targetBranch - Target branch name
   * @param sourceBranch - Source branch name
   * @returns Array of file changes with accurate statistics
   */
  public async parseFileChangesFromCompleteDiff(
    nameStatus: string,
    diffContent: string,
    targetBranch: string,
    sourceBranch: string
  ): Promise<FileChange[]> {
    const fileChanges: FileChange[] = [];
    const statusMap: Record<string, 'added' | 'modified' | 'deleted' | 'renamed'> = {
      A: 'added',
      M: 'modified',
      D: 'deleted',
    };

    const nameStatusLines = nameStatus.split('\n').filter((line) => line.trim());
    const fileStatsMap = this.extractFileStatsFromCompleteDiff(diffContent);

    Logger.debug(
      `[parseFileChangesFromCompleteDiff] Found stats for ${
        Object.keys(fileStatsMap).length
      } files in complete diff`
    );

    for (const line of nameStatusLines) {
      const parts = line.split('\t');
      const status = parts[0];
      let filePath: string;
      let oldPath: string | undefined;
      let similarity: number | undefined;
      let fileStatus: 'added' | 'modified' | 'deleted' | 'renamed';

      if (status.startsWith('R')) {
        const renameMatch = status.match(/R(\d+)/);
        similarity = renameMatch ? parseInt(renameMatch[1], 10) : undefined;
        oldPath = parts[1];
        filePath = parts[2];
        fileStatus = 'renamed';
      } else if (status.startsWith('C')) {
        filePath = parts[2];
        fileStatus = 'added';
      } else if (statusMap[status]) {
        filePath = parts.slice(1).join('\t');
        fileStatus = statusMap[status];
      } else {
        continue;
      }

      if (!filePath) continue;

      const stats = fileStatsMap[filePath] || { additions: 0, deletions: 0 };
      let additions = stats.additions;
      let deletions = stats.deletions;

      if (additions === 0 && deletions === 0) {
        const fallbackStats = await this.getFallbackStats(fileStatus, filePath, targetBranch, sourceBranch);
        additions = fallbackStats.additions;
        deletions = fallbackStats.deletions;
      }

      Logger.debug(
        `[parseFileChangesFromCompleteDiff] ${filePath} (${fileStatus}): +${additions}, -${deletions}`
      );

      fileChanges.push({
        path: filePath,
        status: fileStatus,
        additions,
        deletions,
        oldPath,
        similarity,
      });
    }

    return fileChanges;
  }

  /**
   * Extract file statistics from complete diff content.
   * 
   * @param diffContent - Complete git diff output
   * @returns Map of file path to statistics
   */
  public extractFileStatsFromCompleteDiff(
    diffContent: string
  ): Record<string, DiffStatistics> {
    const fileStats: Record<string, DiffStatistics> = {};
    const lines = diffContent.split('\n');
    let currentFile = '';
    let additions = 0;
    let deletions = 0;
    let inHunk = false;

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          fileStats[currentFile] = { additions, deletions };
        }

        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          currentFile = match[2];
          additions = 0;
          deletions = 0;
          inHunk = false;
          Logger.debug(`[extractFileStatsFromCompleteDiff] Processing file: ${currentFile}`);
        }
      } else if (line.startsWith('@@')) {
        inHunk = true;
      } else if (inHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }
    }

    if (currentFile) {
      fileStats[currentFile] = { additions, deletions };
    }

    Logger.debug(
      `[extractFileStatsFromCompleteDiff] Extracted stats for ${
        Object.keys(fileStats).length
      } files`
    );

    return fileStats;
  }

  /**
   * Analyze diff statistics from content.
   * 
   * @param diffContent - Raw git diff content
   * @returns Statistics object
   */
  public analyzeDiffStatistics(diffContent: string): DiffStatistics {
    const lines = diffContent.split('\n');
    let additions = 0;
    let deletions = 0;
    let inDiffSection = false;
    let hunkCount = 0;

    Logger.debug(`[analyzeDiffStatistics] Analyzing ${lines.length} lines of diff`);

    for (const line of lines) {
      if (line.startsWith('@@')) {
        inDiffSection = true;
        hunkCount++;
        Logger.debug(
          `[analyzeDiffStatistics] Found hunk ${hunkCount}: ${line.substring(0, 100)}`
        );
        continue;
      }

      if (inDiffSection) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        } else if (line.startsWith('\\')) {
          continue;
        }
      }
    }

    Logger.debug(`[analyzeDiffStatistics] Found ${hunkCount} hunks, +${additions}, -${deletions}`);

    if (hunkCount === 0 && diffContent.trim().length > 0) {
      Logger.warn('[analyzeDiffStatistics] No hunks found but diff has content, trying fallback analysis');

      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          additions++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          deletions++;
        }
      }

      Logger.debug(`[analyzeDiffStatistics] Fallback analysis: +${additions}, -${deletions}`);
    }

    return { additions, deletions };
  }

  /**
   * Generate a manual diff when git diff fails.
   * 
   * @param filePath - File path for context
   * @param targetContent - Content from target branch
   * @param sourceContent - Content from source branch
   * @returns Manual diff content
   */
  public generateManualDiff(
    filePath: string,
    targetContent: string,
    sourceContent: string
  ): string {
    const targetLines = targetContent.split('\n');
    const sourceLines = sourceContent.split('\n');

    let diffContent = `--- a/${filePath}\n+++ b/${filePath}\n`;
    diffContent += `@@ -1,${targetLines.length} +1,${sourceLines.length} @@\n`;

    const diffs = this.computeSimpleDiff(targetLines, sourceLines);
    let changesFound = false;

    for (const diff of diffs) {
      if (diff.type === 'removed') {
        changesFound = true;
        diffContent += `-${diff.line}\n`;
      } else if (diff.type === 'added') {
        changesFound = true;
        diffContent += `+${diff.line}\n`;
      } else if (diff.type === 'context') {
        diffContent += ` ${diff.line}\n`;
      }
    }

    if (!changesFound) {
      diffContent += `# No visible differences found\n`;
      diffContent += `# Target: ${targetLines.length} lines, Source: ${sourceLines.length} lines\n`;
      diffContent += `# Possible causes: binary differences, encoding issues, or very large files\n`;
    }

    return diffContent;
  }

  /**
   * Get fallback statistics for special file cases.
   * 
   * @param fileStatus - File status
   * @param filePath - File path
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @returns Fallback statistics
   */
  private async getFallbackStats(
    fileStatus: 'added' | 'modified' | 'deleted' | 'renamed',
    filePath: string,
    targetBranch: string,
    sourceBranch: string
  ): Promise<DiffStatistics> {
    try {
      if (fileStatus === 'added') {
        const additions = await this.gitOpsService.getFileLineCount(sourceBranch, filePath);
        return { additions: additions || 1, deletions: 0 };
      } else if (fileStatus === 'deleted') {
        const deletions = await this.gitOpsService.getFileLineCount(targetBranch, filePath);
        return { additions: 0, deletions: deletions || 1 };
      } else if (fileStatus === 'modified') {
        Logger.warn(`[CRITICAL] Modified file ${filePath} has 0,0 stats - forcing minimum`);
        return { additions: 1, deletions: 0 };
      }
    } catch (error) {
      Logger.warn(`Failed to get fallback stats for ${filePath}`, error);
    }

    return { additions: 0, deletions: 0 };
  }

  /**
   * Compute a simple diff between two arrays of lines.
   * 
   * @param targetLines - Lines from target content
   * @param sourceLines - Lines from source content
   * @returns Array of diff operations
   */
  private computeSimpleDiff(
    targetLines: string[],
    sourceLines: string[]
  ): Array<{ type: 'context' | 'removed' | 'added'; line: string }> {
    const result: Array<{ type: 'context' | 'removed' | 'added'; line: string }> = [];
    const matches = this.findLineMatches(targetLines, sourceLines);

    let targetIndex = 0;
    let sourceIndex = 0;

    while (sourceIndex < sourceLines.length || targetIndex < targetLines.length) {
      const sourceLine = sourceLines[sourceIndex];
      const targetLine = targetLines[targetIndex];

      const sourceMatch = matches.sourceToTarget.get(sourceIndex);
      const targetMatch = matches.targetToSource.get(targetIndex);

      if (
        sourceMatch !== undefined &&
        targetMatch !== undefined &&
        sourceMatch === targetIndex &&
        targetMatch === sourceIndex
      ) {
        result.push({ type: 'context', line: sourceLine });
        sourceIndex++;
        targetIndex++;
      } else if (sourceMatch === undefined) {
        result.push({ type: 'added', line: sourceLine });
        sourceIndex++;
      } else if (targetMatch === undefined || (sourceMatch !== undefined && sourceMatch > targetIndex)) {
        result.push({ type: 'removed', line: targetLine });
        targetIndex++;
      } else {
        result.push({ type: 'added', line: sourceLine });
        sourceIndex++;
      }
    }

    return result;
  }

  /**
   * Find line matches between target and source using LCS approach.
   * 
   * @param targetLines - Target lines
   * @param sourceLines - Source lines
   * @returns Line matches mapping
   */
  private findLineMatches(
    targetLines: string[],
    sourceLines: string[]
  ): {
    sourceToTarget: Map<number, number>;
    targetToSource: Map<number, number>;
  } {
    const sourceToTarget = new Map<number, number>();
    const targetToSource = new Map<number, number>();

    for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex++) {
      const sourceLine = sourceLines[sourceIndex];

      for (let targetIndex = 0; targetIndex < targetLines.length; targetIndex++) {
        if (targetLines[targetIndex] === sourceLine && !targetToSource.has(targetIndex)) {
          sourceToTarget.set(sourceIndex, targetIndex);
          targetToSource.set(targetIndex, sourceIndex);
          break;
        }
      }
    }

    return { sourceToTarget, targetToSource };
  }
}
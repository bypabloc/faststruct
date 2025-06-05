import { Logger } from '../logger';

export interface MoveDetectionResult {
  processedDiff: string;
  movedLinesCount: number;
  modifiedMovedCount: number;
}

export interface DiffStatisticsWithMoves {
  additions: number;
  deletions: number;
  movedLines: number;
  modifiedMovedLines: number;
}

/**
 * Service for detecting moved and modified lines in diffs.
 * Handles advanced move detection and diff enhancement following SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class MoveDetectionService {
  private static instance: MoveDetectionService;

  public static getInstance(): MoveDetectionService {
    if (!this.instance) {
      this.instance = new MoveDetectionService();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  /**
   * Analyze diff statistics excluding moved lines.
   * 
   * @param diffContent - Raw git diff content
   * @returns Object with additions, deletions, and move counts
   */
  public analyzeDiffStatisticsWithMoveDetection(diffContent: string): DiffStatisticsWithMoves {
    const lines = diffContent.split('\n');
    const removedLines = new Map<string, number>();
    const addedLines = new Map<string, number>();
    let inDiffSection = false;

    // First pass: collect all removed and added lines with counts
    for (const line of lines) {
      if (line.startsWith('@@')) {
        inDiffSection = true;
        continue;
      }

      if (inDiffSection) {
        if (line.startsWith('-') && !line.startsWith('---')) {
          const content = line.substring(1).trim();
          if (content) {
            removedLines.set(content, (removedLines.get(content) || 0) + 1);
          }
        } else if (line.startsWith('+') && !line.startsWith('+++')) {
          const content = line.substring(1).trim();
          if (content) {
            addedLines.set(content, (addedLines.get(content) || 0) + 1);
          }
        }
      }
    }

    // Calculate moved lines and real additions/deletions
    let movedLines = 0;
    let realAdditions = 0;
    let realDeletions = 0;

    // Process removed lines
    for (const [content, count] of removedLines) {
      const addedCount = addedLines.get(content) || 0;
      const moved = Math.min(count, addedCount);
      movedLines += moved;
      realDeletions += count - moved;
    }

    // Process added lines
    for (const [content, count] of addedLines) {
      const removedCount = removedLines.get(content) || 0;
      const moved = Math.min(count, removedCount);
      realAdditions += count - moved;
    }

    Logger.debug(
      `[analyzeDiffStatisticsWithMoveDetection] Real: +${realAdditions}, -${realDeletions}, moved: ${movedLines}`
    );

    // Get additional move detection information
    const detectResult = this.detectMovedLines(diffContent);

    return {
      additions: realAdditions,
      deletions: realDeletions,
      movedLines,
      modifiedMovedLines: detectResult.modifiedMovedCount,
    };
  }

  /**
   * Enhanced diff processing with advanced move detection.
   * 
   * @param diffContent - Raw git diff content
   * @returns Enhanced diff with move indicators
   */
  public enhanceDiffWithMoveDetection(diffContent: string): string {
    const { processedDiff } = this.detectMovedLines(diffContent);
    return processedDiff;
  }

  /**
   * Detect lines that were moved or modified in a diff.
   * 
   * @param diffContent - Raw git diff content
   * @returns Move detection result with processed diff
   */
  public detectMovedLines(diffContent: string): MoveDetectionResult {
    const lines = diffContent.split('\n');
    const removedLines = new Map<string, { indices: number[]; fullLine: string }>();
    const addedLines = new Map<string, { indices: number[]; fullLine: string }>();
    const movedLines = new Map<string, { removed: number[]; added: number[] }>();
    const modifiedMovedLines = new Map<string, boolean>();

    // Check if this is a new file (no removed lines at all)
    const hasRemovedLines = lines.some(line => line.startsWith('-') && !line.startsWith('---'));
    const hasAddedLines = lines.some(line => line.startsWith('+') && !line.startsWith('+++'));

    // If it's a new file (only additions), don't detect moved lines
    if (!hasRemovedLines && hasAddedLines) {
      const processedLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('@@')) {
          continue; // Skip hunk headers
        }
        processedLines.push(line);
      }

      return {
        processedDiff: processedLines.join('\n'),
        movedLinesCount: 0,
        modifiedMovedCount: 0,
      };
    }

    // First pass: collect all removed and added lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('-') && !line.startsWith('---')) {
        const fullContent = line.substring(1);
        const trimmedContent = fullContent.trim();

        if (trimmedContent) {
          if (!removedLines.has(trimmedContent)) {
            removedLines.set(trimmedContent, { indices: [], fullLine: fullContent });
          }
          removedLines.get(trimmedContent)!.indices.push(i);
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        const fullContent = line.substring(1);
        const trimmedContent = fullContent.trim();

        if (trimmedContent) {
          if (!addedLines.has(trimmedContent)) {
            addedLines.set(trimmedContent, { indices: [], fullLine: fullContent });
          }
          addedLines.get(trimmedContent)!.indices.push(i);
        }
      }
    }

    // Identify moved lines (exist in both removed and added)
    for (const [content, removedInfo] of removedLines) {
      if (addedLines.has(content)) {
        const addedInfo = addedLines.get(content)!;
        movedLines.set(content, {
          removed: removedInfo.indices,
          added: addedInfo.indices,
        });
      }
    }

    // Check for modified and moved lines
    for (const [removedContent, removedInfo] of removedLines) {
      if (!movedLines.has(removedContent)) {
        for (const [addedContent, addedInfo] of addedLines) {
          if (!movedLines.has(addedContent) && this.areLinesRelated(removedContent, addedContent)) {
            modifiedMovedLines.set(removedContent, true);
            modifiedMovedLines.set(addedContent, true);
          }
        }
      }
    }

    // Second pass: process the diff with moved line markers
    const processedLines: string[] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('-') && !line.startsWith('---')) {
        const trimmedContent = line.substring(1).trim();

        if (trimmedContent && movedLines.has(trimmedContent) && !processedIndices.has(i)) {
          // Mark as moved line with ○ symbol
          processedLines.push('○' + line.substring(1));
          processedIndices.add(i);

          // Mark corresponding added lines as processed
          const moveInfo = movedLines.get(trimmedContent)!;
          for (const addIdx of moveInfo.added) {
            processedIndices.add(addIdx);
          }
        } else if (!processedIndices.has(i)) {
          processedLines.push(line);
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        // Skip lines that were marked as moved
        if (!processedIndices.has(i)) {
          processedLines.push(line);
        }
      } else if (line.startsWith('@@')) {
        // Skip hunk headers to avoid clutter in output
        continue;
      } else if (line.startsWith(' ')) {
        // Context lines (unchanged) - preserve exactly as they are
        processedLines.push(line);
      } else {
        // Other lines (file headers, etc)
        processedLines.push(line);
      }
    }

    return {
      processedDiff: processedLines.join('\n'),
      movedLinesCount: movedLines.size,
      modifiedMovedCount: modifiedMovedLines.size / 2, // Divided by 2 because we count both removed and added
    };
  }

  /**
   * Check if two lines are related (similar content with modifications).
   * 
   * @param line1 - First line content
   * @param line2 - Second line content
   * @returns True if lines are related
   */
  public areLinesRelated(line1: string, line2: string): boolean {
    const minLength = Math.min(line1.length, line2.length);
    const threshold = 0.6; // 60% similarity

    if (minLength < 10) return false; // Too short to determine

    // Check for common prefixes or key parts
    const commonPrefix = this.getCommonPrefixLength(line1, line2);
    const commonSuffix = this.getCommonSuffixLength(line1, line2);

    const similarity = (commonPrefix + commonSuffix) / minLength;
    return similarity >= threshold;
  }

  /**
   * Get the length of common prefix between two strings.
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Length of common prefix
   */
  private getCommonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  /**
   * Get the length of common suffix between two strings.
   * 
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Length of common suffix
   */
  private getCommonSuffixLength(str1: string, str2: string): number {
    let i = 0;
    while (
      i < str1.length &&
      i < str2.length &&
      str1[str1.length - 1 - i] === str2[str2.length - 1 - i]
    ) {
      i++;
    }
    return i;
  }

  /**
   * Check if a file is likely reorganized based on filename and stats.
   * 
   * @param filePath - Path to the file
   * @param additions - Number of additions
   * @param deletions - Number of deletions
   * @returns True if file likely has reorganization
   */
  public isLikelyReorganization(filePath: string, additions: number, deletions: number): boolean {
    const fileName = filePath.split('/').pop() || '';

    // Files that commonly have reorganization
    const reorganizationProneFiles = [
      'package.json',
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'composer.json',
      'requirements.txt',
      'Gemfile',
      'go.mod',
      'Cargo.toml',
    ];

    // Configuration files that might be reorganized
    const configFiles = [
      '.eslintrc',
      'eslint.config.',
      'prettier.config.',
      'tsconfig.json',
      'webpack.config.',
      'vite.config.',
      'rollup.config.',
    ];

    // Check if it's a known reorganization-prone file
    if (reorganizationProneFiles.includes(fileName)) {
      return true;
    }

    // Check if it's a config file
    if (configFiles.some((pattern) => fileName.includes(pattern))) {
      return true;
    }

    // If additions and deletions are relatively equal and small, it might be reorganization
    if (additions === deletions && additions <= 10) {
      return true;
    }

    // If the ratio is close to 1:1 but numbers are small, likely reorganization
    if (additions > 0 && deletions > 0) {
      const ratio = Math.min(additions, deletions) / Math.max(additions, deletions);
      if (ratio > 0.7 && Math.max(additions, deletions) <= 20) {
        return true;
      }
    }

    return false;
  }
}
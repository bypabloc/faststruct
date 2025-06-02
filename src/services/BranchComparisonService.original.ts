import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '@/logger';
import { StructureGeneratorService } from '@/services/StructureGeneratorService';
import { ConfigurationService } from '@/services/ConfigurationService';
import { PatternMatcher } from '@/utils/patternMatcher';
import * as path from 'path';

const execAsync = promisify(exec);

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions: number;
  deletions: number;
  oldPath?: string; // For renamed files
  similarity?: number; // Rename similarity percentage
}

export interface BranchComparison {
  sourceBranch: string;
  targetBranch: string;
  filesChanged: FileChange[];
  summary: {
    totalFiles: number;
    additions: number;
    deletions: number;
    filesAdded: number;
    filesModified: number;
    filesDeleted: number;
  };
  diffContent: string;
}

export interface ComparisonOptions {
  showDiff?: boolean;
  maxFilesAnalyzed?: number;
  maxLinesPerFile?: number;
  debugMode?: boolean;
}

interface TreeNodeWithChanges {
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

export class BranchComparisonService {
  private static instance: BranchComparisonService;
  private structureGenerator: StructureGeneratorService;
  private configService: ConfigurationService;
  private patternMatcher: PatternMatcher;

  public static getInstance(): BranchComparisonService {
    if (!this.instance) {
      this.instance = new BranchComparisonService();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor enforces singleton pattern
    this.structureGenerator = StructureGeneratorService.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.patternMatcher = PatternMatcher.getInstance();
  }

  /**
   * Get list of available git branches in the current workspace.
   *
   * @returns Array of branch information
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async getAvailableBranches(): Promise<BranchInfo[]> {
    try {
      Logger.functionStart("getAvailableBranches");

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage("No workspace folder open");
        return [];
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const { stdout } = await execAsync("git branch", {
        cwd: workspaceRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const branches = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => ({
          name: line.replace(/^\*?\s+/, ""),
          isCurrent: line.startsWith("*"),
        }));

      Logger.functionEnd("getAvailableBranches", branches);
      return branches;
    } catch (error) {
      Logger.error("Error getting git branches", error);
      vscode.window.showErrorMessage(
        "Failed to get git branches. Make sure you are in a git repository."
      );
      return [];
    }
  }

  /**
   * Compare two git branches and return the differences.
   *
   * @param sourceBranch - The branch to compare from
   * @param targetBranch - The branch to compare to
   * @returns Branch comparison data or null if failed
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async compareBranches(
    sourceBranch: string,
    targetBranch: string
  ): Promise<BranchComparison | null> {
    try {
      Logger.functionStart("compareBranches", { sourceBranch, targetBranch });

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage("No workspace folder open");
        return null;
      }

      if (sourceBranch === targetBranch) {
        vscode.window.showWarningMessage("Cannot compare a branch with itself");
        return null;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Validate source branch exists
      try {
        await execAsync(`git rev-parse --verify ${sourceBranch}`, {
          cwd: workspaceRoot,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Branch '${sourceBranch}' does not exist`
        );
        Logger.error(`Branch '${sourceBranch}' does not exist`, error);
        return null;
      }

      // Validate target branch exists
      try {
        await execAsync(`git rev-parse --verify ${targetBranch}`, {
          cwd: workspaceRoot,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Branch '${targetBranch}' does not exist`
        );
        Logger.error(`Branch '${targetBranch}' does not exist`, error);
        return null;
      }

      // Get file changes with rename detection
      const { stdout: nameStatus } = await execAsync(
        `git diff --find-renames --name-status ${targetBranch}...${sourceBranch}`,
        {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50, // 50MB buffer
        }
      );

      // Get full diff
      const { stdout: diffContent } = await execAsync(
        `git diff ${targetBranch}...${sourceBranch}`,
        {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 100, // 100MB buffer for large diffs
        }
      );

      // Parse file changes using only name-status and extract stats from the complete diff
      const allFilesChanged = await this.parseFileChangesFromCompleteDiff(
        nameStatus,
        diffContent,
        targetBranch,
        sourceBranch,
        workspaceRoot
      );

      // Get current configuration and apply exclusions
      const config = await this.configService.getConfiguration();
      const filesChanged = [];

      for (const fileChange of allFilesChanged) {
        const fullPath = path.join(workspaceRoot, fileChange.path);
        const fileName = path.basename(fileChange.path);

        // Check if file should be excluded
        const shouldExclude = this.patternMatcher.shouldExclude(
          fullPath,
          fileName,
          "file",
          config,
          workspaceRoot
        );

        if (!shouldExclude) {
          filesChanged.push(fileChange);
        }
      }

      // Calculate summary from filtered files
      const summary = this.calculateSummaryFromFiles(filesChanged);

      const result: BranchComparison = {
        sourceBranch,
        targetBranch,
        filesChanged,
        summary,
        diffContent,
      };

      Logger.functionEnd("compareBranches", result);
      return result;
    } catch (error) {
      Logger.error("Error comparing branches", error);
      vscode.window.showErrorMessage(
        "Failed to compare branches. Make sure both branches exist."
      );
      return null;
    }
  }

  /**
   * Generate formatted output for branch comparison.
   *
   * @param comparison - The branch comparison data
   * @param options - Options for output generation
   * @returns Formatted markdown string
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async generateComparisonOutput(
    comparison: BranchComparison,
    options: ComparisonOptions = {}
  ): Promise<string> {
    try {
      Logger.functionStart("generateComparisonOutput", { comparison, options });

      if (!vscode.workspace.workspaceFolders) {
        return "No workspace folder open";
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Get current configuration for exclusion patterns
      const config = await this.configService.getConfiguration();

      let output = "# Estructura de archivos - Comparación entre ramas\n\n";
      output += `**Rama base:** ${comparison.targetBranch}\n`;
      output += `**Rama con cambios:** ${comparison.sourceBranch}\n\n`;

      // Add exclusion patterns
      output += this.formatExclusionPatterns(config);

      // Add symbol legend
      output += "## Leyenda de símbolos:\n";
      output += "- **+** Línea agregada o nueva\n";
      output += "- **-** Línea eliminada\n";
      output += "- **○** Línea movida (reubicada sin modificación)\n";
      output += "- **●** Línea modificada y movida\n";
      output += "- **(espacio)** Línea sin cambios (contexto)\n\n";

      if (comparison.filesChanged.length === 0) {
        output += "## Resultado:\n";
        output += "No se encontraron cambios entre las ramas seleccionadas.\n";
        Logger.functionEnd("generateComparisonOutput", output);
        return output;
      }

      // Summary section with real statistics (already calculated from diff)
      output += "## Resumen\n\n";
      output += `- **Total archivos modificados:** ${comparison.summary.totalFiles}\n`;
      output += `- **Líneas agregadas:** ${comparison.summary.additions}\n`;
      output += `- **Líneas eliminadas:** ${comparison.summary.deletions}\n`;
      output += `- **Archivos nuevos:** ${comparison.summary.filesAdded}\n`;
      output += `- **Archivos modificados:** ${comparison.summary.filesModified}\n`;
      output += `- **Archivos eliminados:** ${comparison.summary.filesDeleted}\n\n`;

      // Generate tree structure with file changes
      const treeWithChanges = await this.buildFileTreeWithChanges(
        comparison.filesChanged,
        comparison,
        workspaceRoot,
        comparison.targetBranch,
        comparison.sourceBranch
      );

      output += "## Estructura de archivos:\n```\n";
      output += this.formatTreeStructureWithChanges(treeWithChanges);
      output += "\n```\n\n";

      // Add commit history
      output += await this.generateCommitHistory(
        comparison.sourceBranch,
        comparison.targetBranch,
        workspaceRoot
      );

      // Add detailed file analysis
      output += await this.generateDetailedFileAnalysis(
        comparison.filesChanged,
        comparison.sourceBranch,
        comparison.targetBranch,
        workspaceRoot,
        options,
        comparison
      );

      // Add full diff if showDiff option is enabled
      if (options.showDiff && comparison.diffContent) {
        output += "## Diferencias completas\n\n";
        output += "```diff\n";
        // Apply move detection to complete diff
        const enhancedDiff = this.enhanceDiffWithMoveDetection(
          comparison.diffContent
        );
        output += enhancedDiff;
        output += "\n```\n\n";
      }

      Logger.functionEnd("generateComparisonOutput", output);
      return output;
    } catch (error) {
      Logger.error("Error generating comparison output", error);
      throw error;
    }
  }

  /**
   * Interactive branch selection for comparison.
   *
   * @returns Selected branches or null if cancelled
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async selectBranchesForComparison(): Promise<{
    sourceBranch: string;
    targetBranch: string;
  } | null> {
    try {
      Logger.functionStart("selectBranchesForComparison");

      const branches = await this.getAvailableBranches();

      if (branches.length < 2) {
        vscode.window.showWarningMessage("Need at least 2 branches to compare");
        return null;
      }

      // Select source branch
      const sourceBranchItem = await vscode.window.showQuickPick(
        branches.map((b) => ({
          label: b.name,
          description: b.isCurrent ? "(current)" : "",
        })),
        {
          placeHolder: "Select source branch",
          title: "Branch Comparison - Step 1/2",
        }
      );

      if (!sourceBranchItem) {
        return null;
      }

      // Select target branch
      const targetBranchItem = await vscode.window.showQuickPick(
        branches
          .filter((b) => b.name !== sourceBranchItem.label)
          .map((b) => ({
            label: b.name,
            description: b.isCurrent ? "(current)" : "",
          })),
        {
          placeHolder: "Select target branch",
          title: "Branch Comparison - Step 2/2",
        }
      );

      if (!targetBranchItem) {
        return null;
      }

      const result = {
        sourceBranch: sourceBranchItem.label,
        targetBranch: targetBranchItem.label,
      };

      Logger.functionEnd("selectBranchesForComparison", result);
      return result;
    } catch (error) {
      Logger.error("Error in branch selection", error);
      return null;
    }
  }

  /**
   * Parse file changes from complete diff content and extract accurate statistics per file.
   *
   * @param nameStatus - Git diff --name-status output
   * @param diffContent - Complete git diff output
   * @param targetBranch - Target branch name
   * @param sourceBranch - Source branch name
   * @param workspaceRoot - Workspace root path
   * @returns Array of file changes with accurate statistics
   * @author Pablo Contreras
   * @created 2025/06/01
   */
  private async parseFileChangesFromCompleteDiff(
    nameStatus: string,
    diffContent: string,
    targetBranch: string,
    sourceBranch: string,
    workspaceRoot: string
  ): Promise<FileChange[]> {
    const fileChanges: FileChange[] = [];
    const statusMap: Record<
      string,
      "added" | "modified" | "deleted" | "renamed"
    > = {
      A: "added",
      M: "modified",
      D: "deleted",
    };

    // Parse name-status output to get file list and basic info
    const nameStatusLines = nameStatus
      .split("\n")
      .filter((line) => line.trim());

    // Extract statistics from complete diff content
    const fileStatsMap = this.extractFileStatsFromCompleteDiff(diffContent);

    Logger.debug(
      `[parseFileChangesFromCompleteDiff] Found stats for ${
        Object.keys(fileStatsMap).length
      } files in complete diff`
    );

    for (const line of nameStatusLines) {
      const parts = line.split("\t");
      const status = parts[0];
      let filePath: string;
      let oldPath: string | undefined;
      let similarity: number | undefined;
      let fileStatus: "added" | "modified" | "deleted" | "renamed";

      if (status.startsWith("R")) {
        // Renamed file: R100    old/path    new/path
        const renameMatch = status.match(/R(\d+)/);
        similarity = renameMatch ? parseInt(renameMatch[1], 10) : undefined;
        oldPath = parts[1];
        filePath = parts[2];
        fileStatus = "renamed";
      } else if (status.startsWith("C")) {
        // Copied file: treat as added for simplicity
        filePath = parts[2];
        fileStatus = "added";
      } else if (statusMap[status]) {
        // Regular status
        filePath = parts.slice(1).join("\t");
        fileStatus = statusMap[status];
      } else {
        continue; // Skip unknown status
      }

      if (!filePath) continue;

      // Get statistics from the complete diff
      const stats = fileStatsMap[filePath] || { additions: 0, deletions: 0 };
      let additions = stats.additions;
      let deletions = stats.deletions;

      // Apply fallbacks for special cases
      if (additions === 0 && deletions === 0) {
        if (fileStatus === "added") {
          // For new files, try to count lines from source branch
          try {
            const { stdout: fileContent } = await execAsync(
              `git show ${sourceBranch}:"${filePath}" | wc -l`,
              { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 50 }
            );
            additions = parseInt(fileContent.trim(), 10) || 0;
          } catch {
            additions = 1; // Minimum fallback
          }
        } else if (fileStatus === "deleted") {
          // For deleted files, try to count lines from target branch
          try {
            const { stdout: fileContent } = await execAsync(
              `git show ${targetBranch}:"${filePath}" | wc -l`,
              { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 50 }
            );
            deletions = parseInt(fileContent.trim(), 10) || 0;
          } catch {
            deletions = 1; // Minimum fallback
          }
        } else if (fileStatus === "modified") {
          // For modified files, force minimum 1 change if stats are 0,0
          Logger.warn(
            `[CRITICAL] Modified file ${filePath} has 0,0 stats - forcing minimum`
          );
          additions = 1;
        }
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
  private extractFileStatsFromCompleteDiff(
    diffContent: string
  ): Record<string, { additions: number; deletions: number }> {
    const fileStats: Record<string, { additions: number; deletions: number }> =
      {};
    const lines = diffContent.split("\n");
    let currentFile = "";
    let additions = 0;
    let deletions = 0;
    let inHunk = false;

    for (const line of lines) {
      // Detect new file diff
      if (line.startsWith("diff --git")) {
        // Save previous file stats
        if (currentFile) {
          fileStats[currentFile] = { additions, deletions };
        }

        // Extract file path from diff --git a/path b/path
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          currentFile = match[2]; // Use the "new" file path
          additions = 0;
          deletions = 0;
          inHunk = false;
          Logger.debug(
            `[extractFileStatsFromCompleteDiff] Processing file: ${currentFile}`
          );
        }
      }
      // Detect hunk start
      else if (line.startsWith("@@")) {
        inHunk = true;
      }
      // Count additions and deletions in hunks
      else if (inHunk) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          additions++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          deletions++;
        }
      }
    }

    // Save last file stats
    if (currentFile) {
      fileStats[currentFile] = { additions, deletions };
    }

    Logger.debug(
      `[extractFileStatsFromCompleteDiff] Extracted stats for ${
        Object.keys(fileStats).length
      } files`
    );
    Object.entries(fileStats).forEach(([file, stats]) => {
      Logger.debug(
        `[extractFileStatsFromCompleteDiff] ${file}: +${stats.additions}, -${stats.deletions}`
      );
    });

    return fileStats;
  }

  /**
   * Parse file changes from git diff output using real diff analysis.
   *
   * @param nameStatus - Git diff --name-status output
   * @param targetBranch - Target branch name
   * @param sourceBranch - Source branch name
   * @param workspaceRoot - Workspace root path
   * @returns Array of file changes with real statistics
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async parseFileChangesFromDiff(
    nameStatus: string,
    targetBranch: string,
    sourceBranch: string,
    workspaceRoot: string
  ): Promise<FileChange[]> {
    const fileChanges: FileChange[] = [];
    const statusMap: Record<
      string,
      "added" | "modified" | "deleted" | "renamed"
    > = {
      A: "added",
      M: "modified",
      D: "deleted",
    };

    // Parse name-status output
    const nameStatusLines = nameStatus
      .split("\n")
      .filter((line) => line.trim());

    for (const line of nameStatusLines) {
      const parts = line.split("\t");
      const status = parts[0];
      let filePath: string;
      let oldPath: string | undefined;
      let similarity: number | undefined;
      let fileStatus: "added" | "modified" | "deleted" | "renamed";

      if (status.startsWith("R")) {
        // Renamed file: R100    old/path    new/path
        similarity = parseInt(status.substring(1), 10);
        oldPath = parts[1];
        filePath = parts[2];
        fileStatus = "renamed";
      } else if (status.startsWith("C")) {
        // Copied file: treat as added for simplicity
        filePath = parts[2];
        fileStatus = "added";
      } else if (statusMap[status]) {
        // Regular status
        filePath = parts.slice(1).join("\t");
        fileStatus = statusMap[status];
      } else {
        continue; // Skip unknown status
      }

      if (!filePath) continue;

      // Get real diff statistics for this file using diff content analysis
      let additions = 0;
      let deletions = 0;

      try {
        // Always use diff content analysis instead of numstat for more reliable results
        Logger.debug(
          `[DIFF ATTEMPT] Trying to get diff for ${filePath} (${fileStatus})`
        );
        const diffCommand = `git diff ${targetBranch}...${sourceBranch} -- "${filePath}"`;
        Logger.debug(`[DIFF COMMAND] ${diffCommand}`);

        const { stdout: fileDiff } = await execAsync(diffCommand, {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50,
        });

        if (fileDiff.trim()) {
          Logger.debug(
            `[DIFF DEBUG] File: ${filePath}, diff length: ${fileDiff.length}`
          );
          Logger.debug(
            `[DIFF DEBUG] First 500 chars: ${fileDiff.substring(0, 500)}`
          );

          const diffStats = this.analyzeDiffStatistics(fileDiff);
          additions = diffStats.additions;
          deletions = diffStats.deletions;

          Logger.debug(
            `[DIFF DEBUG] Analyzed stats for ${filePath}: +${additions}, -${deletions}`
          );

          // If we still get 0,0 for a file that should have changes, force a minimum
          if (fileStatus === "modified" && additions === 0 && deletions === 0) {
            Logger.warn(
              `[CRITICAL] Modified file ${filePath} analyzed to 0,0 - forcing minimum stats`
            );
            Logger.debug(`[CRITICAL] Full diff content: ${fileDiff}`);
            // For modified files, assume at least 1 change if git says it's modified
            additions = 1;
          }
        } else {
          Logger.warn(
            `[DIFF EMPTY] File ${filePath} (${fileStatus}) returned empty diff - length: ${fileDiff.length}`
          );
          // Handle special cases where diff might be empty
          if (fileStatus === "added") {
            // For new files, count lines from source branch
            try {
              const { stdout: fileContent } = await execAsync(
                `git show ${sourceBranch}:"${filePath}" | wc -l`,
                {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                }
              );
              additions = parseInt(fileContent.trim(), 10) || 0;
              deletions = 0;
            } catch {
              additions = 0;
            }
          } else if (fileStatus === "deleted") {
            // For deleted files, count lines from target branch
            try {
              const { stdout: fileContent } = await execAsync(
                `git show ${targetBranch}:"${filePath}" | wc -l`,
                {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                }
              );
              deletions = parseInt(fileContent.trim(), 10) || 0;
              additions = 0;
            } catch {
              deletions = 0;
            }
          } else if (fileStatus === "renamed") {
            // For renamed files without content changes
            additions = 0;
            deletions = 0;
          }
        }
      } catch (error) {
        Logger.warn(`Failed to get diff for ${filePath}`, error);
        // Fallback: try to get basic stats for special file types
        if (fileStatus === "added") {
          try {
            const { stdout: fileContent } = await execAsync(
              `git show ${sourceBranch}:"${filePath}" | wc -l`,
              { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 50 }
            );
            additions = parseInt(fileContent.trim(), 10) || 0;
          } catch {
            /* ignore */
          }
        } else if (fileStatus === "deleted") {
          try {
            const { stdout: fileContent } = await execAsync(
              `git show ${targetBranch}:"${filePath}" | wc -l`,
              { cwd: workspaceRoot, maxBuffer: 1024 * 1024 * 50 }
            );
            deletions = parseInt(fileContent.trim(), 10) || 0;
          } catch {
            /* ignore */
          }
        }
      }

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
   * Parse file changes from git diff output (legacy function, kept for compatibility).
   *
   * @param nameStatus - Git diff --name-status output
   * @param stat - Git diff --stat output
   * @returns Array of file changes
   */
  private parseFileChanges(nameStatus: string, stat: string): FileChange[] {
    const fileChanges: FileChange[] = [];
    const statusMap: Record<
      string,
      "added" | "modified" | "deleted" | "renamed"
    > = {
      A: "added",
      M: "modified",
      D: "deleted",
    };

    // Parse name-status output
    const nameStatusLines = nameStatus
      .split("\n")
      .filter((line) => line.trim());
    const fileStatusMap = new Map<
      string,
      {
        status: "added" | "modified" | "deleted" | "renamed";
        oldPath?: string;
        similarity?: number;
      }
    >();

    nameStatusLines.forEach((line) => {
      const parts = line.split("\t");
      const status = parts[0];

      if (status.startsWith("R")) {
        // Renamed file: R100    old/path    new/path
        const similarity = parseInt(status.substring(1), 10);
        const oldPath = parts[1];
        const newPath = parts[2];
        if (oldPath && newPath) {
          fileStatusMap.set(newPath, {
            status: "renamed",
            oldPath,
            similarity,
          });
        }
      } else if (status.startsWith("C")) {
        // Copied file: treat as added for simplicity
        const newPath = parts[2];
        if (newPath) {
          fileStatusMap.set(newPath, { status: "added" });
        }
      } else if (statusMap[status]) {
        // Regular status
        const path = parts.slice(1).join("\t");
        if (path) {
          fileStatusMap.set(path, { status: statusMap[status] });
        }
      }
    });

    // Parse stat output to get additions/deletions
    const statLines = stat
      .split("\n")
      .filter((line) => line.trim() && !line.includes("files changed"));

    statLines.forEach((line) => {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]+)/);
      if (match) {
        const [, path, , changes] = match;
        const additions = (changes.match(/\+/g) || []).length;
        const deletions = (changes.match(/-/g) || []).length;
        const fileInfo = fileStatusMap.get(path.trim()) || {
          status: "modified",
        };

        fileChanges.push({
          path: path.trim(),
          status: fileInfo.status,
          additions,
          deletions,
          oldPath: fileInfo.oldPath,
          similarity: fileInfo.similarity,
        });
      }
    });

    // Add files from fileStatusMap that weren't in stat (like pure renames with no content changes)
    fileStatusMap.forEach((fileInfo, path) => {
      if (!fileChanges.find((fc) => fc.path === path)) {
        fileChanges.push({
          path,
          status: fileInfo.status,
          additions: 0,
          deletions: 0,
          oldPath: fileInfo.oldPath,
          similarity: fileInfo.similarity,
        });
      }
    });

    return fileChanges;
  }

  /**
   * Calculate summary statistics from file changes.
   *
   * @param filesChanged - Array of file changes
   * @param stat - Git diff --stat output
   * @returns Summary statistics
   */
  private calculateSummary(
    filesChanged: FileChange[],
    stat: string
  ): BranchComparison["summary"] {
    const summary = {
      totalFiles: filesChanged.length,
      additions: 0,
      deletions: 0,
      filesAdded: filesChanged.filter((f) => f.status === "added").length,
      filesModified: filesChanged.filter((f) => f.status === "modified").length,
      filesDeleted: filesChanged.filter((f) => f.status === "deleted").length,
    };

    // Extract total additions/deletions from stat output
    const summaryMatch = stat.match(
      /(\d+) insertions?\(\+\).*?(\d+) deletions?\(-\)/
    );
    if (summaryMatch) {
      summary.additions = parseInt(summaryMatch[1], 10);
      summary.deletions = parseInt(summaryMatch[2], 10);
    } else {
      // Fallback: calculate from individual files
      filesChanged.forEach((file) => {
        summary.additions += file.additions;
        summary.deletions += file.deletions;
      });
    }

    return summary;
  }

  /**
   * Calculate summary statistics from filtered file changes.
   *
   * @param filesChanged - Array of filtered file changes
   * @returns Summary statistics
   */
  private calculateSummaryFromFiles(
    filesChanged: FileChange[]
  ): BranchComparison["summary"] {
    const summary = {
      totalFiles: filesChanged.length,
      additions: 0,
      deletions: 0,
      filesAdded: filesChanged.filter((f) => f.status === "added").length,
      filesModified: filesChanged.filter(
        (f) => f.status === "modified" || f.status === "renamed"
      ).length,
      filesDeleted: filesChanged.filter((f) => f.status === "deleted").length,
    };

    // Calculate from individual files
    filesChanged.forEach((file) => {
      summary.additions += file.additions;
      summary.deletions += file.deletions;
    });

    return summary;
  }

  /**
   * Generate file structure comparison between two branches.
   *
   * @param sourceBranch - The branch to compare from
   * @param targetBranch - The branch to compare to (base)
   * @returns Structure comparison output or null if failed
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public async generateStructureComparison(
    sourceBranch: string,
    targetBranch: string
  ): Promise<string | null> {
    try {
      Logger.functionStart("generateStructureComparison", {
        sourceBranch,
        targetBranch,
      });

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage("No workspace folder open");
        return null;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Validate source branch exists
      try {
        await execAsync(`git rev-parse --verify ${sourceBranch}`, {
          cwd: workspaceRoot,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Branch '${sourceBranch}' does not exist`
        );
        Logger.error(`Branch '${sourceBranch}' does not exist`, error);
        return null;
      }

      // Validate target branch exists
      try {
        await execAsync(`git rev-parse --verify ${targetBranch}`, {
          cwd: workspaceRoot,
        });
      } catch (error) {
        vscode.window.showErrorMessage(
          `Branch '${targetBranch}' does not exist`
        );
        Logger.error(`Branch '${targetBranch}' does not exist`, error);
        return null;
      }

      // Get files changed between branches
      const { stdout: changedFiles } = await execAsync(
        `git diff --name-only ${targetBranch}...${sourceBranch}`,
        {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50, // 50MB buffer
        }
      );

      if (!changedFiles.trim()) {
        return this.formatNoChangesOutput(sourceBranch, targetBranch);
      }

      // Get current configuration
      const config = await this.configService.getConfiguration();

      // Filter files based on exclusion patterns
      const allFiles = changedFiles.split("\n").filter((f) => f.trim());
      const fileList = [];

      for (const filePath of allFiles) {
        const fullPath = path.join(workspaceRoot, filePath);
        const fileName = path.basename(filePath);

        // Check if file should be excluded
        const shouldExclude = this.patternMatcher.shouldExclude(
          fullPath,
          fileName,
          "file", // Assume files for git diff
          config,
          workspaceRoot
        );

        if (!shouldExclude) {
          fileList.push(filePath);
        }
      }

      if (fileList.length === 0) {
        return this.formatNoChangesWithExclusionsOutput(
          sourceBranch,
          targetBranch,
          config
        );
      }

      // Build file tree from filtered files
      const tree = this.buildFileTree(fileList);

      // Format output
      let output = "# Estructura de archivos - Comparación entre ramas\n\n";
      output += `**Rama base:** ${targetBranch}\n`;
      output += `**Rama con cambios:** ${sourceBranch}\n\n`;

      // Add exclusion patterns
      output += this.formatExclusionPatterns(config);

      // Add file structure
      output += "## Estructura de archivos:\n```\n";
      output += this.formatTreeStructure(tree);
      output += "\n```\n";

      Logger.functionEnd("generateStructureComparison");
      return output;
    } catch (error) {
      Logger.error("Error generating structure comparison", error);
      vscode.window.showErrorMessage("Failed to generate structure comparison");
      return null;
    }
  }

  /**
   * Build a tree structure from file paths.
   *
   * @param files - Array of file paths
   * @returns Tree structure
   */
  private buildFileTree(files: string[]): any {
    const tree: any = {};

    files.forEach((filePath) => {
      const parts = filePath.split("/");
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
   * @returns Tree structure with change information
   */
  private async buildFileTreeWithChanges(
    filesChanged: FileChange[],
    comparison?: BranchComparison,
    workspaceRoot?: string,
    targetBranch?: string,
    sourceBranch?: string
  ): Promise<Record<string, TreeNodeWithChanges>> {
    const tree: any = {};

    for (const fileChange of filesChanged) {
      const parts = fileChange.path.split("/");
      let current = tree;
      
      // Calculate moved lines for this file if possible
      let movedLines = 0;
      let modifiedMovedLines = 0;
      if (comparison?.diffContent && workspaceRoot && targetBranch && sourceBranch) {
        try {
          const { stdout: fileDiff } = await execAsync(
            `git diff ${targetBranch}..${sourceBranch} -- "${fileChange.path}"`,
            {
              cwd: workspaceRoot,
              maxBuffer: 1024 * 1024 * 50,
            }
          );
          
          if (fileDiff) {
            const stats = this.analyzeDiffStatisticsWithMoveDetection(fileDiff);
            movedLines = stats.movedLines;
            modifiedMovedLines = stats.modifiedMovedLines;
          }
        } catch (error) {
          // Ignore errors
        }
      }

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file, store the change information
          current[part] = {
            type: "file",
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
            current[part] = { type: "directory" };
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
  private formatTreeStructure(tree: any, prefix: string = ""): string {
    const entries = Object.entries(tree);
    let output = "";

    entries.forEach(([name, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const extension = isLast ? "    " : "│   ";

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
  private formatTreeStructureWithChanges(
    tree: Record<string, TreeNodeWithChanges>,
    prefix: string = ""
  ): string {
    const entries = Object.entries(tree);
    let output = "";

    entries.forEach(([name, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? "└── " : "├── ";
      const extension = isLast ? "    " : "│   ";

      if (value && value.type === "file") {
        // File with change information
        const icon = this.getChangeIcon(value.status || "modified");
        let stats = `(+${value.additions || 0}, -${value.deletions || 0}`;
        
        // Add moved lines count if available
        if (value.movedLines && value.movedLines > 0) {
          stats += `, ○${value.movedLines}`;
        }
        if (value.modifiedMovedLines && value.modifiedMovedLines > 0) {
          stats += `, ●${value.modifiedMovedLines}`;
        }
        stats += ")";
        
        let nameWithInfo = name;

        // For renamed files, show both old and new names
        if (value.status === "renamed" && value.oldPath) {
          const oldName = path.basename(value.oldPath);
          nameWithInfo = `${name} ← ${oldName}`;
        }

        output += `${prefix}${connector}${icon} ${nameWithInfo} ${stats}\n`;
      } else if (value && value.type === "directory") {
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
  private getChangeIcon(
    status: "added" | "modified" | "deleted" | "renamed"
  ): string {
    switch (status) {
      case "added":
        return "🆕"; // New file
      case "modified":
        return "📝"; // Modified file
      case "deleted":
        return "🗑️"; // Deleted file
      case "renamed":
        return "📂"; // Moved/renamed file
      default:
        return "📄"; // Default file
    }
  }

  /**
   * Format exclusion patterns for display.
   *
   * @param config - FastStruct configuration
   * @returns Formatted exclusion patterns
   */
  private formatExclusionPatterns(config: any): string {
    let output = "## Patrones de exclusión aplicados:\n";

    const exclusions: string[] = [];

    // Basic exclusions
    if (config.exclude?.folders) {
      exclusions.push(...config.exclude.folders.map((f: string) => `${f}/`));
    }
    if (config.exclude?.files) {
      exclusions.push(...config.exclude.files);
    }

    // Advanced exclusions
    if (config.exclude?.advanced?.patterns) {
      exclusions.push(...config.exclude.advanced.patterns);
    }

    if (exclusions.length === 0) {
      output += "- Ninguno\n";
    } else {
      exclusions.forEach((pattern) => {
        output += `- ${pattern}\n`;
      });
    }

    output += "\n";
    return output;
  }

  /**
   * Format output when no changes are found.
   *
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @returns Formatted message
   */
  private formatNoChangesOutput(
    sourceBranch: string,
    targetBranch: string
  ): string {
    let output = "# Estructura de archivos - Comparación entre ramas\n\n";
    output += `**Rama base:** ${targetBranch}\n`;
    output += `**Rama con cambios:** ${sourceBranch}\n\n`;
    output += "## Resultado:\n";
    output += "No se encontraron cambios entre las ramas seleccionadas.\n";
    return output;
  }

  /**
   * Format output when all changes were excluded by filters.
   *
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param config - FastStruct configuration
   * @returns Formatted message
   */
  private formatNoChangesWithExclusionsOutput(
    sourceBranch: string,
    targetBranch: string,
    config: any
  ): string {
    let output = "# Estructura de archivos - Comparación entre ramas\n\n";
    output += `**Rama base:** ${targetBranch}\n`;
    output += `**Rama con cambios:** ${sourceBranch}\n\n`;

    // Add exclusion patterns
    output += this.formatExclusionPatterns(config);

    output += "## Resultado:\n";
    output +=
      "Todos los archivos modificados fueron excluidos por los patrones de exclusión configurados.\n";
    output +=
      "\n*Nota: Puedes ajustar los patrones de exclusión en la configuración de FastStruct.*\n";
    return output;
  }

  /**
   * Generate commit history section showing commits unique to source branch.
   *
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param workspaceRoot - Workspace root path
   * @returns Formatted commit history section
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async generateCommitHistory(
    sourceBranch: string,
    targetBranch: string,
    workspaceRoot: string
  ): Promise<string> {
    try {
      Logger.functionStart("generateCommitHistory", {
        sourceBranch,
        targetBranch,
      });

      // Get commits that are in sourceBranch but not in targetBranch
      const { stdout: commitLog } = await execAsync(
        `git log ${targetBranch}..${sourceBranch} --oneline --no-merges --max-count=20`,
        {
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        }
      );

      let output = "## HISTORIAL DE COMMITS (nuevos en rama comparar)\n\n";

      if (!commitLog.trim()) {
        output += "No hay commits nuevos en la rama de comparación.\n\n";
        Logger.functionEnd("generateCommitHistory", "No new commits");
        return output;
      }

      const commits = commitLog.trim().split("\n");
      output += `**Total de commits nuevos:** ${commits.length}\n\n`;

      commits.forEach((commit, index) => {
        const [hash, ...messageParts] = commit.split(" ");
        const message = messageParts.join(" ");
        output += `${index + 1}. **${hash}** - ${message}\n`;
      });

      output += "\n";
      Logger.functionEnd(
        "generateCommitHistory",
        `Generated history for ${commits.length} commits`
      );
      return output;
    } catch (error) {
      Logger.error("Error generating commit history", error);
      return "## HISTORIAL DE COMMITS (nuevos en rama comparar)\n\nError al obtener el historial de commits.\n\n";
    }
  }

  /**
   * Generate detailed file analysis with diffs and content.
   *
   * @param filesChanged - Array of file changes
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param workspaceRoot - Workspace root path
   * @param options - Comparison options
   * @param comparison - Branch comparison data for accessing complete diff content
   * @returns Formatted detailed file analysis
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async generateDetailedFileAnalysis(
    filesChanged: FileChange[],
    sourceBranch: string,
    targetBranch: string,
    workspaceRoot: string,
    options?: ComparisonOptions,
    comparison?: BranchComparison
  ): Promise<string> {
    try {
      Logger.functionStart("generateDetailedFileAnalysis", {
        fileCount: filesChanged.length,
        sourceBranch,
        targetBranch,
      });

      let output = "## ANÁLISIS DETALLADO DE ARCHIVOS\n\n";

      if (filesChanged.length === 0) {
        output += "No hay archivos modificados para analizar.\n\n";
        return output;
      }

      // Determine how many files to analyze based on options
      const maxFiles = options?.maxFilesAnalyzed || filesChanged.length;
      const filesToAnalyze = filesChanged.slice(0, maxFiles);

      if (filesChanged.length > maxFiles) {
        output += `*Mostrando los primeros ${maxFiles} archivos de ${filesChanged.length} archivos modificados.*\n`;
        output += `*Para ver todos los archivos, configura \`maxFilesAnalyzed: ${filesChanged.length}\` en las opciones.*\n\n`;
      }

      for (const fileChange of filesToAnalyze) {
        output += await this.generateSingleFileAnalysis(
          fileChange,
          sourceBranch,
          targetBranch,
          workspaceRoot,
          options,
          comparison
        );
        output += "\n---\n\n";
      }

      Logger.functionEnd(
        "generateDetailedFileAnalysis",
        `Analyzed ${filesToAnalyze.length} files`
      );
      return output;
    } catch (error) {
      Logger.error("Error generating detailed file analysis", error);
      return "## ANÁLISIS DETALLADO DE ARCHIVOS\n\nError al generar el análisis detallado.\n\n";
    }
  }

  /**
   * Extract hunk information from diff content.
   *
   * @param diffContent - Git diff content
   * @returns Array of hunk information
   */
  private extractHunkInfo(
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
        oldCount: parseInt(match[2] || "1", 10),
        newStart: parseInt(match[3], 10),
        newCount: parseInt(match[4] || "1", 10),
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
  private extractHunkInfoFromCompleteDiff(
    diffContent: string,
    filePath: string
  ): Array<{
    oldStart: number;
    oldCount: number;
    newStart: number;
    newCount: number;
  }> {
    const lines = diffContent.split("\n");
    const hunks = [];
    let currentFile = "";
    let inTargetFile = false;

    for (const line of lines) {
      // Detect file diff start
      if (line.startsWith("diff --git")) {
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)$/);
        if (match) {
          currentFile = match[2]; // Use the "new" file path
          inTargetFile = currentFile === filePath;
        }
      }
      // Extract hunk headers for target file
      else if (inTargetFile && line.startsWith("@@")) {
        const hunkMatch = line.match(
          /@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/
        );
        if (hunkMatch) {
          hunks.push({
            oldStart: parseInt(hunkMatch[1], 10),
            oldCount: parseInt(hunkMatch[2] || "1", 10),
            newStart: parseInt(hunkMatch[3], 10),
            newCount: parseInt(hunkMatch[4] || "1", 10),
          });
        }
      }
    }

    return hunks;
  }

  /**
   * Generate analysis for a single file change.
   *
   * @param fileChange - File change information
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param workspaceRoot - Workspace root path
   * @param options - Comparison options
   * @param comparison - Branch comparison data for accessing complete diff content
   * @returns Formatted file analysis
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async generateSingleFileAnalysis(
    fileChange: FileChange,
    sourceBranch: string,
    targetBranch: string,
    workspaceRoot: string,
    options?: ComparisonOptions,
    comparison?: BranchComparison
  ): Promise<string> {
    try {
      const {
        path: filePath,
        status,
        additions,
        deletions,
        oldPath,
        similarity,
      } = fileChange;
      const icon = this.getChangeIcon(status);

      let output = `### ${icon} ${filePath}\n\n`;

      // Set appropriate status text and section titles
      let statusText: string;
      let sectionTitle: string;

      switch (status) {
        case "added":
          statusText = "Nuevo";
          sectionTitle = "#### Contenido del archivo nuevo:";
          break;
        case "deleted":
          statusText = "Eliminado";
          sectionTitle = "#### Contenido del archivo eliminado:";
          break;
        case "renamed":
          statusText = `Movido/Renombrado${
            similarity ? ` (${similarity}% similar)` : ""
          }`;
          sectionTitle =
            additions > 0 || deletions > 0
              ? "#### Diferencias tras el movimiento:"
              : "#### Archivo movido sin cambios de contenido:";
          break;
        case "modified":
        default:
          statusText = "Modificado";
          sectionTitle = "#### Diferencias:";
          break;
      }

      output += `**Estado:** ${statusText}\n`;
      if (status === "renamed" && oldPath) {
        output += `**Movido desde:** ${oldPath}\n`;
        output += `**Movido hasta:** ${filePath}\n`;
      }
      output += `**Cambios:** +${additions} líneas, -${deletions} líneas`;
      
      // Add moved lines count if available
      if (comparison?.diffContent) {
        try {
          // Get the file-specific diff
          const { stdout: fileDiff } = await execAsync(
            `git diff ${targetBranch}..${sourceBranch} -- "${filePath}"`,
            {
              cwd: workspaceRoot,
              maxBuffer: 1024 * 1024 * 50,
            }
          );
          
          if (fileDiff) {
            const stats = this.analyzeDiffStatisticsWithMoveDetection(fileDiff);
            if (stats.movedLines > 0) {
              output += `, ○${stats.movedLines} líneas movidas`;
            }
            if (stats.modifiedMovedLines > 0) {
              output += `, ●${stats.modifiedMovedLines} líneas modificadas y movidas`;
            }
          }
        } catch (error) {
          // Ignore errors, just don't show moved lines count
        }
      }
      
      output += "\n";

      // No hunk information display (removed as requested)

      output += "\n";

      if (status === "deleted") {
        output += sectionTitle + "\n\n";
        try {
          const { stdout: deletedContent } = await execAsync(
            `git show ${targetBranch}:"${filePath}"`,
            {
              cwd: workspaceRoot,
              maxBuffer: 1024 * 1024 * 50, // 50MB buffer per file
            }
          );
          output += "```\n";
          output += deletedContent;
          output += "\n```\n\n";
        } catch (error) {
          output +=
            "*No se pudo obtener el contenido del archivo eliminado.*\n\n";
        }
      } else if (status === "added") {
        // For new files, show content directly
        output += sectionTitle + "\n\n";
        try {
          const { stdout: fileContent } = await execAsync(
            `git show ${sourceBranch}:"${filePath}"`,
            {
              cwd: workspaceRoot,
              maxBuffer: 1024 * 1024 * 50, // 50MB buffer per file
            }
          );
          output += "```\n";
          output += fileContent;
          output += "\n```\n\n";
        } catch (error) {
          output += "*No se pudo obtener el contenido del archivo nuevo.*\n\n";
        }
      } else {
        // Show diff for modified/renamed files
        output += sectionTitle + "\n\n";
        try {
          // Try multiple diff commands to ensure we get the content
          let diffContent = "";

          // Debug: Check if file exists in both branches
          if (options?.debugMode) {
            try {
              const fileExistsInTarget = await execAsync(
                `git cat-file -e ${targetBranch}:"${filePath}"`,
                { cwd: workspaceRoot }
              )
                .then(() => true)
                .catch(() => false);

              const fileExistsInSource = await execAsync(
                `git cat-file -e ${sourceBranch}:"${filePath}"`,
                { cwd: workspaceRoot }
              )
                .then(() => true)
                .catch(() => false);

              Logger.info(
                `File ${filePath} - Target: ${fileExistsInTarget}, Source: ${fileExistsInSource}`
              );
            } catch (debugError) {
              Logger.warn(`Debug check failed for ${filePath}`, debugError);
            }
          }

          // First try: standard diff
          try {
            const { stdout } = await execAsync(
              `git diff ${targetBranch}..${sourceBranch} -- "${filePath}"`,
              {
                cwd: workspaceRoot,
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer per file
              }
            );
            diffContent = stdout;
          } catch (diffError) {
            Logger.warn(`Standard diff failed for ${filePath}`, diffError);
          }

          // Second try: unified diff with more context if first failed
          if (!diffContent.trim()) {
            try {
              const { stdout } = await execAsync(
                `git diff -U3 ${targetBranch} ${sourceBranch} -- "${filePath}"`,
                {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                }
              );
              diffContent = stdout;
            } catch (diffError) {
              Logger.warn(`Unified diff failed for ${filePath}`, diffError);
            }
          }

          // Third try: show file contents and compare manually
          if (!diffContent.trim() && status === "modified") {
            try {
              const [targetContent, sourceContent] = await Promise.all([
                execAsync(`git show ${targetBranch}:"${filePath}"`, {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                })
                  .then((r) => r.stdout)
                  .catch(() => ""),
                execAsync(`git show ${sourceBranch}:"${filePath}"`, {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                })
                  .then((r) => r.stdout)
                  .catch(() => ""),
              ]);

              if (targetContent !== sourceContent) {
                const manualDiff = this.generateManualDiff(
                  filePath,
                  targetContent,
                  sourceContent,
                  0
                );
                // Use manual diff as is (move detection will be applied later)
                diffContent = manualDiff;
              } else if (options?.debugMode) {
                diffContent = `# Debug: File contents are identical between branches\n# This might indicate:\n# 1. Whitespace-only changes\n# 2. Line ending differences\n# 3. File mode changes\n# Target content length: ${targetContent.length} bytes\n# Source content length: ${sourceContent.length} bytes\n`;
              }
            } catch (compareError) {
              Logger.warn(
                `Content comparison failed for ${filePath}`,
                compareError
              );
            }
          }

          // Fourth try: Check for whitespace-only changes
          if (!diffContent.trim() && status === "modified") {
            try {
              const { stdout: whitespaceIgnoredDiff } = await execAsync(
                `git diff -w ${targetBranch}..${sourceBranch} -- "${filePath}"`,
                {
                  cwd: workspaceRoot,
                  maxBuffer: 1024 * 1024 * 50,
                }
              );

              if (!whitespaceIgnoredDiff.trim()) {
                diffContent = `# Solo cambios de espacios en blanco detectados\n# El archivo tiene modificaciones pero solo en espacios, tabs o saltos de línea\n# Cambios: +${additions}/-${deletions} líneas\n`;
              }
            } catch (whitespaceError) {
              Logger.warn(
                `Whitespace check failed for ${filePath}`,
                whitespaceError
              );
            }
          }

          if (diffContent.trim()) {
            // Enhance diff with move detection
            const enhancedDiff = this.enhanceDiffWithMoveDetection(diffContent);
            output += "```diff\n";
            output += enhancedDiff;
            output += "\n```\n\n";
          } else {
            output += `*No se pudieron obtener las diferencias específicas para este archivo.*\n`;
            output += `*Archivo marcado como ${status} con +${additions}/-${deletions} líneas.*\n`;

            if (options?.debugMode) {
              output += `*Debug: Intentando obtener diff para "${filePath}" entre ${targetBranch} y ${sourceBranch}*\n`;
            }
            output += "\n";
          }
        } catch (error) {
          Logger.error(`Error getting diff for ${filePath}`, error);
          output += `*Error al obtener las diferencias del archivo.*\n`;
          output += `*Archivo marcado como ${status} con +${additions}/-${deletions} líneas.*\n\n`;
        }
      }

      return output;
    } catch (error) {
      Logger.error(`Error analyzing file ${fileChange.path}`, error);
      return `### Error al analizar ${fileChange.path}\n\n*No se pudo generar el análisis para este archivo.*\n\n`;
    }
  }

  /**
   * Generate a manual diff when git diff fails.
   *
   * @param filePath - File path for context
   * @param targetContent - Content from target branch
   * @param sourceContent - Content from source branch
   * @param maxLines - Maximum lines to compare
   * @returns Manual diff content
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private generateManualDiff(
    filePath: string,
    targetContent: string,
    sourceContent: string,
    maxLines: number
  ): string {
    const targetLines = targetContent.split("\n");
    const sourceLines = sourceContent.split("\n");

    let diffContent = `--- a/${filePath}\n+++ b/${filePath}\n`;
    diffContent += `@@ -1,${targetLines.length} +1,${sourceLines.length} @@\n`;

    // Use a simple LCS-based approach to find the actual differences
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
   * Compute a simple diff between two arrays of lines.
   * This algorithm maintains the order of the source file while correctly 
   * identifying additions, deletions, and context lines.
   * 
   * @param targetLines - Lines from target content
   * @param sourceLines - Lines from source content  
   * @returns Array of diff operations in source file order
   */
  private computeSimpleDiff(targetLines: string[], sourceLines: string[]): Array<{
    type: 'context' | 'removed' | 'added';
    line: string;
  }> {
    const result: Array<{ type: 'context' | 'removed' | 'added'; line: string }> = [];
    
    // Use LCS-like approach to find matching lines
    const matches = this.findLineMatches(targetLines, sourceLines);
    
    let targetIndex = 0;
    let sourceIndex = 0;
    
    // Walk through the source file maintaining its order
    while (sourceIndex < sourceLines.length || targetIndex < targetLines.length) {
      const sourceLine = sourceLines[sourceIndex];
      const targetLine = targetLines[targetIndex];
      
      // Check if current source line has a match in target
      const sourceMatch = matches.sourceToTarget.get(sourceIndex);
      const targetMatch = matches.targetToSource.get(targetIndex);
      
      if (sourceMatch !== undefined && targetMatch !== undefined && 
          sourceMatch === targetIndex && targetMatch === sourceIndex) {
        // Both lines match - this is context
        result.push({ type: 'context', line: sourceLine });
        sourceIndex++;
        targetIndex++;
      } else if (sourceMatch === undefined) {
        // Source line has no match - it's an addition
        result.push({ type: 'added', line: sourceLine });
        sourceIndex++;
      } else if (targetMatch === undefined || 
                 (sourceMatch !== undefined && sourceMatch > targetIndex)) {
        // Target line has no match or source line matches later - target line was removed
        result.push({ type: 'removed', line: targetLine });
        targetIndex++;
      } else {
        // Source line matches earlier in target - it's an addition
        result.push({ type: 'added', line: sourceLine });
        sourceIndex++;
      }
    }
    
    return result;
  }

  /**
   * Find line matches between target and source using a simple LCS approach.
   * This helps identify which lines are common between both files.
   */
  private findLineMatches(targetLines: string[], sourceLines: string[]): {
    sourceToTarget: Map<number, number>;
    targetToSource: Map<number, number>;
  } {
    const sourceToTarget = new Map<number, number>();
    const targetToSource = new Map<number, number>();
    
    // For each line in source, find its first occurrence in target
    for (let sourceIndex = 0; sourceIndex < sourceLines.length; sourceIndex++) {
      const sourceLine = sourceLines[sourceIndex];
      
      // Find the first unmatched occurrence of this line in target
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

  /**
   * Método mejorado para analizar estadísticas de diff
   * Cuenta correctamente las líneas agregadas y eliminadas
   *
   * @param diffContent - Raw git diff content
   * @returns Object with actual additions and deletions count
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private analyzeDiffStatistics(diffContent: string): {
    additions: number;
    deletions: number;
  } {
    const lines = diffContent.split("\n");
    let additions = 0;
    let deletions = 0;
    let inDiffSection = false;
    let hunkCount = 0;

    Logger.debug(
      `[analyzeDiffStatistics] Analyzing ${lines.length} lines of diff`
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detectar inicio de sección de diff (hunks)
      if (line.startsWith("@@")) {
        inDiffSection = true;
        hunkCount++;
        Logger.debug(
          `[analyzeDiffStatistics] Found hunk ${hunkCount}: ${line.substring(
            0,
            100
          )}`
        );
        continue;
      }

      // Solo contar líneas dentro de secciones de diff
      if (inDiffSection) {
        // Líneas que comienzan con + (pero no +++ que es header)
        if (line.startsWith("+") && !line.startsWith("+++")) {
          additions++;
        }
        // Líneas que comienzan con - (pero no --- que es header)
        else if (line.startsWith("-") && !line.startsWith("---")) {
          deletions++;
        }
        // Las líneas que comienzan con \ son metadatos, no las contamos
        else if (line.startsWith("\\")) {
          continue;
        }
      }
    }

    Logger.debug(
      `[analyzeDiffStatistics] Found ${hunkCount} hunks, +${additions}, -${deletions}`
    );

    // If we found no hunks but have content, try a different approach
    if (hunkCount === 0 && diffContent.trim().length > 0) {
      Logger.warn(
        `[analyzeDiffStatistics] No hunks found but diff has content, trying fallback analysis`
      );

      // Fallback: count all + and - lines, even without hunk context
      for (const line of lines) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          additions++;
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          deletions++;
        }
      }

      Logger.debug(
        `[analyzeDiffStatistics] Fallback analysis: +${additions}, -${deletions}`
      );
    }

    return { additions, deletions };
  }

  /**
   * Analyze diff statistics excluding moved lines.
   *
   * @param diffContent - Raw git diff content
   * @returns Object with actual additions and deletions count (excluding moved lines)
   * @author Pablo Contreras
   * @created 2025/01/06
   */
  private analyzeDiffStatisticsWithMoveDetection(diffContent: string): {
    additions: number;
    deletions: number;
    movedLines: number;
    modifiedMovedLines: number;
  } {
    const lines = diffContent.split("\n");
    const removedLines = new Map<string, number>();
    const addedLines = new Map<string, number>();
    let inDiffSection = false;

    // First pass: collect all removed and added lines with counts
    for (const line of lines) {
      if (line.startsWith("@@")) {
        inDiffSection = true;
        continue;
      }

      if (inDiffSection) {
        if (line.startsWith("-") && !line.startsWith("---")) {
          const content = line.substring(1).trim();
          if (content) {
            removedLines.set(content, (removedLines.get(content) || 0) + 1);
          }
        } else if (line.startsWith("+") && !line.startsWith("+++")) {
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
      // Don't count moved lines again, they were already counted above
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
   * Detect lines that were moved or modified in a diff.
   *
   * @param diffContent - Raw git diff content
   * @returns Map of moved lines and processed diff content
   * @author Pablo Contreras
   * @created 2025/01/06
   */
  private detectMovedLines(diffContent: string): {
    processedDiff: string;
    movedLinesCount: number;
    modifiedMovedCount: number;
  } {
    const lines = diffContent.split("\n");
    const removedLines = new Map<
      string,
      { indices: number[]; fullLine: string }
    >();
    const addedLines = new Map<
      string,
      { indices: number[]; fullLine: string }
    >();
    const movedLines = new Map<
      string,
      { removed: number[]; added: number[] }
    >();
    const modifiedMovedLines = new Map<string, boolean>();

    // Check if this is a new file (no removed lines at all)
    const hasRemovedLines = lines.some(line => line.startsWith("-") && !line.startsWith("---"));
    const hasAddedLines = lines.some(line => line.startsWith("+") && !line.startsWith("+++"));
    
    // If it's a new file (only additions), don't detect moved lines
    if (!hasRemovedLines && hasAddedLines) {
      const processedLines: string[] = [];
      
      for (const line of lines) {
        if (line.startsWith("@@")) {
          // Skip hunk headers
          continue;
        }
        processedLines.push(line);
      }
      
      return {
        processedDiff: processedLines.join("\n"),
        movedLinesCount: 0,
        modifiedMovedCount: 0,
      };
    }

    // First pass: collect all removed and added lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("-") && !line.startsWith("---")) {
        // Use both trimmed content for comparison and full content for display
        const fullContent = line.substring(1);
        const trimmedContent = fullContent.trim();

        if (trimmedContent) {
          if (!removedLines.has(trimmedContent)) {
            removedLines.set(trimmedContent, {
              indices: [],
              fullLine: fullContent,
            });
          }
          removedLines.get(trimmedContent)!.indices.push(i);
        }
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        const fullContent = line.substring(1);
        const trimmedContent = fullContent.trim();

        if (trimmedContent) {
          if (!addedLines.has(trimmedContent)) {
            addedLines.set(trimmedContent, {
              indices: [],
              fullLine: fullContent,
            });
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
    // These are lines that appear to be similar but have slight modifications
    for (const [removedContent, removedInfo] of removedLines) {
      if (!movedLines.has(removedContent)) {
        // Check if there's a similar line in added lines
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

      if (line.startsWith("-") && !line.startsWith("---")) {
        const trimmedContent = line.substring(1).trim();

        if (
          trimmedContent &&
          movedLines.has(trimmedContent) &&
          !processedIndices.has(i)
        ) {
          // Mark as moved line with ○ symbol
          processedLines.push("○" + line.substring(1));
          processedIndices.add(i);

          // Mark corresponding added lines as processed
          const moveInfo = movedLines.get(trimmedContent)!;
          for (const addIdx of moveInfo.added) {
            processedIndices.add(addIdx);
          }
        } else if (!processedIndices.has(i)) {
          processedLines.push(line);
        }
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        // Skip lines that were marked as moved
        if (!processedIndices.has(i)) {
          processedLines.push(line);
        }
      } else if (line.startsWith("@@")) {
        // Skip hunk headers to avoid clutter in output
        continue;
      } else if (line.startsWith(" ")) {
        // Context lines (unchanged) - preserve exactly as they are
        processedLines.push(line);
      } else {
        // Other lines (file headers, etc)
        processedLines.push(line);
      }
    }

    return {
      processedDiff: processedLines.join("\n"),
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
  private areLinesRelated(line1: string, line2: string): boolean {
    // Simple heuristic: check if lines share significant common substring
    // This could be improved with more sophisticated similarity algorithms
    const minLength = Math.min(line1.length, line2.length);
    const threshold = 0.6; // 60% similarity
    
    if (minLength < 10) return false; // Too short to determine
    
    // Check for common prefixes or key parts
    const commonPrefix = this.getCommonPrefixLength(line1, line2);
    const commonSuffix = this.getCommonSuffixLength(line1, line2);
    
    const similarity = (commonPrefix + commonSuffix) / minLength;
    return similarity >= threshold;
  }

  private getCommonPrefixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && str1[i] === str2[i]) {
      i++;
    }
    return i;
  }

  private getCommonSuffixLength(str1: string, str2: string): number {
    let i = 0;
    while (i < str1.length && i < str2.length && 
           str1[str1.length - 1 - i] === str2[str2.length - 1 - i]) {
      i++;
    }
    return i;
  }

  /**
   * Enhanced diff processing with advanced move detection.
   *
   * @param diffContent - Raw git diff content
   * @returns Enhanced diff with move indicators
   * @author Pablo Contreras
   * @created 2025/01/06
   */
  private enhanceDiffWithMoveDetection(diffContent: string): string {
    const { processedDiff } = this.detectMovedLines(diffContent);
    return processedDiff;
  }

  /**
   * Generate a note about statistics discrepancies.
   *
   * @param reportedAdditions - Additions reported by git stat
   * @param reportedDeletions - Deletions reported by git stat
   * @param actualStats - Actual stats from diff analysis
   * @param filePath - Path to the file for context
   * @returns Note about discrepancy or null if stats match
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private generateStatsNote(
    reportedAdditions: number,
    reportedDeletions: number,
    actualStats: { additions: number; deletions: number },
    filePath?: string
  ): string | null {
    const additionDiff = Math.abs(actualStats.additions - reportedAdditions);
    const deletionDiff = Math.abs(actualStats.deletions - reportedDeletions);

    // Only show note if there's a significant discrepancy (>5 lines or >50% difference)
    const significantAdditionDiff =
      additionDiff > 5 ||
      (reportedAdditions > 0 && additionDiff / reportedAdditions > 0.5);
    const significantDeletionDiff =
      deletionDiff > 5 ||
      (reportedDeletions > 0 && deletionDiff / reportedDeletions > 0.5);

    if (significantAdditionDiff || significantDeletionDiff) {
      let note = "*Nota sobre estadísticas:*\n";
      note += `- **Git stat reporta:** +${reportedAdditions}/-${reportedDeletions} líneas\n`;
      note += `- **Diff real muestra:** +${actualStats.additions}/-${actualStats.deletions} líneas\n`;

      // Provide context-specific explanations
      if (
        filePath &&
        this.isLikelyReorganization(
          filePath,
          reportedAdditions,
          reportedDeletions
        )
      ) {
        note +=
          "- *Este archivo tiene reorganización de contenido (reordenamiento de líneas existentes)*\n";
        note +=
          "- *Git stat cuenta cada línea movida como eliminación + adición*";
      } else if (
        actualStats.additions > reportedAdditions ||
        actualStats.deletions > reportedDeletions
      ) {
        note +=
          "- *El diff real incluye cambios de formato, espacios en blanco o contexto adicional*";
      } else {
        note +=
          "- *Git stat podría incluir cambios no visibles en el diff (binarios, permisos, etc.)*";
      }

      return note;
    }

    return null;
  }

  /**
   * Determine if a file likely has reorganization based on filename and stats.
   *
   * @param filePath - Path to the file
   * @param additions - Number of additions
   * @param deletions - Number of deletions
   * @returns True if file likely has reorganization
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private isLikelyReorganization(
    filePath: string,
    additions: number,
    deletions: number
  ): boolean {
    const fileName = path.basename(filePath);

    // Files that commonly have reorganization
    const reorganizationProneFfiles = [
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "composer.json",
      "requirements.txt",
      "Gemfile",
      "go.mod",
      "Cargo.toml",
    ];

    // Configuration files that might be reorganized
    const configFiles = [
      ".eslintrc",
      "eslint.config.",
      "prettier.config.",
      "tsconfig.json",
      "webpack.config.",
      "vite.config.",
      "rollup.config.",
    ];

    // Check if it's a known reorganization-prone file
    if (reorganizationProneFfiles.includes(fileName)) {
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
      const ratio =
        Math.min(additions, deletions) / Math.max(additions, deletions);
      if (ratio > 0.7 && Math.max(additions, deletions) <= 20) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update file statistics with real diff analysis instead of git stat.
   *
   * @param filesChanged - Array of file changes with git stat statistics
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param workspaceRoot - Workspace root path
   * @returns Array of file changes with updated real statistics
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private async updateFileStatsWithRealDiff(
    filesChanged: FileChange[],
    sourceBranch: string,
    targetBranch: string,
    workspaceRoot: string
  ): Promise<FileChange[]> {
    try {
      Logger.functionStart("updateFileStatsWithRealDiff", {
        fileCount: filesChanged.length,
      });

      const updatedFiles: FileChange[] = [];

      for (const fileChange of filesChanged) {
        let realAdditions = fileChange.additions;
        let realDeletions = fileChange.deletions;

        // For all file types except deleted, get real diff statistics
        if (fileChange.status !== "deleted") {
          try {
            // Get the actual diff content
            const { stdout: diffContent } = await execAsync(
              `git diff ${targetBranch}..${sourceBranch} -- "${fileChange.path}"`,
              {
                cwd: workspaceRoot,
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer
              }
            );

            if (diffContent.trim()) {
              const realStats = this.analyzeDiffStatistics(diffContent);
              realAdditions = realStats.additions;
              realDeletions = realStats.deletions;

              // Debug logging for troubleshooting
              if (
                realStats.additions !== fileChange.additions ||
                realStats.deletions !== fileChange.deletions
              ) {
                Logger.info(
                  `Stats updated for ${fileChange.path}: Git(+${fileChange.additions}/-${fileChange.deletions}) -> Real(+${realStats.additions}/-${realStats.deletions})`
                );
              }
            }
          } catch (error) {
            Logger.warn(
              `Failed to get real diff for ${fileChange.path}`,
              error
            );
            // Keep original stats if diff fails
          }
        }

        updatedFiles.push({
          ...fileChange,
          additions: realAdditions,
          deletions: realDeletions,
        });
      }

      Logger.functionEnd(
        "updateFileStatsWithRealDiff",
        `Updated ${updatedFiles.length} files`
      );
      return updatedFiles;
    } catch (error) {
      Logger.error("Error updating file stats with real diff", error);
      // Return original files if update fails
      return filesChanged;
    }
  }
}

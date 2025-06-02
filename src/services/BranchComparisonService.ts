import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../logger';
import { StructureGeneratorService } from './StructureGeneratorService';
import { ConfigurationService } from './ConfigurationService';
import { PatternMatcher } from '../utils/patternMatcher';

// Import the new modular services
import { GitOperationsService, BranchInfo } from './GitOperationsService';
import { DiffAnalysisService, FileChange } from './DiffAnalysisService';
import { MoveDetectionService } from './MoveDetectionService';
import { FileTreeService } from './FileTreeService';
import { FileContentService, ComparisonOptions } from './FileContentService';
import { ComparisonOutputService, BranchComparison } from './ComparisonOutputService';

/**
 * Refactored BranchComparisonService following SOLID principles.
 * Now acts as an orchestrator that coordinates modular services.
 * Each service has a single responsibility (SRP).
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class BranchComparisonService {
  private static instance: BranchComparisonService;
  
  // Existing services (kept for compatibility)
  private structureGenerator: StructureGeneratorService;
  private configService: ConfigurationService;
  private patternMatcher: PatternMatcher;

  // New modular services
  private gitOpsService: GitOperationsService;
  private diffAnalysisService: DiffAnalysisService;
  private moveDetectionService: MoveDetectionService;
  private fileTreeService: FileTreeService;
  private fileContentService: FileContentService;
  private outputService: ComparisonOutputService;

  public static getInstance(): BranchComparisonService {
    if (!this.instance) {
      this.instance = new BranchComparisonService();
    }
    return this.instance;
  }

  private constructor() {
    // Initialize existing services
    this.structureGenerator = StructureGeneratorService.getInstance();
    this.configService = ConfigurationService.getInstance();
    this.patternMatcher = PatternMatcher.getInstance();

    // Initialize new modular services
    this.gitOpsService = GitOperationsService.getInstance();
    this.diffAnalysisService = DiffAnalysisService.getInstance();
    this.moveDetectionService = MoveDetectionService.getInstance();
    this.fileTreeService = FileTreeService.getInstance();
    this.fileContentService = FileContentService.getInstance();
    this.outputService = ComparisonOutputService.getInstance();
  }

  /**
   * Get list of available git branches in the current workspace.
   * 
   * @returns Array of branch information
   */
  public async getAvailableBranches(): Promise<BranchInfo[]> {
    Logger.functionStart("getAvailableBranches");

    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showWarningMessage("No workspace folder open");
      return [];
    }

    try {
      const branches = await this.gitOpsService.getAvailableBranches();
      Logger.functionEnd("getAvailableBranches", branches);
      return branches;
    } catch (error) {
      Logger.error("Error getting git branches", error);
      return [];
    }
  }

  /**
   * Compare two git branches and return the differences.
   * 
   * @param sourceBranch - The branch to compare from
   * @param targetBranch - The branch to compare to
   * @returns Branch comparison data or null if failed
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

      // Validate both branches exist
      const [sourceExists, targetExists] = await Promise.all([
        this.gitOpsService.validateBranch(sourceBranch),
        this.gitOpsService.validateBranch(targetBranch)
      ]);

      if (!sourceExists) {
        vscode.window.showErrorMessage(`Branch '${sourceBranch}' does not exist`);
        return null;
      }

      if (!targetExists) {
        vscode.window.showErrorMessage(`Branch '${targetBranch}' does not exist`);
        return null;
      }

      // Get file changes and diff content
      const [nameStatus, diffContent] = await Promise.all([
        this.gitOpsService.getNameStatus(targetBranch, sourceBranch),
        this.gitOpsService.getCompleteDiff(targetBranch, sourceBranch)
      ]);

      // Parse file changes with accurate statistics
      const allFilesChanged = await this.diffAnalysisService.parseFileChangesFromCompleteDiff(
        nameStatus,
        diffContent,
        targetBranch,
        sourceBranch
      );

      // Apply exclusion patterns
      const filesChanged = await this.applyExclusionPatterns(allFilesChanged);

      // Calculate summary from filtered files
      const summary = this.outputService.calculateSummaryFromFiles(filesChanged);

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

      const output = await this.outputService.generateComparisonOutput(comparison, options);

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
   * Generate file structure comparison between two branches.
   * 
   * @param sourceBranch - The branch to compare from
   * @param targetBranch - The branch to compare to (base)
   * @returns Structure comparison output or null if failed
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

      // Validate both branches exist
      const [sourceExists, targetExists] = await Promise.all([
        this.gitOpsService.validateBranch(sourceBranch),
        this.gitOpsService.validateBranch(targetBranch)
      ]);

      if (!sourceExists) {
        vscode.window.showErrorMessage(`Branch '${sourceBranch}' does not exist`);
        return null;
      }

      if (!targetExists) {
        vscode.window.showErrorMessage(`Branch '${targetBranch}' does not exist`);
        return null;
      }

      // Get files changed between branches
      const changedFiles = await this.gitOpsService.getChangedFiles(targetBranch, sourceBranch);

      if (!changedFiles.trim()) {
        return this.outputService.formatNoChangesOutput(sourceBranch, targetBranch);
      }

      // Apply exclusion patterns
      const allFiles = changedFiles.split("\n").filter((f) => f.trim());
      const fileList = await this.applyExclusionPatternsToFilePaths(allFiles);

      if (fileList.length === 0) {
        const config = await this.configService.getConfiguration();
        return this.outputService.formatNoChangesWithExclusionsOutput(
          sourceBranch,
          targetBranch,
          config
        );
      }

      // Build file tree from filtered files
      const tree = this.fileTreeService.buildFileTree(fileList);

      // Format output
      let output = "# Estructura de archivos - Comparación entre ramas\n\n";
      output += `**Rama base:** ${targetBranch}\n`;
      output += `**Rama con cambios:** ${sourceBranch}\n\n`;

      // Add exclusion patterns
      const config = await this.configService.getConfiguration();
      output += this.outputService.formatExclusionPatterns(config);

      // Add file structure
      output += "## Estructura de archivos:\n```\n";
      output += this.fileTreeService.formatTreeStructure(tree);
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
   * Apply exclusion patterns to file changes.
   * 
   * @param allFilesChanged - All file changes before filtering
   * @returns Filtered file changes
   */
  private async applyExclusionPatterns(allFilesChanged: FileChange[]): Promise<FileChange[]> {
    const config = await this.configService.getConfiguration();
    const workspaceRoot = this.gitOpsService.getWorkspaceRoot();
    
    if (!workspaceRoot) {
      return allFilesChanged;
    }

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

    return filesChanged;
  }

  /**
   * Apply exclusion patterns to file paths.
   * 
   * @param allFiles - All file paths before filtering
   * @returns Filtered file paths
   */
  private async applyExclusionPatternsToFilePaths(allFiles: string[]): Promise<string[]> {
    const config = await this.configService.getConfiguration();
    const workspaceRoot = this.gitOpsService.getWorkspaceRoot();
    
    if (!workspaceRoot) {
      return allFiles;
    }

    const fileList = [];

    for (const filePath of allFiles) {
      const fullPath = path.join(workspaceRoot, filePath);
      const fileName = path.basename(filePath);

      // Check if file should be excluded
      const shouldExclude = this.patternMatcher.shouldExclude(
        fullPath,
        fileName,
        "file",
        config,
        workspaceRoot
      );

      if (!shouldExclude) {
        fileList.push(filePath);
      }
    }

    return fileList;
  }
}
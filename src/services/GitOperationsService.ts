import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '@/logger';

const execAsync = promisify(exec);

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
}

/**
 * Service for basic Git operations following SRP.
 * Handles all low-level git commands and validation.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class GitOperationsService {
  private static instance: GitOperationsService;

  public static getInstance(): GitOperationsService {
    if (!this.instance) {
      this.instance = new GitOperationsService();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor enforces singleton pattern
  }

  /**
   * Get workspace root path.
   * 
   * @returns Workspace root path or null if no workspace
   */
  public getWorkspaceRoot(): string | null {
    if (!vscode.workspace.workspaceFolders) {
      return null;
    }
    return vscode.workspace.workspaceFolders[0].uri.fsPath;
  }

  /**
   * Execute a git command safely.
   * 
   * @param command - Git command to execute
   * @param options - Execution options
   * @returns Command output
   */
  public async executeGitCommand(
    command: string, 
    options: { maxBuffer?: number; cwd?: string } = {}
  ): Promise<string> {
    try {
      Logger.debug(`[GitOperationsService] Executing: ${command}`);
      
      const workspaceRoot = options.cwd || this.getWorkspaceRoot();
      if (!workspaceRoot) {
        throw new Error('No workspace folder open');
      }

      const { stdout } = await execAsync(command, {
        cwd: workspaceRoot,
        maxBuffer: options.maxBuffer || 1024 * 1024 * 10, // 10MB default
      });

      return stdout;
    } catch (error) {
      Logger.error(`Git command failed: ${command}`, error);
      throw error;
    }
  }

  /**
   * Get list of available git branches.
   * 
   * @returns Array of branch information
   */
  public async getAvailableBranches(): Promise<BranchInfo[]> {
    try {
      Logger.functionStart("getAvailableBranches");

      const stdout = await this.executeGitCommand("git branch");

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
   * Validate that a branch exists.
   * 
   * @param branchName - Name of the branch to validate
   * @returns True if branch exists
   */
  public async validateBranch(branchName: string): Promise<boolean> {
    try {
      await this.executeGitCommand(`git rev-parse --verify ${branchName}`);
      return true;
    } catch (error) {
      Logger.error(`Branch '${branchName}' does not exist`, error);
      return false;
    }
  }

  /**
   * Get file content from a specific branch.
   * 
   * @param branchName - Branch name
   * @param filePath - Path to the file
   * @returns File content
   */
  public async getFileContent(branchName: string, filePath: string): Promise<string> {
    try {
      return await this.executeGitCommand(
        `git show ${branchName}:"${filePath}"`,
        { maxBuffer: 1024 * 1024 * 50 } // 50MB for large files
      );
    } catch (error) {
      Logger.warn(`Failed to get content for ${filePath} from ${branchName}`, error);
      throw error;
    }
  }

  /**
   * Get file line count from a specific branch.
   * 
   * @param branchName - Branch name
   * @param filePath - Path to the file
   * @returns Number of lines
   */
  public async getFileLineCount(branchName: string, filePath: string): Promise<number> {
    try {
      const stdout = await this.executeGitCommand(
        `git show ${branchName}:"${filePath}" | wc -l`,
        { maxBuffer: 1024 * 1024 * 50 }
      );
      return parseInt(stdout.trim(), 10) || 0;
    } catch (error) {
      Logger.warn(`Failed to get line count for ${filePath} from ${branchName}`, error);
      return 0;
    }
  }

  /**
   * Check if a file exists in a specific branch.
   * 
   * @param branchName - Branch name
   * @param filePath - Path to the file
   * @returns True if file exists
   */
  public async fileExistsInBranch(branchName: string, filePath: string): Promise<boolean> {
    try {
      await this.executeGitCommand(`git cat-file -e ${branchName}:"${filePath}"`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get name-status output for comparing branches.
   * 
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @returns Git name-status output
   */
  public async getNameStatus(targetBranch: string, sourceBranch: string): Promise<string> {
    return await this.executeGitCommand(
      `git diff --find-renames --name-status ${targetBranch}...${sourceBranch}`,
      { maxBuffer: 1024 * 1024 * 50 }
    );
  }

  /**
   * Get complete diff between branches.
   * 
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @returns Git diff output
   */
  public async getCompleteDiff(targetBranch: string, sourceBranch: string): Promise<string> {
    return await this.executeGitCommand(
      `git diff ${targetBranch}...${sourceBranch}`,
      { maxBuffer: 1024 * 1024 * 100 } // 100MB for large diffs
    );
  }

  /**
   * Get diff for a specific file between branches.
   * 
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @param filePath - Path to the file
   * @returns Git diff output for the file
   */
  public async getFileDiff(
    targetBranch: string, 
    sourceBranch: string, 
    filePath: string
  ): Promise<string> {
    return await this.executeGitCommand(
      `git diff ${targetBranch}..${sourceBranch} -- "${filePath}"`,
      { maxBuffer: 1024 * 1024 * 50 }
    );
  }

  /**
   * Get commit history between branches.
   * 
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @param maxCount - Maximum number of commits
   * @returns Git log output
   */
  public async getCommitHistory(
    targetBranch: string, 
    sourceBranch: string, 
    maxCount: number = 20
  ): Promise<string> {
    return await this.executeGitCommand(
      `git log ${targetBranch}..${sourceBranch} --oneline --no-merges --max-count=${maxCount}`,
      { maxBuffer: 1024 * 1024 * 10 }
    );
  }

  /**
   * Get files changed between branches.
   * 
   * @param targetBranch - Target branch
   * @param sourceBranch - Source branch
   * @returns List of changed files
   */
  public async getChangedFiles(targetBranch: string, sourceBranch: string): Promise<string> {
    return await this.executeGitCommand(
      `git diff --name-only ${targetBranch}...${sourceBranch}`,
      { maxBuffer: 1024 * 1024 * 50 }
    );
  }
}
import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../logger';

const execAsync = promisify(exec);

export interface BranchInfo {
  name: string;
  isCurrent: boolean;
}

export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  additions: number;
  deletions: number;
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
}

export class BranchComparisonService {
  private static instance: BranchComparisonService;

  public static getInstance(): BranchComparisonService {
    if (!this.instance) {
      this.instance = new BranchComparisonService();
    }
    return this.instance;
  }

  private constructor() {
    // Private constructor enforces singleton pattern
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
      Logger.functionStart('getAvailableBranches');

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return [];
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const { stdout } = await execAsync('git branch', { cwd: workspaceRoot });

      const branches = stdout
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          name: line.replace(/^\*?\s+/, ''),
          isCurrent: line.startsWith('*')
        }));

      Logger.functionEnd('getAvailableBranches', branches);
      return branches;
    } catch (error) {
      Logger.error('Error getting git branches', error);
      vscode.window.showErrorMessage('Failed to get git branches. Make sure you are in a git repository.');
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
  public async compareBranches(sourceBranch: string, targetBranch: string): Promise<BranchComparison | null> {
    try {
      Logger.functionStart('compareBranches', { sourceBranch, targetBranch });

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return null;
      }

      if (sourceBranch === targetBranch) {
        vscode.window.showWarningMessage('Cannot compare a branch with itself');
        return null;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Get file changes
      const { stdout: nameStatus } = await execAsync(
        `git diff --name-status ${targetBranch}...${sourceBranch}`,
        { cwd: workspaceRoot }
      );

      // Get statistics
      const { stdout: stat } = await execAsync(
        `git diff --stat ${targetBranch}...${sourceBranch}`,
        { cwd: workspaceRoot }
      );

      // Get full diff
      const { stdout: diffContent } = await execAsync(
        `git diff ${targetBranch}...${sourceBranch}`,
        { cwd: workspaceRoot }
      );

      // Parse file changes
      const filesChanged = this.parseFileChanges(nameStatus, stat);

      // Calculate summary
      const summary = this.calculateSummary(filesChanged, stat);

      const result: BranchComparison = {
        sourceBranch,
        targetBranch,
        filesChanged,
        summary,
        diffContent
      };

      Logger.functionEnd('compareBranches', result);
      return result;
    } catch (error) {
      Logger.error('Error comparing branches', error);
      vscode.window.showErrorMessage('Failed to compare branches. Make sure both branches exist.');
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
  public async generateComparisonOutput(comparison: BranchComparison, options: ComparisonOptions = {}): Promise<string> {
    try {
      Logger.functionStart('generateComparisonOutput', { comparison, options });

      let output = '# Branch Comparison\n\n';
      output += `**Source Branch:** ${comparison.sourceBranch}\n`;
      output += `**Target Branch:** ${comparison.targetBranch}\n\n`;

      if (comparison.filesChanged.length === 0) {
        output += 'No differences found between branches\n';
        Logger.functionEnd('generateComparisonOutput', output);
        return output;
      }

      // Summary section
      output += '## Summary\n\n';
      output += `- **Total Files Changed:** ${comparison.summary.totalFiles}\n`;
      output += `- **Additions:** ${comparison.summary.additions} lines\n`;
      output += `- **Deletions:** ${comparison.summary.deletions} lines\n`;
      output += `- **Files Added:** ${comparison.summary.filesAdded}\n`;
      output += `- **Files Modified:** ${comparison.summary.filesModified}\n`;
      output += `- **Files Deleted:** ${comparison.summary.filesDeleted}\n\n`;

      // Files changed section
      output += '## Files Changed\n\n';

      const addedFiles = comparison.filesChanged.filter(f => f.status === 'added');
      const modifiedFiles = comparison.filesChanged.filter(f => f.status === 'modified');
      const deletedFiles = comparison.filesChanged.filter(f => f.status === 'deleted');

      if (addedFiles.length > 0) {
        output += '### Added Files\n\n';
        addedFiles.forEach(file => {
          output += `- \`${file.path}\` (+${file.additions}, -${file.deletions})\n`;
        });
        output += '\n';
      }

      if (modifiedFiles.length > 0) {
        output += '### Modified Files\n\n';
        modifiedFiles.forEach(file => {
          output += `- \`${file.path}\` (+${file.additions}, -${file.deletions})\n`;
        });
        output += '\n';
      }

      if (deletedFiles.length > 0) {
        output += '### Deleted Files\n\n';
        deletedFiles.forEach(file => {
          output += `- \`${file.path}\` (+${file.additions}, -${file.deletions})\n`;
        });
        output += '\n';
      }

      // Full diff section (optional)
      if (options.showDiff && comparison.diffContent) {
        output += '## Full Diff\n\n';
        output += '```diff\n';
        output += comparison.diffContent;
        output += '\n```\n';
      }

      Logger.functionEnd('generateComparisonOutput', output);
      return output;
    } catch (error) {
      Logger.error('Error generating comparison output', error);
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
  public async selectBranchesForComparison(): Promise<{ sourceBranch: string; targetBranch: string } | null> {
    try {
      Logger.functionStart('selectBranchesForComparison');

      const branches = await this.getAvailableBranches();

      if (branches.length < 2) {
        vscode.window.showWarningMessage('Need at least 2 branches to compare');
        return null;
      }

      // Select source branch
      const sourceBranchItem = await vscode.window.showQuickPick(
        branches.map(b => ({
          label: b.name,
          description: b.isCurrent ? '(current)' : ''
        })),
        {
          placeHolder: 'Select source branch',
          title: 'Branch Comparison - Step 1/2'
        }
      );

      if (!sourceBranchItem) {
        return null;
      }

      // Select target branch
      const targetBranchItem = await vscode.window.showQuickPick(
        branches
          .filter(b => b.name !== sourceBranchItem.label)
          .map(b => ({
            label: b.name,
            description: b.isCurrent ? '(current)' : ''
          })),
        {
          placeHolder: 'Select target branch',
          title: 'Branch Comparison - Step 2/2'
        }
      );

      if (!targetBranchItem) {
        return null;
      }

      const result = {
        sourceBranch: sourceBranchItem.label,
        targetBranch: targetBranchItem.label
      };

      Logger.functionEnd('selectBranchesForComparison', result);
      return result;
    } catch (error) {
      Logger.error('Error in branch selection', error);
      return null;
    }
  }

  /**
   * Parse file changes from git diff output.
   * 
   * @param nameStatus - Git diff --name-status output
   * @param stat - Git diff --stat output
   * @returns Array of file changes
   */
  private parseFileChanges(nameStatus: string, stat: string): FileChange[] {
    const fileChanges: FileChange[] = [];
    const statusMap: Record<string, 'added' | 'modified' | 'deleted'> = {
      'A': 'added',
      'M': 'modified',
      'D': 'deleted'
    };

    // Parse name-status output
    const nameStatusLines = nameStatus.split('\n').filter(line => line.trim());
    const fileStatusMap = new Map<string, 'added' | 'modified' | 'deleted'>();

    nameStatusLines.forEach(line => {
      const [status, ...pathParts] = line.split('\t');
      const path = pathParts.join('\t');
      if (status && path && statusMap[status]) {
        fileStatusMap.set(path, statusMap[status]);
      }
    });

    // Parse stat output to get additions/deletions
    const statLines = stat.split('\n').filter(line => line.trim() && !line.includes('files changed'));

    statLines.forEach(line => {
      const match = line.match(/^\s*(.+?)\s*\|\s*(\d+)\s*([+-]+)/);
      if (match) {
        const [, path, , changes] = match;
        const additions = (changes.match(/\+/g) || []).length;
        const deletions = (changes.match(/-/g) || []).length;
        const status = fileStatusMap.get(path.trim()) || 'modified';

        fileChanges.push({
          path: path.trim(),
          status,
          additions,
          deletions
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
  private calculateSummary(filesChanged: FileChange[], stat: string): BranchComparison['summary'] {
    const summary = {
      totalFiles: filesChanged.length,
      additions: 0,
      deletions: 0,
      filesAdded: filesChanged.filter(f => f.status === 'added').length,
      filesModified: filesChanged.filter(f => f.status === 'modified').length,
      filesDeleted: filesChanged.filter(f => f.status === 'deleted').length
    };

    // Extract total additions/deletions from stat output
    const summaryMatch = stat.match(/(\d+) insertions?\(\+\).*?(\d+) deletions?\(-\)/);
    if (summaryMatch) {
      summary.additions = parseInt(summaryMatch[1], 10);
      summary.deletions = parseInt(summaryMatch[2], 10);
    } else {
      // Fallback: calculate from individual files
      filesChanged.forEach(file => {
        summary.additions += file.additions;
        summary.deletions += file.deletions;
      });
    }

    return summary;
  }
}
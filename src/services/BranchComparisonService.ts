import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../logger';
import { StructureGeneratorService } from './StructureGeneratorService';
import { ConfigurationService } from './ConfigurationService';
import { PatternMatcher } from '../utils/patternMatcher';
import * as path from 'path';

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

interface TreeNodeWithChanges {
  type: 'file' | 'directory';
  status?: 'added' | 'modified' | 'deleted';
  additions?: number;
  deletions?: number;
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
      Logger.functionStart('getAvailableBranches');

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return [];
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
      const { stdout } = await execAsync('git branch', { 
        cwd: workspaceRoot,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });

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
        { 
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50 // 50MB buffer
        }
      );

      // Get statistics
      const { stdout: stat } = await execAsync(
        `git diff --stat ${targetBranch}...${sourceBranch}`,
        { 
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50 // 50MB buffer
        }
      );

      // Get full diff
      const { stdout: diffContent } = await execAsync(
        `git diff ${targetBranch}...${sourceBranch}`,
        { 
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 100 // 100MB buffer for large diffs
        }
      );

      // Parse file changes
      const allFilesChanged = this.parseFileChanges(nameStatus, stat);

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
          'file',
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

      // Get current configuration for exclusion patterns
      const config = await this.configService.getConfiguration();

      let output = '# Estructura de archivos - Comparación entre ramas\n\n';
      output += `**Rama base:** ${comparison.targetBranch}\n`;
      output += `**Rama con cambios:** ${comparison.sourceBranch}\n\n`;

      // Add exclusion patterns
      output += this.formatExclusionPatterns(config);

      if (comparison.filesChanged.length === 0) {
        output += '## Resultado:\n';
        output += 'No se encontraron cambios entre las ramas seleccionadas.\n';
        Logger.functionEnd('generateComparisonOutput', output);
        return output;
      }

      // Summary section
      output += '## Resumen\n\n';
      output += `- **Total archivos modificados:** ${comparison.summary.totalFiles}\n`;
      output += `- **Líneas agregadas:** ${comparison.summary.additions}\n`;
      output += `- **Líneas eliminadas:** ${comparison.summary.deletions}\n`;
      output += `- **Archivos nuevos:** ${comparison.summary.filesAdded}\n`;
      output += `- **Archivos modificados:** ${comparison.summary.filesModified}\n`;
      output += `- **Archivos eliminados:** ${comparison.summary.filesDeleted}\n\n`;

      // Generate tree structure with file changes
      const treeWithChanges = this.buildFileTreeWithChanges(comparison.filesChanged);
      
      output += '## Estructura de archivos:\n```\n';
      output += this.formatTreeStructureWithChanges(treeWithChanges);
      output += '\n```\n';

      // Full diff section (optional)
      if (options.showDiff && comparison.diffContent) {
        output += '## Diferencias completas\n\n';
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

  /**
   * Calculate summary statistics from filtered file changes.
   * 
   * @param filesChanged - Array of filtered file changes
   * @returns Summary statistics
   */
  private calculateSummaryFromFiles(filesChanged: FileChange[]): BranchComparison['summary'] {
    const summary = {
      totalFiles: filesChanged.length,
      additions: 0,
      deletions: 0,
      filesAdded: filesChanged.filter(f => f.status === 'added').length,
      filesModified: filesChanged.filter(f => f.status === 'modified').length,
      filesDeleted: filesChanged.filter(f => f.status === 'deleted').length
    };

    // Calculate from individual files
    filesChanged.forEach(file => {
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
  public async generateStructureComparison(sourceBranch: string, targetBranch: string): Promise<string | null> {
    try {
      Logger.functionStart('generateStructureComparison', { sourceBranch, targetBranch });

      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return null;
      }

      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // Get files changed between branches
      const { stdout: changedFiles } = await execAsync(
        `git diff --name-only ${targetBranch}...${sourceBranch}`,
        { 
          cwd: workspaceRoot,
          maxBuffer: 1024 * 1024 * 50 // 50MB buffer
        }
      );

      if (!changedFiles.trim()) {
        return this.formatNoChangesOutput(sourceBranch, targetBranch);
      }

      // Get current configuration
      const config = await this.configService.getConfiguration();
      
      // Filter files based on exclusion patterns
      const allFiles = changedFiles.split('\n').filter(f => f.trim());
      const fileList = [];
      
      for (const filePath of allFiles) {
        const fullPath = path.join(workspaceRoot, filePath);
        const fileName = path.basename(filePath);
        
        // Check if file should be excluded
        const shouldExclude = this.patternMatcher.shouldExclude(
          fullPath,
          fileName,
          'file', // Assume files for git diff
          config,
          workspaceRoot
        );
        
        if (!shouldExclude) {
          fileList.push(filePath);
        }
      }

      if (fileList.length === 0) {
        return this.formatNoChangesWithExclusionsOutput(sourceBranch, targetBranch, config);
      }

      // Build file tree from filtered files
      const tree = this.buildFileTree(fileList);

      // Format output
      let output = '# Estructura de archivos - Comparación entre ramas\n\n';
      output += `**Rama base:** ${targetBranch}\n`;
      output += `**Rama con cambios:** ${sourceBranch}\n\n`;
      
      // Add exclusion patterns
      output += this.formatExclusionPatterns(config);
      
      // Add file structure
      output += '## Estructura de archivos:\n```\n';
      output += this.formatTreeStructure(tree);
      output += '\n```\n';

      Logger.functionEnd('generateStructureComparison');
      return output;
    } catch (error) {
      Logger.error('Error generating structure comparison', error);
      vscode.window.showErrorMessage('Failed to generate structure comparison');
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

    files.forEach(filePath => {
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
   * @returns Tree structure with change information
   */
  private buildFileTreeWithChanges(filesChanged: FileChange[]): Record<string, TreeNodeWithChanges> {
    const tree: any = {};

    filesChanged.forEach(fileChange => {
      const parts = fileChange.path.split('/');
      let current = tree;

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          // It's a file, store the change information
          current[part] = {
            type: 'file',
            status: fileChange.status,
            additions: fileChange.additions,
            deletions: fileChange.deletions
          };
        } else {
          // It's a directory
          if (!current[part]) {
            current[part] = { type: 'directory' };
          }
          current = current[part];
        }
      });
    });

    return tree;
  }

  /**
   * Format tree structure for display.
   * 
   * @param tree - Tree structure
   * @param prefix - Prefix for indentation
   * @returns Formatted tree string
   */
  private formatTreeStructure(tree: any, prefix: string = ''): string {
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
  private formatTreeStructureWithChanges(tree: Record<string, TreeNodeWithChanges>, prefix: string = ''): string {
    const entries = Object.entries(tree);
    let output = '';

    entries.forEach(([name, value], index) => {
      const isLast = index === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const extension = isLast ? '    ' : '│   ';

      if (value && value.type === 'file') {
        // File with change information
        const icon = this.getChangeIcon(value.status || 'modified');
        const stats = `(+${value.additions || 0}, -${value.deletions || 0})`;
        output += `${prefix}${connector}${icon} ${name} ${stats}\n`;
      } else if (value && value.type === 'directory') {
        // Directory - remove the type property before recursing
        const { type, status, additions, deletions, ...children } = value;
        output += `${prefix}${connector}📁 ${name}\n`;
        output += this.formatTreeStructureWithChanges(children as Record<string, TreeNodeWithChanges>, prefix + extension);
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
  private getChangeIcon(status: 'added' | 'modified' | 'deleted'): string {
    switch (status) {
      case 'added':
        return '🆕'; // New file
      case 'modified':
        return '📝'; // Modified file
      case 'deleted':
        return '🗑️'; // Deleted file
      default:
        return '📄'; // Default file
    }
  }

  /**
   * Format exclusion patterns for display.
   * 
   * @param config - FastStruct configuration
   * @returns Formatted exclusion patterns
   */
  private formatExclusionPatterns(config: any): string {
    let output = '## Patrones de exclusión aplicados:\n';
    
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
      output += '- Ninguno\n';
    } else {
      exclusions.forEach(pattern => {
        output += `- ${pattern}\n`;
      });
    }

    output += '\n';
    return output;
  }

  /**
   * Format output when no changes are found.
   * 
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @returns Formatted message
   */
  private formatNoChangesOutput(sourceBranch: string, targetBranch: string): string {
    let output = '# Estructura de archivos - Comparación entre ramas\n\n';
    output += `**Rama base:** ${targetBranch}\n`;
    output += `**Rama con cambios:** ${sourceBranch}\n\n`;
    output += '## Resultado:\n';
    output += 'No se encontraron cambios entre las ramas seleccionadas.\n';
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
  private formatNoChangesWithExclusionsOutput(sourceBranch: string, targetBranch: string, config: any): string {
    let output = '# Estructura de archivos - Comparación entre ramas\n\n';
    output += `**Rama base:** ${targetBranch}\n`;
    output += `**Rama con cambios:** ${sourceBranch}\n\n`;
    
    // Add exclusion patterns
    output += this.formatExclusionPatterns(config);
    
    output += '## Resultado:\n';
    output += 'Todos los archivos modificados fueron excluidos por los patrones de exclusión configurados.\n';
    output += '\n*Nota: Puedes ajustar los patrones de exclusión en la configuración de FastStruct.*\n';
    return output;
  }
}
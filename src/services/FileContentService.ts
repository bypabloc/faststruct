import { Logger } from '@/logger';
import { FileChange } from '@/services/DiffAnalysisService';
import { GitOperationsService } from '@/services/GitOperationsService';
import { MoveDetectionService } from '@/services/MoveDetectionService';

export interface ComparisonOptions {
  showDiff?: boolean;
  maxFilesAnalyzed?: number;
  maxLinesPerFile?: number;
  debugMode?: boolean;
}

/**
 * Service for analyzing individual file content and generating detailed file reports.
 * Handles file content analysis and formatting following SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class FileContentService {
  private static instance: FileContentService;
  private gitOpsService: GitOperationsService;
  private moveDetectionService: MoveDetectionService;

  public static getInstance(): FileContentService {
    if (!this.instance) {
      this.instance = new FileContentService();
    }
    return this.instance;
  }

  private constructor() {
    this.gitOpsService = GitOperationsService.getInstance();
    this.moveDetectionService = MoveDetectionService.getInstance();
  }

  /**
   * Generate analysis for a single file change.
   * 
   * @param fileChange - File change information
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param options - Comparison options
   * @returns Formatted file analysis
   */
  public async generateSingleFileAnalysis(
    fileChange: FileChange,
    sourceBranch: string,
    targetBranch: string,
    options?: ComparisonOptions
  ): Promise<string> {
    try {
      const { path: filePath, status, additions, deletions, oldPath, similarity } = fileChange;
      const icon = this.getChangeIcon(status);

      let output = `### ${icon} ${filePath}\n\n`;

      // Set appropriate status text and section titles
      const { statusText, sectionTitle } = this.getStatusTextAndTitle(status, similarity);

      output += `**Estado:** ${statusText}\n`;
      if (status === 'renamed' && oldPath) {
        output += `**Movido desde:** ${oldPath}\n`;
        output += `**Movido hasta:** ${filePath}\n`;
      }
      output += `**Cambios:** +${additions} líneas, -${deletions} líneas`;

      // Add moved lines count if available
      try {
        const fileDiff = await this.gitOpsService.getFileDiff(targetBranch, sourceBranch, filePath);

        if (fileDiff) {
          const stats = this.moveDetectionService.analyzeDiffStatisticsWithMoveDetection(fileDiff);
          if (stats.movedLines > 0) {
            output += `, ○${stats.movedLines} líneas movidas`;
          }
          if (stats.modifiedMovedLines > 0) {
            output += `, ●${stats.modifiedMovedLines} líneas modificadas y movidas`;
          }
        }
      } catch (error) {
        // Ignore errors, just don't show moved lines count
        Logger.debug(`Could not analyze moves for ${filePath}`, error);
      }

      output += '\n\n';

      // Generate content based on file status
      if (status === 'deleted') {
        output += await this.generateDeletedFileContent(filePath, targetBranch, sectionTitle);
      } else if (status === 'added') {
        output += await this.generateAddedFileContent(filePath, sourceBranch, sectionTitle);
      } else {
        output += await this.generateModifiedFileContent(
          filePath,
          sourceBranch,
          targetBranch,
          sectionTitle,
          options
        );
      }

      return output;
    } catch (error) {
      Logger.error(`Error analyzing file ${fileChange.path}`, error);
      return `### Error al analizar ${fileChange.path}\n\n*No se pudo generar el análisis para este archivo.*\n\n`;
    }
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
   * Get status text and section title based on file status.
   * 
   * @param status - File status
   * @param similarity - Similarity percentage for renamed files
   * @returns Status text and section title
   */
  private getStatusTextAndTitle(
    status: 'added' | 'modified' | 'deleted' | 'renamed',
    similarity?: number
  ): { statusText: string; sectionTitle: string } {
    switch (status) {
      case 'added':
        return {
          statusText: 'Nuevo',
          sectionTitle: '#### Contenido del archivo nuevo:',
        };
      case 'deleted':
        return {
          statusText: 'Eliminado',
          sectionTitle: '#### Contenido del archivo eliminado:',
        };
      case 'renamed':
        return {
          statusText: `Movido/Renombrado${similarity ? ` (${similarity}% similar)` : ''}`,
          sectionTitle: '#### Diferencias tras el movimiento:',
        };
      case 'modified':
      default:
        return {
          statusText: 'Modificado',
          sectionTitle: '#### Diferencias:',
        };
    }
  }

  /**
   * Generate content section for deleted files.
   * 
   * @param filePath - File path
   * @param targetBranch - Target branch name
   * @param sectionTitle - Section title
   * @returns Formatted content
   */
  private async generateDeletedFileContent(
    filePath: string,
    targetBranch: string,
    sectionTitle: string
  ): Promise<string> {
    let output = sectionTitle + '\n\n';

    try {
      const deletedContent = await this.gitOpsService.getFileContent(targetBranch, filePath);
      output += '```\n';
      output += deletedContent;
      output += '\n```\n\n';
    } catch (error) {
      output += '*No se pudo obtener el contenido del archivo eliminado.*\n\n';
    }

    return output;
  }

  /**
   * Generate content section for new files.
   * 
   * @param filePath - File path
   * @param sourceBranch - Source branch name
   * @param sectionTitle - Section title
   * @returns Formatted content
   */
  private async generateAddedFileContent(
    filePath: string,
    sourceBranch: string,
    sectionTitle: string
  ): Promise<string> {
    let output = sectionTitle + '\n\n';

    try {
      const fileContent = await this.gitOpsService.getFileContent(sourceBranch, filePath);
      output += '```\n';
      output += fileContent;
      output += '\n```\n\n';
    } catch (error) {
      output += '*No se pudo obtener el contenido del archivo nuevo.*\n\n';
    }

    return output;
  }

  /**
   * Generate content section for modified/renamed files.
   * 
   * @param filePath - File path
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param sectionTitle - Section title
   * @param options - Comparison options
   * @returns Formatted content
   */
  private async generateModifiedFileContent(
    filePath: string,
    sourceBranch: string,
    targetBranch: string,
    sectionTitle: string,
    options?: ComparisonOptions
  ): Promise<string> {
    let output = sectionTitle + '\n\n';

    try {
      let diffContent = '';

      // Try multiple diff approaches for robust diff generation
      diffContent = await this.tryMultipleDiffApproaches(
        filePath,
        sourceBranch,
        targetBranch,
        options
      );

      if (diffContent.trim()) {
        // Enhance diff with move detection
        const enhancedDiff = this.moveDetectionService.enhanceDiffWithMoveDetection(diffContent);
        output += '```diff\n';
        output += enhancedDiff;
        output += '\n```\n\n';
      } else {
        output += `*No se pudieron obtener las diferencias específicas para este archivo.*\n`;
        output += `*Archivo marcado como modificado.*\n`;

        if (options?.debugMode) {
          output += `*Debug: Intentando obtener diff para "${filePath}" entre ${targetBranch} y ${sourceBranch}*\n`;
        }
        output += '\n';
      }
    } catch (error) {
      Logger.error(`Error getting diff for ${filePath}`, error);
      output += `*Error al obtener las diferencias del archivo.*\n\n`;
    }

    return output;
  }

  /**
   * Try multiple diff approaches to get the most reliable diff.
   * 
   * @param filePath - File path
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param options - Comparison options
   * @returns Diff content
   */
  private async tryMultipleDiffApproaches(
    filePath: string,
    sourceBranch: string,
    targetBranch: string,
    options?: ComparisonOptions
  ): Promise<string> {
    let diffContent = '';

    // Debug: Check if file exists in both branches
    if (options?.debugMode) {
      try {
        const fileExistsInTarget = await this.gitOpsService.fileExistsInBranch(targetBranch, filePath);
        const fileExistsInSource = await this.gitOpsService.fileExistsInBranch(sourceBranch, filePath);

        Logger.info(`File ${filePath} - Target: ${fileExistsInTarget}, Source: ${fileExistsInSource}`);
      } catch (debugError) {
        Logger.warn(`Debug check failed for ${filePath}`, debugError);
      }
    }

    // First try: standard diff
    try {
      diffContent = await this.gitOpsService.getFileDiff(targetBranch, sourceBranch, filePath);
    } catch (diffError) {
      Logger.warn(`Standard diff failed for ${filePath}`, diffError);
    }

    // Second try: unified diff with more context if first failed
    if (!diffContent.trim()) {
      try {
        diffContent = await this.gitOpsService.executeGitCommand(
          `git diff -U3 ${targetBranch} ${sourceBranch} -- "${filePath}"`,
          { maxBuffer: 1024 * 1024 * 50 }
        );
      } catch (diffError) {
        Logger.warn(`Unified diff failed for ${filePath}`, diffError);
      }
    }

    // Third try: manual comparison if git diff fails
    if (!diffContent.trim()) {
      try {
        const [targetContent, sourceContent] = await Promise.all([
          this.gitOpsService.getFileContent(targetBranch, filePath).catch(() => ''),
          this.gitOpsService.getFileContent(sourceBranch, filePath).catch(() => ''),
        ]);

        if (targetContent !== sourceContent) {
          // Generate manual diff using DiffAnalysisService
          const diffAnalysisService = await import('./DiffAnalysisService');
          const diffService = diffAnalysisService.DiffAnalysisService.getInstance();
          diffContent = diffService.generateManualDiff(filePath, targetContent, sourceContent);
        } else if (options?.debugMode) {
          diffContent = `# Debug: File contents are identical between branches\n# This might indicate:\n# 1. Whitespace-only changes\n# 2. Line ending differences\n# 3. File mode changes\n# Target content length: ${targetContent.length} bytes\n# Source content length: ${sourceContent.length} bytes\n`;
        }
      } catch (compareError) {
        Logger.warn(`Content comparison failed for ${filePath}`, compareError);
      }
    }

    // Fourth try: Check for whitespace-only changes
    if (!diffContent.trim()) {
      try {
        const whitespaceIgnoredDiff = await this.gitOpsService.executeGitCommand(
          `git diff -w ${targetBranch}..${sourceBranch} -- "${filePath}"`,
          { maxBuffer: 1024 * 1024 * 50 }
        );

        if (!whitespaceIgnoredDiff.trim()) {
          diffContent = `# Solo cambios de espacios en blanco detectados\n# El archivo tiene modificaciones pero solo en espacios, tabs o saltos de línea\n`;
        }
      } catch (whitespaceError) {
        Logger.warn(`Whitespace check failed for ${filePath}`, whitespaceError);
      }
    }

    return diffContent;
  }

  /**
   * Generate a note about statistics discrepancies.
   * 
   * @param reportedAdditions - Additions reported by git stat
   * @param reportedDeletions - Deletions reported by git stat
   * @param actualAdditions - Actual additions from diff analysis
   * @param actualDeletions - Actual deletions from diff analysis
   * @param filePath - Path to the file for context
   * @returns Note about discrepancy or null if stats match
   */
  public generateStatsNote(
    reportedAdditions: number,
    reportedDeletions: number,
    actualAdditions: number,
    actualDeletions: number,
    filePath?: string
  ): string | null {
    const additionDiff = Math.abs(actualAdditions - reportedAdditions);
    const deletionDiff = Math.abs(actualDeletions - reportedDeletions);

    // Only show note if there's a significant discrepancy (>5 lines or >50% difference)
    const significantAdditionDiff =
      additionDiff > 5 || (reportedAdditions > 0 && additionDiff / reportedAdditions > 0.5);
    const significantDeletionDiff =
      deletionDiff > 5 || (reportedDeletions > 0 && deletionDiff / reportedDeletions > 0.5);

    if (significantAdditionDiff || significantDeletionDiff) {
      let note = '*Nota sobre estadísticas:*\n';
      note += `- **Git stat reporta:** +${reportedAdditions}/-${reportedDeletions} líneas\n`;
      note += `- **Diff real muestra:** +${actualAdditions}/-${actualDeletions} líneas\n`;

      // Provide context-specific explanations
      if (filePath && this.moveDetectionService.isLikelyReorganization(filePath, reportedAdditions, reportedDeletions)) {
        note += '- *Este archivo tiene reorganización de contenido (reordenamiento de líneas existentes)*\n';
        note += '- *Git stat cuenta cada línea movida como eliminación + adición*';
      } else if (actualAdditions > reportedAdditions || actualDeletions > reportedDeletions) {
        note += '- *El diff real incluye cambios de formato, espacios en blanco o contexto adicional*';
      } else {
        note += '- *Git stat podría incluir cambios no visibles en el diff (binarios, permisos, etc.)*';
      }

      return note;
    }

    return null;
  }
}
import { Logger } from '../logger';
import { FileChange } from './DiffAnalysisService';
import { GitOperationsService } from './GitOperationsService';
import { FileContentService, ComparisonOptions } from './FileContentService';
import { FileTreeService } from './FileTreeService';
import { MoveDetectionService } from './MoveDetectionService';

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

/**
 * Service for generating formatted comparison output.
 * Handles all output formatting and report generation following SRP.
 * 
 * @author Pablo Contreras
 * @created 2025/02/06
 */
export class ComparisonOutputService {
  private static instance: ComparisonOutputService;
  private gitOpsService: GitOperationsService;
  private fileContentService: FileContentService;
  private fileTreeService: FileTreeService;
  private moveDetectionService: MoveDetectionService;

  public static getInstance(): ComparisonOutputService {
    if (!this.instance) {
      this.instance = new ComparisonOutputService();
    }
    return this.instance;
  }

  private constructor() {
    this.gitOpsService = GitOperationsService.getInstance();
    this.fileContentService = FileContentService.getInstance();
    this.fileTreeService = FileTreeService.getInstance();
    this.moveDetectionService = MoveDetectionService.getInstance();
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
      Logger.functionStart('generateComparisonOutput', { comparison, options });

      const workspaceRoot = this.gitOpsService.getWorkspaceRoot();
      if (!workspaceRoot) {
        return 'No workspace folder open';
      }

      let output = '# Estructura de archivos - Comparación entre ramas\n\n';
      output += `**Rama base:** ${comparison.targetBranch}\n`;
      output += `**Rama con cambios:** ${comparison.sourceBranch}\n\n`;

      // Add exclusion patterns (if config is available)
      // This would need to be injected from the configuration service
      
      // Add symbol legend
      output += this.generateSymbolLegend();

      if (comparison.filesChanged.length === 0) {
        output += '## Resultado:\n';
        output += 'No se encontraron cambios entre las ramas seleccionadas.\n';
        Logger.functionEnd('generateComparisonOutput', output);
        return output;
      }

      // Summary section
      output += this.generateSummarySection(comparison.summary);

      // Generate tree structure with file changes
      const treeWithChanges = await this.fileTreeService.buildFileTreeWithChanges(
        comparison.filesChanged,
        workspaceRoot,
        comparison.targetBranch,
        comparison.sourceBranch
      );

      output += '## Estructura de archivos:\n```\n';
      output += this.fileTreeService.formatTreeStructureWithChanges(treeWithChanges);
      output += '\n```\n\n';

      // Add commit history
      output += await this.generateCommitHistory(
        comparison.sourceBranch,
        comparison.targetBranch
      );

      // Add detailed file analysis
      output += await this.generateDetailedFileAnalysis(
        comparison.filesChanged,
        comparison.sourceBranch,
        comparison.targetBranch,
        options
      );

      // Add full diff if showDiff option is enabled
      if (options.showDiff && comparison.diffContent) {
        output += '## Diferencias completas\n\n';
        output += '```diff\n';
        const enhancedDiff = this.moveDetectionService.enhanceDiffWithMoveDetection(
          comparison.diffContent
        );
        output += enhancedDiff;
        output += '\n```\n\n';
      }

      Logger.functionEnd('generateComparisonOutput', output);
      return output;
    } catch (error) {
      Logger.error('Error generating comparison output', error);
      throw error;
    }
  }

  /**
   * Generate symbol legend section.
   * 
   * @returns Formatted symbol legend
   */
  public generateSymbolLegend(): string {
    let output = '## Leyenda de símbolos:\n';
    output += '- **+** Línea agregada o nueva\n';
    output += '- **-** Línea eliminada\n';
    output += '- **○** Línea movida (reubicada sin modificación)\n';
    output += '- **●** Línea modificada y movida\n';
    output += '- **(espacio)** Línea sin cambios (contexto)\n\n';
    return output;
  }

  /**
   * Generate summary section with statistics.
   * 
   * @param summary - Branch comparison summary
   * @returns Formatted summary section
   */
  public generateSummarySection(summary: BranchComparison['summary']): string {
    let output = '## Resumen\n\n';
    output += `- **Total archivos modificados:** ${summary.totalFiles}\n`;
    output += `- **Líneas agregadas:** ${summary.additions}\n`;
    output += `- **Líneas eliminadas:** ${summary.deletions}\n`;
    output += `- **Archivos nuevos:** ${summary.filesAdded}\n`;
    output += `- **Archivos modificados:** ${summary.filesModified}\n`;
    output += `- **Archivos eliminados:** ${summary.filesDeleted}\n\n`;
    return output;
  }

  /**
   * Generate commit history section showing commits unique to source branch.
   * 
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @returns Formatted commit history section
   */
  public async generateCommitHistory(
    sourceBranch: string,
    targetBranch: string
  ): Promise<string> {
    try {
      Logger.functionStart('generateCommitHistory', {
        sourceBranch,
        targetBranch,
      });

      const commitLog = await this.gitOpsService.getCommitHistory(targetBranch, sourceBranch, 20);

      let output = '## HISTORIAL DE COMMITS (nuevos en rama comparar)\n\n';

      if (!commitLog.trim()) {
        output += 'No hay commits nuevos en la rama de comparación.\n\n';
        Logger.functionEnd('generateCommitHistory', 'No new commits');
        return output;
      }

      const commits = commitLog.trim().split('\n');
      output += `**Total de commits nuevos:** ${commits.length}\n\n`;

      commits.forEach((commit, index) => {
        const [hash, ...messageParts] = commit.split(' ');
        const message = messageParts.join(' ');
        output += `${index + 1}. **${hash}** - ${message}\n`;
      });

      output += '\n';
      Logger.functionEnd(
        'generateCommitHistory',
        `Generated history for ${commits.length} commits`
      );
      return output;
    } catch (error) {
      Logger.error('Error generating commit history', error);
      return '## HISTORIAL DE COMMITS (nuevos en rama comparar)\n\nError al obtener el historial de commits.\n\n';
    }
  }

  /**
   * Generate detailed file analysis with diffs and content.
   * 
   * @param filesChanged - Array of file changes
   * @param sourceBranch - Source branch name
   * @param targetBranch - Target branch name
   * @param options - Comparison options
   * @returns Formatted detailed file analysis
   */
  public async generateDetailedFileAnalysis(
    filesChanged: FileChange[],
    sourceBranch: string,
    targetBranch: string,
    options?: ComparisonOptions
  ): Promise<string> {
    try {
      Logger.functionStart('generateDetailedFileAnalysis', {
        fileCount: filesChanged.length,
        sourceBranch,
        targetBranch,
      });

      let output = '## ANÁLISIS DETALLADO DE ARCHIVOS\n\n';

      if (filesChanged.length === 0) {
        output += 'No hay archivos modificados para analizar.\n\n';
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
        output += await this.fileContentService.generateSingleFileAnalysis(
          fileChange,
          sourceBranch,
          targetBranch,
          options
        );
        output += '\n---\n\n';
      }

      Logger.functionEnd(
        'generateDetailedFileAnalysis',
        `Analyzed ${filesToAnalyze.length} files`
      );
      return output;
    } catch (error) {
      Logger.error('Error generating detailed file analysis', error);
      return '## ANÁLISIS DETALLADO DE ARCHIVOS\n\nError al generar el análisis detallado.\n\n';
    }
  }

  /**
   * Format exclusion patterns for display.
   * 
   * @param config - FastStruct configuration
   * @returns Formatted exclusion patterns
   */
  public formatExclusionPatterns(config: any): string {
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
      exclusions.forEach((pattern) => {
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
  public formatNoChangesOutput(sourceBranch: string, targetBranch: string): string {
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
  public formatNoChangesWithExclusionsOutput(
    sourceBranch: string,
    targetBranch: string,
    config: any
  ): string {
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

  /**
   * Calculate summary statistics from filtered file changes.
   * 
   * @param filesChanged - Array of filtered file changes
   * @returns Summary statistics
   */
  public calculateSummaryFromFiles(filesChanged: FileChange[]): BranchComparison['summary'] {
    const summary = {
      totalFiles: filesChanged.length,
      additions: 0,
      deletions: 0,
      filesAdded: filesChanged.filter((f) => f.status === 'added').length,
      filesModified: filesChanged.filter(
        (f) => f.status === 'modified' || f.status === 'renamed'
      ).length,
      filesDeleted: filesChanged.filter((f) => f.status === 'deleted').length,
    };

    // Calculate from individual files
    filesChanged.forEach((file) => {
      summary.additions += file.additions;
      summary.deletions += file.deletions;
    });

    return summary;
  }
}
import * as vscode from 'vscode';
import { registerBranchComparisonCommands } from '../../src/commands/branchComparisonCommands';
import { BranchComparisonService } from '../../src/services/BranchComparisonService';
import { Logger } from '../../src/logger';

// Mock dependencies
jest.mock('../../src/logger');
jest.mock('../../src/services/BranchComparisonService');

describe('branchComparisonCommands', () => {
  let mockContext: vscode.ExtensionContext;
  let mockBranchComparisonService: jest.Mocked<BranchComparisonService>;
  let registeredCommands: Map<string, (...args: any[]) => any>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset BranchComparisonService singleton
    (BranchComparisonService as any).instance = undefined;
    
    // Initialize registered commands map
    registeredCommands = new Map();
    
    // Mock extension context
    mockContext = {
      subscriptions: [],
      extensionPath: '/test/extension'
    } as any;
    
    // Mock BranchComparisonService
    mockBranchComparisonService = {
      getAvailableBranches: jest.fn(),
      compareBranches: jest.fn(),
      generateComparisonOutput: jest.fn(),
      selectBranchesForComparison: jest.fn(),
      generateStructureComparison: jest.fn()
    } as any;
    
    (BranchComparisonService.getInstance as jest.Mock).mockReturnValue(mockBranchComparisonService);
    
    // Mock vscode.commands.registerCommand
    (vscode.commands.registerCommand as jest.Mock).mockImplementation((command: string, callback: (...args: any[]) => any) => {
      registeredCommands.set(command, callback);
      const disposable = { dispose: jest.fn() };
      mockContext.subscriptions.push(disposable);
      return disposable;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('registerBranchComparisonCommands', () => {
    it('should register all branch comparison commands', () => {
      // Act
      registerBranchComparisonCommands(mockContext);

      // Assert
      expect(vscode.commands.registerCommand).toHaveBeenCalledTimes(4);
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('faststruct.compareBranchesStructure', expect.any(Function));
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('faststruct.compareBranches', expect.any(Function));
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('faststruct.compareBranchesWithCurrent', expect.any(Function));
      expect(vscode.commands.registerCommand).toHaveBeenCalledWith('faststruct.listBranches', expect.any(Function));
      expect(registeredCommands.has('faststruct.compareBranchesStructure')).toBe(true);
      expect(registeredCommands.has('faststruct.compareBranches')).toBe(true);
      expect(registeredCommands.has('faststruct.compareBranchesWithCurrent')).toBe(true);
      expect(registeredCommands.has('faststruct.listBranches')).toBe(true);
      // Each command registration adds a disposable to subscriptions
      expect(mockContext.subscriptions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('faststruct.compareBranches', () => {
    beforeEach(() => {
      // Clear previous registrations
      registeredCommands.clear();
      registerBranchComparisonCommands(mockContext);
    });

    it('should execute branch comparison successfully', async () => {
      // Arrange
      const mockSelection = { sourceBranch: 'feature/test', targetBranch: 'main' };
      const mockComparison = {
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        filesChanged: [{ path: 'test.ts', status: 'modified' as const, additions: 5, deletions: 2 }],
        summary: {
          totalFiles: 1,
          additions: 5,
          deletions: 2,
          filesAdded: 0,
          filesModified: 1,
          filesDeleted: 0
        },
        diffContent: 'diff content'
      };
      const mockOutput = '# Branch Comparison\n...';

      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(mockSelection);
      mockBranchComparisonService.compareBranches.mockResolvedValue(mockComparison);
      mockBranchComparisonService.generateComparisonOutput.mockResolvedValue(mockOutput);

      // Mock document creation
      const mockDocument = { uri: { fsPath: '/test/comparison.md' } };
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);
      
      // Act
      const command = registeredCommands.get('faststruct.compareBranches');
      await command!();

      // Assert
      expect(mockBranchComparisonService.selectBranchesForComparison).toHaveBeenCalled();
      expect(mockBranchComparisonService.compareBranches).toHaveBeenCalledWith('feature/test', 'main');
      expect(mockBranchComparisonService.generateComparisonOutput).toHaveBeenCalledWith(mockComparison, {
        maxFilesAnalyzed: 1, // mockComparison.filesChanged.length
        maxLinesPerFile: 100,
        debugMode: true
      });
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({ 
        content: mockOutput, 
        language: 'markdown' 
      });
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        'Branch comparison completed successfully'
      );
    });

    it('should handle cancelled branch selection', async () => {
      // Arrange
      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(null);

      // Act
      const command = registeredCommands.get('faststruct.compareBranches');
      await command!();

      // Assert
      expect(mockBranchComparisonService.compareBranches).not.toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    it('should handle comparison failure', async () => {
      // Arrange
      const mockSelection = { sourceBranch: 'feature/test', targetBranch: 'main' };
      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(mockSelection);
      mockBranchComparisonService.compareBranches.mockResolvedValue(null);

      // Act
      const command = registeredCommands.get('faststruct.compareBranches');
      await command!();

      // Assert
      expect(mockBranchComparisonService.generateComparisonOutput).not.toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Test error');
      mockBranchComparisonService.selectBranchesForComparison.mockRejectedValue(error);

      // Act
      const command = registeredCommands.get('faststruct.compareBranches');
      await command!();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith('Error in compareBranches command', error);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to compare branches: Test error'
      );
    });
  });

  describe('faststruct.compareBranchesWithCurrent', () => {
    beforeEach(() => {
      // Clear previous registrations
      registeredCommands.clear();
      registerBranchComparisonCommands(mockContext);
    });

    it('should compare selected branch with current branch', async () => {
      // Arrange
      const branches = [
        { name: 'main', isCurrent: true },
        { name: 'feature/test', isCurrent: false },
        { name: 'develop', isCurrent: false }
      ];
      const mockComparison = {
        sourceBranch: 'feature/test',
        targetBranch: 'main',
        filesChanged: [],
        summary: {
          totalFiles: 0,
          additions: 0,
          deletions: 0,
          filesAdded: 0,
          filesModified: 0,
          filesDeleted: 0
        },
        diffContent: ''
      };
      const mockOutput = '# Branch Comparison\n...';

      mockBranchComparisonService.getAvailableBranches.mockResolvedValue(branches);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({ 
        label: 'feature/test', 
        description: '' 
      });
      mockBranchComparisonService.compareBranches.mockResolvedValue(mockComparison);
      mockBranchComparisonService.generateComparisonOutput.mockResolvedValue(mockOutput);

      const mockDocument = { uri: { fsPath: '/test/comparison.md' } };
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesWithCurrent');
      await command!();

      // Assert
      expect(mockBranchComparisonService.getAvailableBranches).toHaveBeenCalled();
      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          { label: 'feature/test', description: '' },
          { label: 'develop', description: '' }
        ]),
        {
          placeHolder: 'Select branch to compare with current branch (main)',
          title: 'Compare with Current Branch'
        }
      );
      expect(mockBranchComparisonService.compareBranches).toHaveBeenCalledWith('feature/test', 'main');
    });

    it('should handle no current branch found', async () => {
      // Arrange
      const branches = [
        { name: 'feature/test', isCurrent: false },
        { name: 'develop', isCurrent: false }
      ];
      mockBranchComparisonService.getAvailableBranches.mockResolvedValue(branches);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesWithCurrent');
      await command!();

      // Assert
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Could not determine current branch'
      );
      expect(vscode.window.showQuickPick).not.toHaveBeenCalled();
    });

    it('should handle single branch scenario', async () => {
      // Arrange
      const branches = [{ name: 'main', isCurrent: true }];
      mockBranchComparisonService.getAvailableBranches.mockResolvedValue(branches);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesWithCurrent');
      await command!();

      // Assert
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No other branches available to compare with main'
      );
    });

    it('should handle cancelled branch selection', async () => {
      // Arrange
      const branches = [
        { name: 'main', isCurrent: true },
        { name: 'feature/test', isCurrent: false }
      ];
      mockBranchComparisonService.getAvailableBranches.mockResolvedValue(branches);
      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue(undefined);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesWithCurrent');
      await command!();

      // Assert
      expect(mockBranchComparisonService.compareBranches).not.toHaveBeenCalled();
    });
  });

  describe('faststruct.listBranches', () => {
    beforeEach(() => {
      // Clear previous registrations
      registeredCommands.clear();
      registerBranchComparisonCommands(mockContext);
    });

    it('should list all available branches', async () => {
      // Arrange
      const branches = [
        { name: 'main', isCurrent: true },
        { name: 'feature/test', isCurrent: false },
        { name: 'develop', isCurrent: false },
        { name: 'hotfix/urgent', isCurrent: false }
      ];
      mockBranchComparisonService.getAvailableBranches.mockResolvedValue(branches);

      const mockDocument = { uri: { fsPath: '/test/branches.md' } };
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

      // Act
      const command = registeredCommands.get('faststruct.listBranches');
      await command!();

      // Assert
      expect(mockBranchComparisonService.getAvailableBranches).toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
        content: expect.stringContaining('# Git Branches'),
        language: 'markdown'
      });
      
      // Verify content includes all branches
      const contentCall = (vscode.workspace.openTextDocument as jest.Mock).mock.calls[0][0];
      expect(contentCall.content).toContain('## Current Branch');
      expect(contentCall.content).toContain('- **main**');
      expect(contentCall.content).toContain('## Other Branches');
      expect(contentCall.content).toContain('- feature/test');
      expect(contentCall.content).toContain('- develop');
      expect(contentCall.content).toContain('- hotfix/urgent');
      expect(contentCall.content).toContain('**Total branches:** 4');
      
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should handle no branches available', async () => {
      // Arrange
      mockBranchComparisonService.getAvailableBranches.mockResolvedValue([]);

      // Act
      const command = registeredCommands.get('faststruct.listBranches');
      await command!();

      // Assert
      expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
        'No branches found in the current repository'
      );
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Git error');
      mockBranchComparisonService.getAvailableBranches.mockRejectedValue(error);

      // Act
      const command = registeredCommands.get('faststruct.listBranches');
      await command!();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith('Error in listBranches command', error);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to list branches: Git error'
      );
    });
  });

  describe('faststruct.compareBranchesStructure', () => {
    beforeEach(() => {
      // Clear previous registrations
      registeredCommands.clear();
      registerBranchComparisonCommands(mockContext);
    });

    it('should execute structure comparison successfully', async () => {
      // Arrange
      const mockSelection = { sourceBranch: 'feature/test', targetBranch: 'main' };
      const mockOutput = '# Estructura de archivos - Comparación entre ramas\n...';

      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(mockSelection);
      mockBranchComparisonService.generateStructureComparison = jest.fn().mockResolvedValue(mockOutput);

      const mockDocument = { uri: { fsPath: '/test/structure-comparison.md' } };
      (vscode.workspace.openTextDocument as jest.Mock).mockResolvedValue(mockDocument);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesStructure');
      await command!();

      // Assert
      expect(mockBranchComparisonService.selectBranchesForComparison).toHaveBeenCalled();
      expect(mockBranchComparisonService.generateStructureComparison).toHaveBeenCalledWith('feature/test', 'main');
      expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith({
        content: mockOutput,
        language: 'markdown'
      });
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(mockDocument);
    });

    it('should handle cancelled branch selection', async () => {
      // Arrange
      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(null);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesStructure');
      await command!();

      // Assert
      expect(mockBranchComparisonService.generateStructureComparison).not.toHaveBeenCalled();
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    it('should handle structure generation failure', async () => {
      // Arrange
      const mockSelection = { sourceBranch: 'feature/test', targetBranch: 'main' };
      mockBranchComparisonService.selectBranchesForComparison.mockResolvedValue(mockSelection);
      mockBranchComparisonService.generateStructureComparison = jest.fn().mockResolvedValue(null);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesStructure');
      await command!();

      // Assert
      expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Structure comparison error');
      mockBranchComparisonService.selectBranchesForComparison.mockRejectedValue(error);

      // Act
      const command = registeredCommands.get('faststruct.compareBranchesStructure');
      await command!();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith('Error in compareBranchesStructure command', error);
      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        'Failed to compare branch structures: Structure comparison error'
      );
    });
  });
});
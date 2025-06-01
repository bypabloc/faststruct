import * as vscode from 'vscode';
import { BranchComparisonService } from '../services/BranchComparisonService';
import { Logger } from '../logger';

/**
 * Register all branch comparison related commands.
 * 
 * @param context - Extension context
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function registerBranchComparisonCommands(context: vscode.ExtensionContext): void {
  const branchComparisonService = BranchComparisonService.getInstance();

  // Command: Compare structure between branches
  context.subscriptions.push(
    vscode.commands.registerCommand('faststruct.compareBranchesStructure', async () => {
      try {
        Logger.functionStart('compareBranchesStructure command');

        // Select branches
        const selection = await branchComparisonService.selectBranchesForComparison();
        if (!selection) {
          return;
        }

        // Generate structure comparison
        const output = await branchComparisonService.generateStructureComparison(
          selection.sourceBranch,
          selection.targetBranch
        );

        if (!output) {
          return;
        }

        // Show result in new document
        const document = await vscode.workspace.openTextDocument({
          content: output,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(document);

        Logger.functionEnd('compareBranchesStructure command');
      } catch (error) {
        Logger.error('Error in compareBranchesStructure command', error);
        vscode.window.showErrorMessage(`Failed to compare branch structures: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  // Command: Compare two branches
  context.subscriptions.push(
    vscode.commands.registerCommand('faststruct.compareBranches', async () => {
      try {
        Logger.functionStart('compareBranches command');

        // Select branches
        const selection = await branchComparisonService.selectBranchesForComparison();
        if (!selection) {
          return;
        }

        // Compare branches
        const comparison = await branchComparisonService.compareBranches(
          selection.sourceBranch,
          selection.targetBranch
        );

        if (!comparison) {
          return;
        }

        // Generate output
        const output = await branchComparisonService.generateComparisonOutput(comparison);

        // Show result in new document
        const document = await vscode.workspace.openTextDocument({
          content: output,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage('Branch comparison completed successfully');

        Logger.functionEnd('compareBranches command');
      } catch (error) {
        Logger.error('Error in compareBranches command', error);
        vscode.window.showErrorMessage(`Failed to compare branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  // Command: Compare branch with current
  context.subscriptions.push(
    vscode.commands.registerCommand('faststruct.compareBranchesWithCurrent', async () => {
      try {
        Logger.functionStart('compareBranchesWithCurrent command');

        // Get available branches
        const branches = await branchComparisonService.getAvailableBranches();
        const currentBranch = branches.find(b => b.isCurrent);

        if (!currentBranch) {
          vscode.window.showErrorMessage('Could not determine current branch');
          return;
        }

        // Filter out current branch for selection
        const otherBranches = branches.filter(b => !b.isCurrent);

        if (otherBranches.length === 0) {
          vscode.window.showWarningMessage(`No other branches available to compare with ${currentBranch.name}`);
          return;
        }

        // Select branch to compare with current
        const selectedBranch = await vscode.window.showQuickPick(
          otherBranches.map(b => ({
            label: b.name,
            description: ''
          })),
          {
            placeHolder: `Select branch to compare with current branch (${currentBranch.name})`,
            title: 'Compare with Current Branch'
          }
        );

        if (!selectedBranch) {
          return;
        }

        // Compare branches
        const comparison = await branchComparisonService.compareBranches(
          selectedBranch.label,
          currentBranch.name
        );

        if (!comparison) {
          return;
        }

        // Generate output
        const output = await branchComparisonService.generateComparisonOutput(comparison);

        // Show result in new document
        const document = await vscode.workspace.openTextDocument({
          content: output,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(document);
        vscode.window.showInformationMessage('Branch comparison completed successfully');

        Logger.functionEnd('compareBranchesWithCurrent command');
      } catch (error) {
        Logger.error('Error in compareBranchesWithCurrent command', error);
        vscode.window.showErrorMessage(`Failed to compare branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );

  // Command: List all branches
  context.subscriptions.push(
    vscode.commands.registerCommand('faststruct.listBranches', async () => {
      try {
        Logger.functionStart('listBranches command');

        const branches = await branchComparisonService.getAvailableBranches();

        if (branches.length === 0) {
          vscode.window.showWarningMessage('No branches found in the current repository');
          return;
        }

        // Generate branch list output
        let output = '# Git Branches\n\n';
        
        const currentBranch = branches.find(b => b.isCurrent);
        if (currentBranch) {
          output += '## Current Branch\n\n';
          output += `- **${currentBranch.name}**\n\n`;
        }

        const otherBranches = branches.filter(b => !b.isCurrent);
        if (otherBranches.length > 0) {
          output += '## Other Branches\n\n';
          otherBranches.forEach(branch => {
            output += `- ${branch.name}\n`;
          });
          output += '\n';
        }

        output += `**Total branches:** ${branches.length}\n`;

        // Show result in new document
        const document = await vscode.workspace.openTextDocument({
          content: output,
          language: 'markdown'
        });

        await vscode.window.showTextDocument(document);

        Logger.functionEnd('listBranches command');
      } catch (error) {
        Logger.error('Error in listBranches command', error);
        vscode.window.showErrorMessage(`Failed to list branches: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    })
  );
}
const { BranchComparisonService } = require('../out/services/BranchComparisonService');
const { ConfigurationService } = require('../out/services/ConfigurationService');
const { Logger } = require('../out/logger');
const { execSync } = require('child_process');
const path = require('path');

// Enable debug logging
process.env.FASTSTRUCT_DEBUG = 'true';

async function testBranchComparison() {
  try {
    console.log('=== TESTING BRANCH COMPARISON ===\n');
    
    // First, let's check what git diff --numstat returns directly
    const workspaceRoot = path.resolve(__dirname, '..');
    console.log('Workspace root:', workspaceRoot);
    
    try {
      console.log('\n=== DIRECT GIT COMMANDS ===');
      
      // Test git diff --numstat
      const numstatCmd = `cd ${workspaceRoot} && git diff --numstat master...dev -- package.json`;
      console.log('Command:', numstatCmd);
      const numstatOutput = execSync(numstatCmd, { encoding: 'utf8' });
      console.log('Numstat output:', numstatOutput);
      
      // Test git diff --stat
      const statCmd = `cd ${workspaceRoot} && git diff --stat master...dev -- package.json`;
      console.log('\nCommand:', statCmd);
      const statOutput = execSync(statCmd, { encoding: 'utf8' });
      console.log('Stat output:', statOutput);
      
      // Test git diff --name-status
      const nameStatusCmd = `cd ${workspaceRoot} && git diff --name-status master...dev -- package.json`;
      console.log('\nCommand:', nameStatusCmd);
      const nameStatusOutput = execSync(nameStatusCmd, { encoding: 'utf8' });
      console.log('Name-status output:', nameStatusOutput);
      
    } catch (error) {
      console.error('Git command error:', error.message);
    }
    
    console.log('\n=== TESTING SERVICE ===');
    
    // Mock VS Code API
    global.vscode = {
      workspace: {
        workspaceFolders: [{
          uri: { fsPath: workspaceRoot }
        }],
        getConfiguration: () => ({
          get: (key) => {
            const config = {
              'faststruct.config': {
                debug: true,
                exclude: {
                  folders: ['node_modules', '.git'],
                  files: [],
                  advanced: {
                    patterns: [],
                    specificFiles: [],
                    specificFolders: [],
                    regexPatterns: []
                  }
                },
                excludeContent: {
                  files: [],
                  folders: [],
                  patterns: []
                }
              }
            };
            return config[key];
          }
        })
      },
      window: {
        showErrorMessage: (msg) => console.error('VS Code Error:', msg),
        showWarningMessage: (msg) => console.warn('VS Code Warning:', msg)
      },
      ConfigurationTarget: { Global: 1 }
    };
    
    // Create service instance
    const configService = ConfigurationService.getInstance();
    const branchService = new BranchComparisonService(configService);
    
    // Compare branches
    console.log('\nComparing branches: master...dev');
    const comparison = await branchService.compareBranches('dev', 'master');
    
    if (comparison) {
      console.log('\n=== COMPARISON RESULT ===');
      console.log('Files changed:', comparison.filesChanged.length);
      
      // Find package.json in the results
      const packageJson = comparison.filesChanged.find(f => f.path.includes('package.json'));
      if (packageJson) {
        console.log('\npackage.json stats:');
        console.log('- Path:', packageJson.path);
        console.log('- Status:', packageJson.status);
        console.log('- Additions:', packageJson.additions);
        console.log('- Deletions:', packageJson.deletions);
      } else {
        console.log('\npackage.json not found in results!');
      }
      
      // Generate output
      console.log('\n=== GENERATING OUTPUT ===');
      const output = await branchService.generateComparisonOutput(comparison, {
        maxFilesAnalyzed: 5,
        maxLinesPerFile: 50,
        showDiff: true,
        debugMode: true
      });
      
      // Extract just the tree structure
      const treeMatch = output.match(/## Estructura de archivos:\n```\n([\s\S]*?)\n```/);
      if (treeMatch) {
        console.log('\nTree structure:');
        console.log(treeMatch[1]);
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
    console.error(error.stack);
  }
}

// Run the test
testBranchComparison();
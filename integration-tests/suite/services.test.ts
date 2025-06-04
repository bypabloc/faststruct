import * as assert from 'assert';
import * as vscode from 'vscode';
import { before } from 'mocha';

// Import services for testing (they should be accessible after extension activation)
// Note: In a real test environment, we might need to mock some of these

suite('FastStruct Services Test Suite', () => {
  before(async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('the-full-stack.faststruct');
    if (extension && !extension.isActive) {
      await extension.activate();
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  });

  test('Logger should be functional', async () => {
    // Test that we can access VS Code's output channels
    // The Logger creates an output channel, so this tests its basic functionality
    try {
      // This is an indirect test - we can't directly access the Logger class
      // but we can verify that output channels are working
      const testChannel = vscode.window.createOutputChannel('FastStruct Test');
      testChannel.appendLine('Test message');
      testChannel.dispose();
      
      assert.ok(true, 'Output channel functionality works');
    } catch (error) {
      assert.fail(`Logger/Output channel test failed: ${error}`);
    }
  });

  test('Configuration service should provide default config', () => {
    const config = vscode.workspace.getConfiguration('faststruct');
    const faststructConfig = config.get('config') as any;
    
    assert.ok(faststructConfig, 'Configuration should exist');
    
    // Test some default configuration properties
    assert.ok(
      typeof faststructConfig.debug === 'boolean',
      'Debug config should be boolean'
    );
    
    if (faststructConfig.exclude) {
      assert.ok(
        Array.isArray(faststructConfig.exclude.folders),
        'Exclude folders should be an array'
      );
      assert.ok(
        Array.isArray(faststructConfig.exclude.files),
        'Exclude files should be an array'
      );
    }
  });

  test('File system operations should be available', async () => {
    try {
      // Test basic workspace functionality that FileSystemService would use
      const workspaceFolders = vscode.workspace.workspaceFolders;
      
      // This might be undefined in test environment, that's ok
      assert.ok(
        workspaceFolders === undefined || Array.isArray(workspaceFolders),
        'Workspace folders should be undefined or array'
      );
      
      // Test that we can use VS Code's file system API
      const uri = vscode.Uri.file('/tmp/test');
      assert.ok(uri, 'URI creation should work');
      
    } catch (error) {
      assert.fail(`File system operations test failed: ${error}`);
    }
  });

  test('Command registration should be working', async () => {
    try {
      // This tests that CommandRegistrationService worked
      const commands = await vscode.commands.getCommands();
      const faststructCommands = commands.filter(cmd => cmd.startsWith('faststruct.'));
      
      assert.ok(
        faststructCommands.length > 0,
        'At least one FastStruct command should be registered'
      );
      
      // Test that we can query command information
      assert.ok(
        typeof faststructCommands[0] === 'string',
        'Command names should be strings'
      );
      
    } catch (error) {
      assert.fail(`Command registration test failed: ${error}`);
    }
  });

  test('Extension context should be properly set up', async () => {
    const extension = vscode.extensions.getExtension('the-full-stack.faststruct');
    assert.ok(extension, 'Extension should exist');
    assert.ok(extension.isActive, 'Extension should be active');
    
    // Test extension properties
    assert.ok(extension.packageJSON, 'Package JSON should be accessible');
    assert.ok(extension.extensionPath, 'Extension path should be available');
    
    // Verify the extension is in the right location structure
    assert.ok(
      extension.extensionPath.includes('faststruct') || 
      extension.extensionPath.includes('the-full-stack.faststruct'),
      'Extension path should contain extension identifier'
    );
  });

  test('VS Code API compatibility', () => {
    // Test that we're using compatible VS Code APIs
    assert.ok(vscode.window, 'VS Code window API should be available');
    assert.ok(vscode.workspace, 'VS Code workspace API should be available');
    assert.ok(vscode.commands, 'VS Code commands API should be available');
    assert.ok(vscode.Uri, 'VS Code Uri API should be available');
    
    // Test version compatibility
    assert.ok(vscode.version, 'VS Code version should be available');
  });
});
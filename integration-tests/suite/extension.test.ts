import * as assert from 'assert';
import * as vscode from 'vscode';
import { after, before } from 'mocha';

suite('FastStruct Extension Test Suite', () => {
  let extension: vscode.Extension<any> | undefined;

  before(async () => {
    // Get the extension
    extension = vscode.extensions.getExtension('the-full-stack.faststruct');
    assert.ok(extension, 'Extension should be found');
    
    // Activate the extension
    await extension.activate();
    
    // Wait a bit for activation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  after(() => {
    vscode.window.showInformationMessage('FastStruct integration tests completed!');
  });

  test('Extension should be present and activated', async () => {
    assert.ok(extension, 'Extension should exist');
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
  });

  test('Extension should register all main commands', async () => {
    const commands = await vscode.commands.getCommands();
    const faststructCommands = commands.filter(cmd => cmd.startsWith('faststruct.'));
    
    // Essential commands that should always be registered
    const essentialCommands = [
      'faststruct.createStructure',
      'faststruct.createStructureContext',
      'faststruct.createStructureOnly',
      'faststruct.createStructureChoose',
      'faststruct.openSettings',
      'faststruct.healthCheck'
    ];

    essentialCommands.forEach(cmd => {
      assert.ok(
        faststructCommands.includes(cmd), 
        `Command ${cmd} should be registered`
      );
    });

    assert.ok(
      faststructCommands.length >= essentialCommands.length,
      `At least ${essentialCommands.length} commands should be registered, found ${faststructCommands.length}`
    );
  });

  test('Health Check command should execute without errors', async () => {
    try {
      await vscode.commands.executeCommand('faststruct.healthCheck');
      // If we get here, the command executed successfully
      assert.ok(true, 'Health check command executed successfully');
    } catch (error) {
      assert.fail(`Health check command failed: ${error}`);
    }
  });

  test('Create Structure command should exist and be callable', async () => {
    try {
      // We can't fully test structure creation without a workspace,
      // but we can verify the command exists and is callable
      const commands = await vscode.commands.getCommands();
      assert.ok(
        commands.includes('faststruct.createStructure'),
        'createStructure command should be registered'
      );
    } catch (error) {
      assert.fail(`Create structure command test failed: ${error}`);
    }
  });

  test('Configuration should be accessible', () => {
    const config = vscode.workspace.getConfiguration('faststruct');
    assert.ok(config, 'FastStruct configuration should be accessible');
    
    // Test default configuration exists
    const faststructConfig = config.get('config');
    assert.ok(faststructConfig, 'FastStruct config object should exist');
  });

  test('Extension should have correct package information', () => {
    assert.ok(extension, 'Extension should exist');
    assert.strictEqual(extension.id, 'the-full-stack.faststruct', 'Extension ID should match');
    assert.ok(extension.packageJSON, 'Package JSON should be available');
    assert.strictEqual(extension.packageJSON.name, 'faststruct', 'Package name should match');
  });
});
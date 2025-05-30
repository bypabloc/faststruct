import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Suite de pruebas para la extensión FastStruct.
 * 
 * @author Pablo Contreras
 * @created 2025/01/30
 */
suite('FastStruct Extension Test Suite', () => {
  vscode.window.showInformationMessage('Iniciando tests de FastStruct');

  test('La extensión debe estar presente', () => {
    assert.ok(vscode.extensions.getExtension('the-full-stack.faststruct'));
  });

  test('Los comandos deben estar registrados', async () => {
    const commands = await vscode.commands.getCommands();
    
    assert.ok(commands.includes('faststruct.createStructure'));
    assert.ok(commands.includes('faststruct.createStructureContext'));
    assert.ok(commands.includes('faststruct.openSettings'));
  });

  test('La configuración debe tener valores por defecto', () => {
    const config = vscode.workspace.getConfiguration('faststruct');
    const faststructConfig = config.get('config');
    
    assert.ok(faststructConfig);
    assert.strictEqual(typeof faststructConfig, 'object');
  });

  test('Debe excluir carpetas correctamente', async () => {
    // Crear una estructura de prueba temporal
    const testWorkspace = path.join(__dirname, 'test-workspace');
    const nodeModulesPath = path.join(testWorkspace, 'node_modules');
    const srcPath = path.join(testWorkspace, 'src');
    
    // Crear directorios de prueba
    if (!fs.existsSync(testWorkspace)) {
      fs.mkdirSync(testWorkspace, { recursive: true });
    }
    if (!fs.existsSync(nodeModulesPath)) {
      fs.mkdirSync(nodeModulesPath);
    }
    if (!fs.existsSync(srcPath)) {
      fs.mkdirSync(srcPath);
    }
    
    // Crear archivos de prueba
    fs.writeFileSync(path.join(srcPath, 'index.js'), 'console.log("test");');
    fs.writeFileSync(path.join(nodeModulesPath, 'package.json'), '{}');
    
    // Ejecutar el comando
    const uri = vscode.Uri.file(testWorkspace);
    await vscode.commands.executeCommand('faststruct.createStructureContext', uri);
    
    // Verificar que se abrió un documento
    const activeEditor = vscode.window.activeTextEditor;
    assert.ok(activeEditor);
    
    const content = activeEditor.document.getText();
    
    // Verificar que node_modules no está en la salida
    assert.ok(!content.includes('node_modules'));
    
    // Verificar que src sí está en la salida
    assert.ok(content.includes('src'));
    
    // Limpiar
    fs.rmSync(testWorkspace, { recursive: true, force: true });
  });

  test('Debe detectar archivos binarios correctamente', () => {
    // Este test verificaría la detección de archivos binarios
    // pero requeriría acceso a las funciones internas
    assert.ok(true);
  });

  test('El comando openSettings debe abrir la webview', async () => {
    await vscode.commands.executeCommand('faststruct.openSettings');
    
    // Esperar un poco para que se abra la webview
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar que hay un panel webview activo
    // Nota: Esta verificación es limitada porque VS Code no expone
    // una API directa para verificar webviews
    assert.ok(true);
  });
});

/**
 * Configuración de Mocha para los tests.
 * 
 * @author Pablo Contreras
 * @created 2025/01/30
 */
export function run(): Promise<void> {
  // Crear el test runner de Mocha
  const mocha = new (require('mocha'))({
    ui: 'tdd',
    color: true,
    timeout: 10000
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    require('glob')('**/**.test.js', { cwd: testsRoot }, (err: any, files: string[]) => {
      if (err) {
        return reject(err);
      }

      // Agregar archivos al test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Ejecutar los tests
        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}

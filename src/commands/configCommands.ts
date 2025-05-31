import * as vscode from 'vscode';
import { ConfigWebviewProvider } from '../providers/ConfigWebviewProvider';
import { ConfigurationService } from '../services/ConfigurationService';
import { Logger } from '../logger';

/**
 * Registra todos los comandos relacionados con configuración.
 * 
 * @param context - Contexto de la extensión
 * @returns Array de disposables
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function registerConfigCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  const configProvider = new ConfigWebviewProvider(context);
  const configService = ConfigurationService.getInstance();
  
  // Comando para abrir la configuración
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.openSettings',
      () => {
        Logger.info('Comando openSettings ejecutado');
        configProvider.show();
      }
    )
  );
  
  // Comando para verificar la ubicación de la configuración
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.checkConfig',
      () => {
        const inspect = configService.inspectConfiguration();
        Logger.info('Inspección de configuración', inspect);
        
        const items: vscode.QuickPickItem[] = [];
        
        if (inspect?.globalValue) {
          items.push({
            label: '$(globe) Configuración Global',
            description: 'Guardada en la configuración de usuario',
            detail: JSON.stringify(inspect.globalValue, null, 2).substring(0, 100) + '...'
          });
        }
        
        if (inspect?.workspaceValue) {
          items.push({
            label: '$(folder) Configuración de Workspace',
            description: 'Guardada en .vscode/settings.json',
            detail: JSON.stringify(inspect.workspaceValue, null, 2).substring(0, 100) + '...'
          });
        }
        
        if (!inspect?.globalValue && !inspect?.workspaceValue) {
          items.push({
            label: '$(warning) Sin configuración personalizada',
            description: 'Usando valores por defecto',
            detail: 'No se ha guardado ninguna configuración todavía'
          });
        }
        
        vscode.window.showQuickPick(items, {
          placeHolder: 'Ubicaciones de configuración de FastStruct',
          canPickMany: false
        });
      }
    )
  );
  
  // Comando para exportar configuración
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.exportConfig',
      async () => {
        const config = configService.getConfiguration();
        const configJson = JSON.stringify(config, null, 2);
        
        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file('faststruct-config.json'),
          filters: {
            'JSON': ['json']
          }
        });
        
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(configJson, 'utf8'));
          vscode.window.showInformationMessage('Configuración exportada exitosamente');
          Logger.info('Configuración exportada', { path: uri.fsPath });
        }
      }
    )
  );
  
  // Comando para importar configuración
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.importConfig',
      async () => {
        const uris = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: {
            'JSON': ['json']
          }
        });
        
        if (uris && uris.length > 0) {
          try {
            const content = await vscode.workspace.fs.readFile(uris[0]);
            const config = JSON.parse(Buffer.from(content).toString('utf8'));
            
            await configService.saveConfiguration(config);
            vscode.window.showInformationMessage('Configuración importada exitosamente');
            Logger.info('Configuración importada', { path: uris[0].fsPath });
          } catch (error) {
            vscode.window.showErrorMessage(
              `Error al importar configuración: ${error instanceof Error ? error.message : String(error)}`
            );
            Logger.error('Error al importar configuración', error);
          }
        }
      }
    )
  );
  
  // Comando para restablecer configuración
  disposables.push(
    vscode.commands.registerCommand(
      'faststruct.resetConfig',
      async () => {
        const answer = await vscode.window.showWarningMessage(
          '¿Estás seguro de que quieres restablecer toda la configuración a los valores por defecto?',
          'Sí',
          'No'
        );
        
        if (answer === 'Sí') {
          const defaultConfig = configService.getDefaultConfig();
          await configService.saveConfiguration(defaultConfig);
          
          vscode.window.showInformationMessage('Configuración restablecida a valores por defecto');
          Logger.info('Configuración restablecida');
        }
      }
    )
  );
  
  Logger.info('Comandos de configuración registrados', { count: disposables.length });
  return disposables;
}
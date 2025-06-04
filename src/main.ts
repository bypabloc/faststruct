import * as vscode from "vscode";
import { Logger } from "@/logger";
import { CommandRegistrationService } from "@/services/CommandRegistrationService";

/**
 * Función de activación de la extensión FastStruct.
 * Este archivo sigue el principio SRP manejando solo la activación.
 *
 * @param context - Contexto de la extensión
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function activate(context: vscode.ExtensionContext) {
  // Crear output channel inmediatamente para asegurar que aparezca
  const outputChannel = vscode.window.createOutputChannel('FastStruct');
  outputChannel.show();
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('FastStruct Extension - ACTIVANDO');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
  outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
  outputChannel.appendLine(`VS Code Version: ${vscode.version}`);
  outputChannel.appendLine('='.repeat(60));
  
  console.log('Congratulations, your extension "faststruct" is now active!');
  console.log('Extension Path:', context.extensionPath);
  console.log('Extension URI:', context.extensionUri.toString());
  console.log('Storage Path:', context.storagePath);

  // Inicializar el logger
  Logger.info("FastStruct extension activada");
  Logger.info(`Extension Path: ${context.extensionPath}`);
  Logger.info(`Extension URI: ${context.extensionUri.toString()}`);
  
  // Mostrar mensaje de activación SIEMPRE (independiente del modo debug)
  Logger.forceShow("FastStruct extension activada exitosamente! Para ver logs detallados, habilita 'faststruct.config.debug' en Settings");

  try {
    outputChannel.appendLine('Registrando comandos...');
    
    // Registrar todos los comandos usando el servicio
    const commandService = CommandRegistrationService.getInstance();
    commandService.registerAllCommands(context);
    outputChannel.appendLine('Comandos registrados exitosamente');

    // Verificar que todos los comandos están registrados correctamente
    commandService.verifyCommandRegistration().then((success) => {
      if (success) {
        Logger.info("Todos los comandos verificados correctamente");
        outputChannel.appendLine('✓ Todos los comandos verificados correctamente');
      } else {
        Logger.error("Algunos comandos no se registraron correctamente");
        outputChannel.appendLine('✗ ERROR: Algunos comandos no se registraron');
      }
    }).catch(err => {
      outputChannel.appendLine(`✗ ERROR verificando comandos: ${err}`);
    });

    // Mostrar mensaje de bienvenida si es la primera vez
    showWelcomeMessageIfNeeded(context);

    Logger.info("FastStruct activado exitosamente");
    outputChannel.appendLine('✓ FastStruct activado exitosamente');
    
    // Guardar el output channel en el contexto para uso posterior
    context.subscriptions.push(outputChannel);
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    
    outputChannel.appendLine('✗ ERROR CRITICO durante la activación:');
    outputChannel.appendLine(`  Mensaje: ${errorMsg}`);
    outputChannel.appendLine(`  Stack: ${errorStack}`);
    
    Logger.error("Error durante la activación de FastStruct", error);
    vscode.window.showErrorMessage(
      `Error al activar FastStruct: ${errorMsg}`
    );
  }
}

/**
 * Función de desactivación de la extensión.
 *
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function deactivate() {
  Logger.info("FastStruct extension desactivada");
}

/**
 * Muestra un mensaje de bienvenida si es la primera vez que se activa la extensión.
 *
 * @param context - Contexto de la extensión
 * @author Pablo Contreras
 * @created 2025/01/31
 */
function showWelcomeMessageIfNeeded(context: vscode.ExtensionContext): void {
  const welcomeShownKey = "faststruct.welcomeShown";
  const welcomeShown = context.globalState.get<boolean>(welcomeShownKey, false);

  if (!welcomeShown) {
    const message =
      'Bienvenido a FastStruct! Para comenzar, haz clic derecho en cualquier carpeta del explorador y selecciona "FastStruct".';
    const actions = ["Ver Configuración", "Cerrar"];

    vscode.window
      .showInformationMessage(message, ...actions)
      .then((selection) => {
        if (selection === "Ver Configuración") {
          vscode.commands.executeCommand("faststruct.openSettings");
        }
      });

    // Marcar que el mensaje ya fue mostrado
    context.globalState.update(welcomeShownKey, true);
  }
}

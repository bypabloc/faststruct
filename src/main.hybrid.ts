import * as vscode from "vscode";
import { Logger } from "./logger";
import { CommandRegistrationService } from "./services/CommandRegistrationService";

/**
 * Función de activación híbrida - garantiza activación + funcionalidad completa.
 */
export function activate(context: vscode.ExtensionContext) {
  // Crear output channel inmediatamente para asegurar que aparezca
  const outputChannel = vscode.window.createOutputChannel('FastStruct');
  outputChannel.show();
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine('FastStruct Extension - ACTIVANDO (HÍBRIDO)');
  outputChannel.appendLine('='.repeat(60));
  outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
  outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
  outputChannel.appendLine(`VS Code Version: ${vscode.version}`);
  outputChannel.appendLine('='.repeat(60));
  
  console.log('FastStruct ACTIVANDO - Version Híbrida');
  console.log('Extension Path:', context.extensionPath);
  console.log('Extension URI:', context.extensionUri.toString());

  try {
    // Paso 1: Inicializar el logger
    outputChannel.appendLine('1. Inicializando Logger...');
    Logger.info("FastStruct extension activada");
    Logger.info(`Extension Path: ${context.extensionPath}`);
    Logger.info(`Extension URI: ${context.extensionUri.toString()}`);
    outputChannel.appendLine('✓ Logger inicializado correctamente');
    
    // Paso 2: Mostrar mensaje de activación
    outputChannel.appendLine('2. Mostrando mensaje de activación...');
    Logger.forceShow("FastStruct extension activada exitosamente! Para ver logs detallados, habilita 'faststruct.config.debug' en Settings");
    outputChannel.appendLine('✓ Mensaje de activación mostrado');

  } catch (loggerError) {
    outputChannel.appendLine(`✗ ERROR en Logger: ${loggerError}`);
    console.error('Logger error:', loggerError);
  }

  try {
    // Paso 3: Registrar comandos usando el servicio
    outputChannel.appendLine('3. Obteniendo CommandRegistrationService...');
    const commandService = CommandRegistrationService.getInstance();
    outputChannel.appendLine('✓ CommandRegistrationService obtenido');
    
    outputChannel.appendLine('4. Registrando comandos...');
    commandService.registerAllCommands(context);
    outputChannel.appendLine('✓ Comandos registrados exitosamente');

  } catch (commandError) {
    outputChannel.appendLine(`✗ ERROR registrando comandos: ${commandError}`);
    console.error('Command registration error:', commandError);
    
    // Fallback: registrar al menos un comando básico
    try {
      outputChannel.appendLine('5. FALLBACK: Registrando comando básico...');
      const fallbackCommand = vscode.commands.registerCommand('faststruct.createStructure', () => {
        vscode.window.showErrorMessage('FastStruct está en modo fallback. Revisa los logs para más detalles.');
        outputChannel.show();
      });
      context.subscriptions.push(fallbackCommand);
      outputChannel.appendLine('✓ Comando fallback registrado');
    } catch (fallbackError) {
      outputChannel.appendLine(`✗ ERROR en fallback: ${fallbackError}`);
    }
  }

  try {
    // Paso 5: Verificar comandos registrados
    outputChannel.appendLine('6. Verificando comandos registrados...');
    const commandService = CommandRegistrationService.getInstance();
    commandService.verifyCommandRegistration().then((success) => {
      if (success) {
        Logger.info("Todos los comandos verificados correctamente");
        outputChannel.appendLine('✓ Todos los comandos verificados correctamente');
      } else {
        Logger.error("Algunos comandos no se registraron correctamente");
        outputChannel.appendLine('✗ Algunos comandos no se registraron correctamente');
      }
    }).catch(err => {
      outputChannel.appendLine(`✗ ERROR verificando comandos: ${err}`);
    });

  } catch (verifyError) {
    outputChannel.appendLine(`✗ ERROR en verificación: ${verifyError}`);
  }

  try {
    // Paso 6: Mostrar mensaje de bienvenida
    outputChannel.appendLine('7. Mostrando mensaje de bienvenida...');
    showWelcomeMessageIfNeeded(context);
    outputChannel.appendLine('✓ Mensaje de bienvenida procesado');

  } catch (welcomeError) {
    outputChannel.appendLine(`✗ ERROR en mensaje de bienvenida: ${welcomeError}`);
  }

  // Paso final: Finalizar activación
  outputChannel.appendLine('8. Finalizando activación...');
  Logger.info("FastStruct activado exitosamente");
  outputChannel.appendLine('✓ FastStruct activado exitosamente (modo híbrido)');
  
  // Guardar el output channel en el contexto para uso posterior
  context.subscriptions.push(outputChannel);
  
  // Mostrar notificación de éxito
  vscode.window.showInformationMessage('FastStruct activado correctamente');
}

/**
 * Función de desactivación.
 */
export function deactivate() {
  console.log('FastStruct DESACTIVANDO');
  Logger.info("FastStruct extension desactivada");
}

/**
 * Muestra un mensaje de bienvenida si es la primera vez que se activa la extensión.
 */
function showWelcomeMessageIfNeeded(context: vscode.ExtensionContext): void {
  const welcomeShownKey = "faststruct.welcomeShown";
  const welcomeShown = context.globalState.get(welcomeShownKey, false);

  if (!welcomeShown) {
    const message = 'Bienvenido a FastStruct! Para comenzar, haz clic derecho en cualquier carpeta del explorador y selecciona "FastStruct".';
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
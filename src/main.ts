import * as vscode from "vscode";
import { Logger } from "./logger";
import { CommandRegistrationService } from "./services/CommandRegistrationService";

/**
 * Función de activación de la extensión FastStruct.
 * Este archivo sigue el principio SRP manejando solo la activación.
 *
 * @param context - Contexto de la extensión
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "faststruct" is now active!');

  // Inicializar el logger
  Logger.info("FastStruct extension activada");
  Logger.show(); // Mostrar el canal de output si debug está habilitado

  try {
    // Registrar todos los comandos usando el servicio
    const commandService = CommandRegistrationService.getInstance();
    commandService.registerAllCommands(context);

    // Verificar que todos los comandos están registrados correctamente
    commandService.verifyCommandRegistration().then((success) => {
      if (success) {
        Logger.info("Todos los comandos verificados correctamente");
      } else {
        Logger.error("Algunos comandos no se registraron correctamente");
      }
    });

    // Mostrar mensaje de bienvenida si es la primera vez
    showWelcomeMessageIfNeeded(context);

    Logger.info("FastStruct activado exitosamente");
  } catch (error) {
    Logger.error("Error durante la activación de FastStruct", error);
    vscode.window.showErrorMessage(
      `Error al activar FastStruct: ${
        error instanceof Error ? error.message : String(error)
      }`
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

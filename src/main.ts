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
  let outputChannel: any;
  
  try {
    // Crear output channel inmediatamente para asegurar que aparezca
    outputChannel = vscode.window.createOutputChannel('FastStruct');
    outputChannel.show();
    console.log("✓ Output channel created successfully");
  } catch (error) {
    console.error("✗ ERROR creating output channel:", error);
    // Fallback: usar solo console
    outputChannel = {
      show: () => {},
      appendLine: (msg: string) => console.log(msg),
      push: () => {}
    };
  }

  try {
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine('FastStruct Extension - ACTIVANDO');
    outputChannel.appendLine('='.repeat(60));
    outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("✗ ERROR writing to output channel header:", error);
  }

  try {
    outputChannel.appendLine(`Extension Path: ${context.extensionPath}`);
    outputChannel.appendLine(`Extension URI: ${context.extensionUri.toString()}`);
    outputChannel.appendLine(`VS Code Version: ${vscode.version}`);
    outputChannel.appendLine('='.repeat(60));
  } catch (error) {
    console.error("✗ ERROR writing extension info to output channel:", error);
  }
  
  try {
    console.log('Congratulations, your extension "faststruct" is now active!');
    console.log('Extension Path:', context.extensionPath);
    console.log('Extension URI:', context.extensionUri.toString());
    console.log('Storage Path:', context.storagePath);
  } catch (error) {
    console.error("✗ ERROR writing console logs:", error);
  }

  try {
    // Inicializar el logger
    Logger.info("FastStruct extension activada");
    Logger.info(`Extension Path: ${context.extensionPath}`);
    Logger.info(`Extension URI: ${context.extensionUri.toString()}`);
  } catch (error) {
    console.error("✗ ERROR initializing logger:", error);
  }
  
  try {
    // Mostrar mensaje de activación SIEMPRE (independiente del modo debug)
    Logger.forceShow("FastStruct extension activada exitosamente! Para ver logs detallados, habilita 'faststruct.config.debug' en Settings");
  } catch (error) {
    console.error("✗ ERROR showing force message:", error);
  }

  try {
    outputChannel.appendLine('Registrando comandos...');
    
    // Registrar todos los comandos usando el servicio
    const commandService = CommandRegistrationService.getInstance();
    commandService.registerAllCommands(context);
    outputChannel.appendLine('Comandos registrados exitosamente');
    console.log("✓ Commands registered successfully");

    try {
      // Verificar que todos los comandos están registrados correctamente
      commandService.verifyCommandRegistration().then((success: boolean) => {
        try {
          if (success) {
            Logger.info("Todos los comandos verificados correctamente");
            outputChannel.appendLine('✓ Todos los comandos verificados correctamente');
          } else {
            Logger.error("Algunos comandos no se registraron correctamente");
            outputChannel.appendLine('✗ ERROR: Algunos comandos no se registraron');
          }
        } catch (error) {
          console.error("✗ ERROR in verification success callback:", error);
        }
      }).catch((err: any) => {
        try {
          console.error("✗ ERROR verifying commands:", err);
          outputChannel.appendLine(`✗ ERROR verificando comandos: ${err}`);
        } catch (error) {
          console.error("✗ ERROR in verification error callback:", error);
        }
      });
    } catch (error) {
      console.error("✗ ERROR setting up command verification:", error);
    }

    try {
      // Mostrar mensaje de bienvenida si es la primera vez
      showWelcomeMessageIfNeeded(context);
    } catch (error) {
      console.error("✗ ERROR showing welcome message:", error);
    }

    try {
      Logger.info("FastStruct activado exitosamente");
      outputChannel.appendLine('✓ FastStruct activado exitosamente');
    } catch (error) {
      console.error("✗ ERROR logging success:", error);
    }
    
    try {
      // Guardar el output channel en el contexto para uso posterior
      context.subscriptions.push(outputChannel);
    } catch (error) {
      console.error("✗ ERROR adding output channel to subscriptions:", error);
    }
    
  } catch (error) {
    try {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      
      console.error("✗ CRITICAL ERROR during activation:", errorMsg);
      console.error("Stack trace:", errorStack);
      
      outputChannel.appendLine('✗ ERROR CRITICO durante la activación:');
      outputChannel.appendLine(`  Mensaje: ${errorMsg}`);
      outputChannel.appendLine(`  Stack: ${errorStack}`);
      
      Logger.error("Error durante la activación de FastStruct", error);
      vscode.window.showErrorMessage(
        `Error al activar FastStruct: ${errorMsg}`
      );
    } catch (innerError) {
      console.error("✗ ERROR in error handler:", innerError);
    }
  }
}

/**
 * Función de desactivación de la extensión.
 *
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function deactivate() {
  try {
    console.log("FastStruct extension deactivating...");
    Logger.info("FastStruct extension desactivada");
    console.log("✓ FastStruct extension deactivated successfully");
  } catch (error) {
    console.error("✗ ERROR during deactivation:", error);
  }
}

/**
 * Muestra un mensaje de bienvenida si es la primera vez que se activa la extensión.
 *
 * @param context - Contexto de la extensión
 * @author Pablo Contreras
 * @created 2025/01/31
 */
function showWelcomeMessageIfNeeded(context: vscode.ExtensionContext): void {
  try {
    const welcomeShownKey = "faststruct.welcomeShown";
    let welcomeShown: boolean;

    try {
      welcomeShown = context.globalState.get<boolean>(welcomeShownKey, false);
      console.log("✓ Retrieved welcome shown state:", welcomeShown);
    } catch (error) {
      console.error("✗ ERROR getting welcome shown state:", error);
      welcomeShown = false; // Default fallback
    }

    if (!welcomeShown) {
      try {
        const message =
          'Bienvenido a FastStruct! Para comenzar, haz clic derecho en cualquier carpeta del explorador y selecciona "FastStruct".';
        const actions = ["Ver Configuración", "Cerrar"];

        try {
          const promise = vscode.window.showInformationMessage(message, ...actions);
          promise.then((selection: string | undefined) => {
            try {
              if (selection === "Ver Configuración") {
                try {
                  vscode.commands.executeCommand("faststruct.openSettings");
                  console.log("✓ Opening settings command executed");
                } catch (error) {
                  console.error("✗ ERROR executing openSettings command:", error);
                }
              }
            } catch (error) {
              console.error("✗ ERROR in selection handler:", error);
            }
          }, (error: any) => {
            console.error("✗ ERROR in showInformationMessage promise:", error);
          });
        } catch (error) {
          console.error("✗ ERROR showing information message:", error);
        }

        try {
          // Marcar que el mensaje ya fue mostrado
          context.globalState.update(welcomeShownKey, true);
          console.log("✓ Welcome shown state updated");
        } catch (error) {
          console.error("✗ ERROR updating welcome shown state:", error);
        }
      } catch (error) {
        console.error("✗ ERROR in welcome message logic:", error);
      }
    } else {
      console.log("✓ Welcome message already shown, skipping");
    }
  } catch (error) {
    console.error("✗ ERROR in showWelcomeMessageIfNeeded:", error);
  }
}

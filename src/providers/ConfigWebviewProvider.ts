import * as vscode from "vscode";
import { Logger } from "../logger";
import { ConfigurationService } from "../services/ConfigurationService";
import { WebviewContentService } from "../services/WebviewContentService";
import { WebviewMessageService } from "../services/WebviewMessageService";
import { ProjectStatsService } from "../services/ProjectStatsService";

/**
 * Proveedor de webview para la interfaz de configuración de FastStruct.
 * Versión refactorizada siguiendo el principio SRP.
 *
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export class ConfigWebviewProvider {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private configService: ConfigurationService;
  private contentService: WebviewContentService;
  private messageService: WebviewMessageService;
  private statsService: ProjectStatsService;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.configService = ConfigurationService.getInstance();
    this.contentService = WebviewContentService.getInstance();
    this.messageService = WebviewMessageService.getInstance();
    this.statsService = ProjectStatsService.getInstance();
    Logger.info("ConfigWebviewProvider inicializado");
  }

  /**
   * Muestra la interfaz de configuración en un panel webview.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  public show() {
    Logger.functionStart("ConfigWebviewProvider.show");

    // Si ya existe un panel, lo enfocamos
    if (this.panel) {
      Logger.info("Panel existente encontrado, enfocando");
      this.panel.reveal();
      Logger.functionEnd("ConfigWebviewProvider.show", "Panel enfocado");
      return;
    }

    // Mostrar mensaje informativo si no hay configuración
    this.checkWorkspaceConfiguration();

    // Crear panel
    this.panel = this.createWebviewPanel();

    // Configurar contenido
    this.setupWebviewContent();

    // Configurar manejadores
    this.setupEventHandlers();

    // Cargar datos iniciales
    this.loadInitialData();

    Logger.functionEnd("ConfigWebviewProvider.show", "Panel mostrado");
  }

  /**
   * Verifica si existe configuración en el workspace.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private checkWorkspaceConfiguration(): void {
    if (
      vscode.workspace.workspaceFolders &&
      vscode.workspace.workspaceFolders.length > 0
    ) {
      const inspect = this.configService.inspectConfiguration();

      if (!inspect?.workspaceValue) {
        vscode.window.showInformationMessage(
          "No se encontró configuración de FastStruct en este proyecto. Puedes crear una nueva configuración y guardarla.",
          "Entendido"
        );
      }
    }
  }

  /**
   * Crea el panel webview.
   *
   * @returns Panel webview creado
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private createWebviewPanel(): vscode.WebviewPanel {
    Logger.info("Creando nuevo panel webview");

    return vscode.window.createWebviewPanel(
      "faststructConfig",
      "FastStruct Configuration",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "media"),
          vscode.Uri.joinPath(
            this.context.extensionUri,
            "src",
            "templates",
            "webview"
          ),
          vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        ],
      }
    );
  }

  /**
   * Configura el contenido del webview.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private setupWebviewContent(): void {
    if (!this.panel) return;

    Logger.info("Configurando contenido HTML");

    const nonce = this.contentService.generateNonce();
    this.panel.webview.html = this.contentService.generateHtml(
      this.panel.webview,
      this.context.extensionUri,
      nonce
    );
  }

  /**
   * Configura los manejadores de eventos.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private setupEventHandlers(): void {
    if (!this.panel) return;

    Logger.info("Configurando manejadores de eventos");

    // Manejar mensajes
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.messageService.handleMessage(message, this.panel!.webview);
      },
      undefined,
      this.context.subscriptions
    );

    // Limpiar cuando se cierre
    this.panel.onDidDispose(
      () => {
        Logger.info("Panel cerrado, limpiando recursos");
        this.panel = undefined;
      },
      undefined,
      this.context.subscriptions
    );
  }

  /**
   * Carga los datos iniciales en el webview.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  private loadInitialData(): void {
    if (!this.panel) return;

    Logger.info("Cargando datos iniciales");

    // Cargar configuración
    this.messageService.handleMessage(
      { command: "loadConfig" },
      this.panel.webview
    );

    // Cargar estadísticas
    this.messageService.handleMessage(
      { command: "getStats" },
      this.panel.webview
    );
  }
}

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Minimatch } from "minimatch";
import { ConfigWebviewProvider } from "./ConfigWebviewProvider";
import { Logger } from "./logger";

interface TreeItem {
  name: string;
  type: "file" | "directory";
  children?: TreeItem[];
  path?: string;
}

interface ExclusionConfig {
  patterns: string[];
  specificFiles: string[];
  specificFolders: string[];
  regexPatterns: string[];
}

interface ContentExclusionConfig {
  files: string[];
  folders: string[];
  patterns: string[];
}

interface FastStructConfig {
  debug: boolean;
  exclude: {
    folders: string[];
    files: string[];
    advanced: ExclusionConfig;
  };
  excludeContent: ContentExclusionConfig;
  quickExclude?: {
    enabled: boolean;
    showNotifications: boolean;
  };
}

const AI_STRUCTURE_GUIDE = `# AI File Structure Analysis Guide

This output presents a comprehensive view of a file/folder structure and its contents. Here's how to interpret the information:

## Structure Format
The output is divided into two main sections:

1. TREE VIEW (First section)
   - Uses ASCII characters to display the hierarchy
   - └── marks the last item in a group
   - ├── marks items with more siblings
   - │   shows the vertical structure continuation
   - 📁 indicates directories
   - Files are shown without icons

2. DETAILED CONTENT (Second section)
   - Each file entry starts with "Path: " showing its relative location
   - Followed by "Content: " showing either:
     - Actual file content between \`\`\` markers
     - [Content excluded by configuration] for excluded content
     - [Binary file] for non-text files
     - [Error reading file: {message}] for unreadable files

## Reading Tips
- Directories are listed before files
- All items are alphabetically sorted within their level
- Content exclusions are based on configuration rules
- Binary files (images, executables, etc.) are automatically detected

---
Structure and content follows below:

`;

/**
 * Clase para manejar las exclusiones dinámicas de FastStruct.
 *
 * @author Pablo Contreras
 * @created 2025/01/31
 */
class ExclusionManager {
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * Agrega una exclusión a la configuración.
   *
   * @param type - Tipo de exclusión
   * @param value - Valor a excluir
   * @param configPath - Ruta en la configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async addExclusion(type: string, value: string, configPath: string) {
    try {
      Logger.info(
        `Iniciando addExclusion: ${type} = ${value} en ${configPath}`
      );

      // Verificar si hay un workspace abierto
      if (
        !vscode.workspace.workspaceFolders ||
        vscode.workspace.workspaceFolders.length === 0
      ) {
        const answer = await vscode.window.showWarningMessage(
          "No hay un workspace abierto. ¿Deseas guardar la exclusión globalmente?",
          "Sí",
          "No"
        );

        if (answer !== "Sí") {
          return;
        }
      } else {
        // Crear directorio .vscode si no existe
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const vscodePath = path.join(workspaceFolder.uri.fsPath, ".vscode");

        if (!fs.existsSync(vscodePath)) {
          Logger.info(`Creando directorio .vscode en ${vscodePath}`);
          fs.mkdirSync(vscodePath, { recursive: true });
        }
      }

      // Obtener la configuración actual completa
      const configuration = vscode.workspace.getConfiguration("faststruct");
      const currentConfig = configuration.get<any>("config") || {};

      Logger.info("Configuración actual:", currentConfig);

      // Crear una copia profunda de la configuración para modificar
      const newConfig = JSON.parse(JSON.stringify(currentConfig));

      // Asegurar que la estructura existe
      if (!newConfig.exclude) {
        newConfig.exclude = {
          folders: currentConfig.exclude?.folders || [],
          files: currentConfig.exclude?.files || [],
          advanced: {
            patterns: [],
            specificFiles: [],
            specificFolders: [],
            regexPatterns: [],
          },
        };
      }

      if (!newConfig.exclude.advanced) {
        newConfig.exclude.advanced = {
          patterns: currentConfig.exclude?.advanced?.patterns || [],
          specificFiles: currentConfig.exclude?.advanced?.specificFiles || [],
          specificFolders:
            currentConfig.exclude?.advanced?.specificFolders || [],
          regexPatterns: currentConfig.exclude?.advanced?.regexPatterns || [],
        };
      }

      if (!newConfig.excludeContent) {
        newConfig.excludeContent = {
          files: currentConfig.excludeContent?.files || [],
          folders: currentConfig.excludeContent?.folders || [],
          patterns: currentConfig.excludeContent?.patterns || [],
        };
      }

      // Navegar a la propiedad correcta y agregar el valor
      const pathParts = configPath.split(".");
      let current: any = newConfig;

      // Navegar hasta el penúltimo elemento
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      // Obtener la última parte (el array donde agregar)
      const lastPart = pathParts[pathParts.length - 1];
      if (!current[lastPart] || !Array.isArray(current[lastPart])) {
        current[lastPart] = [];
      }

      // Verificar si ya existe
      if (!current[lastPart].includes(value)) {
        current[lastPart].push(value);

        Logger.info("Nueva configuración a guardar:", newConfig);

        // Determinar el target basado en si hay workspace
        const target =
          vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0
            ? vscode.ConfigurationTarget.Workspace
            : vscode.ConfigurationTarget.Global;

        // Guardar la configuración completa
        await configuration.update("config", newConfig, target);

        // Verificar que se guardó correctamente
        const updatedConfig = vscode.workspace
          .getConfiguration("faststruct")
          .get("config");
        Logger.info("Configuración después de guardar:", updatedConfig);

        // Mostrar notificación si está habilitado
        if (newConfig.quickExclude?.showNotifications !== false) {
          const location =
            target === vscode.ConfigurationTarget.Workspace
              ? "proyecto"
              : "globalmente";
          vscode.window.showInformationMessage(
            `FastStruct: ${type} '${value}' agregado a exclusiones del ${location}`
          );
        }

        Logger.info(
          `Exclusión agregada exitosamente: ${type} = ${value} en ${configPath}`
        );
      } else {
        vscode.window.showWarningMessage(
          `FastStruct: '${value}' ya está en la lista de exclusiones`
        );
        Logger.info(`El valor '${value}' ya existe en ${configPath}`);
      }
    } catch (error) {
      Logger.error("Error al agregar exclusión", error);
      vscode.window.showErrorMessage(
        `Error al agregar exclusión: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Remueve una exclusión de la configuración.
   *
   * @param value - Valor a remover
   * @param configPath - Ruta en la configuración
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async removeExclusion(value: string, configPath: string) {
    const configuration = vscode.workspace.getConfiguration("faststruct");
    const config = configuration.get<FastStructConfig>(
      "config",
      {} as FastStructConfig
    );

    // Navegar a la propiedad correcta
    const pathParts = configPath.split(".");
    let current: any = config;

    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        return; // No existe la ruta
      }
      current = current[pathParts[i]];
    }

    const lastPart = pathParts[pathParts.length - 1];
    if (current[lastPart] && Array.isArray(current[lastPart])) {
      const index = current[lastPart].indexOf(value);
      if (index > -1) {
        current[lastPart].splice(index, 1);

        // Guardar configuración
        await configuration.update(
          "config",
          config,
          vscode.ConfigurationTarget.Workspace
        );

        vscode.window.showInformationMessage(
          `FastStruct: '${value}' removido de exclusiones`
        );

        Logger.info(`Exclusión removida: ${value}`);
      }
    }
  }

  /**
   * Muestra todas las exclusiones actuales.
   *
   * @author Pablo Contreras
   * @created 2025/01/31
   */
  async showExclusions() {
    const configuration = vscode.workspace.getConfiguration("faststruct");
    const config = configuration.get<FastStructConfig>(
      "config",
      {} as FastStructConfig
    );

    // Crear contenido para mostrar
    let content = "# FastStruct - Exclusiones Actuales\n\n";

    content += "## Exclusiones de Estructura\n\n";

    content += "### Carpetas\n";
    content +=
      config.exclude.folders.map((f) => `- ${f}`).join("\n") || "*Ninguna*";
    content += "\n\n";

    content += "### Archivos\n";
    content +=
      config.exclude.files.map((f) => `- ${f}`).join("\n") || "*Ninguna*";
    content += "\n\n";

    content += "### Exclusiones Avanzadas\n\n";

    content += "#### Patrones\n";
    content +=
      config.exclude.advanced.patterns.map((p) => `- ${p}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "#### Archivos Específicos\n";
    content +=
      config.exclude.advanced.specificFiles.map((f) => `- ${f}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "#### Carpetas Específicas\n";
    content +=
      config.exclude.advanced.specificFolders.map((f) => `- ${f}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "#### Expresiones Regulares\n";
    content +=
      config.exclude.advanced.regexPatterns.map((r) => `- ${r}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "## Exclusiones de Contenido\n\n";

    content += "### Archivos\n";
    content +=
      config.excludeContent.files.map((f) => `- ${f}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "### Carpetas\n";
    content +=
      config.excludeContent.folders.map((f) => `- ${f}`).join("\n") ||
      "*Ninguna*";
    content += "\n\n";

    content += "### Patrones\n";
    content +=
      config.excludeContent.patterns.map((p) => `- ${p}`).join("\n") ||
      "*Ninguna*";

    // Mostrar en un nuevo documento
    const document = await vscode.workspace.openTextDocument({
      content: content,
      language: "markdown",
    });

    await vscode.window.showTextDocument(document, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }
}

function log(message: string, config: FastStructConfig) {
  if (config.debug) {
    Logger.debug(message);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "faststruct" is now active!');
  Logger.info("FastStruct extension activada");
  Logger.show(); // Mostrar el canal de output para ver los logs

  // Crear el proveedor de webview para la configuración
  const configProvider = new ConfigWebviewProvider(context);

  // Crear el manejador de exclusiones
  const exclusionManager = new ExclusionManager(context);

  function getConfiguration(
    workspaceFolder?: vscode.WorkspaceFolder
  ): FastStructConfig {
    const config = vscode.workspace.getConfiguration(
      "faststruct",
      workspaceFolder?.uri
    );

    const configFile = config.get<FastStructConfig>(
      "config",
      {} as FastStructConfig
    );

    return {
      debug: configFile.debug || false,
      exclude: {
        folders: configFile.exclude?.folders || [],
        files: configFile.exclude?.files || [],
        advanced: {
          patterns: configFile.exclude?.advanced?.patterns || [],
          specificFiles: configFile.exclude?.advanced?.specificFiles || [],
          specificFolders: configFile.exclude?.advanced?.specificFolders || [],
          regexPatterns: configFile.exclude?.advanced?.regexPatterns || [],
        },
      },
      excludeContent: {
        files: configFile.excludeContent?.files || [],
        folders: configFile.excludeContent?.folders || [],
        patterns: configFile.excludeContent?.patterns || [],
      },
      quickExclude: configFile.quickExclude || {
        enabled: true,
        showNotifications: true,
      },
    };
  }

  function matchesRegexPatterns(itemPath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(itemPath);
      } catch (e) {
        return false;
      }
    });
  }

  function matchesSpecificPath(
    itemPath: string,
    specificPaths: string[],
    basePath: string
  ): boolean {
    const normalizedItemPath = path
      .normalize(path.relative(basePath, itemPath))
      .replace(/\\/g, "/");

    return specificPaths.some((specificPath) => {
      const normalizedSpecificPath = path
        .normalize(specificPath)
        .replace(/\\/g, "/");

      return (
        normalizedItemPath === normalizedSpecificPath ||
        normalizedItemPath.startsWith(normalizedSpecificPath + "/")
      );
    });
  }

  function shouldExclude(
    itemPath: string,
    name: string,
    type: "file" | "directory",
    config: FastStructConfig,
    basePath: string
  ): boolean {
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, "/");
    log(`Checking exclusion for: ${relativePath}`, config);

    const patterns =
      type === "directory" ? config.exclude.folders : config.exclude.files;
    const basicPatternMatch = patterns.some((pattern) => {
      if (
        pattern.includes("*") ||
        pattern.includes("?") ||
        pattern.includes("[")
      ) {
        const mm = new Minimatch(pattern);
        const matches = mm.match(name);
        if (matches) log(`Excluded by basic pattern: ${pattern}`, config);
        return matches;
      }
      const matches = name === pattern;
      if (matches) log(`Excluded by exact name match: ${pattern}`, config);
      return matches;
    });

    if (basicPatternMatch) return true;

    const { advanced } = config.exclude;

    if (
      type === "file" &&
      matchesSpecificPath(itemPath, advanced.specificFiles, basePath)
    ) {
      log(`Excluded by specific file match: ${relativePath}`, config);
      return true;
    }

    if (
      type === "directory" &&
      matchesSpecificPath(itemPath, advanced.specificFolders, basePath)
    ) {
      log(`Excluded by specific folder match: ${relativePath}`, config);
      return true;
    }

    if (matchesRegexPatterns(relativePath, advanced.regexPatterns)) {
      log(`Excluded by regex pattern: ${relativePath}`, config);
      return true;
    }

    const advancedPatternMatch = advanced.patterns.some((pattern) => {
      const mm = new Minimatch(pattern);
      const matches = mm.match(relativePath);
      if (matches) log(`Excluded by advanced pattern: ${pattern}`, config);
      return matches;
    });

    return advancedPatternMatch;
  }

  function shouldExcludeContent(
    itemPath: string,
    type: "file" | "directory",
    config: FastStructConfig,
    basePath: string
  ): boolean {
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, "/");
    if (type === "file" && config.excludeContent.files.includes(relativePath)) {
      log(`Content excluded by specific file match: ${relativePath}`, config);
      return true;
    }
    if (
      type === "directory" &&
      config.excludeContent.folders.includes(relativePath)
    ) {
      log(`Content excluded by specific folder match: ${relativePath}`, config);
      return true;
    }
    // Añadir verificación de patrones
    const matchesPattern = config.excludeContent.patterns.some((pattern) => {
      const mm = new Minimatch(pattern);
      const matches = mm.match(relativePath);
      if (matches) log(`Content excluded by pattern: ${pattern}`, config);
      return matches;
    });
    if (matchesPattern) {
      return true;
    }
    return false;
  }

  const BINARY_EXTENSIONS = new Set([
    ".ico",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".pdf",
    ".doc",
    ".docx",
    ".ppt",
    ".pptx",
    ".xls",
    ".xlsx",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".class",
    ".pyc",
    ".o",
    ".obj",
  ]);

  function readDirectoryStructure(
    dirPath: string,
    config: FastStructConfig,
    basePath: string = dirPath
  ): TreeItem[] {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const structure: TreeItem[] = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (
        shouldExclude(
          fullPath,
          item.name,
          item.isDirectory() ? "directory" : "file",
          config,
          basePath
        )
      ) {
        continue;
      }

      if (item.isDirectory()) {
        structure.push({
          name: item.name,
          type: "directory",
          children: readDirectoryStructure(fullPath, config, basePath),
          path: fullPath,
        });
      } else {
        structure.push({
          name: item.name,
          type: "file",
          path: fullPath,
        });
      }
    }

    return structure.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "directory" ? -1 : 1;
    });
  }

  function isFileBinary(filePath: string): boolean {
    try {
      // Lee solo los primeros bytes del archivo
      const buffer = Buffer.alloc(8);
      const fd = fs.openSync(filePath, "r");
      const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
      fs.closeSync(fd);

      // Verifica las firmas comunes de archivos binarios
      const signatures: { [key: string]: number[] } = {
        // Imágenes
        PNG: [0x89, 0x50, 0x4e, 0x47],
        GIF: [0x47, 0x49, 0x46, 0x38],
        JPEG: [0xff, 0xd8, 0xff],
        BMP: [0x42, 0x4d],
        WEBP: [0x52, 0x49, 0x46, 0x46],
        // Archivos comprimidos
        ZIP: [0x50, 0x4b, 0x03, 0x04],
        RAR: [0x52, 0x61, 0x72, 0x21],
        GZIP: [0x1f, 0x8b],
        // PDF
        PDF: [0x25, 0x50, 0x44, 0x46],
      };

      // Verifica las firmas conocidas
      for (const [_, signature] of Object.entries(signatures)) {
        if (signature.every((byte, i) => buffer[i] === byte)) {
          return true;
        }
      }

      // Verifica bytes nulos o caracteres de control
      for (let i = 0; i < bytesRead; i++) {
        if (buffer[i] === 0x00 || (buffer[i] < 0x09 && buffer[i] !== 0x0a)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      // Si hay algún error al leer el archivo, asumimos que es binario
      return true;
    }
  }

  function tryReadFile(filePath: string): {
    content: string | null;
    error?: string;
  } {
    try {
      // Primero verificamos si el archivo parece ser binario
      if (isFileBinary(filePath)) {
        return { content: null, error: "Binary file" };
      }

      // Si no es binario, intentamos leer el contenido como texto
      try {
        const content = fs.readFileSync(filePath, "utf8");

        // Última verificación para caracteres no imprimibles
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content)) {
          return { content: null, error: "Binary file" };
        }

        return { content };
      } catch {
        return { content: null, error: "Binary file" };
      }
    } catch (error) {
      return { content: null, error: "Binary file" };
    }
  }

  function generateFullOutput(
    items: TreeItem[],
    basePath: string,
    config: FastStructConfig,
    prefix = "",
    isLast = true
  ): string {
    let result = AI_STRUCTURE_GUIDE;
    result += generateTreeText(items, prefix, isLast);
    result += "\n\n";

    let fileContents = "";
    const processItems = (items: TreeItem[]) => {
      for (const item of items) {
        if (item.path) {
          const relativePath = path.relative(basePath, item.path);
          if (item.type === "file") {
            fileContents += `Path: ${relativePath}\n`;

            if (shouldExcludeContent(item.path, "file", config, basePath)) {
              fileContents += `Content: [Content excluded by configuration]\n\n`;
              continue;
            }

            const { content, error } = tryReadFile(item.path);
            if (error) {
              fileContents += `Content: [${error}]\n\n`;
            } else if (content !== null) {
              fileContents += `Content:\n\`\`\`\n${content}\n\`\`\`\n\n`;
            }
          }
          if (item.type === "directory" && item.children) {
            if (
              shouldExcludeContent(item.path, "directory", config, basePath)
            ) {
              fileContents += `Directory: ${relativePath}\n`;
              fileContents += `[Content of this directory is excluded by configuration]\n\n`;
              return;
            }
            processItems(item.children);
          }
        }
      }
    };

    processItems(items);
    result += fileContents;

    return result;
  }

  function generateTreeText(
    items: TreeItem[],
    prefix = "",
    isLast = true
  ): string {
    if (items.length === 0) return "";

    let result = "";

    items.forEach((item, index) => {
      const isLastItem = index === items.length - 1;
      const newPrefix = prefix + (isLastItem ? "    " : "│   ");

      result += prefix + (isLastItem ? "└── " : "├── ");

      if (item.type === "directory") {
        result += `📁${item.name}\n`;
        if (item.children) {
          result += generateTreeText(item.children, newPrefix, isLastItem);
        }
      } else {
        result += `${item.name}\n`;
      }
    });

    return result;
  }

  // Comando para crear la estructura
  const createStructureContextCommand = vscode.commands.registerCommand(
    "faststruct.createStructureContext",
    async (uri: vscode.Uri) => {
      if (!uri) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          uri = workspaceFolders[0].uri;
        } else {
          vscode.window.showErrorMessage(
            "No folder selected and no workspace folder found."
          );
          return;
        }
      }

      try {
        const folderPath = uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const config = getConfiguration(workspaceFolder);
        const structure = readDirectoryStructure(folderPath, config);
        const fullOutput = generateFullOutput(
          [
            {
              name: path.basename(folderPath),
              type: "directory",
              children: structure,
              path: folderPath,
            },
          ],
          folderPath,
          config
        );

        const document = await vscode.workspace.openTextDocument({
          content: fullOutput,
          language: "markdown",
        });

        await vscode.window.showTextDocument(document, {
          preview: false,
          viewColumn: vscode.ViewColumn.Beside,
        });

        vscode.window.showInformationMessage(
          `Structure generated for: ${path.basename(folderPath)}`
        );
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error generating structure: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        console.error("Error:", error);
      }
    }
  );

  // Comando para abrir la configuración
  const openSettingsCommand = vscode.commands.registerCommand(
    "faststruct.openSettings",
    () => {
      Logger.info("Comando openSettings ejecutado");
      configProvider.show();
    }
  );

  // Comando alternativo para crear estructura
  const createStructureCommand = vscode.commands.registerCommand(
    "faststruct.createStructure",
    async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        vscode.commands.executeCommand(
          "faststruct.createStructureContext",
          workspaceFolders[0].uri
        );
      } else {
        vscode.window.showErrorMessage("No workspace folder found.");
      }
    }
  );

  // Comando para verificar la ubicación de la configuración
  const checkConfigCommand = vscode.commands.registerCommand(
    "faststruct.checkConfig",
    () => {
      const configuration = vscode.workspace.getConfiguration("faststruct");
      const inspect = configuration.inspect("config");

      Logger.info("Inspección de configuración", inspect);

      const items: vscode.QuickPickItem[] = [];

      if (inspect?.globalValue) {
        items.push({
          label: "$(globe) Configuración Global",
          description: "Guardada en la configuración de usuario",
          detail:
            JSON.stringify(inspect.globalValue, null, 2).substring(0, 100) +
            "...",
        });
      }

      if (inspect?.workspaceValue) {
        items.push({
          label: "$(folder) Configuración de Workspace",
          description: "Guardada en .vscode/settings.json",
          detail:
            JSON.stringify(inspect.workspaceValue, null, 2).substring(0, 100) +
            "...",
        });
      }

      if (!inspect?.globalValue && !inspect?.workspaceValue) {
        items.push({
          label: "$(warning) Sin configuración personalizada",
          description: "Usando valores por defecto",
          detail: "No se ha guardado ninguna configuración todavía",
        });
      }

      vscode.window.showQuickPick(items, {
        placeHolder: "Ubicaciones de configuración de FastStruct",
        canPickMany: false,
      });
    }
  );

  // Comandos para exclusión de archivos
  const excludeFileCommand = vscode.commands.registerCommand(
    "faststruct.excludeFile",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      await exclusionManager.addExclusion(
        "Archivo específico",
        relativePath,
        "exclude.advanced.specificFiles"
      );
    }
  );

  const excludeFileExtensionCommand = vscode.commands.registerCommand(
    "faststruct.excludeFileExtension",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const extension = path.extname(uri.fsPath);
      if (!extension) {
        vscode.window.showWarningMessage("El archivo no tiene extensión");
        return;
      }

      const pattern = `*${extension}`;
      await exclusionManager.addExclusion(
        "Extensión de archivo",
        pattern,
        "exclude.files"
      );
    }
  );

  const excludeFileNameCommand = vscode.commands.registerCommand(
    "faststruct.excludeFileName",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const fileName = path.basename(uri.fsPath);
      await exclusionManager.addExclusion(
        "Nombre de archivo",
        fileName,
        "exclude.files"
      );
    }
  );

  const excludeFileContentCommand = vscode.commands.registerCommand(
    "faststruct.excludeFileContent",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      await exclusionManager.addExclusion(
        "Contenido de archivo",
        relativePath,
        "excludeContent.files"
      );
    }
  );

  const excludeFileTypeContentCommand = vscode.commands.registerCommand(
    "faststruct.excludeFileTypeContent",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const extension = path.extname(uri.fsPath);
      if (!extension) {
        vscode.window.showWarningMessage("El archivo no tiene extensión");
        return;
      }

      const pattern = `*${extension}`;
      await exclusionManager.addExclusion(
        "Contenido por extensión",
        pattern,
        "excludeContent.patterns"
      );
    }
  );

  const excludeFilePatternCommand = vscode.commands.registerCommand(
    "faststruct.excludeFilePattern",
    async () => {
      const pattern = await vscode.window.showInputBox({
        prompt: "Ingrese el patrón de archivos a excluir (ej: **/*.test.js)",
        placeHolder: "**/*.test.js",
        validateInput: (value) => {
          if (!value || value.trim() === "") {
            return "El patrón no puede estar vacío";
          }
          return null;
        },
      });

      if (pattern) {
        await exclusionManager.addExclusion(
          "Patrón de archivo",
          pattern,
          "exclude.advanced.patterns"
        );
      }
    }
  );

  // Comandos para exclusión de carpetas
  const excludeFolderCommand = vscode.commands.registerCommand(
    "faststruct.excludeFolder",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      await exclusionManager.addExclusion(
        "Carpeta específica",
        relativePath,
        "exclude.advanced.specificFolders"
      );
    }
  );

  const excludeFolderNameCommand = vscode.commands.registerCommand(
    "faststruct.excludeFolderName",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const folderName = path.basename(uri.fsPath);
      await exclusionManager.addExclusion(
        "Nombre de carpeta",
        folderName,
        "exclude.folders"
      );
    }
  );

  const excludeFolderContentCommand = vscode.commands.registerCommand(
    "faststruct.excludeFolderContent",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      await exclusionManager.addExclusion(
        "Contenido de carpeta",
        relativePath,
        "excludeContent.folders"
      );
    }
  );

  const excludeSubfoldersCommand = vscode.commands.registerCommand(
    "faststruct.excludeSubfolders",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      const pattern = `${relativePath}/**/`;

      await exclusionManager.addExclusion(
        "Subcarpetas",
        pattern,
        "exclude.advanced.patterns"
      );
    }
  );

  const excludeFolderPatternCommand = vscode.commands.registerCommand(
    "faststruct.excludeFolderPattern",
    async () => {
      const pattern = await vscode.window.showInputBox({
        prompt: "Ingrese el patrón de carpetas a excluir (ej: **/temp/)",
        placeHolder: "**/temp/",
        validateInput: (value) => {
          if (!value || value.trim() === "") {
            return "El patrón no puede estar vacío";
          }
          return null;
        },
      });

      if (pattern) {
        await exclusionManager.addExclusion(
          "Patrón de carpeta",
          pattern,
          "exclude.advanced.patterns"
        );
      }
    }
  );

  // Comandos para incluir (remover exclusiones)
  const includeFileCommand = vscode.commands.registerCommand(
    "faststruct.includeFile",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      const fileName = path.basename(uri.fsPath);

      // Buscar en todas las posibles ubicaciones y remover
      await exclusionManager.removeExclusion(
        relativePath,
        "exclude.advanced.specificFiles"
      );
      await exclusionManager.removeExclusion(fileName, "exclude.files");
      await exclusionManager.removeExclusion(
        relativePath,
        "excludeContent.files"
      );
    }
  );

  const includeFolderCommand = vscode.commands.registerCommand(
    "faststruct.includeFolder",
    async (uri: vscode.Uri) => {
      if (!uri) return;

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (!workspaceFolder) return;

      const relativePath = path
        .relative(workspaceFolder.uri.fsPath, uri.fsPath)
        .replace(/\\/g, "/");
      const folderName = path.basename(uri.fsPath);

      // Buscar en todas las posibles ubicaciones y remover
      await exclusionManager.removeExclusion(
        relativePath,
        "exclude.advanced.specificFolders"
      );
      await exclusionManager.removeExclusion(folderName, "exclude.folders");
      await exclusionManager.removeExclusion(
        relativePath,
        "excludeContent.folders"
      );
    }
  );

  // Comando para mostrar exclusiones
  const showExclusionsCommand = vscode.commands.registerCommand(
    "faststruct.showExclusions",
    async () => {
      await exclusionManager.showExclusions();
    }
  );

  // Comando para crear estructura con vista previa
  const createStructureWithPreviewCommand = vscode.commands.registerCommand(
    "faststruct.createStructureWithPreview",
    async (uri: vscode.Uri) => {
      if (!uri) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          uri = workspaceFolders[0].uri;
        } else {
          vscode.window.showErrorMessage(
            "No folder selected and no workspace folder found."
          );
          return;
        }
      }

      try {
        const folderPath = uri.fsPath;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const config = getConfiguration(workspaceFolder);

        // Mostrar lista de archivos que serán incluidos/excluidos
        const structure = readDirectoryStructure(folderPath, config);

        // Contar archivos y carpetas
        let fileCount = 0;
        let folderCount = 0;

        const countItems = (items: TreeItem[]) => {
          for (const item of items) {
            if (item.type === "file") {
              fileCount++;
            } else {
              folderCount++;
              if (item.children) {
                countItems(item.children);
              }
            }
          }
        };

        countItems(structure);

        const answer = await vscode.window.showInformationMessage(
          `Se generará la estructura con ${fileCount} archivos y ${folderCount} carpetas. ¿Continuar?`,
          "Sí, generar",
          "Ver configuración",
          "Cancelar"
        );

        if (answer === "Sí, generar") {
          await vscode.commands.executeCommand(
            "faststruct.createStructureContext",
            uri
          );
        } else if (answer === "Ver configuración") {
          await vscode.commands.executeCommand("faststruct.openSettings");
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          `Error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  // Registrar todos los comandos
  context.subscriptions.push(
    createStructureContextCommand,
    openSettingsCommand,
    createStructureCommand,
    checkConfigCommand,
    excludeFileCommand,
    excludeFileExtensionCommand,
    excludeFileNameCommand,
    excludeFileContentCommand,
    excludeFileTypeContentCommand,
    excludeFilePatternCommand,
    excludeFolderCommand,
    excludeFolderNameCommand,
    excludeFolderContentCommand,
    excludeSubfoldersCommand,
    excludeFolderPatternCommand,
    includeFileCommand,
    includeFolderCommand,
    showExclusionsCommand,
    createStructureWithPreviewCommand
  );
}

export function deactivate() {}
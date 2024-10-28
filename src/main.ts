import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Minimatch } from "minimatch";

// Interfaz para representar un item en la estructura
interface TreeItem {
  name: string;
  type: "file" | "directory";
  children?: TreeItem[];
  path?: string;
}

// Enhanced interface for exclusion configuration
interface ExclusionConfig {
  patterns: string[];      // Basic glob patterns (*.log, etc.)
  specificFiles: string[]; // Specific file paths (db/data.ts)
  specificFolders: string[]; // Specific folder paths (src/utils/)
  regexPatterns: string[]; // Regex patterns (src/**/*.md)
}

// Enhanced interface for the configuration
interface FastStructConfig {
  exclude: {
    folders: string[];
    files: string[];
    advanced: ExclusionConfig;
  };
}

function log(message: string) {
  const config = vscode.workspace.getConfiguration("faststruct");
  if (config.get("debug")) {
    console.log(`FastStruct: ${message}`);
  }
}

log("Enhanced Extension is now active!");

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "faststruct" is now active!');

  // Enhanced function to get configuration
  function getConfiguration(
    workspaceFolder?: vscode.WorkspaceFolder
  ): FastStructConfig {
    const config = vscode.workspace.getConfiguration(
      "faststruct",
      workspaceFolder?.uri
    );

    return {
      exclude: {
        folders: config.get<string[]>("exclude.folders", [
          "node_modules",
          ".git",
          "dist",
          "build",
        ]),
        files: config.get<string[]>("exclude.files", [
          "*.log",
          "*.lock",
          "package-lock.json",
        ]),
        advanced: {
          patterns: config.get<string[]>("exclude.advanced.patterns", []),
          specificFiles: config.get<string[]>(
            "exclude.advanced.specificFiles",
            []
          ),
          specificFolders: config.get<string[]>(
            "exclude.advanced.specificFolders",
            []
          ),
          regexPatterns: config.get<string[]>(
            "exclude.advanced.regexPatterns",
            []
          ),
        },
      },
    };
  }

  // Enhanced function to check if a path matches regex patterns
  function matchesRegexPatterns(itemPath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => {
      try {
        const regex = new RegExp(pattern);
        return regex.test(itemPath);
      } catch (e) {
        log(`Invalid regex pattern: ${pattern}`);
        return false;
      }
    });
  }

  // Enhanced function to check if a path matches specific paths
  function matchesSpecificPath(
    itemPath: string,
    specificPaths: string[],
    basePath: string
  ): boolean {
    // Normalize all paths and make them relative to basePath
    const normalizedItemPath = path
      .normalize(path.relative(basePath, itemPath))
      .replace(/\\/g, "/");

    return specificPaths.some((specificPath) => {
      // Normalize the specific path
      const normalizedSpecificPath = path
        .normalize(specificPath)
        .replace(/\\/g, "/");

      // Check for exact match or if the normalized item path starts with the specific path
      return (
        normalizedItemPath === normalizedSpecificPath ||
        normalizedItemPath.startsWith(normalizedSpecificPath + "/")
      );
    });
  }

  // Función para verificar si un item debe ser excluido
  function shouldExclude(
    itemPath: string,
    name: string,
    type: "file" | "directory",
    config: FastStructConfig,
    basePath: string
  ): boolean {
    // Get relative path for matching
    const relativePath = path.relative(basePath, itemPath).replace(/\\/g, "/");

    log(`Checking exclusion for: ${relativePath}`);

    // Check basic patterns first
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
        if (matches) log(`Excluded by basic pattern: ${pattern}`);
        return matches;
      }
      const matches = name === pattern;
      if (matches) log(`Excluded by exact name match: ${pattern}`);
      return matches;
    });

    if (basicPatternMatch) return true;

    // Check advanced exclusions
    const { advanced } = config.exclude;

    // Check specific files
    if (type === "file") {
      const fileMatch = matchesSpecificPath(
        itemPath,
        advanced.specificFiles,
        basePath
      );
      if (fileMatch) {
        log(`Excluded by specific file match: ${relativePath}`);
        return true;
      }
    }

    // Check specific folders
    if (type === "directory") {
      const folderMatch = matchesSpecificPath(
        itemPath,
        advanced.specificFolders,
        basePath
      );
      if (folderMatch) {
        log(`Excluded by specific folder match: ${relativePath}`);
        return true;
      }
    }

    // Check regex patterns
    if (matchesRegexPatterns(relativePath, advanced.regexPatterns)) {
      log(`Excluded by regex pattern: ${relativePath}`);
      return true;
    }

    // Check advanced patterns using minimatch
    const advancedPatternMatch = advanced.patterns.some((pattern) => {
      const mm = new Minimatch(pattern);
      const matches = mm.match(relativePath);
      if (matches) log(`Excluded by advanced pattern: ${pattern}`);
      return matches;
    });

    return advancedPatternMatch;
  }

  // Lista de extensiones conocidas de archivos binarios
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

  // Función para verificar si es un archivo binario basado en la extensión
  function isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
  }

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

  // Función para generar la representación en texto de la estructura y contenido
  function generateFullOutput(
    items: TreeItem[],
    basePath: string,
    prefix = "",
    isLast = true
  ): string {
    let result = "";

    // Primero generamos el árbol de directorios
    result += generateTreeText(items, prefix, isLast);
    result += "\n\n";

    // Luego agregamos el contenido de cada archivo
    let fileContents = "";
    const processItems = (items: TreeItem[]) => {
      for (const item of items) {
        if (item.path) {
          const relativePath = path.relative(basePath, item.path);
          if (item.type === "file") {
            fileContents += `Path: ${relativePath}\n`;
            if (isBinaryFile(item.path)) {
              fileContents += `Content: [Binary file]\n\n`;
            } else {
              try {
                const content = fs.readFileSync(item.path, "utf8");
                fileContents += `Content:\n\`\`\`\n${content}\n\`\`\`\n\n`;
              } catch (error) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                fileContents += `Content: [Error reading file: ${errorMessage}]\n\n`;
              }
            }
          }
          if (item.type === "directory" && item.children) {
            processItems(item.children);
          }
        }
      }
    };

    processItems(items);
    result += fileContents;

    return result;
  }

  // Función para generar la representación en texto de la estructura
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

  // Registro del comando para el menú contextual
  const createStructureContextCommand = vscode.commands.registerCommand(
    "faststruct.createStructureContext",
    async (uri: vscode.Uri) => {
      // Si no se proporciona URI, intentamos obtener el workspace actual
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
          folderPath
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

  context.subscriptions.push(createStructureContextCommand);
}

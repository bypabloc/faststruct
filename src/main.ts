import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as minimatch from "minimatch";

// Interfaz para representar un item en la estructura
interface TreeItem {
  name: string;
  type: "file" | "directory";
  children?: TreeItem[];
}

// Interfaz para la configuración
interface FastStructConfig {
  exclude: {
    folders: string[];
    files: string[];
  };
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "faststruct" is now active!');

  // Función para obtener la configuración
  function getConfiguration(
    workspaceFolder?: vscode.WorkspaceFolder
  ): FastStructConfig {
    const config = vscode.workspace.getConfiguration(
      "faststruct",
      workspaceFolder?.uri
    );
    return {
      exclude: config.get<FastStructConfig["exclude"]>("exclude", {
        folders: ["node_modules", ".git", "dist", "build"],
        files: ["*.log", "*.lock", "package-lock.json"],
      }),
    };
  }

  // Función para verificar si un item debe ser excluido
  function shouldExclude(
    name: string,
    type: "file" | "directory",
    config: FastStructConfig
  ): boolean {
    const patterns =
      type === "directory" ? config.exclude.folders : config.exclude.files;
    return patterns.some((pattern) => {
      // Si el patrón contiene caracteres especiales de glob, usa minimatch
      if (
        pattern.includes("*") ||
        pattern.includes("?") ||
        pattern.includes("[")
      ) {
        return minimatch(name, pattern);
      }
      // Si no, usa comparación directa
      return name === pattern;
    });
  }

  // Función para leer la estructura de directorios recursivamente
  function readDirectoryStructure(
    dirPath: string,
    config: FastStructConfig
  ): TreeItem[] {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const structure: TreeItem[] = [];

    for (const item of items) {
      // Verificar si el item debe ser excluido
      if (
        shouldExclude(
          item.name,
          item.isDirectory() ? "directory" : "file",
          config
        )
      ) {
        continue;
      }

      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        structure.push({
          name: item.name,
          type: "directory",
          children: readDirectoryStructure(fullPath, config),
        });
      } else {
        structure.push({
          name: item.name,
          type: "file",
        });
      }
    }

    // Ordenar: primero directorios, luego archivos, ambos alfabéticamente
    return structure.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      }
      return a.type === "directory" ? -1 : 1;
    });
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

      // Agregar emoji de carpeta para directorios
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
        if (vscode.workspace.workspaceFolders?.length > 0) {
          uri = vscode.workspace.workspaceFolders[0].uri;
        } else {
          vscode.window.showErrorMessage(
            "No folder selected and no workspace folder found."
          );
          return;
        }
      }

      try {
        // Obtener la ruta del directorio seleccionado
        const folderPath = uri.fsPath;

        // Obtener la configuración para el workspace actual
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
        const config = getConfiguration(workspaceFolder);

        // Leer la estructura del directorio
        const structure = readDirectoryStructure(folderPath, config);

        // Generar el texto del árbol
        const treeText = generateTreeText([
          {
            name: path.basename(folderPath),
            type: "directory",
            children: structure,
          },
        ]);

        // Crear un nuevo documento con la estructura
        const document = await vscode.workspace.openTextDocument({
          content: treeText,
          language: "plaintext",
        });

        // Mostrar el documento
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

  // Agregar los comandos al contexto de subscripciones
  context.subscriptions.push(createStructureContextCommand);
}
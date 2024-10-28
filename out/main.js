"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const minimatch = require("minimatch");
function log(message) {
    const config = vscode.workspace.getConfiguration("faststruct");
    if (config.get("debug")) {
        console.log(`FastStruct: ${message}`);
    }
}
log("Extension is now active!");
function activate(context) {
    console.log('Congratulations, your extension "faststruct" is now active!');
    // Función para obtener la configuración
    function getConfiguration(workspaceFolder) {
        const config = vscode.workspace.getConfiguration("faststruct", workspaceFolder?.uri);
        return {
            exclude: config.get("exclude", {
                folders: ["node_modules", ".git", "dist", "build"],
                files: ["*.log", "*.lock", "package-lock.json"],
            }),
        };
    }
    // Función para verificar si un item debe ser excluido
    function shouldExclude(name, type, config) {
        const patterns = type === "directory" ? config.exclude.folders : config.exclude.files;
        return patterns.some((pattern) => {
            if (pattern.includes("*") ||
                pattern.includes("?") ||
                pattern.includes("[")) {
                return minimatch(name, pattern);
            }
            return name === pattern;
        });
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
    function isBinaryFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return BINARY_EXTENSIONS.has(ext);
    }
    // Función para leer la estructura de directorios recursivamente
    function readDirectoryStructure(dirPath, config) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const structure = [];
        for (const item of items) {
            if (shouldExclude(item.name, item.isDirectory() ? "directory" : "file", config)) {
                continue;
            }
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                structure.push({
                    name: item.name,
                    type: "directory",
                    children: readDirectoryStructure(fullPath, config),
                    path: fullPath,
                });
            }
            else {
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
    function generateFullOutput(items, basePath, prefix = "", isLast = true) {
        let result = "";
        // Primero generamos el árbol de directorios
        result += generateTreeText(items, prefix, isLast);
        result += "\n\n";
        // Luego agregamos el contenido de cada archivo
        let fileContents = "";
        const processItems = (items) => {
            for (const item of items) {
                if (item.path) {
                    const relativePath = path.relative(basePath, item.path);
                    if (item.type === "file") {
                        fileContents += `Path: ${relativePath}\n`;
                        if (isBinaryFile(item.path)) {
                            fileContents += `Content: [Binary file]\n\n`;
                        }
                        else {
                            try {
                                const content = fs.readFileSync(item.path, "utf8");
                                fileContents += `Content:\n\`\`\`\n${content}\n\`\`\`\n\n`;
                            }
                            catch (error) {
                                const errorMessage = error instanceof Error ? error.message : String(error);
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
    function generateTreeText(items, prefix = "", isLast = true) {
        if (items.length === 0)
            return "";
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
            }
            else {
                result += `${item.name}\n`;
            }
        });
        return result;
    }
    // Registro del comando para el menú contextual
    const createStructureContextCommand = vscode.commands.registerCommand("faststruct.createStructureContext", async (uri) => {
        // Si no se proporciona URI, intentamos obtener el workspace actual
        if (!uri) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                uri = workspaceFolders[0].uri;
            }
            else {
                vscode.window.showErrorMessage("No folder selected and no workspace folder found.");
                return;
            }
        }
        try {
            const folderPath = uri.fsPath;
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
            const config = getConfiguration(workspaceFolder);
            const structure = readDirectoryStructure(folderPath, config);
            const fullOutput = generateFullOutput([
                {
                    name: path.basename(folderPath),
                    type: "directory",
                    children: structure,
                    path: folderPath,
                },
            ], folderPath);
            const document = await vscode.workspace.openTextDocument({
                content: fullOutput,
                language: "markdown",
            });
            await vscode.window.showTextDocument(document, {
                preview: false,
                viewColumn: vscode.ViewColumn.Beside,
            });
            vscode.window.showInformationMessage(`Structure generated for: ${path.basename(folderPath)}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error generating structure: ${error instanceof Error ? error.message : String(error)}`);
            console.error("Error:", error);
        }
    });
    context.subscriptions.push(createStructureContextCommand);
}
//# sourceMappingURL=main.js.map
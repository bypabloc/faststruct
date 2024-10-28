"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const minimatch_1 = require("minimatch");
function log(message) {
    const config = vscode.workspace.getConfiguration("faststruct");
    if (config.get("debug")) {
        console.log(`FastStruct: ${message}`);
    }
}
log("Enhanced Extension is now active!");
function activate(context) {
    console.log('Congratulations, your extension "faststruct" is now active!');
    // Enhanced function to get configuration
    function getConfiguration(workspaceFolder) {
        const config = vscode.workspace.getConfiguration("faststruct", workspaceFolder?.uri);
        return {
            exclude: {
                folders: config.get("exclude.folders", [
                    "node_modules",
                    ".git",
                    "dist",
                    "build",
                ]),
                files: config.get("exclude.files", [
                    "*.log",
                    "*.lock",
                    "package-lock.json",
                ]),
                advanced: {
                    patterns: config.get("exclude.advanced.patterns", []),
                    specificFiles: config.get("exclude.advanced.specificFiles", []),
                    specificFolders: config.get("exclude.advanced.specificFolders", []),
                    regexPatterns: config.get("exclude.advanced.regexPatterns", []),
                },
            },
        };
    }
    // Enhanced function to check if a path matches regex patterns
    function matchesRegexPatterns(itemPath, patterns) {
        return patterns.some((pattern) => {
            try {
                const regex = new RegExp(pattern);
                return regex.test(itemPath);
            }
            catch (e) {
                log(`Invalid regex pattern: ${pattern}`);
                return false;
            }
        });
    }
    // Enhanced function to check if a path matches specific paths
    function matchesSpecificPath(itemPath, specificPaths, basePath) {
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
            return (normalizedItemPath === normalizedSpecificPath ||
                normalizedItemPath.startsWith(normalizedSpecificPath + "/"));
        });
    }
    // Función para verificar si un item debe ser excluido
    function shouldExclude(itemPath, name, type, config, basePath) {
        // Get relative path for matching
        const relativePath = path.relative(basePath, itemPath).replace(/\\/g, "/");
        log(`Checking exclusion for: ${relativePath}`);
        // Check basic patterns first
        const patterns = type === "directory" ? config.exclude.folders : config.exclude.files;
        const basicPatternMatch = patterns.some((pattern) => {
            if (pattern.includes("*") ||
                pattern.includes("?") ||
                pattern.includes("[")) {
                const mm = new minimatch_1.Minimatch(pattern);
                const matches = mm.match(name);
                if (matches)
                    log(`Excluded by basic pattern: ${pattern}`);
                return matches;
            }
            const matches = name === pattern;
            if (matches)
                log(`Excluded by exact name match: ${pattern}`);
            return matches;
        });
        if (basicPatternMatch)
            return true;
        // Check advanced exclusions
        const { advanced } = config.exclude;
        // Check specific files
        if (type === "file") {
            const fileMatch = matchesSpecificPath(itemPath, advanced.specificFiles, basePath);
            if (fileMatch) {
                log(`Excluded by specific file match: ${relativePath}`);
                return true;
            }
        }
        // Check specific folders
        if (type === "directory") {
            const folderMatch = matchesSpecificPath(itemPath, advanced.specificFolders, basePath);
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
            const mm = new minimatch_1.Minimatch(pattern);
            const matches = mm.match(relativePath);
            if (matches)
                log(`Excluded by advanced pattern: ${pattern}`);
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
    function isBinaryFile(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return BINARY_EXTENSIONS.has(ext);
    }
    function readDirectoryStructure(dirPath, config, basePath = dirPath) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        const structure = [];
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (shouldExclude(fullPath, item.name, item.isDirectory() ? "directory" : "file", config, basePath)) {
                continue;
            }
            if (item.isDirectory()) {
                structure.push({
                    name: item.name,
                    type: "directory",
                    children: readDirectoryStructure(fullPath, config, basePath),
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
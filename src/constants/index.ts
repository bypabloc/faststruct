/**
 * Constantes globales para FastStruct.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

/**
 * Guía de estructura con contenido para IA.
 */
export const AI_STRUCTURE_GUIDE = `# AI File Structure Analysis Guide

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
 * Guía de estructura sin contenido.
 */
export const STRUCTURE_ONLY_GUIDE = `# Project Structure

This output shows the file and folder structure of the project.

## Structure Format
- 📁 indicates directories
- Files are shown without icons
- └── marks the last item in a group
- ├── marks items with more siblings
- │   shows the vertical structure continuation

---
Structure follows below:

`;

/**
 * Extensiones de archivos binarios conocidos.
 */
export const BINARY_EXTENSIONS = new Set([
  // Imágenes
  '.ico', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg',
  '.tiff', '.tif', '.psd', '.raw', '.heif', '.heic',
  
  // Documentos
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx',
  '.odt', '.ods', '.odp',
  
  // Archivos comprimidos
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.iso', '.dmg',
  
  // Ejecutables y librerías
  '.exe', '.dll', '.so', '.dylib', '.app', '.deb', '.rpm',
  '.msi', '.pkg',
  
  // Compilados
  '.class', '.pyc', '.pyo', '.o', '.obj', '.pdb',
  '.wasm',
  
  // Multimedia
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv',
  '.wav', '.flac', '.aac', '.ogg', '.wma',
  
  // Fuentes
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  
  // Bases de datos
  '.db', '.sqlite', '.sqlite3', '.mdb',
  
  // Otros
  '.bin', '.dat', '.data'
]);

/**
 * Plantillas de exclusión predefinidas para diferentes tipos de proyectos.
 */
export const PROJECT_TEMPLATES = {
  node: {
    folders: ['node_modules', '.git', 'dist', 'build', 'coverage', '.npm', '.yarn'],
    files: ['*.log', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', 'package-lock.json', 'yarn.lock'],
    patterns: ['**/*.min.js', '**/*.map', '**/bundle.js']
  },
  python: {
    folders: ['__pycache__', '.git', 'venv', 'env', '.pytest_cache', '.mypy_cache', 'build', 'dist'],
    files: ['*.pyc', '*.pyo', '*.pyd', '.Python', '*.so', '*.egg-info'],
    patterns: ['**/__pycache__/**', '**/*.egg-info/**']
  },
  java: {
    folders: ['.git', 'target', 'out', 'build', '.gradle', '.idea', '.mvn'],
    files: ['*.class', '*.jar', '*.war', '*.ear', '.classpath', '.project'],
    patterns: ['**/target/**', '**/build/**']
  },
  dotnet: {
    folders: ['.git', 'bin', 'obj', '.vs', 'packages', 'TestResults'],
    files: ['*.dll', '*.exe', '*.pdb', '*.user', '*.cache'],
    patterns: ['**/bin/**', '**/obj/**']
  }
};

/**
 * Comandos de FastStruct.
 */
export const COMMANDS = {
  // Estructura
  CREATE_STRUCTURE: 'faststruct.createStructure',
  CREATE_STRUCTURE_CONTEXT: 'faststruct.createStructureContext',
  CREATE_STRUCTURE_ONLY: 'faststruct.createStructureOnly',
  CREATE_STRUCTURE_CHOOSE: 'faststruct.createStructureChoose',
  CREATE_STRUCTURE_WITH_PREVIEW: 'faststruct.createStructureWithPreview',
  
  // Configuración
  OPEN_SETTINGS: 'faststruct.openSettings',
  CHECK_CONFIG: 'faststruct.checkConfig',
  EXPORT_CONFIG: 'faststruct.exportConfig',
  IMPORT_CONFIG: 'faststruct.importConfig',
  RESET_CONFIG: 'faststruct.resetConfig',
  
  // Exclusiones de archivos
  EXCLUDE_FILE: 'faststruct.excludeFile',
  EXCLUDE_FILE_EXTENSION: 'faststruct.excludeFileExtension',
  EXCLUDE_FILE_NAME: 'faststruct.excludeFileName',
  EXCLUDE_FILE_CONTENT: 'faststruct.excludeFileContent',
  EXCLUDE_FILE_TYPE_CONTENT: 'faststruct.excludeFileTypeContent',
  EXCLUDE_FILE_PATTERN: 'faststruct.excludeFilePattern',
  
  // Exclusiones de carpetas
  EXCLUDE_FOLDER: 'faststruct.excludeFolder',
  EXCLUDE_FOLDER_NAME: 'faststruct.excludeFolderName',
  EXCLUDE_FOLDER_CONTENT: 'faststruct.excludeFolderContent',
  EXCLUDE_SUBFOLDERS: 'faststruct.excludeSubfolders',
  EXCLUDE_FOLDER_PATTERN: 'faststruct.excludeFolderPattern',
  
  // Inclusiones
  INCLUDE_FILE: 'faststruct.includeFile',
  INCLUDE_FOLDER: 'faststruct.includeFolder',
  
  // Otros
  SHOW_EXCLUSIONS: 'faststruct.showExclusions',
  HEALTH_CHECK: 'faststruct.healthCheck'
};
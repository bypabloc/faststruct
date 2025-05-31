/**
 * Utilidades para manejo de archivos.
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */

/**
 * Formatea el tamaño de archivo en una unidad legible.
 * 
 * @param bytes - Tamaño en bytes
 * @returns Tamaño formateado (ej: "1.5 MB")
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Obtiene el tipo MIME basado en la extensión del archivo.
 * 
 * @param extension - Extensión del archivo (con o sin punto)
 * @returns Tipo MIME o 'text/plain' por defecto
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function getMimeType(extension: string): string {
  const ext = extension.toLowerCase().replace(/^\./, '');
  
  const mimeTypes: { [key: string]: string } = {
    // Texto
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'xml': 'application/xml',
    'yaml': 'application/x-yaml',
    'yml': 'application/x-yaml',
    
    // Código
    'js': 'text/javascript',
    'ts': 'text/typescript',
    'jsx': 'text/jsx',
    'tsx': 'text/tsx',
    'py': 'text/x-python',
    'java': 'text/x-java',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'cs': 'text/x-csharp',
    'php': 'text/x-php',
    'rb': 'text/x-ruby',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'swift': 'text/x-swift',
    'kt': 'text/x-kotlin',
    
    // Web
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    'scss': 'text/x-scss',
    'sass': 'text/x-sass',
    'less': 'text/x-less',
    
    // Shell
    'sh': 'text/x-sh',
    'bash': 'text/x-sh',
    'zsh': 'text/x-sh',
    'fish': 'text/x-sh',
    'ps1': 'text/x-powershell',
    'bat': 'text/x-bat',
    'cmd': 'text/x-bat',
    
    // Configuración
    'ini': 'text/x-ini',
    'toml': 'text/x-toml',
    'properties': 'text/x-properties',
    'env': 'text/plain',
    
    // Documentos
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Imágenes
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    
    // Video
    'mp4': 'video/mp4',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'wmv': 'video/x-ms-wmv',
    'mkv': 'video/x-matroska',
    
    // Archivos comprimidos
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'bz2': 'application/x-bzip2',
    
    // Otros
    'exe': 'application/x-msdownload',
    'dll': 'application/x-msdownload',
    'so': 'application/x-sharedlib',
    'dylib': 'application/x-sharedlib'
  };
  
  return mimeTypes[ext] || 'text/plain';
}

/**
 * Verifica si un archivo es de texto basándose en su extensión.
 * 
 * @param extension - Extensión del archivo
 * @returns true si es un archivo de texto
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function isTextFile(extension: string): boolean {
  const mimeType = getMimeType(extension);
  return mimeType.startsWith('text/') || 
         mimeType === 'application/json' ||
         mimeType === 'application/xml' ||
         mimeType === 'application/x-yaml';
}

/**
 * Sanitiza un nombre de archivo removiendo caracteres no válidos.
 * 
 * @param filename - Nombre de archivo a sanitizar
 * @returns Nombre de archivo sanitizado
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function sanitizeFilename(filename: string): string {
  // Remover caracteres no válidos para sistemas de archivos
  return filename.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
}

/**
 * Obtiene la fecha de modificación formateada.
 * 
 * @param date - Fecha a formatear
 * @returns Fecha formateada en formato local
 * @author Pablo Contreras
 * @created 2025/01/31
 */
export function formatModifiedDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
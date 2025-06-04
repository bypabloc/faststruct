#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Arreglando exports en archivos JS...');

const filesToFix = [
  'out/main.js',
  'out/main.simple.js',
  'out/main.hybrid.js'
];

filesToFix.forEach(filePath => {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Buscar y remover exports prematuros
  const exportRegex = /exports\.(activate|deactivate)\s*=\s*(activate|deactivate);?\n?/g;
  
  // Extraer las líneas de export
  const exports = [];
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[0].trim());
  }
  
  // Remover exports prematuros
  content = content.replace(exportRegex, '');
  
  // Agregar exports al final (antes del sourcemap)
  if (exports.length > 0) {
    const sourcemapRegex = /(\/\/# sourceMappingURL=.*$)/m;
    const uniqueExports = [...new Set(exports)]; // Remover duplicados
    const exportsBlock = uniqueExports.join('\n') + '\n';
    
    if (sourcemapRegex.test(content)) {
      content = content.replace(sourcemapRegex, exportsBlock + '$1');
    } else {
      content += '\n' + exportsBlock;
    }
    
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Arreglado: ${filePath} (${uniqueExports.length} exports movidos)`);
  } else {
    console.log(`ℹ️  No se encontraron exports para mover en: ${filePath}`);
  }
});

console.log('✅ Proceso de arreglo completado');
const fs = require('fs');
const path = require('path');

// Verificar si los archivos compilados tienen los imports correctos
const mainJsPath = path.join(__dirname, '..', 'out', 'main.js');
const loggerJsPath = path.join(__dirname, '..', 'out', 'logger.js');

console.log('=== ANÁLISIS DE COMPILACIÓN ===');
console.log();

// Verificar main.js
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');
  
  console.log('✓ main.js existe');
  
  // Verificar que no hay imports "@/" sin resolver
  const aliasImports = mainContent.match(/@\//g);
  if (aliasImports) {
    console.log('❌ main.js tiene imports "@/" sin resolver:', aliasImports.length);
  } else {
    console.log('✓ main.js no tiene imports "@/" sin resolver');
  }
  
  // Verificar que el import del logger está correcto
  if (mainContent.includes('require("./logger")')) {
    console.log('✓ main.js importa logger correctamente');
  } else {
    console.log('❌ main.js no importa logger correctamente');
  }
  
  // Verificar que Logger.info está siendo llamado
  if (mainContent.includes('logger_1.Logger.info')) {
    console.log('✓ main.js llama a Logger.info');
  } else {
    console.log('❌ main.js no llama a Logger.info');
  }
  
  // Verificar que Logger.show está siendo llamado
  if (mainContent.includes('logger_1.Logger.show')) {
    console.log('✓ main.js llama a Logger.show');
  } else {
    console.log('❌ main.js no llama a Logger.show');
  }
} else {
  console.log('❌ main.js no existe');
}

console.log();

// Verificar logger.js
if (fs.existsSync(loggerJsPath)) {
  const loggerContent = fs.readFileSync(loggerJsPath, 'utf8');
  
  console.log('✓ logger.js existe');
  
  // Verificar que isDebugEnabled existe
  if (loggerContent.includes('isDebugEnabled')) {
    console.log('✓ logger.js tiene función isDebugEnabled');
  } else {
    console.log('❌ logger.js no tiene función isDebugEnabled');
  }
  
  // Verificar que la configuración se lee correctamente
  if (loggerContent.includes('vscode.workspace.getConfiguration')) {
    console.log('✓ logger.js lee configuración de VS Code');
  } else {
    console.log('❌ logger.js no lee configuración de VS Code');
  }
  
  // Verificar que existe la función show
  if (loggerContent.includes('static show()')) {
    console.log('✓ logger.js tiene función show()');
  } else {
    console.log('❌ logger.js no tiene función show()');
  }
} else {
  console.log('❌ logger.js no existe');
}

console.log();

console.log('=== RESUMEN DE ANÁLISIS ===');
console.log('1. Verifica que tsc-alias está funcionando correctamente');
console.log('2. Los imports "@/" se están resolviendo a rutas relativas');
console.log('3. El logger debería funcionar si debug está habilitado en la configuración');
console.log();
console.log('Para activar logs:');
console.log('1. Abre VS Code Settings (Ctrl+,)');
console.log('2. Busca "faststruct"');
console.log('3. Edita faststruct.config.debug y ponlo en true');
console.log('4. O ejecuta el comando "FastStruct: Health Check"');
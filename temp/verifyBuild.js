const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando build de FastStruct...\n');

// Verificar que existe el directorio out
const outDir = path.join(__dirname, '..', 'out');
if (!fs.existsSync(outDir)) {
    console.error('❌ ERROR: No existe el directorio "out". Ejecuta "pnpm run compile" primero.');
    process.exit(1);
}

// Archivos críticos que deben existir
const criticalFiles = [
    'main.js',
    'logger.js',
    'services/CommandRegistrationService.js',
    'services/StructureGeneratorService.js',
    'services/ConfigurationService.js',
    'templates/webview/configWebview.html',
    'templates/webview/configWebview.css',
    'templates/webview/configWebview.js'
];

let hasErrors = false;

console.log('📁 Verificando archivos críticos:\n');
criticalFiles.forEach(file => {
    const filePath = path.join(outDir, file);
    if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`✅ ${file} (${stats.size} bytes)`);
    } else {
        console.error(`❌ FALTA: ${file}`);
        hasErrors = true;
    }
});

// Verificar que no hay archivos .ts en out (solo .d.ts)
console.log('\n📝 Verificando que no hay archivos TypeScript sin compilar:\n');
function checkForTsFiles(dir, basePath = '') {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const relativePath = path.join(basePath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            checkForTsFiles(fullPath, relativePath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            console.error(`❌ Archivo .ts encontrado: ${relativePath}`);
            hasErrors = true;
        }
    });
}

checkForTsFiles(outDir);

// Verificar package.json
console.log('\n📦 Verificando package.json:\n');
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (packageJson.main === './out/main.js') {
    console.log('✅ main apunta correctamente a ./out/main.js');
} else {
    console.error(`❌ main apunta a: ${packageJson.main} (debería ser ./out/main.js)`);
    hasErrors = true;
}

// Resultado final
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.error('\n❌ Build tiene errores. Revisa los mensajes anteriores.');
    process.exit(1);
} else {
    console.log('\n✅ Build verificado correctamente. Listo para empaquetar.');
}
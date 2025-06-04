#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Leer package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const vsixName = `${packageJson.name}-${packageJson.version}.vsix`;

console.log('🚀 FastStruct - Build Local');
console.log('==========================\n');

try {
    // 1. Compilar
    console.log('📦 Compilando TypeScript...');
    execSync('pnpm run compile', { stdio: 'inherit' });
    console.log('✅ Compilación completada\n');

    // 2. Empaquetar
    console.log('📦 Creando VSIX...');
    execSync('pnpm run package', { stdio: 'inherit' });
    console.log(`✅ VSIX creado: ${vsixName}\n`);

    // 3. Instalar localmente
    console.log('🔧 Instalando extensión localmente...');
    execSync(`code --install-extension ${vsixName}`, { stdio: 'inherit' });
    console.log('✅ Extensión instalada exitosamente\n');

    console.log('🎉 ¡Listo! FastStruct ha sido compilado e instalado localmente.');
    console.log('📝 Para probar los cambios, recarga la ventana de VS Code con:');
    console.log('   - Ctrl+Shift+P (Cmd+Shift+P en Mac)');
    console.log('   - Escribir "Developer: Reload Window"');
    console.log('   - Presionar Enter\n');

} catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
    process.exit(1);
}
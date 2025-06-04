#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Leer package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Guardar versión original
const originalVersion = packageJson.version;

// Incrementar versión patch
const versionParts = originalVersion.split('.');
const newPatchVersion = parseInt(versionParts[2]) + 1;
const newVersion = `${versionParts[0]}.${versionParts[1]}.${newPatchVersion}`;

console.log('🚀 FastStruct - Build Local');
console.log('==========================\n');

let vsixName = '';

try {
    // 1. Actualizar versión temporalmente
    console.log(`📝 Actualizando versión: ${originalVersion} → ${newVersion}`);
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Versión actualizada temporalmente\n');

    // Actualizar nombre del archivo VSIX con la nueva versión
    vsixName = `${packageJson.name}-${newVersion}.vsix`;

    // 2. Compilar
    console.log('📦 Compilando TypeScript...');
    execSync('pnpm run compile', { stdio: 'inherit' });
    console.log('✅ Compilación completada\n');

    // 3. Empaquetar
    console.log('📦 Creando VSIX...');
    execSync('pnpm run package', { stdio: 'inherit' });
    console.log(`✅ VSIX creado: ${vsixName}\n`);

    // 4. Instalar localmente
    console.log('🔧 Instalando extensión localmente...');
    execSync(`code --install-extension ${vsixName}`, { stdio: 'inherit' });
    console.log('✅ Extensión instalada exitosamente\n');

    // 5. Restaurar versión original
    console.log(`📝 Restaurando versión original: ${newVersion} → ${originalVersion}`);
    packageJson.version = originalVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Versión restaurada\n');

    // 6. Eliminar archivo VSIX
    console.log(`🗑️  Eliminando archivo VSIX: ${vsixName}`);
    const vsixPath = path.join(__dirname, '..', vsixName);
    if (fs.existsSync(vsixPath)) {
        fs.unlinkSync(vsixPath);
        console.log('✅ Archivo VSIX eliminado\n');
    }

    console.log('🎉 ¡Listo! FastStruct ha sido compilado e instalado localmente.');
    console.log('📝 Para probar los cambios, recarga la ventana de VS Code con:');
    console.log('   - Ctrl+Shift+P (Cmd+Shift+P en Mac)');
    console.log('   - Escribir "Developer: Reload Window"');
    console.log('   - Presionar Enter\n');

} catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
    
    // Intentar restaurar la versión original en caso de error
    try {
        console.log('🔧 Intentando restaurar versión original...');
        packageJson.version = originalVersion;
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
        console.log('✅ Versión original restaurada');
    } catch (restoreError) {
        console.error('❌ Error al restaurar versión:', restoreError.message);
    }

    // Intentar eliminar el archivo VSIX si existe
    if (vsixName) {
        try {
            const vsixPath = path.join(__dirname, '..', vsixName);
            if (fs.existsSync(vsixPath)) {
                fs.unlinkSync(vsixPath);
                console.log('✅ Archivo VSIX eliminado');
            }
        } catch (cleanupError) {
            console.error('❌ Error al eliminar VSIX:', cleanupError.message);
        }
    }

    process.exit(1);
}
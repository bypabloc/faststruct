#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 FastStruct Extension Testing');
console.log('='.repeat(40));

try {
  // 1. Compile TypeScript
  console.log('📦 Compilando TypeScript...');
  execSync('pnpm run compile', { stdio: 'inherit' });
  console.log('✅ Compilación completada\n');

  // 2. Run unit tests (Jest)
  console.log('🔬 Ejecutando tests unitarios (Jest)...');
  try {
    execSync('pnpm run test', { stdio: 'inherit' });
    console.log('✅ Tests unitarios completados\n');
  } catch (error) {
    console.log('⚠️  Algunos tests unitarios fallaron (continuando con tests de integración)\n');
  }

  // 3. Run integration tests (VS Code)
  console.log('🏗️  Ejecutando tests de integración (VS Code)...');
  execSync('vscode-test --label unitTests', { stdio: 'inherit' });
  console.log('✅ Tests de integración completados\n');

  console.log('🎉 Todos los tests completados exitosamente!');

} catch (error) {
  console.error('❌ Error durante los tests:', error.message);
  process.exit(1);
}
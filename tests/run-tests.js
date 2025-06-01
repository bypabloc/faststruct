/**
 * Script para ejecutar tests con opciones personalizadas
 * 
 * @author Pablo Contreras
 * @created 2025/01/31
 */
const { spawn } = require('child_process');
const path = require('path');

// Parsear argumentos de línea de comandos
const args = process.argv.slice(2);
const command = args[0] || 'test';

// Configuración de comandos
const commands = {
  'test': {
    cmd: 'jest',
    args: []
  },
  'test:watch': {
    cmd: 'jest',
    args: ['--watch']
  },
  'test:coverage': {
    cmd: 'jest',
    args: ['--coverage']
  },
  'test:unit': {
    cmd: 'jest',
    args: ['--testPathPattern=tests/.*\\.test\\.ts$']
  },
  'test:debug': {
    cmd: 'node',
    args: ['--inspect-brk', './node_modules/.bin/jest', '--runInBand']
  },
  'test:file': {
    cmd: 'jest',
    args: [args[1] || '']
  },
  'test:verbose': {
    cmd: 'jest',
    args: ['--verbose']
  }
};

// Función para ejecutar comando
function runCommand(commandName) {
  const config = commands[commandName];
  
  if (!config) {
    console.error(`Comando desconocido: ${commandName}`);
    console.log('\nComandos disponibles:');
    Object.keys(commands).forEach(cmd => {
      console.log(`  - ${cmd}`);
    });
    process.exit(1);
  }
  
  console.log(`\n🧪 Ejecutando: ${commandName}\n`);
  
  // Configurar variables de entorno
  const env = { ...process.env };
  
  // Agregar flags adicionales si se proporcionan
  const additionalArgs = args.slice(commandName === 'test:file' ? 2 : 1);
  const finalArgs = [...config.args, ...additionalArgs];
  
  // Ejecutar comando
  const child = spawn(config.cmd, finalArgs, {
    stdio: 'inherit',
    shell: true,
    env
  });
  
  child.on('error', (error) => {
    console.error(`Error ejecutando tests: ${error.message}`);
    process.exit(1);
  });
  
  child.on('close', (code) => {
    if (code !== 0) {
      console.error(`\n❌ Tests fallaron con código: ${code}`);
    } else {
      console.log('\n✅ Tests completados exitosamente');
    }
    process.exit(code);
  });
}

// Mostrar ayuda si se solicita
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
FastStruct Test Runner
======================

Uso: node tests/run-tests.js [comando] [opciones]

Comandos:
  test              Ejecutar todos los tests
  test:watch        Ejecutar tests en modo watch
  test:coverage     Ejecutar tests con cobertura
  test:unit         Ejecutar solo tests unitarios
  test:debug        Ejecutar tests en modo debug
  test:file <path>  Ejecutar tests de un archivo específico
  test:verbose      Ejecutar tests con salida detallada

Ejemplos:
  node tests/run-tests.js test
  node tests/run-tests.js test:file tests/services/ConfigurationService.test.ts
  node tests/run-tests.js test:coverage --silent
  
Opciones adicionales:
  Cualquier opción de Jest puede ser agregada después del comando
  `);
  process.exit(0);
}

// Ejecutar comando
runCommand(command);
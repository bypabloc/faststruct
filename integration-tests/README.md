# FastStruct Integration Tests

Este directorio contiene tests de integración para la extensión FastStruct de VS Code.

## Estructura

- `suite/extension.test.ts` - Tests principales de la extensión
- `suite/commands.test.ts` - Tests de comandos registrados
- `suite/services.test.ts` - Tests de servicios críticos

## Ejecutar Tests

### Tests de Integración VS Code
```bash
# Ejecutar todos los tests de integración
pnpm run test:integration

# Ejecutar solo tests unitarios (rápidos)
pnpm run test:vscode

# Ejecutar tests con watch mode
pnpm run test:integration:watch

# Ejecutar todos los tests (unit + integration)
pnpm run test:all
```

### Tests Unitarios Jest (existentes)
```bash
# Tests unitarios con Jest
pnpm run test

# Tests unitarios en modo watch
pnpm run test:watch

# Tests con coverage
pnpm run test:coverage
```

## Configuración

Los tests están configurados en `.vscode-test.mjs` y usan:

- **@vscode/test-cli** - CLI moderno para tests de VS Code
- **Mocha** - Framework de testing
- **VS Code Test Environment** - Entorno completo de VS Code para tests

## Tests Incluidos

### Extension Tests
- ✅ Verificar que la extensión se active correctamente
- ✅ Verificar que todos los comandos principales estén registrados
- ✅ Probar Health Check command
- ✅ Verificar acceso a configuración
- ✅ Validar información del paquete

### Commands Tests
- ✅ Verificar registro de comandos de exclusión
- ✅ Verificar comandos de comparación de ramas
- ✅ Verificar comandos de configuración
- ✅ Probar Enable Debug command

### Services Tests
- ✅ Verificar funcionalidad del Logger
- ✅ Probar acceso a configuración
- ✅ Verificar operaciones del sistema de archivos
- ✅ Validar registro de comandos
- ✅ Verificar compatibilidad con VS Code API

## Entorno de Testing

- **Workspace de prueba**: `test-workspace/` contiene un proyecto de ejemplo
- **VS Code estable**: Los tests se ejecutan en VS Code estable
- **Extensiones deshabilitadas**: Para tests aislados
- **Timeout**: 20-30 segundos para permitir activación completa

## Debugging Tests

Para debug de tests:

1. Abrir VS Code en el proyecto FastStruct
2. Ir a Run & Debug (Ctrl+Shift+D)
3. Seleccionar "Extension Tests" (si está configurado)
4. O usar el comando "Test: Debug All Tests" con Extension Test Runner

## Notas

- Los tests se ejecutan en un entorno aislado de VS Code
- La extensión se activa automáticamente antes de ejecutar tests
- Los tests verifican funcionalidad sin modificar archivos reales
- Algunos tests pueden fallar en entornos sin workspace (esperado)
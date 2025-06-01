# Tests de FastStruct

Esta carpeta contiene la suite completa de tests unitarios para la extensión FastStruct.

## Estructura

La estructura de tests refleja la estructura del código fuente:

```
tests/
├── __mocks__/          # Mocks globales
│   └── vscode.ts       # Mock de la API de VS Code
├── commands/           # Tests de comandos
├── managers/           # Tests de managers
├── services/           # Tests de servicios
├── utils/              # Tests de utilidades
├── logger.test.ts      # Tests del logger
├── main.test.ts        # Tests del punto de entrada
└── setup.ts            # Configuración global de tests
```

## Ejecutar Tests

### Todos los tests
```bash
pnpm test
```

### Tests en modo watch
```bash
pnpm run test:watch
```

### Tests con cobertura
```bash
pnpm run test:coverage
```

### Tests específicos
```bash
# Solo tests de servicios
pnpm test -- tests/services

# Solo un archivo específico
pnpm test -- tests/services/ConfigurationService.test.ts
```

## Cobertura

La cobertura de código se genera en la carpeta `coverage/`. Para ver el reporte HTML:

```bash
pnpm run test:coverage
open coverage/index.html
```

## Configuración

### Variables de entorno

- `SHOW_TEST_LOGS=true`: Muestra los logs durante la ejecución de tests

### Jest

La configuración de Jest está en `jest.config.js` y en `package.json`.

## Escribir Tests

### Convenciones

1. **Nombres de archivos**: `[nombre].test.ts`
2. **Estructura**: Usar `describe` para agrupar tests relacionados
3. **Nombres de tests**: Comenzar con "debe" (should en español)
4. **Mocks**: Crear mocks específicos para cada test

### Ejemplo de test

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { MyService } from '../../src/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MyService();
  });

  describe('myMethod', () => {
    it('debe retornar el resultado esperado', () => {
      const result = service.myMethod('input');
      expect(result).toBe('expected output');
    });
  });
});
```

### Mocking

Para mockear módulos de VS Code:

```typescript
import * as vscode from 'vscode';

// El mock ya está configurado globalmente
(vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('OK');
```

### Tests Asíncronos

```typescript
it('debe manejar operaciones asíncronas', async () => {
  const result = await service.asyncMethod();
  expect(result).toBeDefined();
});
```

## Debugging Tests

Para debuggear tests en VS Code:

1. Agregar un breakpoint en el test
2. Usar la configuración "Debug Jest Tests" (agregar a `.vscode/launch.json` si no existe)
3. F5 para iniciar debugging

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Troubleshooting

### Los tests fallan con "Cannot find module"

Asegúrate de compilar el código antes de ejecutar tests:
```bash
pnpm run compile
pnpm test
```

### Los mocks no funcionan

Verifica que `jest.clearAllMocks()` se ejecute en `beforeEach`.

### Tests lentos

Usa `--runInBand` para ejecutar tests en serie:
```bash
pnpm test -- --runInBand
```

## Mantenimiento

- Mantener la cobertura de código por encima del 80%
- Actualizar tests cuando se modifique funcionalidad
- Agregar tests para nuevas funciones antes de implementarlas (TDD)

---
**Autor**: Pablo Contreras  
**Fecha**: 2025/01/31
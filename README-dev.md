# FastStruct - Guía de Desarrollo

## Arquitectura Modular

Este proyecto ha sido refactorizado siguiendo principios SOLID, específicamente:
- **SRP (Single Responsibility Principle)**: Cada módulo tiene una única responsabilidad
- **DRY (Don't Repeat Yourself)**: La lógica común está centralizada en servicios reutilizables

## Estructura del Proyecto

```
src/
├── main.ts                    # Punto de entrada - Solo maneja activación
├── types/                     # Definiciones de tipos TypeScript
│   ├── index.ts              # Exportaciones principales de tipos
│   └── config.types.ts       # Tipos de configuración
├── services/                  # Servicios singleton con lógica de negocio
│   ├── ConfigurationService.ts    # Manejo de configuración
│   ├── FileSystemService.ts       # Operaciones del sistema de archivos
│   ├── StructureGeneratorService.ts # Generación de estructura
│   ├── OutputFormatterService.ts   # Formateo de salida
│   └── CommandRegistrationService.ts # Registro de comandos
├── managers/                  # Clases que manejan operaciones complejas
│   └── ExclusionManager.ts   # Gestión de exclusiones
├── commands/                  # Definición de comandos de VS Code
│   ├── index.ts              # Exportaciones de comandos
│   ├── structureCommands.ts  # Comandos de estructura
│   ├── exclusionCommands.ts  # Comandos de exclusión
│   └── configCommands.ts     # Comandos de configuración
├── utils/                     # Utilidades reutilizables
│   ├── pathUtils.ts          # Utilidades de rutas
│   ├── fileUtils.ts          # Utilidades de archivos
│   └── patternMatcher.ts     # Coincidencia de patrones
├── constants/                 # Constantes globales
│   └── index.ts              # Todas las constantes
├── providers/                 # Proveedores de VS Code
│   └── ConfigWebviewProvider.ts # Proveedor de webview
└── logger.ts                  # Sistema de logging
```

## Principios de Diseño

### 1. Servicios Singleton

Los servicios principales usan el patrón Singleton para mantener una única instancia:

```typescript
class MyService {
  private static instance: MyService;
  
  public static getInstance(): MyService {
    if (!this.instance) {
      this.instance = new MyService();
    }
    return this.instance;
  }
  
  private constructor() {}
}
```

### 2. Separación de Responsabilidades

- **ConfigurationService**: Solo maneja la lectura/escritura de configuración
- **FileSystemService**: Solo maneja operaciones del sistema de archivos
- **PatternMatcher**: Solo maneja la lógica de coincidencia de patrones
- **OutputFormatterService**: Solo maneja el formato de salida

### 3. Comandos Modulares

Los comandos están agrupados por funcionalidad:
- `structureCommands.ts`: Comandos para generar estructura
- `exclusionCommands.ts`: Comandos para manejar exclusiones
- `configCommands.ts`: Comandos para configuración

### 4. Tipos Fuertemente Tipados

Todos los tipos están definidos en `src/types/`:
- Interfaces claras para configuración
- Tipos para elementos del árbol
- Enums para tipos de exclusión

## Flujo de Datos

1. **Activación**: `main.ts` → `CommandRegistrationService`
2. **Comando ejecutado**: `commands/*` → `services/*`
3. **Generación de estructura**:
   - `StructureGeneratorService` coordina el proceso
   - `FileSystemService` lee el sistema de archivos
   - `PatternMatcher` verifica exclusiones
   - `OutputFormatterService` genera la salida

## Agregar Nueva Funcionalidad

### 1. Nuevo Comando

```typescript
// En src/commands/myCommands.ts
export function registerMyCommands(context: vscode.ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];
  
  disposables.push(
    vscode.commands.registerCommand('faststruct.myCommand', async () => {
      // Lógica del comando
    })
  );
  
  return disposables;
}
```

### 2. Nuevo Servicio

```typescript
// En src/services/MyService.ts
export class MyService {
  private static instance: MyService;
  
  public static getInstance(): MyService {
    if (!this.instance) {
      this.instance = new MyService();
    }
    return this.instance;
  }
  
  private constructor() {}
  
  public myMethod(): void {
    // Implementación
  }
}
```

### 3. Nuevo Tipo de Exclusión

1. Agregar el tipo en `src/types/config.types.ts`
2. Actualizar `PatternMatcher` en `src/utils/patternMatcher.ts`
3. Agregar comando en `src/commands/exclusionCommands.ts`

## Testing

La estructura modular facilita el testing:

```typescript
// test/services/ConfigurationService.test.ts
import { ConfigurationService } from '../../src/services/ConfigurationService';

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  
  beforeEach(() => {
    service = ConfigurationService.getInstance();
  });
  
  test('should return default config', () => {
    const config = service.getDefaultConfig();
    expect(config.debug).toBe(false);
  });
});
```

## Debugging

El sistema de logging está centralizado en `Logger`:

```typescript
Logger.info('Mensaje informativo');
Logger.debug('Mensaje de debug'); // Solo se muestra si debug está habilitado
Logger.error('Mensaje de error', error);
Logger.functionStart('nombreFuncion', parametros);
Logger.functionEnd('nombreFuncion', resultado);
```

## Convenciones de Código

1. **Nombres de archivos**: camelCase para archivos, PascalCase para clases
2. **Documentación**: JSDoc en español con autor y fecha
3. **Imports**: Ordenar por tipo (node, vscode, servicios, tipos, utils)
4. **Métodos**: Públicos primero, privados después
5. **Constantes**: UPPER_SNAKE_CASE en `constants/index.ts`

## Compilación y Desarrollo

```bash
# Instalar dependencias
pnpm install

# Compilar
pnpm run compile

# Compilar en modo watch
pnpm run watch

# Linting
pnpm run lint

# Limpiar y reinstalar
pnpm run pnpm:reinstall
```

## Publicación

1. Actualizar versión en `package.json`
2. Actualizar `CHANGELOG.md`
3. Compilar: `pnpm run vscode:prepublish`
4. Empaquetar: `vsce package`
5. Publicar: `vsce publish`

## Mantenimiento

- Los servicios singleton mantienen estado durante la sesión
- La configuración se cachea y se actualiza según necesidad
- Los patrones se compilan una vez y se reutilizan
- El logger respeta la configuración de debug

---

**Autor**: Pablo Contreras  
**Fecha**: 2025/01/31
# FastStruct 📁

[![Tests](https://github.com/bypabloc/faststruct/actions/workflows/test.yml/badge.svg?branch=dev)](https://github.com/bypabloc/faststruct/actions/workflows/test.yml)
[![PR Checks](https://github.com/bypabloc/faststruct/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/bypabloc/faststruct/actions/workflows/pr-checks.yml)

Una extensión de VS Code para visualizar y documentar rápidamente la estructura de archivos de tu proyecto. FastStruct te ayuda a crear documentación clara y bien formateada de la estructura de directorios de tu proyecto, incluyendo el contenido de los archivos cuando lo necesites.

![FastStruct Demo](./assets/animated/demo.gif)

## Características ✨

- 📊 **Genera estructura visual en árbol** de tu proyecto
- 📝 **Incluye contenido de archivos** en la documentación (opcional)
- 🎯 **Exclusiones configurables** de archivos y carpetas
- 💡 **Detección inteligente** de archivos binarios
- 🖱️ **Integración con menú contextual** del explorador
- 🎨 **Interfaz de configuración visual** moderna e intuitiva
- 📈 **Estadísticas en tiempo real** sobre exclusiones
- 🔍 **Prueba de patrones** para verificar exclusiones
- 📥 **Importación desde .gitignore** para configuración rápida

## Instalación 💻

Puedes instalar FastStruct directamente desde el VS Code Marketplace:

1. Abre VS Code
2. Presiona `Ctrl+P` / `Cmd+P`
3. Escribe `ext install faststruct`

O busca "FastStruct" en la vista de Extensiones (`Ctrl+Shift+X` / `Cmd+Shift+X`).

## Uso 🚀

### Uso Básico

FastStruct ofrece diferentes formas de generar la estructura de tu proyecto:

#### 1. Menú Contextual (Recomendado)

1. Haz clic derecho en cualquier carpeta del explorador de VS Code
2. Selecciona **FastStruct** en el menú
3. Elige una de las siguientes opciones:
   - **Crear estructura...** - Te permite elegir qué tipo de estructura generar
   - **Crear estructura con contenido** - Incluye el contenido de los archivos
   - **Crear solo estructura** - Muestra solo la estructura de carpetas y archivos
   - **Crear estructura con vista previa** - Muestra una vista previa antes de generar

#### 2. Paleta de Comandos

También puedes usar la paleta de comandos (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. Escribe "FastStruct"
2. Selecciona uno de los comandos disponibles

### Nueva Interfaz de Configuración 🎨

FastStruct incluye una interfaz de configuración completamente renovada:

1. Haz clic derecho en el explorador → FastStruct → Open Settings
2. O usa la paleta de comandos: "FastStruct: Open Settings"

#### Características de la Nueva Interfaz

- **Vista General con Estadísticas**: Visualiza el impacto de tus exclusiones en tiempo real
- **Navegación por Secciones**: Organización clara de las opciones
- **Búsqueda en Listas**: Encuentra rápidamente elementos en listas largas
- **Prueba de Patrones**: Verifica que tus patrones funcionen correctamente
- **Importación desde .gitignore**: Configura exclusiones basadas en tu archivo .gitignore
- **Plantillas Predefinidas**: Aplica configuraciones comunes para proyectos Node.js, Python, Java, .NET
- **Herramientas de Mantenimiento**: Limpia duplicados y ordena patrones automáticamente

## Tipos de Salida 📋

### 1. Estructura con Contenido

Genera la estructura completa incluyendo el contenido de los archivos:

```
└── 📁project
    ├── 📁src
    │   └── index.js
    └── README.md

Path: src/index.js
Content:
```javascript
console.log('Hello World');
```

```

### 2. Solo Estructura

Genera únicamente la estructura de carpetas y archivos, sin contenido:

```

└── 📁project
    ├── 📁src
    │   ├── index.js
    │   └── utils.js
    ├── 📁tests
    │   └── test.js
    └── README.md

```

## Guía de Configuración ⚙️

### Estructura de Configuración

FastStruct se puede configurar usando `faststruct.config` en los ajustes de VS Code:

```json
{
  "faststruct.config": {
    "debug": false,
    "exclude": {
      "folders": [...],
      "files": [...],
      "advanced": {
        "patterns": [...],
        "specificFiles": [...],
        "specificFolders": [...],
        "regexPatterns": [...]
      }
    },
    "excludeContent": {
      "files": [...],
      "folders": [...],
      "patterns": [...]
    },
    "output": {
      "includeContent": true,
      "includeEmptyFolders": true,
      "includeFileSize": false,
      "includeLastModified": false
    }
  }
}
```

### Opciones de Configuración

#### 1. Opciones de Salida (Nuevo)

```json
"output": {
  "includeContent": true,      // Incluir contenido de archivos
  "includeEmptyFolders": true, // Mostrar carpetas vacías
  "includeFileSize": false,    // Mostrar tamaño de archivos
  "includeLastModified": false // Mostrar fecha de modificación
}
```

#### 2. Modo Debug

```json
"debug": true
```

Habilita el registro detallado para solución de problemas

#### 3. Exclusiones Básicas

##### Exclusiones de Carpetas

```json
"exclude": {
  "folders": [
    "node_modules",
    ".git",
    "dist",
    "build"
  ]
}
```

##### Exclusiones de Archivos

```json
"exclude": {
  "files": [
    "*.log",
    "*.lock",
    "package-lock.json"
  ]
}
```

#### 4. Exclusiones Avanzadas

##### Patrones Glob

```json
"exclude": {
  "advanced": {
    "patterns": [
      "**/*.min.js",
      "**/*.generated.*"
    ]
  }
}
```

##### Archivos/Carpetas Específicos

```json
"exclude": {
  "advanced": {
    "specificFiles": [
      "src/config/sensitive.json"
    ],
    "specificFolders": [
      "src/utils/"
    ]
  }
}
```

##### Expresiones Regulares

```json
"exclude": {
  "advanced": {
    "regexPatterns": [
      "src/.*\\.md$",
      "docs/.*\\.temp\\.*"
    ]
  }
}
```

#### 5. Exclusiones de Contenido

Oculta el contenido de archivos mientras los mantiene en la estructura:

```json
"excludeContent": {
  "files": ["*.config.js"],
  "folders": ["src/config"],
  "patterns": ["**/*.secret.*"]
}
```

### Ejemplo de Configuración Completa

```json
{
  "faststruct.config": {
    "debug": false,
    "exclude": {
      "folders": ["node_modules", ".git", "dist"],
      "files": ["*.log", "*.lock"],
      "advanced": {
        "patterns": ["**/*.min.js"],
        "specificFiles": ["src/config/secret.json"],
        "specificFolders": ["tests/fixtures/"],
        "regexPatterns": [".*\\.temp\\..*"]
      }
    },
    "excludeContent": {
      "files": ["*.env"],
      "folders": ["src/config"],
      "patterns": ["**/*.secret.*"]
    },
    "output": {
      "includeContent": true,
      "includeEmptyFolders": false,
      "includeFileSize": true,
      "includeLastModified": false
    }
  }
}
```

## Consejos de Uso 💡

1. **Configuración Rápida**
   - Usa la función "Importar desde .gitignore" para una configuración inicial rápida
   - Aplica plantillas predefinidas según el tipo de proyecto

2. **Rendimiento**
   - Para proyectos grandes, considera usar "Solo estructura" para obtener resultados más rápidos
   - Usa patrones simples cuando sea posible para mejor rendimiento

3. **Seguridad**
   - Usa `excludeContent` para archivos sensibles que deben aparecer en la estructura pero sin mostrar su contenido
   - Verifica tus patrones antes de compartir salidas de estructura

4. **Organización**
   - Usa la función "Ordenar Patrones" para mantener tu configuración organizada
   - Ejecuta "Limpiar Duplicados" periódicamente para optimizar tu configuración

## Atajos de Teclado 🎹

Puedes asignar atajos de teclado personalizados a los comandos de FastStruct:

1. Abre la configuración de atajos (`Ctrl+K Ctrl+S` / `Cmd+K Cmd+S`)
2. Busca "FastStruct"
3. Asigna tus atajos preferidos

## Requisitos 📋

- Visual Studio Code v1.94.0 o superior

## Convenciones de Nomenclatura 📝

Este proyecto sigue las siguientes convenciones para nombres de archivos:

- **Archivos TypeScript**: `camelCase.ts` o `PascalCase.ts`
  - Servicios y clases: `PascalCase.ts` (ej: `ConfigurationService.ts`)
  - Utilidades y funciones: `camelCase.ts` (ej: `fileUtils.ts`)
- **Archivos de prueba**: `camelCase.test.ts` o `PascalCase.test.ts`
- **Archivos JavaScript**: `camelCase.js`
- **No usar guiones (-) o guiones bajos (_)** en nombres de archivos

## Solución de Problemas 🔧

### La extensión no genera estructura

1. Verifica que tengas permisos de lectura en la carpeta
2. Revisa la consola de depuración activando `debug: true`
3. Asegúrate de que no estés excluyendo demasiados archivos

### Los patrones no funcionan como esperaba

1. Usa la función "Probar Patrón" en la interfaz de configuración
2. Verifica la sintaxis de tus expresiones regulares
3. Recuerda que los patrones glob usan `*` para cualquier carácter y `**` para cualquier profundidad

## Licencia 📜

Este proyecto está licenciado bajo la Licencia Pública General GNU v3.0 - consulta el archivo [LICENSE](LICENSE) para más detalles.

## Soporte 🤝

Si encuentras un error o quieres solicitar una característica, por favor crea un issue en el [rastreador de issues](https://github.com/bypabloc/faststruct/issues).

## Contribuir 🌟

¡Las contribuciones son bienvenidas! Por favor, lee nuestras [pautas de contribución](CONTRIBUTING.md) primero.

## Apóyame con un Café ☕

Si encuentras útil esta herramienta y quieres apoyar su desarrollo, puedes invitarme un café a través de [Buy Me a Coffee](https://buymeacoffee.com/bypablo).

---
Hecho con ❤️ por Pablo Contreras

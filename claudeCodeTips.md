# Claude Code - Técnicas Avanzadas y Tips para FastStruct

## 🧠 Extended Thinking Modes

### Activación de Modos de Pensamiento
Claude Code responde a palabras clave específicas para activar diferentes niveles de procesamiento:

```bash
# Pensamiento estándar (~4,000 tokens)
"think about how to implement branch comparison"

# Pensamiento intenso (~10,000 tokens)
"think hard about the architecture for git integration"

# Pensamiento profundo (~32,000 tokens)
"ultrathink about optimizing performance for large repositories"
```

### Cuándo Usar Cada Modo
- **"think"**: Problemas de complejidad media, refactoring simple
- **"think hard"**: Diseño de arquitectura, decisiones importantes
- **"ultrathink"**: Problemas de rendimiento complejos, algoritmos optimizados

## 🔄 Workflow Óptimo para FastStruct

### 1. Exploración Inicial
```bash
# Antes de cualquier cambio
"explore the codebase structure without making changes"
"analyze the service layer architecture"
"understand the exclusion pattern system"
```

### 2. Planificación Detallada
```bash
# Crear plan antes de implementar
"think hard about implementing branch comparison feature"
"create a detailed plan for GitComparisonService"
"what are the edge cases for large git diffs?"
```

### 3. Implementación TDD
```bash
# Los robots aman TDD
"write comprehensive tests for GitComparisonService first"
"implement just enough code to make the tests pass"
"refactor while keeping tests green"
```

### 4. Commit Inteligente
```bash
# Claude genera mensajes de commit contextuales
"commit these changes with a descriptive message"
# O simplemente
"commit"
```

## 📁 Comandos Específicos para FastStruct

### Testing
```bash
# Ejecutar tests específicos
"run tests for PatternMatcher"
"test the exclusion system with edge cases"
"check test coverage for services"
```

### Refactoring
```bash
# Mantener SOLID
"refactor ConfigWebviewProvider following SRP"
"extract common logic to a new service"
"identify violations of SOLID principles"
```

### Performance
```bash
# Optimización
"profile structure generation for 10k files"
"optimize pattern matching performance"
"reduce memory usage in FileSystemService"
```

## 🎯 Mejores Prácticas para FastStruct

### 1. Mantén el Contexto
```bash
# Al inicio de cada sesión
"read the memory bank files to understand current state"
"what was the last thing we worked on?"
"check progress.md for pending tasks"
```

### 2. Validación Continua
```bash
# Después de cambios
"run all tests"
"verify no SOLID principles were violated"
"check if any new dependencies were added"
```

### 3. Documentación Automática
```bash
# Claude mantiene docs actualizadas
"update activeContext.md with current changes"
"document the new GitComparisonService in systemPatterns.md"
"add this bug to progress.md known issues"
```

## 🚀 Comandos Avanzados

### Multi-archivo
```bash
# Trabajar con múltiples archivos
"show me all files that import ConfigurationService"
"update all tests that mock VS Code API"
"refactor all commands to use the new pattern"
```

### Análisis de Impacto
```bash
# Antes de cambios grandes
"what would be affected if we change PatternMatcher interface?"
"analyze dependencies of FileSystemService"
"find potential breaking changes"
```

### Git Avanzado
```bash
# Para la nueva feature
"create a feature branch for git-comparison"
"what files have changed in the last 5 commits?"
"prepare a PR description for branch comparison feature"
```

## 💡 Tips Específicos del Proyecto

### Para Testing
- Siempre mockear VS Code API
- Usar `./__mocks__/vscode.ts` para mocks consistentes
- Escribir tests antes del código (TDD)

### Para Performance
- Usar streams para archivos grandes
- Implementar lazy loading en directorios enormes
- Cache de resultados de pattern matching

### Para Mantenibilidad
- Un servicio = una responsabilidad
- Si un archivo > 200 líneas, considera dividirlo
- Mantén la jerarquía de imports

## 🐛 Debugging con Claude

```bash
# Debugging efectivo
"add detailed logging to trace this issue"
"why might this pattern not match .env files?"
"help me understand this stack trace"
```

## 📊 Monitoreo del Proyecto

```bash
# Status checks regulares
"analyze code quality metrics"
"find unused exports"
"check for circular dependencies"
"list all TODO comments"
```

## 🔧 Automatización Personalizada

### Crear Comando Personalizado
```bash
# En .claude/commands/update-memory-bank.md
"Update all memory bank files with current project state"
"Run all tests and update progress.md with coverage"
"Generate release notes from recent commits"
```

### Uso
```bash
/project:update-memory-bank
/project:generate-release-notes
```

## 🎓 Aprendizaje Continuo

Claude aprende de tus patrones. Ayúdale:
- Corrige cuando no siga tus convenciones
- Muéstrale ejemplos de tu código preferido
- Actualiza CLAUDE.md con nuevas preferencias

## 🚦 Workflow para Nueva Feature

```bash
1. "ultrathink about implementing [feature]"
2. "create spec.md for [feature]"
3. "generate prompt_plan.md from the spec"
4. "execute the plan step by step"
5. "update all memory bank files"
```

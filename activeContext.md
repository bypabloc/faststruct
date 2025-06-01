# FastStruct Active Context

## Current Sprint Focus
Implementación de comparación de ramas para facilitar code reviews con IA.

## Recent Changes (Last Session)
- Enhanced test coverage for CommandRegistrationService and FileSystemService
- Improved mock configurations and assertions in test suite
- Enhanced file and path utilities with better pattern matching
- Updated test mocks for more robust testing
- Added Node.js version management with .nvmrc file
- Comprehensive tests for StructureGeneratorService, fileUtils, pathUtils, and patternMatcher
- Removed WebviewScriptService to simplify architecture

## Active Decisions
- **Arquitectura**: Mantener servicios como singletons
- **Testing**: Jest para unit tests, mock de VS Code API
- **UI**: Webview con vanilla JS (no frameworks)
- **Patterns**: Minimatch para glob patterns
- **Storage**: Configuración en VS Code settings

## Next Immediate Steps
1. Diseñar API para comparación de ramas
2. Implementar servicio GitComparisonService
3. Agregar comandos para seleccionar ramas
4. UI para mostrar diferencias
5. Generar output optimizado para code review

## Current Challenges
- Integración con Git sin dependencias pesadas
- Mantener rendimiento en repos grandes
- UI intuitiva para selección de cambios
- Formato de salida para code review

## Technical Debt
- [x] Mejorar cobertura de tests (objetivo: 80%) - Progreso significativo completado
- [ ] Documentar API pública
- [ ] Optimizar algoritmo de exclusión para grandes proyectos
- [ ] Refactorizar ConfigWebviewProvider (muy grande)
- [ ] Completar documentación de memory bank con archivos MD

## Open Questions
- ¿Usar simple-git o API nativa de VS Code para Git?
- ¿Formato de salida para comparación? (unified diff vs custom)
- ¿Límite de archivos en comparación?
- ¿Integrar con GitHub PRs directamente?

## Dependencies to Watch
- minimatch: v9.0.3 (verificar actualizaciones)
- @types/vscode: ^1.74.0 (mantener compatibilidad)

# FastStruct Active Context

## Current Sprint Focus
Implementación de comparación de ramas para facilitar code reviews con IA.

## Recent Changes (Last Session)
- **Branch Comparison Feature Completed**: Implemented full branch comparison functionality with multiple specialized services
- **New Services Architecture**: GitOperationsService, DiffAnalysisService, MoveDetectionService, FileTreeService, FileContentService, ComparisonOutputService
- **Comprehensive Testing**: Added extensive test suites for all branch comparison services with 95%+ coverage
- **Move Detection**: Intelligent file move/rename detection with similarity analysis
- **Context Detection**: Surrounding context for better code review understanding
- **Robust Diff Analysis**: Multi-stage diff resolution with fallback mechanisms
- **Commit History Integration**: Shows commits unique to source branch (max 20)
- **File Tree Visualization**: Enhanced tree structure with change type icons

## Active Decisions
- **Arquitectura**: Mantener servicios como singletons
- **Testing**: Jest para unit tests, mock de VS Code API
- **UI**: Webview con vanilla JS (no frameworks)
- **Patterns**: Minimatch para glob patterns
- **Storage**: Configuración en VS Code settings

## Next Immediate Steps
1. Performance optimization for large repositories (10k+ files)
2. Add configuration options for branch comparison output format
3. Implement PR template generation based on comparison
4. Add support for comparing specific file patterns only
5. Create visual diff viewer in webview
6. Add branch comparison history/cache
7. Implement comparison export formats (Markdown, HTML, JSON)

## Current Challenges
- Performance optimization for repositories with 10k+ files
- Memory usage optimization for large diffs
- Webview state persistence issues
- UI responsiveness for complex comparisons
- Handling binary file comparisons gracefully

## Technical Debt
- [x] Mejorar cobertura de tests (objetivo: 80%) - Progreso significativo completado
- [ ] Documentar API pública
- [ ] Optimizar algoritmo de exclusión para grandes proyectos
- [ ] Refactorizar ConfigWebviewProvider (muy grande)
- [ ] Completar documentación de memory bank con archivos MD

## Open Questions
- ¿Implementar caché para comparaciones frecuentes?
- ¿Añadir soporte para three-way merge comparisons?
- ¿Integración directa con GitHub/GitLab APIs?
- ¿Soporte para comparación de stashes?
- ¿Visualización gráfica de estadísticas de cambios?

## Dependencies to Watch
- minimatch: v10.0.1 (actualizado recientemente)
- @types/vscode: ^1.100.0 (versión actualizada)
- jest: ^29.7.0 (considerar actualización a v30)
- typescript: ^5.8.3 (última versión estable)

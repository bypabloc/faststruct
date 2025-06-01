# FastStruct Product Context

## Why This Project Exists
Los desarrolladores pierden tiempo limpiando manualmente estructuras de proyecto antes de 
compartirlas con IAs. FastStruct automatiza este proceso, ahorrando tiempo y mejorando 
la calidad de las interacciones con IA.

## User Journey
1. **Instalación**: Usuario busca "faststruct" en VS Code marketplace
2. **Primer Uso**: Click derecho en carpeta → "FastStruct: Create Structure"
3. **Configuración**: Ajusta exclusiones según su stack tecnológico
4. **Generación**: Obtiene estructura limpia en nuevo documento
5. **Compartir**: Copia y pega en ChatGPT/Claude

## Core User Problems Solved
- **Problema**: "Mi proyecto tiene 10,000 archivos pero solo necesito mostrar 50"
  - **Solución**: Sistema de exclusiones inteligente
  
- **Problema**: "Cada vez configuro las mismas exclusiones"
  - **Solución**: Plantillas predefinidas y configuración persistente
  
- **Problema**: "Necesito excluir archivos sensibles (.env, secrets)"
  - **Solución**: Exclusión de contenido manteniendo estructura

## User Experience Goals
- **Simplicidad**: Funcional con configuración por defecto
- **Flexibilidad**: Altamente configurable para power users
- **Velocidad**: Generación instantánea incluso en proyectos grandes
- **Inteligencia**: Detección automática de archivos binarios
- **Integración**: Seamless con workflow de VS Code

## Feature Prioritization
1. **Core**: Generación básica con exclusiones (✓)
2. **Enhanced**: UI de configuración avanzada (✓)
3. **Power**: Exclusiones rápidas por contexto (✓)
4. **Next**: Comparación de ramas para PRs (🚧)
5. **Future**: Integración directa con IAs

## Competitive Landscape
- **Directory Tree Generator**: Básico, sin exclusiones avanzadas
- **Project Tree**: Sin UI de configuración
- **Manual Solutions**: Tedioso y propenso a errores

## Product Evolution
- v0.1: MVP básico
- v0.5: UI webview agregada
- v0.11: Sistema modular SOLID (actual)
- v1.0: Feature de comparación de ramas
- v2.0: Integración con APIs de IA

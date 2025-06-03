# FastStruct Project Brief

## Project Identity
- **Name**: FastStruct
- **Type**: VS Code Extension
- **Version**: 0.0.11
- **Author**: Pablo Contreras (The Full Stack)
- **Created**: January 2025

## Core Purpose
FastStruct genera estructuras de archivos y carpetas de proyectos de programación con configuración 
avanzada de exclusiones, optimizando el contexto proporcionado a IAs web.

## Problem Statement
Los desarrolladores necesitan compartir estructuras de proyecto con IAs, pero incluir todo genera 
ruido innecesario (node_modules, archivos compilados, etc.). FastStruct soluciona esto con 
exclusiones configurables y salida optimizada.

## Target Users
- Desarrolladores usando IAs (ChatGPT, Claude, etc.)
- Equipos documentando arquitecturas
- Desarrolladores creando documentación de proyectos

## Key Features
1. **Generación de Estructura**: Vista de árbol con/sin contenido
2. **Exclusiones Configurables**: Patrones, regex, rutas específicas
3. **UI de Configuración**: Webview interactiva
4. **Exclusiones Rápidas**: Click derecho en explorador
5. **Plantillas Predefinidas**: Node, Python, Java, .NET
6. **[PRÓXIMO] Comparación de Ramas**: Para code reviews

## Success Metrics
- Instalaciones activas en marketplace
- Reducción de tokens en prompts de IA
- Tiempo ahorrado en documentación
- Satisfacción del usuario (reviews)

## Technical Constraints
- Debe funcionar con VS Code 1.74.0+
- TypeScript con modo strict
- Sin dependencias pesadas
- Rendimiento óptimo en proyectos grandes

## Business Model
- Extensión gratuita open source
- Posible versión Pro con features avanzadas futuras

## Unique Value Proposition
"Simplifica el contexto de tu código para IAs con un click"

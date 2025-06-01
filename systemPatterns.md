# FastStruct System Patterns

## Architecture Overview
```
┌─────────────────┐     ┌──────────────────┐
│   VS Code API   │────▶│  Command Layer   │
└─────────────────┘     └──────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │ Service Layer    │
                        │ (Singletons)     │
                        └──────────────────┘
                               │
                        ┌──────┴───────┐
                        ▼              ▼
                 ┌────────────┐ ┌────────────┐
                 │  Managers  │ │   Utils    │
                 └────────────┘ └────────────┘
```

## Core Design Patterns

### Singleton Services
```typescript
export class ConfigurationService {
  private static instance: ConfigurationService;
  
  public static getInstance(): ConfigurationService {
    if (!this.instance) {
      this.instance = new ConfigurationService();
    }
    return this.instance;
  }
  
  private constructor() {}
}
```

### Command Pattern
```typescript
// Cada comando es una función pura
export function registerStructureCommands(
  context: vscode.ExtensionContext
): vscode.Disposable[]
```

### Factory Pattern (Formatters)
```typescript
export class OutputFormatterService {
  formatFullOutput(items, basePath, config, includeContent)
  generateTreeText(items, config, prefix, isLast)
  // Different formatting strategies
}
```

## Service Responsibilities

### ConfigurationService
- Load/Save configuration
- Merge with defaults
- Validate settings

### StructureGeneratorService
- Coordinate file reading
- Apply exclusions
- Generate output

### FileSystemService
- Read directories
- Detect binary files
- Handle file stats

### PatternMatcher
- Glob pattern matching
- Regex validation
- Exclusion logic

### WebviewMessageService
- Handle webview messages
- Coordinate responses
- Update UI state

## Data Flow Patterns

### Configuration Flow
```
User Input → Webview → Message Handler → ConfigService → VS Code Settings
```

### Structure Generation Flow
```
Command → StructureGenerator → FileSystem → PatternMatcher → OutputFormatter → Document
```

## Error Handling Strategy
```typescript
try {
  // Operation
  Logger.info('Operation started', data);
  // ... logic
  Logger.info('Operation completed', result);
} catch (error) {
  Logger.error('Operation failed', error);
  vscode.window.showErrorMessage(
    `Error: ${error.message}`
  );
}
```

## State Management
- Configuration: VS Code settings API
- UI State: Webview internal state
- Extension State: Context.globalState
- No external state stores

## Security Patterns
- CSP for webview
- Input sanitization
- Path validation
- No eval() usage

## Performance Patterns
- Lazy loading for large directories
- Streaming for file reading
- Debouncing for UI updates
- Singleton services (no recreation)

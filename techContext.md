# FastStruct Technical Context

## Technology Stack

### Core
- **Language**: TypeScript 5.0
- **Runtime**: VS Code Extension Host
- **Node**: Compatible with VS Code's Node version
- **Package Manager**: npm

### Development Tools
- **Bundler**: esbuild (via VS Code)
- **Linter**: ESLint
- **Test Runner**: Jest 29.7
- **Type Checking**: TypeScript strict mode

### Key Dependencies
```json
{
  "minimatch": "^10.0.1",      // Glob pattern matching
  "@types/vscode": "^1.100.0", // VS Code API types
  "@types/node": "^22.15.26",  // Node.js types
  "jest": "^29.7.0",           // Testing framework
  "ts-jest": "^29.1.2"         // TypeScript support for Jest
}
```

### VS Code APIs Used
- `vscode.workspace` - File system operations
- `vscode.window` - UI elements, notifications
- `vscode.commands` - Command registration and management
- `vscode.ExtensionContext` - Extension lifecycle
- `vscode.Uri` - File path handling
- `vscode.WebviewPanel` - Configuration UI
- Updated VS Code engine requirement to ^1.100.0

### File System Architecture
```
/
├── src/                    # Source code
│   ├── commands/          # Command implementations
│   ├── services/          # Business logic
│   ├── managers/          # State management
│   ├── providers/         # UI providers
│   ├── templates/         # Webview assets
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities
│   ├── constants/        # Constants
│   ├── logger.ts         # Logging utility
│   └── main.ts           # Entry point
├── tests/                 # Unit tests
├── .vscode/              # VS Code settings
└── dist/                 # Compiled output
```

### Build Configuration

#### tsconfig.json
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "strict": true,
    "outDir": "out",
    "rootDir": "src"
  }
}
```

#### Jest Configuration
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts']
};
```

### Development Environment
- **IDE**: VS Code (obviously)
- **OS**: Linux (development machine)
- **Git**: Version control
- **npm scripts**: Task automation

### Technical Constraints
- No external UI frameworks (vanilla JS)
- No heavy dependencies
- Must support VS Code 1.74.0+
- Follow VS Code extension guidelines
- Maintain backward compatibility

### Security Considerations
- Content Security Policy for webview
- Input validation for file paths
- No execution of user content
- Safe regex compilation

### Performance Targets
- < 1s generation for 1000 files
- < 100ms UI response time
- < 50MB memory usage
- Instant exclusion updates

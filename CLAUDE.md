# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FastStruct es una extensión de VS Code para generar estructuras de archivos y carpetas con exclusiones configurables, 
optimizando el contexto para IAs.

## 👤 Team Preferences
- Call me: Pablo
- Language: Español para explicaciones, inglés para código
- Working alone on this project

## Development Commands

# Most used commands
pnpm run test      # Run all tests
pnpm run watch     # Watch mode for development
pnpm run compile   # Compile TypeScript

### Build & Compilation
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Compile in watch mode for development
- `npm run vscode:prepublish` - Prepare for VS Code packaging

### Testing
- `pnpm test` - Run all Jest tests
- `node temp/run-single-test.js [test-file]`  # Run single test
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run test:unit` - Run only unit tests (tests/*.test.ts)

### Code Quality
- `pnpm run lint` - Run ESLint on TypeScript files

### Maintenance
- `pnpm run pnpm:reinstall` - Clean reinstall (removes node_modules, out, pnpm-lock.yaml)

# Build & Package
pnpm run package   # Create VSIX package
pnpm run vscode:prepublish  # Prepare for publishing

## Architecture Overview

FastStruct follows SOLID principles with a modular service-oriented architecture:

### Core Services (Singleton Pattern)
- **ConfigurationService**: Manages VS Code configuration for FastStruct settings
- **FileSystemService**: Handles all file system operations and directory traversal
- **StructureGeneratorService**: Orchestrates the generation of project structure documentation
- **OutputFormatterService**: Formats the final output with proper tree structure and content
- **CommandRegistrationService**: Centralizes VS Code command registration

### Key Components
- **ExclusionManager**: Complex pattern matching for file/folder exclusions (glob, regex, specific paths)
- **PatternMatcher**: Advanced pattern matching utilities supporting multiple exclusion types
- **ConfigWebviewProvider**: Manages the visual configuration interface webview

### Command Organization
- `commands/structureCommands.ts` - Structure generation commands
- `commands/exclusionCommands.ts` - File/folder exclusion management
- `commands/configCommands.ts` - Configuration management

### Type Safety
All types are defined in `src/types/config.types.ts` with comprehensive interfaces for:
- FastStructConfig (main configuration)
- ExclusionConfig (advanced exclusion patterns) 
- OutputConfig (output formatting options)
- TreeItem (file structure representation)

## Key Features Implementation

### Exclusion System
The extension supports multiple exclusion types:
- Basic folder/file patterns
- Advanced glob patterns (`**/*.min.js`)
- Specific file/folder paths
- Regex patterns
- Content-only exclusions (show structure but hide content)

### Configuration Management
Configuration is stored in VS Code settings under `faststruct.config` with:
- Debug mode for development
- Comprehensive exclusion rules
- Output formatting options
- Quick exclusion settings

### Testing Strategy
- Jest with ts-jest preset
- VS Code API mocks in `tests/__mocks__/vscode.ts`
- Service-level unit tests
- Utility function tests
- Mock configurations for testing

## Development Workflow

1. **Adding New Features**: Create service classes following singleton pattern
2. **New Commands**: Add to appropriate command file and register in CommandRegistrationService
3. **Configuration Changes**: Update config.types.ts and ConfigurationService
4. **Testing**: Write tests in `tests/` directory matching `src/` structure

## Important Implementation Details

- All services use singleton pattern for state management
- Commands are organized by functionality for maintainability
- Extensive logging system with debug mode support
- Pattern matching supports multiple exclusion strategies simultaneously
- TypeScript strict mode enabled for type safety


## 📁 Project Structure
```
/src
  /commands       # Command implementations (SRP)
  /services       # Business logic services  
  /managers       # State management
  /providers      # UI providers (webview)
  /templates      # HTML/CSS/JS templates
  /types          # TypeScript types
  /utils          # Utility functions
/tests            # Jest unit tests
/temp             # Temporary scripts
```

## 🏗️ Architecture Patterns
- **SOLID Principles**: Strictly followed, especially SRP
- **Singleton Pattern**: Used for services
- **Modular Design**: Each module has single responsibility
- **DRY**: Common logic centralized in services
- **Error Handling**: Comprehensive try-catch with Logger
- **Async/Await**: Preferred over promises

## 💻 Code Style Preferences
```typescript
// Use descriptive names for clarity
const configService = ConfigurationService.getInstance();

// Destructure when possible
const { folders, files } = config.exclude;

// Early returns for guard clauses
if (!uri) return;

// Comprehensive JSDoc with author/date
/**
 * Description of function.
 * 
 * @param param - Description
 * @returns Description
 * @author Pablo Contreras
 * @created 2025/01/31
 */
```

## 🧪 Testing Guidelines
- Always run tests before committing
- Write tests for new features
- Test both success and error cases
- Use descriptive test names
- Mock VS Code API appropriately

## ⚠️ Anti-patterns to Avoid
- God classes (violates SRP)
- Callback hell (use async/await)
- Magic numbers/strings
- Deep nesting (max 3 levels)
- Ignoring error handling
- Direct DOM manipulation in services
- Tight coupling between modules

## 🔄 Current Development Focus
Working on branch comparison feature for code review context generation.

## 📝 Important Context
- Extension uses TypeScript with strict mode
- Webview for configuration UI
- File system operations are async
- Pattern matching uses minimatch
- No external database required
- Published to VS Code marketplace

## 🚫 Never Do
- Don't use synchronous file operations
- Don't ignore VS Code API limits
- Don't skip error logging
- Don't violate SOLID principles
- Don't create circular dependencies

## ✅ Always Do
- Follow existing patterns in codebase
- Use Logger for debugging
- Test with different file structures
- Consider performance for large projects
- Maintain backwards compatibility

## 📊 Import Hierarchy
@/types -> @/utils -> @/services -> @/managers -> @/providers -> @/commands -> main.ts
```

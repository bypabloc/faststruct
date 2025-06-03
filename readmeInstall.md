# FastStruct

VSCode extension to quickly create project structures.

## Features

- Create basic project structure with a single command
- More features coming soon...

## Requirements

- Node.js (v16 or higher)
- pnpm (v8 or higher)
- Visual Studio Code (v1.60.0 or higher)

## Installation for Development

1. Clone the repository

```bash
git clone https://github.com/yourusername/faststruct.git
cd faststruct
```

2. Install dependencies

```bash
pnpm install
```

3. Compile the extension

```bash
pnpm run compile
# or for continuous compilation during development:
pnpm run watch
```

## Running the Extension

There are two ways to run the extension:

### Method 1: Using VS Code (Recommended for Development)

1. Open the project in VS Code

2. Press `F5` to start debugging
   - This will automatically:
     - Run `pnpm run vscode:prepublish`
     - Compile the TypeScript code
     - Open a new VS Code window with the extension loaded

### Method 2: Manual Installation

1. Build the VSIX package

```bash
pnpm run vscode:prepublish
npx vsce package
```

2. Install the generated .vsix file through VS Code:
   - Press `Ctrl+Shift+P`
   - Type "Install from VSIX"
   - Select the generated .vsix file

## Using the Extension

1. Open any workspace in VS Code
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
3. Type "FastStruct: Create Structure"
4. Press Enter to execute the command

## Development

### Project Structure

```bash
faststruct/
├── src/              # Source code
│   └── main.ts       # Extension entry point
├── .vscode/          # VS Code configuration
├── out/             # Compiled JavaScript files
└── package.json     # Project configuration
```

### Available Scripts

- `pnpm run compile`: One-time compilation
- `pnpm run watch`: Continuous compilation
- `pnpm run vscode:prepublish`: Prepare extension for publishing
- `pnpm run lint`: Run ESLint

### Debugging

1. Set breakpoints in your TypeScript code
2. Press F5 to start debugging
3. The debugger will stop at your breakpoints
4. Use VS Code's Debug Console to inspect variables

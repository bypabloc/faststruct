# FastStruct 📁

A VS Code extension to quickly visualize and document your project's file structure. FastStruct helps you create clear, well-formatted documentation of your project's directory structure, including file contents when needed.

![FastStruct Demo](./assets/animated/demo.gif)

## Features ✨

- 📊 Generate a visual tree structure of your project
- 📝 Include file contents in the documentation
- 🎯 Configurable file and folder exclusions
- 💡 Smart binary file detection
- 🖱️ Right-click context menu integration

## Installation 💻

You can install FastStruct directly from the VS Code Marketplace:

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install faststruct`

Or search for "FastStruct" in the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).

## Usage 🚀

### Basic Usage

1. Right-click on any folder in the VS Code explorer
2. Select "Create Project Structure Here"
3. A new document will open showing the folder structure and contents

### Command Palette

You can also use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

1. Type "FastStruct: Create Structure"
2. Press Enter

## Configuration Guide ⚙️

### Basic Configuration Structure

FastStruct can be configured using the `faststruct.config` setting in your VS Code settings (`settings.json`):

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
    }
  }
}
```

### Configuration Options

#### 1. Debug Mode
```json
"debug": true
```
Enables detailed logging for troubleshooting (default: `false`)

#### 2. Basic Exclusions

##### Folder Exclusions
```json
"exclude": {
  "folders": [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".tmp",
    "out",
    ".astro",
    ".unlighthouse"
  ]
}
```
- Excludes entire folders from the structure
- Supports simple patterns and exact matches

##### File Exclusions
```json
"exclude": {
  "files": [
    "*.log",
    "*.lock",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock"
  ]
}
```
- Excludes specific files from the structure
- Supports wildcards and exact filenames

#### 3. Advanced Exclusions

##### Pattern-based Exclusions
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
Uses glob patterns for more complex matching

##### Specific File/Folder Exclusions
```json
"exclude": {
  "advanced": {
    "specificFiles": [
      "src/config/sensitive.json"
    ],
    "specificFolders": [
      "src/utils/",
      "tests/fixtures/"
    ]
  }
}
```
Excludes specific files/folders using relative paths

##### Regex Patterns
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
Uses regular expressions for complex pattern matching

#### 4. Content Exclusions

Hide file contents while keeping files in the structure:

```json
"excludeContent": {
  "files": [
    "*.config.js",
    "db/data.ts"
  ],
  "folders": [
    "src/config",
    "tests"
  ],
  "patterns": [
    "*.vsix",
    "**/*.secret.*",
    "**/.secrets**",
    "**/*/.env**"
  ]
}
```

### Example Full Configuration

```json
{
  "faststruct.config": {
    "debug": true,
    "exclude": {
      "folders": [
        "node_modules",
        ".git",
        "dist",
        "build",
        ".tmp",
        "out"
      ],
      "files": [
        "*.log",
        "*.lock",
        "package-lock.json"
      ],
      "advanced": {
        "patterns": ["**/*.min.js", "**/*.generated.*"],
        "specificFiles": ["src/config/sensitive.json"],
        "specificFolders": ["src/utils/", "tests/fixtures/"],
        "regexPatterns": ["src/.*\\.md$", "docs/.*\\.temp\\.*"]
      }
    },
    "excludeContent": {
      "files": ["*.config.js", "db/data.ts"],
      "folders": ["src/config", "tests"],
      "patterns": [
        "*.vsix",
        "**/*.secret.*",
        "**/.secrets**",
        "**/*/.env**"
      ]
    }
  }
}
```

### Configuration Tips 💡

1. **Workspace vs User Settings**
   - Use workspace settings for project-specific exclusions
   - Use user settings for personal preferences

2. **Pattern Priority**
   - Specific paths take precedence over patterns
   - Advanced exclusions override basic exclusions

3. **Performance**
   - Use simpler patterns when possible
   - Avoid excessive use of complex regex patterns
   - Use `debug: true` to troubleshoot pattern matching

4. **Security**
   - Use `excludeContent` for sensitive files
   - Double-check patterns before sharing structure outputs
   - Consider using `.gitignore` patterns as a base

## Output Example 📋

The extension generates output in this format:

```
└── 📁project
    ├── 📁src
    │   └── index.js
    ├── 📁tests
    │   └── test.js
    └── README.md

Path: src/index.js
Content:
´´´javascript
console.log('Hello World');
´´´
```

## Requirements 📋

- Visual Studio Code v1.94.0 or higher

## License 📜

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support 🤝

If you find a bug or want to request a feature, please create an issue in the [issue tracker](https://github.com/bypabloc/faststruct/issues).

## Contributing 🌟

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## Apóyame con un café ☕

If you find this tool useful and want to support its development, you can buy me a coffee through [Buy Me a Coffee](https://buymeacoffee.com/bypablo).

---
Made with ❤️ by Pablo Contreras

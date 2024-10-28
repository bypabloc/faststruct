# FastStruct 📁

A VS Code extension to quickly visualize and document your project's file structure. FastStruct helps you create clear, well-formatted documentation of your project's directory structure, including file contents when needed.

![FastStruct Demo](./assets/demo.gif)

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

### Configuration ⚙️

Configure exclusions in your VS Code settings:

```json
{
  "faststruct.exclude": {
    "folders": [
      "node_modules",
      ".git",
      "dist",
      "build"
    ],
    "files": [
      "*.log",
      "*.lock",
      "package-lock.json"
    ]
  }
}
```

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
```javascript
console.log('Hello World');
```
```

## Requirements 📋

- Visual Studio Code v1.60.0 or higher

## License 📜

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## Support 🤝

If you find a bug or want to request a feature, please create an issue in the [issue tracker](https://github.com/bypabloc/faststruct/issues).

## Contributing 🌟

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

---
Made with ❤️ by Pablo Contreras

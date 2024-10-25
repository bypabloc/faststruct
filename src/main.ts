import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "faststruct" is now active!');
  const disposable = vscode.commands.registerCommand(
    "faststruct.createStructure",
    () => {
      vscode.window.showInformationMessage("Hello World from FastStruct!");
    }
  );

  context.subscriptions.push(disposable);
}

const vscode = require('vscode');

function activate(context) {
    console.log('FastStruct is now active!');

    let disposable = vscode.commands.registerCommand('faststruct.createStructure', async function () {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder found');
            }

            // Crear estructura básica
            await vscode.workspace.fs.createDirectory(
                vscode.Uri.joinPath(workspaceFolders[0].uri, 'src')
            );

            vscode.window.showInformationMessage('Structure created successfully!!!');
        } catch (error) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};

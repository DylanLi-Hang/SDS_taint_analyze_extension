"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const child_process_1 = require("child_process");
const child_process_2 = require("child_process");
function compileToLLVMIR(sourceFile, outputIRFile) {
    return new Promise((resolve, reject) => {
        const clangCommand = `clang -S -emit-llvm -O0 -g ${sourceFile} -o ${outputIRFile}`;
        (0, child_process_1.exec)(clangCommand, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(new Error(stderr));
                return;
            }
            resolve();
        });
    });
}
function runBinaryProgram(programPath, args) {
    return new Promise((resolve, reject) => {
        const childProcess = (0, child_process_2.spawn)(programPath, args);
        childProcess.stdout.on('data', (data) => {
            // Output the data to the VSCode output channel
            vscode.window.activeTerminal?.sendText(data.toString());
        });
        childProcess.stderr.on('data', (data) => {
            // Output the error to the VSCode output channel
            vscode.window.activeTerminal?.sendText(data.toString());
        });
        childProcess.on('error', (error) => {
            // Type assertion to specify the type of 'error' as 'Error'
            const err = error;
            // Reject the promise with the error
            reject(err);
        });
        childProcess.on('close', (code) => {
            if (code === 0) {
                // Resolve the promise when the process completes successfully
                resolve();
            }
            else {
                // Reject the promise if the process exits with a non-zero code
                reject(new Error(`Process exited with code ${code}`));
            }
        });
    });
}
function convertTextToJson(text) {
    const regex = /{ ln:\s+(\d+)\s+cl: (\d+)\s+fl: (.+) }/g;
    const matches = regex.exec(text);
    if (matches) {
        const [, lineNumber, columnNumber, filePath] = matches;
        return {
            "ln": parseInt(lineNumber),
            "cl": parseInt(columnNumber),
            "fl": filePath
        };
    }
    return null;
}
function removeFileExtension(filePath) {
    const fileExtension = path.extname(filePath);
    const fileNameWithoutExtension = path.basename(filePath, fileExtension);
    const directory = path.dirname(filePath);
    return path.join(directory, fileNameWithoutExtension);
}
function getLineLength(filePath, lineNumber) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const line = lines[lineNumber - 1];
        return line.length;
    }
    catch (error) {
        console.error('Error occurred while reading the file:', error);
        return 0;
    }
}
async function parseTaintFlowFile(taintFile, cFile) {
    const taintPaths = [];
    const taintFlowFilePath = `${taintFile}`;
    if (!fs.existsSync(taintFlowFilePath)) {
        console.error(`Taint flow file not found: ${taintFlowFilePath}`);
        return taintPaths;
    }
    const taintFlowData = fs.readFileSync(taintFlowFilePath, 'utf-8');
    const pathSegments = taintFlowData.split('-->');
    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i].trim();
        if (segment.startsWith('{') && segment.endsWith('}')) {
            try {
                const newsegment = convertTextToJson(segment);
                // const taintInfo = JSON.parse(newsegment);
                const { ln, cl, fl } = newsegment;
                const linelen = await getLineLength(cFile, ln);
                if (linelen === -1) {
                    console.error(`Line ${cl} does not exist in the file or an error occurred while reading.`);
                    continue;
                }
                const decoration = {
                    range: new vscode.Range(ln - 1, cl - 1, ln - 1, cl + linelen),
                    hoverMessage: `Tainted Path Segment: ${fl}:${ln}:${cl}`,
                };
                taintPaths.push(decoration);
            }
            catch (error) {
                console.error('Error parsing taint flow data:', error);
            }
        }
    }
    return taintPaths;
}
function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.highlightTaintedPaths', async () => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const cFilePath = activeEditor.document.uri.fsPath;
                const currentFileNameWithoutExtension = removeFileExtension(cFilePath);
                const llFilePath = `${currentFileNameWithoutExtension}.ll`;
                compileToLLVMIR(cFilePath, llFilePath)
                    .then(() => {
                    console.log('Compilation successful!');
                })
                    .catch((error) => {
                    console.error('Compilation failed:', error);
                });
                const currentFileDirectory = path.dirname(__filename);
                console.log(currentFileDirectory);
                const programPath = `${currentFileDirectory}/analyze`;
                const args = [llFilePath];
                try {
                    // Execute the binary program
                    await runBinaryProgram(programPath, args);
                    vscode.window.showInformationMessage('Binary program execution completed successfully!');
                }
                catch (error) {
                    const err = error;
                    vscode.window.showErrorMessage(`Binary program execution failed: ${err.message}`);
                }
                // log(cFilePath);
                // const taintFlowFilePath = `${currentFileNameWithoutExtension}.txt`;
                let parentFolderPath = path.dirname(cFilePath);
                console.log(parentFolderPath);
                const taintFlowFilePath = `${parentFolderPath}/taint.txt`;
                if (fs.existsSync(taintFlowFilePath)) {
                    const taintPaths = await parseTaintFlowFile(taintFlowFilePath, cFilePath);
                    const decorationType = vscode.window.createTextEditorDecorationType({
                        backgroundColor: 'rgba(255, 0, 0, 0.3)',
                    });
                    activeEditor.setDecorations(decorationType, taintPaths);
                }
                else {
                    vscode.window.showErrorMessage(`Taint flow file not found: ${taintFlowFilePath}`);
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    });
    let disposable2 = vscode.commands.registerCommand('extension.highlightTaintedPathsText', async () => {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const cFilePath = activeEditor.document.uri.fsPath;
                const currentFileNameWithoutExtension = removeFileExtension(cFilePath);
                // const taintFlowFilePath = `${currentFileNameWithoutExtension}.txt`;
                const taintFlowFilePath = `${currentFileNameWithoutExtension}.txt`;
                if (fs.existsSync(taintFlowFilePath)) {
                    const taintPaths = await parseTaintFlowFile(taintFlowFilePath, cFilePath);
                    const decorationType = vscode.window.createTextEditorDecorationType({
                        backgroundColor: 'rgba(255, 0, 0, 0.3)',
                    });
                    activeEditor.setDecorations(decorationType, taintPaths);
                }
                else {
                    vscode.window.showErrorMessage(`Taint flow file not found: ${taintFlowFilePath}`);
                }
            }
        }
        catch (error) {
            console.error(error);
        }
    });
    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map
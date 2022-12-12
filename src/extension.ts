import * as vscode from 'vscode';
import { extensions, Uri } from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as shell from 'shelljs';


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.runQodana', runQodana));
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.openQodanaReport', openQodanaReport));
	const channel = createLogChannel();
	channel.appendLine('Qodana extension is activated');
}
function createLogChannel() {
	return vscode.window.createOutputChannel('Qodana-VSCode');
}


async function runQodana() {
	const channel = createLogChannel();
	const sarifExt = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
	if (!sarifExt) {
		vscode.window.showErrorMessage('Sarif extension is missing');
		channel.appendLine('Sarif extension is missing');
		return;
	}
	if (!shell) {
		console.log('shelljs is not installed');
		vscode.window.showErrorMessage('shelljs is not installed');
		channel.appendLine('shelljs is not installed');
		return;
	}
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder is opened');
		channel.appendLine('No workspace folder is opened');
		return;
	}
	const path = vscode.workspace.workspaceFolders[0].uri.fsPath;
	// TODO: check if docker is installed
	// windows loves path with \ instead of / so we need to replace them to make docker happy
	const cleanedPath = path.replace(/\\/g, '/');
	const cachePath = cleanedPath + "/.vscode/qodana/cache";
	createFolderIfMissing(cachePath);
	const resultPath = cleanedPath + "/.vscode/qodana/results";
	createFolderIfMissing(resultPath);

	// convert the path to volumes
	const volumePath = cleanedPath + "/:/data/project/";
	const cacheVolume = cachePath + "/:/data/cache/";
	const resultsVolume = resultPath + "/:/data/results/";

	// run qodana and pipe the output to the console
	const qodanaResults = spawn('docker', ['run', "-v", volumePath, "-v", cacheVolume, "-v", resultsVolume, "jetbrains/qodana-jvm-community"]);
	qodanaResults.stdout.on('data', (data: any) => {
		channel.appendLine(`stdout: ${data}`);
	});
	qodanaResults.stderr.on('data', (data: any) => {
		channel.appendLine(`stderr: ${data}`);
	});
	// open the report when qodana is done
	qodanaResults.on('close', (code: any) => {
		channel.appendLine(`child process exited with code ${code}`);
		if (!sarifExt.isActive) {
			sarifExt.activate().then(() => {
				openSarifFile(sarifExt, cleanedPath);
			});
		}
		else {
			openSarifFile(sarifExt, cleanedPath);
		}
	});

}

function openSarifFile(sarifExt: vscode.Extension<any>, cleanedPath: string) {
	sarifExt.exports.openLogs([
		Uri.file(cleanedPath + '/.vscode/qodana/results/qodana.sarif.json')
	]);
}

function createFolderIfMissing(path: string) {
	if (!fs.existsSync(path)) {
		fs.mkdirSync(path, { recursive: true });
	}
}

function openQodanaReport() {
	const sarifExt = extensions.getExtension('MS-SarifVSCode.sarif-viewer');
	if (!sarifExt) {
		console.log('Sarif extension is missing');
		vscode.window.showErrorMessage('Sarif extension is missing');
		return;
	}
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder is opened');
		console.log('No workspace folder is opened');
		return;
	}
	const path = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const cleanedPath = path.replace(/\\/g, '/');
	if (!sarifExt.isActive) {
		sarifExt.activate().then(() => {
			openSarifFile(sarifExt, cleanedPath);
		});
	}
	else {
		openSarifFile(sarifExt, cleanedPath);
	}
}


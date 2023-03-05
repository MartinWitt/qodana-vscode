import * as vscode from 'vscode';
import { extensions, Uri } from 'vscode';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as shell from 'shelljs';

const channel = createLogChannel();
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.runQodana', runQodana));
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.openQodanaReport', openQodanaReport));
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.deleteCache', deleteCache));
	context.subscriptions.push(vscode.commands.registerCommand('qodana-vscode.pullImage', pullContainer));
	channel.appendLine('Qodana extension is activated');
}

function createLogChannel() {
	return vscode.window.createOutputChannel('Qodana-VSCode');
}


async function runQodana() {
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
	// q: check if docker is running by invoking docker ps
	checkIfDockerIsRunning();
	// if not running, show error message and return
	// check if qodana image is installed
	// if not installed, show error message and return
	// check if qodana image is up to date
	// if not up to date, show error message and return

	// windows loves path with \ instead of / so we need to replace them to make docker happy
	const cleanedPath = path.replace(/\\/g, '/');
	const cachePath = cleanedPath + vscode.workspace.getConfiguration('qodana-vscode').get('cache-path');
	createFolderIfMissing(cachePath);
	const resultPath = cleanedPath + "/.vscode/qodana/results";
	createFolderIfMissing(resultPath);

	// convert the path to volumes
	const { volumePath, cacheVolume, resultsVolume } = createVolumePaths(cleanedPath, cachePath, resultPath);

	// run qodana and pipe the output to the console
	invokeQodana(volumePath, cacheVolume, resultsVolume, channel, sarifExt, cleanedPath);

}
function pullContainer() {
	let qodanaImage;
	vscode.window.showQuickPick(createQodanaVersionQuickPickItems(), { canPickMany: false }).then((value) => {
		qodanaImage = value!.label;
	});
	if (!qodanaImage) {
		return;
	}
	const pull = spawn('docker', ['pull', qodanaImage]);
	pull.stdout.on('data', (data: any) => {
		channel.appendLine(`stdout: ${data}`);
	}
	);
	pull.stderr.on('data', (data: any) => {
		channel.appendLine(`stderr: ${data}`);
	}
	);
	pull.on('close', (code: any) => {
		channel.appendLine(`child process exited with code ${code}`);
	}
	);
}

function invokeQodana(volumePath: string, cacheVolume: string, resultsVolume: string, channel: vscode.OutputChannel, sarifExt: vscode.Extension<any>, cleanedPath: string) {
	let qodanaImage;
	vscode.window.showQuickPick(createQodanaVersionQuickPickItems(), { canPickMany: false }).then((value) => {
		qodanaImage = value!.label;
	});
	if (!qodanaImage) {
		return;
	}
	const qodanaResults = spawn('docker', ['run', "-v", volumePath, "-v", cacheVolume, "-v", resultsVolume, qodanaImage]);
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

function createVolumePaths(cleanedPath: string, cachePath: string, resultPath: string) {
	const volumePath = cleanedPath + "/:/data/project/";
	const cacheVolume = cachePath + "/:/data/cache/";
	const resultsVolume = resultPath + "/:/data/results/";
	return { volumePath, cacheVolume, resultsVolume };
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
function deleteCache() {
	const channel = createLogChannel();
	if (!vscode.workspace.workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder is opened');
		channel.appendLine('No workspace folder is opened');
		return;
	}
	const path = vscode.workspace.workspaceFolders[0].uri.fsPath;
	const cleanedPath = path.replace(/\\/g, '/');
	const cachePath = cleanedPath + vscode.workspace.getConfiguration('qodana-vscode').get('cache-path');
	const resultPath = cleanedPath + "/.vscode/qodana/results";
	fs.rmdirSync(cachePath, { recursive: true });
	fs.rmdirSync(resultPath, { recursive: true });
}

// check if docker is running
function checkIfDockerIsRunning() {
	shell.exec('docker ps', { silent: true }, (code: any) => {
		if (code !== 0) {
			vscode.window.showErrorMessage('Docker is not running');
		}
	}
	);
}
function createQodanaVersionQuickPickItems() {
	const items: QodanaSelection[] = [];
	items.push(new QodanaSelection('java-community', vscode.workspace.getConfiguration('qodana-vscode').get('linter.java-community') as string));
	items.push(new QodanaSelection('java', vscode.workspace.getConfiguration('qodana-vscode').get('linter.java') as string));
	items.push(new QodanaSelection('js', vscode.workspace.getConfiguration('qodana-vscode').get('linter.js') as string));
	return items;
}
class QodanaSelection implements vscode.QuickPickItem {
	constructor(public label: string, public description: string) { }
}

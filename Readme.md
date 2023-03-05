# Qodana VSCode Extension

Qodana is a static code analysis tool that helps you to improve the quality of your code. It is based on the IntelliJ IDEA platform and uses the same code analysis engine as the IntelliJ IDEA IDE.
To learn more about Qodana, visit the [Qodana website](https://www.jetbrains.com/qodana/).
We use the qodana docker image to run the analysis. The image is available on [Docker Hub](https://hub.docker.com/r/jetbrains/qodana).
After the analysis is complete, the results are displayed in the Problems panel.
This plugin is in beta. We appreciate your feedback and bug reports.

## Features

* Run Qodana analysis on a project
* Support for the following languages: Java, Kotlin, JavaScript, TypeScript

## Requirements

* Docker
* a project with a supported language
* [MS-Sarif Viewer extension](https://github.com/microsoft/sarif-visualstudio-extension)

## Extension Settings

This extension contributes the following settings:

| Setting | Description | Default value |
|---|---|---|
`qodana-vscode.cache-path` | Path to the cache directory. | `/.vscode/qodana/results` |
`qodana-vscode.report-path` | Path to the report directory. | `/.vscode/qodana/results` |
`qodana-vscode.linter.java` | The linter for java | `jetbrains/qodana:latest` |
`qodana-vscode.linter.java-community` | The linter for java-community | `jetbrains/qodana-community:latest` |
`qodana-vscode.linter.js` | The linter version for js/ts | `jetbrains/qodana-js:latest` |

## Extension Commands

This extension contributes the following commands:

| Command | Description |
|---|---|
`qodana-vscode.runQodana` | Run Qodana analysis on a project |
`qodana-vscode.openQodanaReport` | Open Qodana report in sarif viewer |
`qodana-vscode.deleteCache` | Delete Qodana cache |
`qodana-vscode.pullImage` | Pull Qodana image |

## Additional Information

To enable and disable rules, alter the `qodana.yaml` file in the root of your project. For more information about the configuration file, see the [Qodana Configuration](https://www.jetbrains.com/help/qodana/qodana-yaml.html) page.
For an example of the `qodana.yaml` file, see [Spoon-Github](https://www.jetbrains.com/help/qodana/qodana-yaml.html).

## Links

* [Qodana website](https://www.jetbrains.com/qodana/)
* [Qodana documentation](https://www.jetbrains.com/help/qodana/)
* [Qodana Configuration](https://www.jetbrains.com/help/qodana/qodana-yaml.html)


## License

[MIT](LICENSE)
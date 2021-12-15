"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeScriptReporter = void 0;
const path_1 = __importDefault(require("path"));
const TypeScriptIssueFactory_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/issue/TypeScriptIssueFactory");
const ControlledWatchCompilerHost_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/reporter/ControlledWatchCompilerHost");
const ControlledWatchSolutionBuilderHost_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/reporter/ControlledWatchSolutionBuilderHost");
const ControlledTypeScriptSystem_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/reporter/ControlledTypeScriptSystem");
const TypeScriptConfigurationParser_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/reporter/TypeScriptConfigurationParser");
const Performance_1 = require("fork-ts-checker-webpack-plugin/lib/profile/Performance");
const TypeScriptPerformance_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/profile/TypeScriptPerformance");
const TypeScriptVueExtension_1 = require("./TypeScriptVueExtension");
function createTypeScriptReporter(configuration) {
    let parsedConfiguration;
    let parseConfigurationDiagnostics = [];
    let dependencies;
    let artifacts;
    let configurationChanged = false;
    let watchCompilerHost;
    let watchSolutionBuilderHost;
    let watchProgram;
    let solutionBuilder;
    let shouldUpdateRootFiles = false;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const typescript = require(configuration.typescriptPath);
    const extensions = [];
    const system = (0, ControlledTypeScriptSystem_1.createControlledTypeScriptSystem)(typescript, configuration.mode);
    const diagnosticsPerProject = new Map();
    const performance = (0, TypeScriptPerformance_1.connectTypeScriptPerformance)(typescript, (0, Performance_1.createPerformance)());
    if (configuration.extensions.vue.enabled) {
        extensions.push((0, TypeScriptVueExtension_1.createTypeScriptVueExtension)(configuration.extensions.vue));
    }
    function getConfigFilePathFromCompilerOptions(compilerOptions) {
        return compilerOptions.configFilePath;
    }
    function getProjectNameOfBuilderProgram(builderProgram) {
        return getConfigFilePathFromCompilerOptions(builderProgram.getProgram().getCompilerOptions());
    }
    function getTracing() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return typescript.tracing;
    }
    function getDiagnosticsOfBuilderProgram(builderProgram) {
        const diagnostics = [];
        if (configuration.diagnosticOptions.syntactic) {
            performance.markStart('Syntactic Diagnostics');
            diagnostics.push(...builderProgram.getSyntacticDiagnostics());
            performance.markEnd('Syntactic Diagnostics');
        }
        if (configuration.diagnosticOptions.global) {
            performance.markStart('Global Diagnostics');
            diagnostics.push(...builderProgram.getGlobalDiagnostics());
            performance.markEnd('Global Diagnostics');
        }
        if (configuration.diagnosticOptions.semantic) {
            performance.markStart('Semantic Diagnostics');
            diagnostics.push(...builderProgram.getSemanticDiagnostics());
            performance.markEnd('Semantic Diagnostics');
        }
        if (configuration.diagnosticOptions.declaration) {
            performance.markStart('Declaration Diagnostics');
            diagnostics.push(...builderProgram.getDeclarationDiagnostics());
            performance.markEnd('Declaration Diagnostics');
        }
        return diagnostics;
    }
    function emitTsBuildInfoFileForBuilderProgram(builderProgram) {
        if (configuration.mode !== 'readonly' &&
            parsedConfiguration &&
            (0, TypeScriptConfigurationParser_1.isIncrementalCompilation)(parsedConfiguration.options)) {
            const program = builderProgram.getProgram();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof program.emitBuildInfo === 'function') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                program.emitBuildInfo();
            }
        }
    }
    function getParseConfigFileHost() {
        const parseConfigDiagnostics = [];
        let parseConfigFileHost = {
            ...system,
            onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
                parseConfigDiagnostics.push(diagnostic);
            },
        };
        for (const extension of extensions) {
            if (extension.extendParseConfigFileHost) {
                parseConfigFileHost = extension.extendParseConfigFileHost(parseConfigFileHost);
            }
        }
        return [parseConfigFileHost, parseConfigDiagnostics];
    }
    function parseConfiguration() {
        const [parseConfigFileHost, parseConfigDiagnostics] = getParseConfigFileHost();
        const parsedConfiguration = (0, TypeScriptConfigurationParser_1.parseTypeScriptConfiguration)(typescript, configuration.configFile, configuration.context, configuration.configOverwrite, parseConfigFileHost);
        if (parsedConfiguration.errors) {
            parseConfigDiagnostics.push(...parsedConfiguration.errors);
        }
        return [parsedConfiguration, parseConfigDiagnostics];
    }
    function parseConfigurationIfNeeded() {
        if (!parsedConfiguration) {
            [parsedConfiguration, parseConfigurationDiagnostics] = parseConfiguration();
        }
        return parsedConfiguration;
    }
    function getDependencies() {
        parsedConfiguration = parseConfigurationIfNeeded();
        const [parseConfigFileHost] = getParseConfigFileHost();
        let dependencies = (0, TypeScriptConfigurationParser_1.getDependenciesFromTypeScriptConfiguration)(typescript, parsedConfiguration, configuration.context, parseConfigFileHost);
        for (const extension of extensions) {
            if (extension.extendDependencies) {
                dependencies = extension.extendDependencies(dependencies);
            }
        }
        return dependencies;
    }
    function getArtifacts() {
        parsedConfiguration = parseConfigurationIfNeeded();
        const [parseConfigFileHost] = getParseConfigFileHost();
        return (0, TypeScriptConfigurationParser_1.getArtifactsFromTypeScriptConfiguration)(typescript, parsedConfiguration, configuration.context, parseConfigFileHost);
    }
    function getArtifactsIfNeeded() {
        if (!artifacts) {
            artifacts = getArtifacts();
        }
        return artifacts;
    }
    function startProfilingIfNeeded() {
        if (configuration.profile) {
            performance.enable();
        }
    }
    function stopProfilingIfNeeded() {
        if (configuration.profile) {
            performance.print();
            performance.disable();
        }
    }
    function startTracingIfNeeded(compilerOptions) {
        const tracing = getTracing();
        if (compilerOptions.generateTrace && tracing) {
            tracing.startTracing(getConfigFilePathFromCompilerOptions(compilerOptions), compilerOptions.generateTrace, configuration.build);
        }
    }
    function stopTracingIfNeeded(program) {
        const tracing = getTracing();
        const compilerOptions = program.getCompilerOptions();
        if (compilerOptions.generateTrace && tracing) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tracing.stopTracing(program.getProgram().getTypeCatalog());
        }
    }
    function dumpTracingLegendIfNeeded() {
        const tracing = getTracing();
        if (tracing) {
            tracing.dumpLegend();
        }
    }
    return {
        getReport: async ({ changedFiles = [], deletedFiles = [] }) => {
            // clear cache to be ready for next iteration and to free memory
            system.clearCache();
            if ([...changedFiles, ...deletedFiles]
                .map((affectedFile) => path_1.default.normalize(affectedFile))
                .includes(path_1.default.normalize(configuration.configFile))) {
                // we need to re-create programs
                parsedConfiguration = undefined;
                dependencies = undefined;
                artifacts = undefined;
                watchCompilerHost = undefined;
                watchSolutionBuilderHost = undefined;
                watchProgram = undefined;
                solutionBuilder = undefined;
                diagnosticsPerProject.clear();
                configurationChanged = true;
            }
            else {
                const previousDependencies = dependencies;
                [parsedConfiguration, parseConfigurationDiagnostics] = parseConfiguration();
                dependencies = getDependencies();
                if (previousDependencies &&
                    JSON.stringify(previousDependencies) !== JSON.stringify(dependencies)) {
                    // dependencies changed - we need to recompute artifacts
                    artifacts = getArtifacts();
                    shouldUpdateRootFiles = true;
                }
            }
            parsedConfiguration = parseConfigurationIfNeeded();
            system.setArtifacts(getArtifactsIfNeeded());
            if (configurationChanged) {
                configurationChanged = false;
                // try to remove outdated .tsbuildinfo file for incremental mode
                if (typeof typescript.getTsBuildInfoEmitOutputFilePath === 'function' &&
                    configuration.mode !== 'readonly' &&
                    parsedConfiguration.options.incremental) {
                    const tsBuildInfoPath = typescript.getTsBuildInfoEmitOutputFilePath(parsedConfiguration.options);
                    if (tsBuildInfoPath) {
                        try {
                            system.deleteFile(tsBuildInfoPath);
                        }
                        catch (error) {
                            // silent
                        }
                    }
                }
            }
            return {
                async getDependencies() {
                    if (!dependencies) {
                        dependencies = getDependencies();
                    }
                    return dependencies;
                },
                async getIssues() {
                    startProfilingIfNeeded();
                    parsedConfiguration = parseConfigurationIfNeeded();
                    // report configuration diagnostics and exit
                    if (parseConfigurationDiagnostics.length) {
                        let issues = (0, TypeScriptIssueFactory_1.createIssuesFromTsDiagnostics)(typescript, parseConfigurationDiagnostics);
                        issues.forEach((issue) => {
                            if (!issue.file) {
                                issue.file = configuration.configFile;
                            }
                        });
                        extensions.forEach((extension) => {
                            if (extension.extendIssues) {
                                issues = extension.extendIssues(issues);
                            }
                        });
                        return issues;
                    }
                    if (configuration.build) {
                        // solution builder case
                        // ensure watch solution builder host exists
                        if (!watchSolutionBuilderHost) {
                            performance.markStart('Create Solution Builder Host');
                            watchSolutionBuilderHost = (0, ControlledWatchSolutionBuilderHost_1.createControlledWatchSolutionBuilderHost)(typescript, parsedConfiguration, system, (rootNames, compilerOptions, host, oldProgram, configFileParsingDiagnostics, projectReferences) => {
                                if (compilerOptions) {
                                    startTracingIfNeeded(compilerOptions);
                                }
                                return typescript.createSemanticDiagnosticsBuilderProgram(rootNames, compilerOptions, host, oldProgram, configFileParsingDiagnostics, projectReferences);
                            }, undefined, undefined, undefined, undefined, (builderProgram) => {
                                const projectName = getProjectNameOfBuilderProgram(builderProgram);
                                const diagnostics = getDiagnosticsOfBuilderProgram(builderProgram);
                                // update diagnostics
                                diagnosticsPerProject.set(projectName, diagnostics);
                                // emit .tsbuildinfo file if needed
                                emitTsBuildInfoFileForBuilderProgram(builderProgram);
                                stopTracingIfNeeded(builderProgram);
                            }, extensions);
                            performance.markEnd('Create Solution Builder Host');
                            solutionBuilder = undefined;
                        }
                        // ensure solution builder exists and is up-to-date
                        if (!solutionBuilder || shouldUpdateRootFiles) {
                            // not sure if it's the best option - maybe there is a smarter way to do this
                            shouldUpdateRootFiles = false;
                            performance.markStart('Create Solution Builder');
                            solutionBuilder = typescript.createSolutionBuilderWithWatch(watchSolutionBuilderHost, [configuration.configFile], {});
                            performance.markEnd('Create Solution Builder');
                            performance.markStart('Build Solutions');
                            solutionBuilder.build();
                            performance.markEnd('Build Solutions');
                        }
                    }
                    else {
                        // watch compiler case
                        // ensure watch compiler host exists
                        if (!watchCompilerHost) {
                            performance.markStart('Create Watch Compiler Host');
                            watchCompilerHost = (0, ControlledWatchCompilerHost_1.createControlledWatchCompilerHost)(typescript, parsedConfiguration, system, (rootNames, compilerOptions, host, oldProgram, configFileParsingDiagnostics, projectReferences) => {
                                if (compilerOptions) {
                                    startTracingIfNeeded(compilerOptions);
                                }
                                return typescript.createSemanticDiagnosticsBuilderProgram(rootNames, compilerOptions, host, oldProgram, configFileParsingDiagnostics, projectReferences);
                            }, undefined, undefined, (builderProgram) => {
                                const projectName = getProjectNameOfBuilderProgram(builderProgram);
                                const diagnostics = getDiagnosticsOfBuilderProgram(builderProgram);
                                // update diagnostics
                                diagnosticsPerProject.set(projectName, diagnostics);
                                // emit .tsbuildinfo file if needed
                                emitTsBuildInfoFileForBuilderProgram(builderProgram);
                                stopTracingIfNeeded(builderProgram);
                            }, extensions);
                            performance.markEnd('Create Watch Compiler Host');
                            watchProgram = undefined;
                        }
                        // ensure watch program exists
                        if (!watchProgram) {
                            performance.markStart('Create Watch Program');
                            watchProgram = typescript.createWatchProgram(watchCompilerHost);
                            performance.markEnd('Create Watch Program');
                        }
                        if (shouldUpdateRootFiles && dependencies?.files) {
                            // we have to update root files manually as don't use config file as a program input
                            watchProgram.updateRootFileNames(dependencies.files);
                            shouldUpdateRootFiles = false;
                        }
                    }
                    changedFiles.forEach((changedFile) => {
                        if (system) {
                            system.invokeFileChanged(changedFile);
                        }
                    });
                    deletedFiles.forEach((removedFile) => {
                        if (system) {
                            system.invokeFileDeleted(removedFile);
                        }
                    });
                    // wait for all queued events to be processed
                    performance.markStart('Queued Tasks');
                    await system.waitForQueued();
                    performance.markEnd('Queued Tasks');
                    // aggregate all diagnostics and map them to issues
                    const diagnostics = [];
                    diagnosticsPerProject.forEach((projectDiagnostics) => {
                        diagnostics.push(...projectDiagnostics);
                    });
                    let issues = (0, TypeScriptIssueFactory_1.createIssuesFromTsDiagnostics)(typescript, diagnostics);
                    extensions.forEach((extension) => {
                        if (extension.extendIssues) {
                            issues = extension.extendIssues(issues);
                        }
                    });
                    dumpTracingLegendIfNeeded();
                    stopProfilingIfNeeded();
                    return issues;
                },
                async close() {
                    // do nothing
                },
            };
        },
    };
}
exports.createTypeScriptReporter = createTypeScriptReporter;

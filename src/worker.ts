import {workerData, parentPort} from 'worker_threads';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import {
    composeReporterRpcClients,
    createAggregatedReporter,
    FilesChange,
    FilesMatch,
    Report,
    ReporterRpcClient
} from "fork-ts-checker-webpack-plugin/lib/reporter";


import {
    createEsLintReporterRpcClient
} from "fork-ts-checker-webpack-plugin/lib/eslint-reporter/reporter/EsLintReporterRpcClient";
import {assertEsLintSupport} from "fork-ts-checker-webpack-plugin/lib/eslint-reporter/assertEsLintSupport";
import {
    createTypeScriptReporterRpcClient
} from "./reporterRpcClient/createTypeScriptReporterRpcClient";
import {assertTypeScriptSupport} from "fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptSupport";
import {
    createTypeScriptReporterConfiguration
} from "fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration";
import {
    createForkTsCheckerWebpackPluginState,
    ForkTsCheckerWebpackPluginState
} from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginState";
import {
    ForkTsCheckerWebpackPluginConfiguration
} from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginConfiguration";
import {ForkTsCheckerWebpackPluginOptions} from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginOptions";
import {
    createEsLintReporterConfiguration
} from "fork-ts-checker-webpack-plugin/lib/eslint-reporter/EsLintReporterConfiguration";
import {createFormatterConfiguration} from "fork-ts-checker-webpack-plugin/lib/formatter";
import {createIssueConfiguration} from "fork-ts-checker-webpack-plugin/lib/issue/IssueConfiguration";
import {createLoggerConfiguration} from "fork-ts-checker-webpack-plugin/lib/logger/LoggerConfiguration";
import {Issue} from "fork-ts-checker-webpack-plugin/lib/issue";
import isPending from "fork-ts-checker-webpack-plugin/lib/utils/async/isPending";
import wait from "fork-ts-checker-webpack-plugin/lib/utils/async/wait";
import chalk from "chalk";
import moment from "moment";

export interface IssueCustom extends Issue {
    formatted?: string | undefined;
    formattedColor?: string | undefined;
}

export interface ForkTsCheckerWebpackPluginStateCustom extends ForkTsCheckerWebpackPluginState {
    reportPromise: Promise<Report | undefined>;
}

const config = Object.assign({}, {
    async: true as boolean,
    typescript: {
        configFile: `./tsconfig.json`,
        extensions: {
            vue: {
                enabled: false,
                compiler: '@vue/compiler-sfc'
            }
        }
    }
} as ForkTsCheckerWebpackPluginOptions, workerData as ForkTsCheckerWebpackPluginOptions) as ForkTsCheckerWebpackPluginOptions;

export class Checker {
    constructor() {
        console.log(chalk.yellow(`[${moment().format('Y-MM-DD H:mm:ss')}] Started checker`));
        this.main().then(() => {
            if (config.async) console.log(chalk.magenta(`[${moment().format('Y-MM-DD H:mm:ss')}] Checker loaded`));
        });
    }

    createForkTsCheckerWebpackPluginConfiguration(
        options: ForkTsCheckerWebpackPluginOptions = {}
    ): ForkTsCheckerWebpackPluginConfiguration {
        const compiler: any = {
            options: {
                context: process.cwd()
            }
        }

        return {
            async: options.async as boolean,
            typescript: createTypeScriptReporterConfiguration(compiler, options.typescript),
            eslint: createEsLintReporterConfiguration(compiler, options.eslint),
            issue: createIssueConfiguration(compiler, options.issue),
            formatter: createFormatterConfiguration(options.formatter),
            logger: createLoggerConfiguration(compiler, options.logger),
        };
    }

    async main() {
        const configuration = this.createForkTsCheckerWebpackPluginConfiguration(config);
        const state = createForkTsCheckerWebpackPluginState() as ForkTsCheckerWebpackPluginStateCustom;
        const reporters: ReporterRpcClient[] = [];
        state.watching = config.async ?? true;
        if (configuration.typescript.enabled) {
            assertTypeScriptSupport(configuration.typescript);
            reporters.push(createTypeScriptReporterRpcClient(configuration.typescript));
        }

        if (configuration.eslint.enabled) {
            assertEsLintSupport(configuration.eslint);
            reporters.push(createEsLintReporterRpcClient(configuration.eslint));
        }

        if (reporters.length) {
            const reporter = createAggregatedReporter(composeReporterRpcClients(reporters));

            if (state.watching) {
                parentPort?.on('message', async (message: any) => {
                    if (message.type === 'changedFiles') {
                        const startTime = (new Date()).getTime();
                        this.compilation(state, reporter, configuration, message.files);

                        if (await isPending(state.issuesPromise)) {
                            console.log(chalk.cyan(`[${moment().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));
                        }

                        state.issuesPromise.then(async (issues) => {
                            if (!issues) issues = [];

                            issues = issues?.filter(configuration.issue.predicate);
                            const doneTime = (new Date()).getTime();
                            parentPort?.postMessage({
                                type: 'issueList',
                                issues: issues,
                                time: doneTime - startTime
                            });
                        }).catch((e) => {
                            console.log(chalk.bgRed(`[${moment().format('Y-MM-DD H:mm:ss')}] CATCH state.issuesPromise`), e)
                        });
                    }
                });
            } else {
                this.compilation(state, reporter, configuration, {changedFiles: [], deletedFiles: []});
                await this.run(state, reporter, configuration);
                await this.done(state, reporter, configuration);
            }
        }
    }

    async done(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration) {
        await reporter.disconnect();
    }

    compilation(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration, change: FilesChange) {
        let resolveDependencies: (dependencies: FilesMatch | undefined) => void;
        let rejectedDependencies: (error: Error) => void;
        let resolveIssues: (issues: Issue[] | undefined) => void;
        let rejectIssues: (error: Error) => void;

        state.dependenciesPromise = new Promise((resolve, reject) => {
            resolveDependencies = resolve;
            rejectedDependencies = reject;
        });
        state.issuesPromise = new Promise((resolve, reject) => {
            resolveIssues = resolve;
            rejectIssues = reject;
        });
        const previousReportPromise = state.reportPromise;
        state.reportPromise = ForkTsCheckerWebpackPlugin.pool.submit(
            (done: any) =>
                new Promise(async (resolve) => {
                    try {
                        await reporter.connect();

                        const previousReport = await previousReportPromise;
                        if (previousReport) {
                            await previousReport.close();
                        }
                        const report = await reporter.getReport(change);
                        resolve(report);

                        report
                            .getDependencies()
                            .then(resolveDependencies)
                            .catch(rejectedDependencies)
                            .finally(() => {
                                report.getIssues().then((Issues) => {
                                    return Issues.filter(item => !Boolean(item.message.includes('is not a module') || item.message.includes('has no default export')) && !item.message.includes('.vue'))
                                }).then(resolveIssues).catch(rejectIssues).finally(done);
                            });
                    } catch (error) {
                        resolve(undefined);
                        resolveDependencies(undefined);
                        resolveIssues(undefined);
                        done();
                    }
                })
        );
    }

    async run(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration) {
        if (!state.initialized) {
            state.initialized = true;
            console.log(chalk.cyan(`[${moment().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));

            const reportPromise = state.reportPromise;
            const issuesPromise = state.issuesPromise;
            const startTime = (new Date()).getTime();

            let issues: Issue[] | undefined = [];

            try {
                if (state.watching) {
                    if (await isPending(issuesPromise)) {
                        console.log(chalk.cyan(`[${moment().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));
                    } else {
                        await wait(10);
                    }
                }

                issues = await issuesPromise;
            } catch (error) {
                console.log({error: error, xx: chalk.bgRed('!!!!!!!!!!!!')})
                return;
            }

            if (!issues) issues = [];

            if (state.watching) {
                if (reportPromise !== state.reportPromise) {
                    return;
                }
            }

            issues = issues.filter(configuration.issue.predicate);

            const doneTime = (new Date()).getTime();
            parentPort?.postMessage({
                type: 'issueList',
                issues: issues,
                time: doneTime - startTime
            });
        }
    }
}

export const checker = new Checker;

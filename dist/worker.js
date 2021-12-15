"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checker = exports.Checker = void 0;
const worker_threads_1 = require("worker_threads");
const fork_ts_checker_webpack_plugin_1 = __importDefault(require("fork-ts-checker-webpack-plugin"));
const reporter_1 = require("fork-ts-checker-webpack-plugin/lib/reporter");
const EsLintReporterRpcClient_1 = require("fork-ts-checker-webpack-plugin/lib/eslint-reporter/reporter/EsLintReporterRpcClient");
const assertEsLintSupport_1 = require("fork-ts-checker-webpack-plugin/lib/eslint-reporter/assertEsLintSupport");
const createTypeScriptReporterRpcClient_1 = require("./reporterRpcClient/createTypeScriptReporterRpcClient");
const TypeScriptSupport_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptSupport");
const TypeScriptReporterConfiguration_1 = require("fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration");
const ForkTsCheckerWebpackPluginState_1 = require("fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginState");
const EsLintReporterConfiguration_1 = require("fork-ts-checker-webpack-plugin/lib/eslint-reporter/EsLintReporterConfiguration");
const formatter_1 = require("fork-ts-checker-webpack-plugin/lib/formatter");
const IssueConfiguration_1 = require("fork-ts-checker-webpack-plugin/lib/issue/IssueConfiguration");
const LoggerConfiguration_1 = require("fork-ts-checker-webpack-plugin/lib/logger/LoggerConfiguration");
const isPending_1 = __importDefault(require("fork-ts-checker-webpack-plugin/lib/utils/async/isPending"));
const wait_1 = __importDefault(require("fork-ts-checker-webpack-plugin/lib/utils/async/wait"));
const chalk_1 = __importDefault(require("chalk"));
const moment_1 = __importDefault(require("moment"));
const config = Object.assign({}, {
    async: true,
    typescript: {
        configFile: `./tsconfig.json`,
        extensions: {
            vue: {
                enabled: false,
                compiler: '@vue/compiler-sfc'
            }
        }
    }
}, worker_threads_1.workerData);
class Checker {
    constructor() {
        console.log(chalk_1.default.yellow(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] Started checker`));
        this.main().then(() => {
            if (config.async)
                console.log(chalk_1.default.magenta(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] Checker loaded`));
        });
    }
    createForkTsCheckerWebpackPluginConfiguration(options = {}) {
        const compiler = {
            options: {
                context: process.cwd()
            }
        };
        return {
            async: options.async,
            typescript: (0, TypeScriptReporterConfiguration_1.createTypeScriptReporterConfiguration)(compiler, options.typescript),
            eslint: (0, EsLintReporterConfiguration_1.createEsLintReporterConfiguration)(compiler, options.eslint),
            issue: (0, IssueConfiguration_1.createIssueConfiguration)(compiler, options.issue),
            formatter: (0, formatter_1.createFormatterConfiguration)(options.formatter),
            logger: (0, LoggerConfiguration_1.createLoggerConfiguration)(compiler, options.logger),
        };
    }
    async main() {
        const configuration = this.createForkTsCheckerWebpackPluginConfiguration(config);
        const state = (0, ForkTsCheckerWebpackPluginState_1.createForkTsCheckerWebpackPluginState)();
        const reporters = [];
        state.watching = config.async ?? true;
        if (configuration.typescript.enabled) {
            (0, TypeScriptSupport_1.assertTypeScriptSupport)(configuration.typescript);
            reporters.push((0, createTypeScriptReporterRpcClient_1.createTypeScriptReporterRpcClient)(configuration.typescript));
        }
        if (configuration.eslint.enabled) {
            (0, assertEsLintSupport_1.assertEsLintSupport)(configuration.eslint);
            reporters.push((0, EsLintReporterRpcClient_1.createEsLintReporterRpcClient)(configuration.eslint));
        }
        if (reporters.length) {
            const reporter = (0, reporter_1.createAggregatedReporter)((0, reporter_1.composeReporterRpcClients)(reporters));
            if (state.watching) {
                worker_threads_1.parentPort?.on('message', async (message) => {
                    if (message.type === 'changedFiles') {
                        const startTime = (new Date()).getTime();
                        this.compilation(state, reporter, configuration, message.files);
                        if (await (0, isPending_1.default)(state.issuesPromise)) {
                            console.log(chalk_1.default.cyan(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));
                        }
                        state.issuesPromise.then(async (issues) => {
                            if (!issues)
                                issues = [];
                            issues = issues?.filter(configuration.issue.predicate);
                            const doneTime = (new Date()).getTime();
                            worker_threads_1.parentPort?.postMessage({
                                type: 'issueList',
                                issues: issues,
                                time: doneTime - startTime
                            });
                        }).catch((e) => {
                            console.log(chalk_1.default.bgRed(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] CATCH state.issuesPromise`), e);
                        });
                    }
                });
            }
            else {
                this.compilation(state, reporter, configuration, { changedFiles: [], deletedFiles: [] });
                await this.run(state, reporter, configuration);
                await this.done(state, reporter, configuration);
            }
        }
    }
    async done(state, reporter, configuration) {
        await reporter.disconnect();
    }
    compilation(state, reporter, configuration, change) {
        let resolveDependencies;
        let rejectedDependencies;
        let resolveIssues;
        let rejectIssues;
        state.dependenciesPromise = new Promise((resolve, reject) => {
            resolveDependencies = resolve;
            rejectedDependencies = reject;
        });
        state.issuesPromise = new Promise((resolve, reject) => {
            resolveIssues = resolve;
            rejectIssues = reject;
        });
        const previousReportPromise = state.reportPromise;
        state.reportPromise = fork_ts_checker_webpack_plugin_1.default.pool.submit((done) => new Promise(async (resolve) => {
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
                        return Issues.filter(item => !Boolean(item.message.includes('is not a module') || item.message.includes('has no default export')) && !item.message.includes('.vue'));
                    }).then(resolveIssues).catch(rejectIssues).finally(done);
                });
            }
            catch (error) {
                resolve(undefined);
                resolveDependencies(undefined);
                resolveIssues(undefined);
                done();
            }
        }));
    }
    async run(state, reporter, configuration) {
        if (!state.initialized) {
            state.initialized = true;
            console.log(chalk_1.default.cyan(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));
            const reportPromise = state.reportPromise;
            const issuesPromise = state.issuesPromise;
            const startTime = (new Date()).getTime();
            let issues = [];
            try {
                if (state.watching) {
                    if (await (0, isPending_1.default)(issuesPromise)) {
                        console.log(chalk_1.default.cyan(`[${(0, moment_1.default)().format('Y-MM-DD H:mm:ss')}] Issues checking in progress...`));
                    }
                    else {
                        await (0, wait_1.default)(10);
                    }
                }
                issues = await issuesPromise;
            }
            catch (error) {
                console.log({ error: error, xx: chalk_1.default.bgRed('!!!!!!!!!!!!') });
                return;
            }
            if (!issues)
                issues = [];
            if (state.watching) {
                if (reportPromise !== state.reportPromise) {
                    return;
                }
            }
            issues = issues.filter(configuration.issue.predicate);
            const doneTime = (new Date()).getTime();
            worker_threads_1.parentPort?.postMessage({
                type: 'issueList',
                issues: issues,
                time: doneTime - startTime
            });
        }
    }
}
exports.Checker = Checker;
exports.checker = new Checker;

import { FilesChange, Report, ReporterRpcClient } from "fork-ts-checker-webpack-plugin/lib/reporter";
import { ForkTsCheckerWebpackPluginState } from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginState";
import { ForkTsCheckerWebpackPluginConfiguration } from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginConfiguration";
import { ForkTsCheckerWebpackPluginOptions } from "fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPluginOptions";
import { Issue } from "fork-ts-checker-webpack-plugin/lib/issue";
export interface IssueCustom extends Issue {
    formatted?: string | undefined;
    formattedColor?: string | undefined;
}
export interface ForkTsCheckerWebpackPluginStateCustom extends ForkTsCheckerWebpackPluginState {
    reportPromise: Promise<Report | undefined>;
}
export declare class Checker {
    constructor();
    createForkTsCheckerWebpackPluginConfiguration(options?: ForkTsCheckerWebpackPluginOptions): ForkTsCheckerWebpackPluginConfiguration;
    main(): Promise<void>;
    done(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration): Promise<void>;
    compilation(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration, change: FilesChange): void;
    run(state: ForkTsCheckerWebpackPluginStateCustom, reporter: ReporterRpcClient, configuration: ForkTsCheckerWebpackPluginConfiguration): Promise<void>;
}
export declare const checker: Checker;

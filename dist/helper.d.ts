/// <reference types="node" />
import { IssueCustom } from "./worker";
import { ErrorPayload, WebSocketServer } from "vite";
import { Worker } from "worker_threads";
import { BabelCodeFrameOptions } from "fork-ts-checker-webpack-plugin/lib/formatter";
import { Issue } from "fork-ts-checker-webpack-plugin/lib/issue";
import { TypeScriptReporterOptions } from "fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterOptions";
import { EsLintReporterOptions } from "fork-ts-checker-webpack-plugin/lib/eslint-reporter/EsLintReporterOptions";
export declare type WorkerCallback = (err: any, result?: any) => any;
export declare type Formatter = (issue: Issue, options?: BabelCodeFrameOptions) => string;
export declare class Helper {
    changedFiles: Array<string>;
    deletedFiles: Array<string>;
    timeout: NodeJS.Timeout | undefined;
    worker: Worker | undefined;
    config: PluginConfig;
    constructor(config: PluginConfig);
    runWorker(path: string, cb: WorkerCallback, workerData?: object | null): Worker;
    workerStart(ws?: WebSocketServer, watch?: boolean): void;
    clearFiles(): void;
    addFile: (path: string) => void;
    deleteFile: (path: string) => void;
    changeFiles(): void;
    getPayloadError(issues: IssueCustom): ErrorPayload;
    handleMessage(message: any, ws?: WebSocketServer): void;
}
export declare function issueToViteError(issue: IssueCustom): ErrorPayload['err'];
export declare function createCodeFrameFormatter(options?: BabelCodeFrameOptions): Formatter;
export declare function createBasicFormatter(): Formatter;
export interface PluginConfig {
    vite: {
        overlay: boolean;
    };
    checker: ForkTsCheckerWebpackPluginOptions;
}
export interface ForkTsCheckerWebpackPluginOptions {
    async?: boolean;
    typescript?: TypeScriptReporterOptions;
    eslint?: EsLintReporterOptions;
    formatter?: 'codeframe' | 'basic';
}

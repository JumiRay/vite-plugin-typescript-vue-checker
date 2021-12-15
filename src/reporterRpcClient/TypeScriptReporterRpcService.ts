import process from 'process';
import {createTypeScriptReporter } from "./createTypeScriptReporter";
import { TypeScriptReporterConfiguration } from 'fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration';
import { createRpcIpcMessagePort } from 'fork-ts-checker-webpack-plugin/lib/rpc/rpc-ipc';
import { registerReporterRpcService } from 'fork-ts-checker-webpack-plugin/lib/reporter';
const service = registerReporterRpcService<TypeScriptReporterConfiguration>(
    createRpcIpcMessagePort(process),
    createTypeScriptReporter
);
service.open();

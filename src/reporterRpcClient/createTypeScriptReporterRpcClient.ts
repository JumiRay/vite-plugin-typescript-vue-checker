import path from 'path';
import {
    TypeScriptReporterConfiguration
} from "fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration";
import { createReporterRpcClient, ReporterRpcClient } from 'fork-ts-checker-webpack-plugin/lib/reporter';
import { createRpcIpcMessageChannel } from 'fork-ts-checker-webpack-plugin/lib//rpc/rpc-ipc';

function createTypeScriptReporterRpcClient(
    configuration: TypeScriptReporterConfiguration
): ReporterRpcClient {
    const channel = createRpcIpcMessageChannel(
        path.resolve(__dirname, './TypeScriptReporterRpcService.js'),
        configuration.memoryLimit
    );

    return createReporterRpcClient(channel, configuration);
}

export { createTypeScriptReporterRpcClient };

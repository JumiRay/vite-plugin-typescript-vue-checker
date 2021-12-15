import { TypeScriptReporterConfiguration } from "fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration";
import { ReporterRpcClient } from 'fork-ts-checker-webpack-plugin/lib/reporter';
declare function createTypeScriptReporterRpcClient(configuration: TypeScriptReporterConfiguration): ReporterRpcClient;
export { createTypeScriptReporterRpcClient };

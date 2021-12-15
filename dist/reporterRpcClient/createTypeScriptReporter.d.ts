import { Reporter } from 'fork-ts-checker-webpack-plugin/lib/reporter';
import { TypeScriptReporterConfiguration } from 'fork-ts-checker-webpack-plugin/lib/typescript-reporter/TypeScriptReporterConfiguration';
declare function createTypeScriptReporter(configuration: TypeScriptReporterConfiguration): Reporter;
export { createTypeScriptReporter };

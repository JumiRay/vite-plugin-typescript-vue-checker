"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTypeScriptReporterRpcClient = void 0;
const path_1 = __importDefault(require("path"));
const reporter_1 = require("fork-ts-checker-webpack-plugin/lib/reporter");
const rpc_ipc_1 = require("fork-ts-checker-webpack-plugin/lib//rpc/rpc-ipc");
function createTypeScriptReporterRpcClient(configuration) {
    const channel = (0, rpc_ipc_1.createRpcIpcMessageChannel)(path_1.default.resolve(__dirname, './TypeScriptReporterRpcService.js'), configuration.memoryLimit);
    return (0, reporter_1.createReporterRpcClient)(channel, configuration);
}
exports.createTypeScriptReporterRpcClient = createTypeScriptReporterRpcClient;

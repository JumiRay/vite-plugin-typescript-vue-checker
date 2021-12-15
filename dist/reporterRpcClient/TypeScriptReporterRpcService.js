"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
const createTypeScriptReporter_1 = require("./createTypeScriptReporter");
const rpc_ipc_1 = require("fork-ts-checker-webpack-plugin/lib/rpc/rpc-ipc");
const reporter_1 = require("fork-ts-checker-webpack-plugin/lib/reporter");
const service = (0, reporter_1.registerReporterRpcService)((0, rpc_ipc_1.createRpcIpcMessagePort)(process_1.default), createTypeScriptReporter_1.createTypeScriptReporter);
service.open();

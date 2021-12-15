"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vueAndTsChecker = void 0;
const helper_1 = require("./helper");
function vueAndTsChecker() {
    const pluginConfig = {
        vite: {
            overlay: true
        },
        checker: {
            typescript: {
                extensions: {
                    vue: {
                        enabled: true,
                        compiler: '@vue/compiler-sfc'
                    }
                }
            }
        }
    };
    const helper = new helper_1.Helper(pluginConfig);
    return {
        name: 'vite-plugin-fork-ts-checker',
        configureServer({ watcher, ws, config: { logger } }) {
            helper.workerStart(ws, true);
            watcher.on('add', helper.addFile);
            watcher.on('change', helper.addFile);
            watcher.on('unlink', helper.deleteFile);
        },
        async writeBundle(options) {
            pluginConfig.checker.async = false;
            helper.workerStart(undefined, false);
        },
    };
}
exports.vueAndTsChecker = vueAndTsChecker;

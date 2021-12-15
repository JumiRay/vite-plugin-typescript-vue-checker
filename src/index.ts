import { Helper, PluginConfig } from "./helper";
import { ViteDevServer } from "vite";

export function vueAndTsChecker() {
    const pluginConfig:PluginConfig = {
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
    }
    const helper = new Helper(pluginConfig);

    return {
        name: 'vite-plugin-fork-ts-checker',
        configureServer({ watcher, ws, config: { logger } }: ViteDevServer) {
            helper.workerStart(ws, true);
            watcher.on('add', helper.addFile)
            watcher.on('change', helper.addFile)
            watcher.on('unlink', helper.deleteFile)
        },
        async writeBundle(options: any) {
            pluginConfig.checker.async = false;
            helper.workerStart(undefined, false);
        },
    }
}

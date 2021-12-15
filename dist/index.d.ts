import { ViteDevServer } from "vite";
export declare function vueAndTsChecker(): {
    name: string;
    configureServer({ watcher, ws, config: { logger } }: ViteDevServer): void;
    writeBundle(options: any): Promise<void>;
};

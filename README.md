## A vite plugin to detect *.ts ｜ *.vue typescript error
this plugin based on fork-ts-checker-webpack-plugin (https://github.com/TypeStrong/fork-ts-checker-webpack-plugin).

* Support Vue Single File Component
* Support *script setup*
* Prompt errors in Vite HMR overlay and terminal console


```sh
# npm
npm install --save-dev vite-plugin-typescript-vue-checker

# yarn
yarn add --dev vite-plugin-typescript-vue-checker

```

## example in vite.config.ts
```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { vueAndTsChecker }  from 'vite-plugin-typescript-vue-checker';

export default defineConfig({
    plugins: [vue(), vueAndTsChecker()]
})

```
## License

MIT License

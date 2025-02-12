import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import {fileURLToPath, URL} from "url";

export default defineConfig({
    define: {
        __DEV__: true
    },
    test: {
        include: ['__tests__/**/*.spec.ts'],
    },
    resolve: {
        alias: {
            'history': fileURLToPath(new URL('../../../history/packages/history/index.ts', import.meta.url))
        }
    },
    plugins: [tsconfigPaths()],
})
import {defineConfig} from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    define: {
        __DEV__: true
    },
    test: {
        include: ['__tests__/**/*.spec.ts'],
    },
    resolve: {
        
    },
    plugins: [tsconfigPaths()],
})
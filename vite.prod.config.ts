import {resolve} from "path";
import dts from 'vite-plugin-dts'

export default {
  esbuild: {
    jsxFactory: 'createElement',
    jsxFragment: 'Fragment',
  },
  resolve: {

  },
  define: {
    __DEV__: false
  },
  build: {
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'RxRouter',
      // the proper extensions will be added
      fileName: 'index',
    },
    sourcemap: true,
    rollupOptions: {
        external: ['data0'],
    },
  },
  plugins: [dts({
    tsconfigPath: resolve(__dirname, '../../tsconfig.prod.json'),
    rollupTypes: true,
    include: ['src/**/*.ts'],
  })]
}

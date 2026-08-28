import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';

const configDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    viteCommonjs(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'crypto', 'stream'],
    }),
  ],
  esbuild: {
    jsx: 'automatic',
    jsxDev: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(configDirectory, './src'),
      'cross-fetch': path.resolve(configDirectory, './src/integration/browser-fetch.ts'),
      'object-inspect': path.resolve(
        configDirectory,
        './src/integration/browser-object-inspect.ts',
      ),
    },
  },
  server: {
    fs: {
      allow: [path.resolve(configDirectory, '..')],
    },
  },
});

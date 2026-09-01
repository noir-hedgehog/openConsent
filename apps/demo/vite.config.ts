import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const browserBundle = resolve(__dirname, '../../packages/web/dist/openconsent.min.js');

function hostedBrowserBundle(): Plugin {
  return {
    name: 'openconsent-hosted-browser-bundle',
    configureServer(server) {
      server.middlewares.use('/openconsent.min.js', (_request, response) => {
        response.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(readFileSync(browserBundle));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'openconsent.min.js', source: readFileSync(browserBundle) });
    }
  };
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react(), hostedBrowserBundle()],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        playground: resolve(__dirname, 'playground/index.html'),
        iife: resolve(__dirname, 'iife/index.html'),
      },
    },
  },
});

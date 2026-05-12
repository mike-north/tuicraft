import { defineConfig } from 'vite';

// Vite handles Monaco's workers natively via the `?worker` import
// suffix — see src/monaco-loader.ts. No plugin needed.
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 4000, // Monaco's bundle is intrinsically large.
  },
  server: {
    port: 5173,
    strictPort: false,
    open: false,
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});

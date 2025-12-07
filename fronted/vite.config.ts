import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import environment from 'vite-plugin-environment';

// Generate build timestamp for cache busting
const BUILD_TIMESTAMP = Date.now();

export default defineConfig({
  plugins: [
    react(),
    environment('all', { prefix: 'CANISTER_' }),
    environment('all', { prefix: 'DFX_' }),
    environment('all', { prefix: 'VITE_' }),
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
    Buffer: ['buffer', 'Buffer'],
    __BUILD_TIMESTAMP__: JSON.stringify(BUILD_TIMESTAMP),
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4943',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].[hash].${BUILD_TIMESTAMP}.js`,
        chunkFileNames: `assets/[name].[hash].${BUILD_TIMESTAMP}.js`,
        assetFileNames: `assets/[name].[hash].${BUILD_TIMESTAMP}.[ext]`,
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
});

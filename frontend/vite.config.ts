import { defineConfig } from 'vite'
import path from 'path'

// Vite configuration tailored for a Phaser-based project.
// Adds sensible defaults for asset paths, environment injection, and smoother
// development DX.

export default defineConfig(({ mode }) => ({
  // Base URL: needed when deploying to a sub-directory (e.g. GitHub Pages)
  // In dev we keep it root-relative so HMR works out of the box.
  base: mode === 'production' ? './' : '/',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/scenes': path.resolve(__dirname, './src/scenes'),
      '@/entities': path.resolve(__dirname, './src/entities'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types')
    }
  },

  // Inject process.env.NODE_ENV so legacy checks like
  // `process.env.NODE_ENV === 'development'` don't crash in the browser.
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode),
  },

  server: {
    port: 3000,
    host: true,
    strictPort: true,
    open: true, // Auto-open browser on `npm run dev`
  },

  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: mode !== 'production' ? 'inline' : false,
  },

  optimizeDeps: {
    /**
     * Include Phaser in optimization to fix default import issues
     */
    include: ['phaser'],
  },

  esbuild: {
    // Handle Phaser's export patterns correctly
    keepNames: true,
  },
}))
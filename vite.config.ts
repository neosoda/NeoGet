import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Normalize path for Windows: chokidar uses forward slashes internally
      ignored: (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/')
        return normalizedPath.includes('/src-tauri/target/')
      },
    },
  },
  build: {
    target: ['es2021', 'chrome100', 'safari13'],
    // Vite 8 minifies with Oxc by default; `minify: 'esbuild'` is deprecated
    // and would require re-adding esbuild as an explicit devDependency.
    minify: !process.env.TAURI_DEBUG,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
})

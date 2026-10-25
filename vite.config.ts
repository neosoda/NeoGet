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
      // Normalize path for Windows: chokidar uses forward slashes internally.
      // The Rust build tree is excluded: on Windows the linker locks the .exe
      // it writes, and watching it fails with EBUSY.
      ignored: (filePath: string) => {
        const normalizedPath = filePath.replace(/\\/g, '/')
        return (
          normalizedPath.includes('/src-tauri/target/') ||
          normalizedPath.includes('/target/')
        )
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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// Normalize to forward slashes for chokidar compatibility on Windows
var tauriTargetDir = path.resolve(__dirname, 'src-tauri', 'target').replace(/\\/g, '/');
export default defineConfig({
    plugins: [react()],
    base: './',
    clearScreen: false,
    server: {
        port: 5173,
        strictPort: true,
        watch: {
            // Normalize path for Windows: chokidar uses forward slashes internally
            ignored: function (filePath) {
                var normalizedPath = filePath.replace(/\\/g, '/');
                return normalizedPath.includes('/src-tauri/target/');
            },
        },
    },
    build: {
        target: ['es2021', 'chrome100', 'safari13'],
        minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});

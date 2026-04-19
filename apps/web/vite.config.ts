import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Directorio de apps/web (fiable en ESM; __dirname a veces no es el esperado en vite.config.ts).
const appDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Carga .env / .env.local desde apps/web aunque el cwd sea la raíz del monorepo.
  envDir: appDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.join(appDir, 'src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    target: 'es2022',
  },
});

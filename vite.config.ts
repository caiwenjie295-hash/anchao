import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { startupManifestPlugin } from './scripts/startup/manifestPlugin.mjs';

export default defineConfig({
  plugins: [react(), startupManifestPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
});

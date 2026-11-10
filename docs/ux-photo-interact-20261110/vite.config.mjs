import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repository = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: repository,
  base: './',
  plugins: [react()],
  build: {
    outDir: process.env.ANCHAO_QA_OUT || path.join(tmpdir(), 'anchao-photo-interact-20261110-preview'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        fixture: path.join(repository, 'docs/ux-designeer-20261110/fixture.html'),
        viewport: path.join(repository, 'docs/ux-designeer-20261110/viewport.html'),
      },
    },
  },
});

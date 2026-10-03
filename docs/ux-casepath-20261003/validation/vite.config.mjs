import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const outputDirectory = mkdtempSync(path.join(tmpdir(), 'anchao-ux-casepath-fixture-'));
const inputFile = path.join(repositoryRoot, 'docs/ux-casepath-20261003/validation/fixture.html');

export default defineConfig({
  root: repositoryRoot,
  base: './',
  plugins: [react()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: { input: inputFile },
  },
});

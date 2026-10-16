import type { Plugin } from 'vite';
export const MANIFEST_NAME: string;
export function startupManifestPlugin(): Plugin;
export function createStartupManifest(base: string, files: { fileName: string; source: string | Uint8Array }[]): {
  schema: number; version: string; base: string; totalBytes: number;
  resources: { path: string; bytes: number; sha256: string }[];
};

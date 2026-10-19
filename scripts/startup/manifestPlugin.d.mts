import type { Plugin } from 'vite';
export const MANIFEST_NAME: string;
export const STARTUP_GROUPS: readonly string[];
export function startupManifestPlugin(): Plugin;
export function createStartupManifest(base: string, files: { fileName: string; source: string | Uint8Array }[], groupsByFile?: Map<string, string[]> | Record<string, string[]>): {
  schema: number; version: string; base: string; totalBytes: number;
  groups: Record<string, { resources: number; totalBytes: number }>;
  resources: { path: string; bytes: number; sha256: string; groups: string[] }[];
};

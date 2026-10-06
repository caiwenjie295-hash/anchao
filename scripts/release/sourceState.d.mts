export const ALLOWED_WINDOWS_MODE_ONLY_PATHS: Set<string>;
export interface GitSourceState {
  gitSha: string;
  contentDirtyPaths: string[];
  untrackedPaths: string[];
  modeOnlyPaths: string[];
  sourceContentHash: string;
}
export function inspectGitSource(rootDirectory?: string): Promise<GitSourceState>;
export function inspectReleaseSource(rootDirectory?: string): Promise<GitSourceState & { clean: boolean; unsupportedModeOnlyPaths: string[] }>;

/** Minimal platform storage surface shared by save and preference repositories. */
export interface BrowserStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Compatibility name for callers that only store game saves. */
export type SaveStoragePort = BrowserStoragePort;

/** Resolves browser storage lazily because accessing localStorage can itself throw. */
export function resolveBrowserStorage(storage?: BrowserStoragePort): BrowserStoragePort | undefined {
  if (storage) return storage;
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export const resolveSaveStorage = resolveBrowserStorage;

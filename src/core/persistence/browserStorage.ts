/** Minimal platform storage surface used by the save repository. */
export interface SaveStoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Resolves browser storage lazily because accessing localStorage can itself throw. */
export function resolveSaveStorage(storage?: SaveStoragePort): SaveStoragePort | undefined {
  if (storage) return storage;
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

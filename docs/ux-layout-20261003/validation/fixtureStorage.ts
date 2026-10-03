export interface FixtureStorageHandle {
  storage: Storage;
  restore: () => void;
}

/** Install a disposable, tab-local Storage without reading or mutating the real save. */
export function installFixtureMemoryStorage(target: Window = window): FixtureStorageHandle {
  const values = new Map<string, string>();
  const previousDescriptor = Object.getOwnPropertyDescriptor(target, 'localStorage');
  const storage: Storage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key) { return values.get(String(key)) ?? null; },
    key(index) { return [...values.keys()][index] ?? null; },
    removeItem(key) { values.delete(String(key)); },
    setItem(key, value) { values.set(String(key), String(value)); },
  };

  Object.defineProperty(target, 'localStorage', { configurable: true, enumerable: true, value: storage });
  if (target.localStorage !== storage) {
    if (previousDescriptor) Object.defineProperty(target, 'localStorage', previousDescriptor);
    else Reflect.deleteProperty(target, 'localStorage');
    throw new Error('无法替换 localStorage，fixture 为保护正式存档已停止。');
  }

  const probeKey = '__ux_layout_fixture_isolation_probe__';
  storage.setItem(probeKey, 'memory-only');
  if (target.localStorage.getItem(probeKey) !== 'memory-only') {
    if (previousDescriptor) Object.defineProperty(target, 'localStorage', previousDescriptor);
    else Reflect.deleteProperty(target, 'localStorage');
    throw new Error('内存存储自检失败，fixture 为保护正式存档已停止。');
  }
  storage.removeItem(probeKey);
  target.document.documentElement.dataset.uxLayoutStorageIsolation = 'memory';

  let restored = false;
  return {
    storage,
    restore() {
      if (restored) return;
      restored = true;
      if (previousDescriptor) Object.defineProperty(target, 'localStorage', previousDescriptor);
      else Reflect.deleteProperty(target, 'localStorage');
      delete target.document.documentElement.dataset.uxLayoutStorageIsolation;
    },
  };
}

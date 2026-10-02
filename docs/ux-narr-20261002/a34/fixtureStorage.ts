export interface FixtureStorageHandle {
  storage: Storage;
  restore: () => void;
}

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
  target.document.documentElement.dataset.a34StorageIsolation = 'memory';
  return {
    storage,
    restore() {
      if (previousDescriptor) Object.defineProperty(target, 'localStorage', previousDescriptor);
      else Reflect.deleteProperty(target, 'localStorage');
      delete target.document.documentElement.dataset.a34StorageIsolation;
    },
  };
}

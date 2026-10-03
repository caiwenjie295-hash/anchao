export const FIXTURE_SNAPSHOT_KEY = '__anchao_ux_casepath_temporary_snapshot_v1__';

export interface FixtureStorageHandle {
  storage: Storage;
  restore: () => void;
}

export interface FixtureSnapshot {
  mode: string;
  serializedSave: string;
}

function restoreDescriptor(target: Window, descriptor: PropertyDescriptor | undefined): void {
  if (descriptor) Object.defineProperty(target, 'localStorage', descriptor);
  else Reflect.deleteProperty(target, 'localStorage');
}

/** Shadow localStorage without reading its prior contents; abort if the memory store cannot be verified. */
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

  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    restoreDescriptor(target, previousDescriptor);
    delete target.document.documentElement.dataset.uxCasepathStorageIsolation;
  };

  try {
    Object.defineProperty(target, 'localStorage', { configurable: true, enumerable: true, value: storage });
    if (target.localStorage !== storage) throw new Error('页面仍未使用验收专用内存存档。');
    const probe = '__ux_casepath_isolation_probe__';
    storage.setItem(probe, 'memory-only');
    if (target.localStorage.getItem(probe) !== 'memory-only') throw new Error('内存存档读写自检失败。');
    storage.removeItem(probe);
    if (storage.length !== 0) throw new Error('内存存档自检清理失败。');
    target.document.documentElement.dataset.uxCasepathStorageIsolation = 'memory';
    return { storage, restore };
  } catch (error) {
    restore();
    throw new Error(`无法隔离正式存档，fixture 已停止：${String(error)}`);
  }
}

export function writeFixtureSnapshot(session: Storage, mode: string, serializedSave: string): void {
  let parsed: unknown;
  try { parsed = JSON.parse(serializedSave); }
  catch { throw new Error('当前内存存档不是有效 JSON，无法重挂载。'); }
  if (!parsed || typeof parsed !== 'object' || (parsed as { schemaVersion?: unknown }).schemaVersion !== 13) {
    throw new Error('当前临时存档不是 schema 13，无法重挂载。');
  }
  session.setItem(FIXTURE_SNAPSHOT_KEY, JSON.stringify({ version: 1, mode, serializedSave }));
}

/** Read only the fixture-owned session key; leave it in place until the new App has loaded successfully. */
export function readFixtureSnapshot(session: Storage, expectedMode: string): FixtureSnapshot | null {
  const raw = session.getItem(FIXTURE_SNAPSHOT_KEY);
  if (raw === null) return null;
  let candidate: unknown;
  try { candidate = JSON.parse(raw); }
  catch { throw new Error('fixture 临时恢复快照格式损坏；没有加载或清除任何正式存档。'); }
  if (!candidate || typeof candidate !== 'object') throw new Error('fixture 临时恢复快照缺少数据。');
  const value = candidate as { version?: unknown; mode?: unknown; serializedSave?: unknown };
  if (value.version !== 1 || value.mode !== expectedMode || typeof value.serializedSave !== 'string') {
    throw new Error('fixture 快照与当前 checkpoint 不匹配；请回到原 checkpoint 重试。');
  }
  return { mode: value.mode, serializedSave: value.serializedSave };
}

export function requireFixtureSnapshot(session: Storage, expectedMode: string): FixtureSnapshot {
  const snapshot = readFixtureSnapshot(session, expectedMode);
  if (!snapshot) throw new Error('当前标签页缺少本批 fixture 专属 session 快照；为防止伪造恢复，此页没有重新生成 checkpoint。');
  return snapshot;
}

export function clearFixtureSnapshot(session: Storage): void {
  session.removeItem(FIXTURE_SNAPSHOT_KEY);
}

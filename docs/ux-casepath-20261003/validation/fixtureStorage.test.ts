import { describe, expect, it } from 'vitest';
import {
  clearFixtureSnapshot,
  FIXTURE_SNAPSHOT_KEY,
  installFixtureMemoryStorage,
  requireFixtureSnapshot,
  readFixtureSnapshot,
  writeFixtureSnapshot,
} from './fixtureStorage';

describe('isolated casepath fixture storage', () => {
  it('shadows the formal save without reading it and restores only the original property descriptor', () => {
    const page = { document: { documentElement: { dataset: {} } } } as unknown as Window;
    let formalReadCount = 0;
    Object.defineProperty(page, 'localStorage', {
      configurable: true,
      get() { formalReadCount += 1; throw new Error('formal storage must not be read'); },
    });

    const handle = installFixtureMemoryStorage(page);
    expect(formalReadCount).toBe(0);
    expect(page.localStorage).toBe(handle.storage);
    handle.storage.setItem('fixture-only', 'value');
    expect(handle.storage.getItem('fixture-only')).toBe('value');
    expect(page.document.documentElement.dataset.uxCasepathStorageIsolation).toBe('memory');

    handle.restore();
    expect(formalReadCount).toBe(0);
    expect(() => page.localStorage).toThrow('formal storage must not be read');
    expect(formalReadCount).toBe(1);
    expect(page.document.documentElement.dataset.uxCasepathStorageIsolation).toBeUndefined();
  });

  it('round-trips only its namespaced schema-13 snapshot and preserves unrelated session keys', () => {
    const session = window.sessionStorage;
    session.clear();
    session.setItem('unrelated-session-item', 'preserve');
    const serializedSave = JSON.stringify({ schemaVersion: 13, game: { phase: 'A2_T06' } });

    writeFixtureSnapshot(session, 'qiming-zhong', serializedSave);
    expect(readFixtureSnapshot(session, 'qiming-zhong')).toEqual({ mode: 'qiming-zhong', serializedSave });
    expect(session.getItem('unrelated-session-item')).toBe('preserve');
    clearFixtureSnapshot(session);
    expect(session.getItem(FIXTURE_SNAPSHOT_KEY)).toBeNull();
    expect(session.getItem('unrelated-session-item')).toBe('preserve');
  });

  it('refuses malformed, mismatched, and non-current schema snapshots', () => {
    const session = window.sessionStorage;
    session.clear();
    expect(() => requireFixtureSnapshot(session, 'qiming')).toThrow('缺少本批 fixture');
    session.setItem(FIXTURE_SNAPSHOT_KEY, '{broken');
    expect(() => readFixtureSnapshot(session, 'qiming')).toThrow('格式损坏');
    session.setItem(FIXTURE_SNAPSHOT_KEY, JSON.stringify({ version: 1, mode: 'school', serializedSave: '{}' }));
    expect(() => readFixtureSnapshot(session, 'qiming')).toThrow('不匹配');
    expect(() => writeFixtureSnapshot(session, 'school', JSON.stringify({ schemaVersion: 12 }))).toThrow('schema 13');
    expect(session.getItem(FIXTURE_SNAPSHOT_KEY)).toContain('"mode":"school"');
  });
});

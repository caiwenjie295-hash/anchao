import { afterEach, describe, expect, it } from 'vitest';
import { installFixtureMemoryStorage } from './fixtureStorage';

describe('A34 fixture storage isolation', () => {
  afterEach(() => {
    delete document.documentElement.dataset.a34StorageIsolation;
  });

  it('shadows browser storage with a complete in-memory Storage before app imports', () => {
    const browserStorage = window.localStorage;
    const sentinel = `a34-isolation-${Date.now()}`;
    browserStorage.setItem(sentinel, 'keep');
    const handle = installFixtureMemoryStorage(window);
    try {
      expect(document.documentElement.dataset.a34StorageIsolation).toBe('memory');
      expect(window.localStorage).toBe(handle.storage);
      expect(window.localStorage.getItem(sentinel)).toBeNull();
      window.localStorage.setItem(sentinel, 'fixture-only');
      window.localStorage.setItem('second', '12');
      expect(window.localStorage.length).toBe(2);
      expect(window.localStorage.key(0)).toBe(sentinel);
      expect(window.localStorage.getItem('second')).toBe('12');
      expect(browserStorage.getItem(sentinel)).toBe('keep');
      window.localStorage.removeItem(sentinel);
      expect(window.localStorage.getItem(sentinel)).toBeNull();
      window.localStorage.clear();
      expect(window.localStorage.length).toBe(0);
      expect(browserStorage.getItem(sentinel)).toBe('keep');
    } finally {
      handle.restore();
      browserStorage.removeItem(sentinel);
    }
  });
});

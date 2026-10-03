import { afterEach, describe, expect, it } from 'vitest';
import { installFixtureMemoryStorage, type FixtureStorageHandle } from './fixtureStorage';

describe('layout validation storage isolation', () => {
  let handle: FixtureStorageHandle | undefined;

  afterEach(() => {
    handle?.restore();
    handle = undefined;
  });

  it('replaces localStorage with an independent map and restores the original descriptor', () => {
    const originalStorage = window.localStorage;
    handle = installFixtureMemoryStorage(window);

    expect(window.localStorage).toBe(handle.storage);
    window.localStorage.setItem('save', 'fixture-only');
    expect(window.localStorage.getItem('save')).toBe('fixture-only');
    expect(originalStorage.getItem('save')).not.toBe('fixture-only');
    expect(document.documentElement.dataset.uxLayoutStorageIsolation).toBe('memory');

    handle.restore();
    expect(window.localStorage).toBe(originalStorage);
    expect(document.documentElement.dataset.uxLayoutStorageIsolation).toBeUndefined();
    handle = undefined;
  });
});

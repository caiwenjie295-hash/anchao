import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRIVATE_BLOG_BOOKMARKS_KEY, readPrivateBlogBookmarks, usePrivateBlogBookmarks } from './blogPreferences';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;

function PreferencesHarness() {
  const { bookmarkedDates, toggleBookmark } = usePrivateBlogBookmarks();
  return <button type="button" aria-pressed={bookmarkedDates.includes('2020-04-03')} onClick={() => toggleBookmark('2020-04-03')}>
    {bookmarkedDates.length}
  </button>;
}

afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  host?.remove();
  host = undefined;
  root = undefined;
  window.localStorage.removeItem(PRIVATE_BLOG_BOOKMARKS_KEY);
  vi.restoreAllMocks();
});

describe('Act4 blog bookmark preferences', () => {
  it('keeps only date-shaped saved values and survives storage read/write failures in memory', async () => {
    window.localStorage.setItem(PRIVATE_BLOG_BOOKMARKS_KEY, JSON.stringify(['2020-04-03', 'unknown', 4]));
    expect(readPrivateBlogBookmarks()).toEqual(['2020-04-03']);
    window.localStorage.setItem(PRIVATE_BLOG_BOOKMARKS_KEY, '[]');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage denied'); });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => { root?.render(<PreferencesHarness />); });
    const bookmark = host.querySelector<HTMLButtonElement>('button')!;
    expect(bookmark.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { bookmark.click(); });
    expect(bookmark.getAttribute('aria-pressed')).toBe('true');
    expect(bookmark.textContent).toBe('1');
  });
});

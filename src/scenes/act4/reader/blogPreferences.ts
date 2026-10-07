import { useEffect, useState } from 'react';
import { resolveBrowserStorage } from '../../../core/persistence/browserStorage';

export const PRIVATE_BLOG_BOOKMARKS_KEY = 'anchao.a4-private-blog-bookmarks';

export function readPrivateBlogBookmarks(): string[] {
  try {
    const stored = JSON.parse(resolveBrowserStorage()?.getItem(PRIVATE_BLOG_BOOKMARKS_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter((item): item is string => typeof item === 'string' && /^2020-04-\d{2}$/.test(item)) : [];
  } catch {
    return [];
  }
}

export function usePrivateBlogBookmarks() {
  const [bookmarkedDates, setBookmarkedDates] = useState<string[]>(readPrivateBlogBookmarks);
  useEffect(() => {
    try {
      resolveBrowserStorage()?.setItem(PRIVATE_BLOG_BOOKMARKS_KEY, JSON.stringify(bookmarkedDates));
    } catch {
      // Keep bookmarks available to the current reader session when local storage is unavailable.
    }
  }, [bookmarkedDates]);

  const toggleBookmark = (dateTime: string) => setBookmarkedDates((current) => current.includes(dateTime)
    ? current.filter((item) => item !== dateTime)
    : [...current, dateTime]);
  return { bookmarkedDates, toggleBookmark };
}

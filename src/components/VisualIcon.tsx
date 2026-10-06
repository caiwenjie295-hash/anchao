import type { ReactNode } from 'react';
import './visualIdentity.css';

export const visualIconNames = [
  'search', 'refresh', 'check', 'star', 'star-filled', 'menu', 'attachment', 'mail',
  'bookmark', 'bookmark-filled', 'tidebook', 'news', 'trail', 'book', 'weather', 'map', 'forum',
  'notes', 'location', 'hotel', 'government', 'community', 'outdoor', 'market',
  'education', 'repair', 'travel', 'photo', 'bus', 'career', 'cloud', 'media', 'service',
  'library', 'event', 'calendar', 'network', 'club', 'streaming', 'history', 'avatar-leaf', 'avatar-wave',
  'avatar-spark', 'avatar-photo', 'avatar-cloud', 'avatar-book', 'profile',
] as const;

export type VisualIconName = typeof visualIconNames[number];

const glyphs: Record<VisualIconName, ReactNode> = {
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  refresh: <><path d="M20 7v5h-5" /><path d="M19 12a7.5 7.5 0 0 0-13.1-4.8L4 9" /><path d="M4 17v-5h5" /><path d="M5 12a7.5 7.5 0 0 0 13.1 4.8L20 15" /></>,
  check: <><path d="m5 12.5 4.2 4.2L19 7" /></>,
  star: <><path d="m12 3.5 2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z" /></>,
  'star-filled': <><path d="m12 3.5 2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.5Z" fill="currentColor" /></>,
  menu: <><path d="M4 6.5h16M4 12h16M4 17.5h16" /></>,
  attachment: <><path d="m8.5 12.5 6.8-6.8a3.1 3.1 0 0 1 4.4 4.4l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.4-8.4" /><path d="m7.7 14.3 7.1-7.1" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 5.5L19.5 7" /></>,
  bookmark: <><path d="M6.5 4.5h11v16L12 17l-5.5 3.5v-16Z" /></>,
  'bookmark-filled': <><path d="M6.5 4.5h11v16L12 17l-5.5 3.5v-16Z" fill="currentColor" /></>,
  tidebook: <><path d="M4.5 5.5c2.8-1.1 5.3-.9 7.5.7v13c-2.2-1.6-4.7-1.8-7.5-.7v-13Z" /><path d="M19.5 5.5c-2.8-1.1-5.3-.9-7.5.7v13c2.2-1.6 4.7-1.8 7.5-.7v-13Z" /><path d="M4 15c2.1-.8 4.2-.7 6.2.3M14 15.5c2-.9 3.9-.9 6-.3" /></>,
  news: <><path d="M5 4.5h12.5a1.5 1.5 0 0 1 1.5 1.5v13H6a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2Z" /><path d="M7.5 8h7M7.5 11h3.8M7.5 14h3.8M14 11h2.5v4H14zM6 19h11" /></>,
  trail: <><path d="m3.5 18 5.6-12 5.1 12 2.3-6 4 6" /><path d="M9.1 6 11 9.5M14.2 18l-1.3-3.1" /></>,
  book: <><path d="M4 5.5c2.8-.8 5.5-.4 8 1.2v13c-2.5-1.6-5.2-2-8-1.2v-13Z" /><path d="M20 5.5c-2.8-.8-5.5-.4-8 1.2v13c2.5-1.6 5.2-2 8-1.2v-13Z" /></>,
  weather: <><circle cx="8" cy="8" r="3.3" /><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1" /><path d="M8 19h9a3 3 0 0 0 .3-6 4.7 4.7 0 0 0-9-.6A3.3 3.3 0 0 0 8 19Z" /></>,
  map: <><path d="m3.5 6 5.7-2 5.6 2 5.7-2v14l-5.7 2-5.6-2-5.7 2V6Z" /><path d="M9.2 4v14M14.8 6v14" /><path d="M17.3 9.2a2.3 2.3 0 1 0-4.6 0c0 1.6 2.3 4.1 2.3 4.1s2.3-2.5 2.3-4.1Z" /></>,
  forum: <><path d="M4 5.5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-5l-4 3v-3H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z" /><path d="M8 9.5h6M8 12h4" /><path d="M18 9h2a2 2 0 0 1 2 2v5h-3v3l-3-2" /></>,
  notes: <><path d="M6 3.5h9l3 3v14H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" /><path d="M14.5 3.8v3h3M8 11h8M8 14.5h8M8 18h5" /></>,
  location: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.3" /></>,
  hotel: <><path d="M4 20V5.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 5.5V20" /><path d="M3 20h18M8 8h2M14 8h2M8 12h2M14 12h2M10 20v-4h4v4" /></>,
  government: <><path d="m3 8 9-4.5L21 8H3Z" /><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 19h18M2.5 21h19" /></>,
  community: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0M13 16a4.2 4.2 0 0 1 8.2 1.4" /></>,
  outdoor: <><path d="M3 19 9.5 7l3.1 5.3 2-3.3L21 19H3Z" /><circle cx="17.5" cy="6.5" r="1.8" /></>,
  market: <><path d="M4 9h16l-1.3-5H5.3L4 9Z" /><path d="M5 9v11h14V9M9 20v-6h6v6M4 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" /></>,
  education: <><path d="m3 9 9-5 9 5-9 5-9-5Z" /><path d="M6.5 11v5c3.7 2.8 7.3 2.8 11 0v-5M21 9v6" /></>,
  repair: <><path d="M14 6a5 5 0 0 0-6.6 6.6L3.5 16.5a2.1 2.1 0 0 0 3 3l3.9-3.9A5 5 0 0 0 17 9.5l-3 3-2.5-2.5 3-3Z" /></>,
  travel: <><path d="M4 18.5c2.1-2.1 4.2-2.1 6.3 0s4.2 2.1 6.3 0 2.4-1.8 3.4-1.4" /><path d="m4 13 5-8 2.8 4.5L14 6l6 9" /></>,
  photo: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="9.5" r="1.5" /><path d="m5 17 4.6-4.4 3.1 2.5 2.2-2 4.1 3.9" /></>,
  bus: <><rect x="4" y="3.5" width="16" height="15" rx="3" /><path d="M4 12h16M8 18.5v2M16 18.5v2M7 7.5h10" /><circle cx="8" cy="15.5" r=".8" fill="currentColor" /><circle cx="16" cy="15.5" r=".8" fill="currentColor" /></>,
  career: <><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M8 7.5v-2a1.5 1.5 0 0 1 1.5-1.5h5A1.5 1.5 0 0 1 16 5.5v2M3.5 12.5h17M10 12.5v2h4v-2" /></>,
  cloud: <><path d="M7.5 18.5H17a4 4 0 0 0 .4-8 5.8 5.8 0 0 0-11.1-1A4.5 4.5 0 0 0 7.5 18.5Z" /><path d="m9 14 2.2 2.2 4.4-4.4" /></>,
  media: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="m10 9 5 3-5 3V9ZM6.5 3v2M17.5 3v2" /></>,
  service: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
  library: <><path d="M5 4.5h14v15H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" /><path d="M8 8h8M8 11.5h8M8 15h5M7 4.5v15" /></>,
  event: <><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M8 16.5h5" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="15" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h2M13 13h3M8 16.5h2" /></>,
  network: <><circle cx="6" cy="7" r="2" /><circle cx="18" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="m7.5 8.5 3.2 6.6M16.5 8.5l-3.2 6.6M8 7h8" /></>,
  club: <><path d="M12 3.5 14.2 9l5.8.4-4.5 3.7 1.5 5.6-5-3.1-5 3.1 1.5-5.6-4.5-3.7 5.8-.4L12 3.5Z" /><path d="M9 21h6" /></>,
  streaming: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m10 9 5 3-5 3V9ZM8 3.5l2 2M16 3.5l-2 2" /></>,
  history: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  'avatar-leaf': <><path d="M19.5 4.5c-8.5-.3-13 3.5-13 8.7a5.8 5.8 0 0 0 5.9 5.8c5.1 0 7.4-5.8 7.1-14.5Z" /><path d="M5 20c2.5-4.2 6-7 11-10" /></>,
  'avatar-wave': <><path d="M3 9c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0M3 15c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" /></>,
  'avatar-spark': <><path d="m12 3 1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  'avatar-photo': <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="9" cy="9" r="1.4" /><path d="m6 17 4.1-4 2.8 2.1 2.4-2.2 2.7 2.6" /></>,
  'avatar-cloud': <><path d="M7.5 18H17a4 4 0 0 0 .4-8 5.8 5.8 0 0 0-11.1-1A4.5 4.5 0 0 0 7.5 18Z" /><path d="M9 14.5h.01M12 14.5h.01M15 14.5h.01" /></>,
  'avatar-book': <><path d="M4.5 5c2.5-1 5-.5 7.5 1v13c-2.5-1.5-5-2-7.5-1V5Z" /><path d="M19.5 5c-2.5-1-5-.5-7.5 1v13c2.5-1.5 5-2 7.5-1V5Z" /></>,
  profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
};

export function VisualIcon({ name, className, size }: { name: VisualIconName; className?: string; size?: number }) {
  return <svg
    className={`visual-icon${className ? ` ${className}` : ''}`}
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >{glyphs[name]}</svg>;
}

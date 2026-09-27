import type { BrowserPage, BrowserPageType } from '../../data/browserData';

/** 搜索结果只区分三种常见版式：报道、帖子、资料/地理条目。 */
export type ResultVariant = 'report' | 'thread' | 'reference';
export type SiteIdentity = { name: string; board: string | null; monogram: string; hue: number; host: string };
export type ForumPost = { author: string; date: string | null; text: string };
export type LabeledEntry = { label: string; text: string };

export const PAGE_TYPE_LABEL: Record<BrowserPageType, string> = {
  news: '本地新闻',
  incident: '事故通报',
  encyclopedia: '百科条目',
  'trail-guide': '路线攻略',
  weather: '天气实况',
  map: '地图信息',
  forum: '论坛讨论',
  'self-media': '个人记录',
  'same-name': '同名地点',
  commercial: '商业信息',
};

const REFERENCE_TYPES: BrowserPageType[] = ['trail-guide', 'weather', 'map'];
const KEYWORD_TYPES: BrowserPageType[] = ['encyclopedia', 'same-name'];
const IDENTITY_HUES = [206, 190, 262, 24, 152, 44, 322, 232, 172, 300];

const REGISTRABLE_SPLIT = /[·•｜|]/;
const BRACKET_PREFIX = /^【([^】]*)】\s*/;
const LABEL_PREFIX = /^([^：:]{1,10})[：:]\s*/;

/** 搜索结果变体只由页面类型决定；绝不能读取 resultTier，否则会把关键结果暴露出来。 */
export const resultVariantFor = (pageType: BrowserPageType): ResultVariant =>
  pageType === 'forum' ? 'thread' : REFERENCE_TYPES.includes(pageType) ? 'reference' : 'report';

export const resultShowsKeywords = (pageType: BrowserPageType): boolean => KEYWORD_TYPES.includes(pageType);

const hashText = (value: string): number => {
  let hash = 0;
  for (const character of Array.from(value)) hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  return hash;
};

/** `domain` 可能是站点名称而不是合法主机名，因此取首字形做标记，主机名只从 url 解析。 */
const monogramOf = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return '#';
  const asciiRun = trimmed.match(/[A-Za-z0-9]+/);
  if (asciiRun && /^[A-Za-z0-9]/.test(trimmed)) return asciiRun[0].slice(0, 2).toUpperCase();
  return Array.from(trimmed)[0] ?? '#';
};

const safeHost = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
};

/** 同一来源使用同一名称、同色系，使不同来源在结果和页面里都保持一致的视觉身份。 */
export const siteIdentity = (page: BrowserPage): SiteIdentity => {
  const segments = page.domain.split(REGISTRABLE_SPLIT).map((segment) => segment.trim()).filter(Boolean);
  const name = segments[0] ?? page.domain.trim();
  const board = segments.slice(1).join(' · ') || null;
  return { name, board, monogram: monogramOf(name), hue: IDENTITY_HUES[hashText(name) % IDENTITY_HUES.length]!, host: safeHost(page.url) };
};

/** 生成面包屑式的路径文字；非法 url 时安全退化为空数组。 */
export const urlCrumbs = (url: string): string[] => {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
    const page = parsed.searchParams.get('page');
    return page ? [...segments, `第 ${page} 页`] : segments;
  } catch {
    return [];
  }
};

/** 论坛正文各有不同写法：既有【昵称｜日期】前缀，也有“楼主：/回复：”前缀。 */
export const parseForumPosts = (page: BrowserPage): ForumPost[] => page.body.map((line, index) => {
  const bracket = line.match(BRACKET_PREFIX);
  if (bracket) {
    const [author, date] = (bracket[1] ?? '').split(/[｜|]/).map((part) => part.trim());
    return { author: author || (index === 0 ? '楼主' : '层主'), date: date || null, text: line.slice(bracket[0].length) };
  }
  const label = line.match(LABEL_PREFIX);
  if (label) return { author: label[1]!, date: null, text: line.slice(label[0].length) };
  return { author: index === 0 ? '楼主' : `${index + 1}楼`, date: index === 0 ? page.publishedAt : null, text: line };
});

/** 正文前几行若都带“名称：”前缀，则按条目卡片呈现；否则返回 null 由通用正文版式处理。 */
export const labeledEntries = (lines: string[]): { entries: LabeledEntry[]; rest: string[] } | null => {
  const matches = lines.map((line) => line.match(LABEL_PREFIX));
  const leading = matches.findIndex((match) => match === null);
  const count = leading === -1 ? lines.length : leading;
  if (count < 2) return null;
  return {
    entries: lines.slice(0, count).map((line, index) => ({ label: matches[index]![1]!, text: line.slice(matches[index]![0].length) })),
    rest: lines.slice(count),
  };
};

/** 最后一行单独作为提示/免责声明，天气、通知类页面常见。 */
export const leadLinesAndNote = (lines: string[]): { rows: string[]; note: string | null } =>
  lines.length > 1 ? { rows: lines.slice(0, -1), note: lines.at(-1) ?? null } : { rows: lines, note: null };

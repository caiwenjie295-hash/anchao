import pagesDocument from '../../data/browser_pages.json';
import queriesDocument from '../../data/search_queries.json';
import flagsDocument from '../../data/flags.json';

export type TraceableRecord = { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string };
export type BrowserPageType = 'news' | 'encyclopedia' | 'trail-guide' | 'weather' | 'map' | 'forum' | 'self-media' | 'same-name' | 'incident' | 'commercial';
export type BrowserPage = TraceableRecord & { pageType: BrowserPageType; url: string; domain: string; publishedAt: string; headline: string; snippet: string; body: string[]; keywords: string[]; resultTier: 'strong' | 'weak' | 'noise'; triggerFlags: string[]; images?: { assetId: string; caption: string }[] };
export type SearchQuery = TraceableRecord & { query: string; aliases: string[]; suggestionTerms: string[]; resultPageIds: string[] };
type Collection<T> = { schemaVersion: number; items: T[] };

const allowedPageTypes: BrowserPageType[] = ['news', 'encyclopedia', 'trail-guide', 'weather', 'map', 'forum', 'self-media', 'same-name', 'incident', 'commercial'];
const asItems = <T>(document: unknown, name: string): T[] => {
  if (typeof document !== 'object' || document === null || !Array.isArray((document as Collection<T>).items)) throw new Error(`${name} 必须包含 items 数组。`);
  return (document as Collection<T>).items;
};
export const normalizeSearchQuery = (query: string): string => query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export const browserPages = asItems<BrowserPage>(pagesDocument, 'browser_pages.json');
export const searchQueries = asItems<SearchQuery>(queriesDocument, 'search_queries.json');
const flags = asItems<TraceableRecord>(flagsDocument, 'flags.json');
export const browserPageById = new Map(browserPages.map((page) => [page.id, page]));
export const searchQueryByNormalizedTerm = new Map(searchQueries.flatMap((definition) => [definition.query, ...definition.aliases].map((term) => [normalizeSearchQuery(term), definition] as const)));
const traceable = (record: TraceableRecord): boolean => Boolean(record.id && record.title && record.act && record.phase && record.source && record.purpose && record.notes && Array.isArray(record.unlockCondition) && Array.isArray(record.relatedFlags));

export function validateBrowserData(): void {
  if (browserPages.length < 20 || searchQueries.length < 7) throw new Error('浏览器需要至少 20 个页面和 7 组查询。');
  const ids = new Set<string>();
  for (const page of browserPages) {
    if (!traceable(page) || ids.has(page.id)) throw new Error(`浏览器页面追溯字段或 ID 无效：${page.id}`);
    ids.add(page.id);
    if (!allowedPageTypes.includes(page.pageType) || !['strong', 'weak', 'noise'].includes(page.resultTier) || !page.url || !page.domain || !page.headline || !page.snippet || !Array.isArray(page.body) || page.body.length === 0 || page.body.some((line) => !line.trim())) throw new Error(`浏览器页面字段无效：${page.id}`);
    for (const flagId of [...page.relatedFlags, ...page.triggerFlags]) if (!flags.some((flag) => flag.id === flagId)) throw new Error(`${page.id} 引用了未登记 Flag：${flagId}`);
  }
  for (const definition of searchQueries) {
    if (!traceable(definition) || ids.has(definition.id)) throw new Error(`查询追溯字段或 ID 无效：${definition.id}`);
    ids.add(definition.id);
    if (!definition.query || !Array.isArray(definition.aliases) || !Array.isArray(definition.suggestionTerms) || definition.resultPageIds.length < 6) throw new Error(`查询字段无效：${definition.id}`);
    const results = definition.resultPageIds.map((id) => browserPageById.get(id));
    if (results.some((page) => !page) || new Set(definition.resultPageIds).size !== definition.resultPageIds.length || !results.some((page) => page?.resultTier === 'strong') || results.filter((page) => page?.resultTier === 'weak' || page?.resultTier === 'noise').length < 2) throw new Error(`查询结果噪音混排无效：${definition.id}`);
  }
}
validateBrowserData();

export const findSearchQuery = (query: string): SearchQuery | undefined => searchQueryByNormalizedTerm.get(normalizeSearchQuery(query));
export const getSuggestions = (query: string): string[] => {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return searchQueries.slice(0, 5).map((item) => item.query);
  return [...new Set(searchQueries.flatMap((item) => [item.query, ...item.aliases, ...item.suggestionTerms]).filter((term) => normalizeSearchQuery(term).includes(normalized)))].slice(0, 6);
};
export const getResultsForQuery = (query: string): BrowserPage[] => findSearchQuery(query)?.resultPageIds.map((id) => browserPageById.get(id)).filter((page): page is BrowserPage => Boolean(page)) ?? [];

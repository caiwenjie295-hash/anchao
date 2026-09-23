import pagesDocument from '../../data/browser_pages.json';
import queriesDocument from '../../data/search_queries.json';
import flagsDocument from '../../data/flags.json';
import type { Act2Stage } from '../core/types';

export type TraceableRecord = { id: string; title: string; act: number; phase: string; source: string; purpose: string; unlockCondition: string[]; relatedFlags: string[]; notes: string };
export type BrowserPageType = 'news' | 'encyclopedia' | 'trail-guide' | 'weather' | 'map' | 'forum' | 'self-media' | 'same-name' | 'incident' | 'commercial';
/** 第二幕 T01 页面必须落在规范列出的九类互联网噪音里。 */
export type Act2NoiseCategory = 'tonic-article' | 'supplement-ad' | 'tutoring' | 'repair-service' | 'travel-guide' | 'same-name-place' | 'photo-post' | 'unrelated-news' | 'symbol-encyclopedia';
export type BrowserPage = TraceableRecord & { pageType: BrowserPageType; noiseCategory?: Act2NoiseCategory; url: string; domain: string; publishedAt: string; headline: string; snippet: string; body: string[]; keywords: string[]; resultTier: 'strong' | 'weak' | 'noise'; triggerFlags: string[]; images?: { assetId: string; caption: string }[] };
export type SearchQuery = TraceableRecord & { query: string; aliases: string[]; suggestionTerms: string[]; resultPageIds: string[] };
type Collection<T> = { schemaVersion: number; items: T[] };

export const ACT2_T01_NOISE_CATEGORIES: Act2NoiseCategory[] = ['tonic-article', 'supplement-ad', 'tutoring', 'repair-service', 'travel-guide', 'same-name-place', 'photo-post', 'unrelated-news', 'symbol-encyclopedia'];
/** T01 页面不得泄露第二幕答案，只提供可信但无解的互联网噪音。 */
export const ACT2_T01_FORBIDDEN_TERMS = ['黑补母', '补母志', '以有余补不足', '能力转移', '记忆转移', '身份转移'];
/** 与“补 / 神像 / 石庙”有关的冻结查询。 */
export const ACT2_T01_BU_QUERY_IDS = ['QUERY_A2_T01_001', 'QUERY_A2_T01_002', 'QUERY_A2_T01_003', 'QUERY_A2_T01_006'];
/** 与“双S / A.W”有关的冻结查询。 */
export const ACT2_T01_SS_QUERY_IDS = ['QUERY_A2_T01_004', 'QUERY_A2_T01_005'];
export const ACT2_T06_QUERY_IDS = ['QUERY_A2_T06_001', 'QUERY_A2_T06_002', 'QUERY_A2_T06_003', 'QUERY_A2_T06_004', 'QUERY_A2_T06_005', 'QUERY_A2_T06_006', 'QUERY_A2_T06_007'];
export const ACT2_T06_PAGE_IDS = ['PAGE_A2_T06_001', 'PAGE_A2_T06_002', 'PAGE_A2_T06_003', 'PAGE_A2_T06_004', 'PAGE_A2_T06_005', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009', 'PAGE_A2_T06_010', 'PAGE_A2_T06_011', 'PAGE_A2_T06_012'];
export type Act2T01SearchTopic = 'bu' | 'ss';

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
export const isAct2T01Record = (record: TraceableRecord): boolean => record.act === 2 && record.phase === 'A2_T01';
export const isAct2T06Record = (record: TraceableRecord): boolean => record.act === 2 && record.phase === 'A2_T06';

const act2T01SearchTopicByQueryId = new Map<string, Act2T01SearchTopic>([
  ...ACT2_T01_BU_QUERY_IDS.map((id) => [id, 'bu'] as const),
  ...ACT2_T01_SS_QUERY_IDS.map((id) => [id, 'ss'] as const),
]);

/** 把浏览器搜索词映射到 T01 的两类冻结主题；非 T01 查询返回 null。 */
export function classifyAct2T01Search(query: string): Act2T01SearchTopic | null {
  const definition = findSearchQuery(query);
  if (!definition || !isAct2T01Record(definition)) return null;
  return act2T01SearchTopicByQueryId.get(definition.id) ?? null;
}

const assertNoAct2T01Leak = (page: BrowserPage): void => {
  const text = [page.title, page.headline, page.snippet, ...page.body].join('\n');
  for (const term of ACT2_T01_FORBIDDEN_TERMS) if (text.includes(term)) throw new Error(`${page.id} 泄露了 T01 禁止内容：${term}`);
};

export function validateBrowserData(): void {
  if (browserPages.length < 20 || searchQueries.length < 7) throw new Error('浏览器需要至少 20 个页面和 7 组查询。');
  const ids = new Set<string>();
  for (const page of browserPages) {
    if (!traceable(page) || ids.has(page.id)) throw new Error(`浏览器页面追溯字段或 ID 无效：${page.id}`);
    ids.add(page.id);
    if (!allowedPageTypes.includes(page.pageType) || !['strong', 'weak', 'noise'].includes(page.resultTier) || !page.url || !page.domain || !page.headline || !page.snippet || !Array.isArray(page.body) || page.body.length === 0 || page.body.some((line) => !line.trim())) throw new Error(`浏览器页面字段无效：${page.id}`);
    for (const flagId of [...page.relatedFlags, ...page.triggerFlags]) if (!flags.some((flag) => flag.id === flagId)) throw new Error(`${page.id} 引用了未登记 Flag：${flagId}`);
    if (isAct2T01Record(page)) {
      if (!page.noiseCategory || !ACT2_T01_NOISE_CATEGORIES.includes(page.noiseCategory)) throw new Error(`T01 噪音页面缺少有效分类：${page.id}`);
      if (page.resultTier === 'strong') throw new Error(`T01 噪音页面不得给出可解结果：${page.id}`);
      if (page.triggerFlags.length > 0) throw new Error(`T01 噪音页面不得触发剧情 Flag：${page.id}`);
      assertNoAct2T01Leak(page);
    }
  }
  const t01Categories = new Set(browserPages.filter(isAct2T01Record).map((page) => page.noiseCategory));
  if (browserPages.filter(isAct2T01Record).length < 12) throw new Error('T01 至少需要 12 个噪音页面。');
  for (const category of ACT2_T01_NOISE_CATEGORIES) if (!t01Categories.has(category)) throw new Error(`T01 缺少噪音分类：${category}`);
  for (const definition of searchQueries) {
    if (!traceable(definition) || ids.has(definition.id)) throw new Error(`查询追溯字段或 ID 无效：${definition.id}`);
    ids.add(definition.id);
    if (!definition.query || !Array.isArray(definition.aliases) || !Array.isArray(definition.suggestionTerms) || definition.resultPageIds.length < 6) throw new Error(`查询字段无效：${definition.id}`);
    const results = definition.resultPageIds.map((id) => browserPageById.get(id));
    if (results.some((page) => !page) || new Set(definition.resultPageIds).size !== definition.resultPageIds.length || results.filter((page) => page?.resultTier === 'weak' || page?.resultTier === 'noise').length < 2) throw new Error(`查询结果噪音混排无效：${definition.id}`);
    if (isAct2T01Record(definition)) {
      if (results.some((page) => page?.resultTier === 'strong')) throw new Error(`T01 查询不得给出可解结果：${definition.id}`);
      if (results.filter((page) => page?.resultTier === 'weak').length < 2 || results.filter((page) => page?.resultTier === 'noise').length < 2) throw new Error(`T01 查询结果噪音混排无效：${definition.id}`);
    } else if (!results.some((page) => page?.resultTier === 'strong')) {
      throw new Error(`查询结果噪音混排无效：${definition.id}`);
    }
  }
  const t01QueryIds = searchQueries.filter(isAct2T01Record).map((definition) => definition.id);
  const frozenQueryIds = [...ACT2_T01_BU_QUERY_IDS, ...ACT2_T01_SS_QUERY_IDS];
  if (frozenQueryIds.some((id) => !t01QueryIds.includes(id))) throw new Error('T01 冻结查询缺少数据登记。');
  if (t01QueryIds.some((id) => !frozenQueryIds.includes(id))) throw new Error('T01 查询缺少冻结主题分类。');
  const t06Pages = browserPages.filter(isAct2T06Record);
  const t06Queries = searchQueries.filter(isAct2T06Record);
  if (t06Pages.map((page) => page.id).sort().join('|') !== [...ACT2_T06_PAGE_IDS].sort().join('|')) throw new Error('T06 页面必须且只能使用冻结的十二个页面 ID。');
  if (t06Queries.map((query) => query.id).sort().join('|') !== [...ACT2_T06_QUERY_IDS].sort().join('|')) throw new Error('T06 查询必须且只能使用冻结的七个查询 ID。');
  const earlyQimingQueries = t06Queries.filter((query) => ACT2_T06_QUERY_IDS.slice(0, 4).includes(query.id));
  if (earlyQimingQueries.some((query) => query.resultPageIds.slice(0, 4).some((id) => id === 'PAGE_A2_T06_006' || id === 'PAGE_A2_T06_007'))) throw new Error('T06 官方查询必须先展示官方材料，论坛结果靠后。');
  const complaintQuery = t06Queries.find((query) => query.id === 'QUERY_A2_T06_005');
  if (complaintQuery?.resultPageIds[0] !== 'PAGE_A2_T06_006') throw new Error('T06 投诉查询必须将论坛主帖提前。');
}
validateBrowserData();

export const findSearchQuery = (query: string): SearchQuery | undefined => searchQueryByNormalizedTerm.get(normalizeSearchQuery(query));
export const isAct2T06Query = (query: string): boolean => {
  const definition = findSearchQuery(query);
  return definition !== undefined && isAct2T06Record(definition);
};
export const isAct2T06PageId = (pageId: string): boolean => ACT2_T06_PAGE_IDS.includes(pageId);
export const isBrowserPageVisible = (page: BrowserPage | undefined, stage: Act2Stage | null): page is BrowserPage => (
  page !== undefined && (!isAct2T06Record(page) || stage === 'qiming')
);
const queryVisible = (definition: SearchQuery, stage: Act2Stage | null): boolean => !isAct2T06Record(definition) || stage === 'qiming';
export const getSuggestions = (query: string, stage: Act2Stage | null = null): string[] => {
  const visibleQueries = searchQueries.filter((definition) => queryVisible(definition, stage));
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return visibleQueries.slice(0, 5).map((item) => item.query);
  return [...new Set(visibleQueries.flatMap((item) => [item.query, ...item.aliases, ...item.suggestionTerms]).filter((term) => normalizeSearchQuery(term).includes(normalized)))].slice(0, 6);
};
export const getResultsForQuery = (query: string, stage: Act2Stage | null = null): BrowserPage[] => {
  const definition = findSearchQuery(query);
  if (!definition || !queryVisible(definition, stage)) return [];
  return definition.resultPageIds.map((id) => browserPageById.get(id)).filter((page): page is BrowserPage => isBrowserPageVisible(page, stage));
};

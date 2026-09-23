import { describe, expect, it } from 'vitest';
import { ACT2_T01_BU_QUERY_IDS, ACT2_T01_FORBIDDEN_TERMS, ACT2_T01_NOISE_CATEGORIES, ACT2_T01_SS_QUERY_IDS, ACT2_T06_PAGE_IDS, ACT2_T06_QUERY_IDS, browserPages, classifyAct2T01Search, findSearchQuery, getResultsForQuery, getSuggestions, normalizeSearchQuery, searchQueries, validateBrowserData } from './browserData';

describe('browser data', () => {
  it('validates traceability, page references and noise mixed result sets', () => {
    expect(() => validateBrowserData()).not.toThrow();
  });
  it('normalizes whitespace and case so aliases reach the same result set', () => {
    expect(normalizeSearchQuery('  XX县   鸡公岭 ')).toBe('xx县 鸡公岭');
    expect(findSearchQuery('xx县鸡公岭')?.id).toBe('QUERY_A1_E_007');
    expect(getResultsForQuery('鸡公岭 徒步').map((page) => page.id)).toEqual(getResultsForQuery('鸡公岭徒步').map((page) => page.id));
  });
  it('keeps data-defined order and does not make every result a strong clue', () => {
    const results = getResultsForQuery('鸡公岭');
    expect(results.map((page) => page.id)).toEqual(['PAGE_A1_E_003', 'PAGE_A1_E_002', 'PAGE_A1_E_004', 'PAGE_A1_E_008', 'PAGE_A1_E_010', 'PAGE_A1_E_007', 'PAGE_A1_E_020']);
    expect(new Set(results.map((page) => page.resultTier))).toEqual(new Set(['strong', 'weak', 'noise']));
  });
});

describe('act2 T01 search noise', () => {
  const t01Pages = browserPages.filter((page) => page.act === 2 && page.phase === 'A2_T01');
  const t01Queries = searchQueries.filter((query) => query.act === 2 && query.phase === 'A2_T01');

  it('registers at least twelve noise pages covering all nine categories', () => {
    expect(t01Pages.length).toBeGreaterThanOrEqual(12);
    expect(new Set(t01Pages.map((page) => page.noiseCategory))).toEqual(new Set(ACT2_T01_NOISE_CATEGORIES));
  });

  it('never leaks the act-two answer through T01 page text', () => {
    const forbidden = new RegExp(ACT2_T01_FORBIDDEN_TERMS.join('|'));
    for (const page of t01Pages) {
      expect(`${page.title}${page.headline}${page.snippet}${page.body.join('')}`).not.toMatch(forbidden);
      expect(page.triggerFlags).toEqual([]);
    }
  });

  it('registers the six frozen queries with aliases and no solvable result', () => {
    expect(t01Queries.map((query) => query.id)).toEqual([...ACT2_T01_BU_QUERY_IDS.slice(0, 3), ...ACT2_T01_SS_QUERY_IDS, ACT2_T01_BU_QUERY_IDS[3]]);
    for (const query of t01Queries) {
      expect(query.aliases.length).toBeGreaterThan(0);
      const results = getResultsForQuery(query.query);
      expect(results.length).toBeGreaterThanOrEqual(6);
      expect(results.some((page) => page.resultTier === 'strong')).toBe(false);
      expect(results.filter((page) => page.resultTier === 'weak').length).toBeGreaterThanOrEqual(2);
      expect(results.filter((page) => page.resultTier === 'noise').length).toBeGreaterThanOrEqual(2);
    }
  });

  it('reaches every frozen query through normalized aliases', () => {
    const samples: [string, string][] = [
      ['鸡公岭补', 'QUERY_A2_T01_001'],
      ['  鸡公岭，补 ', 'QUERY_A2_T01_001'],
      ['鸡公岭神像', 'QUERY_A2_T01_002'],
      ['补神像', 'QUERY_A2_T01_003'],
      ['双s 十字', 'QUERY_A2_T01_004'],
      ['a.w 鸡公岭', 'QUERY_A2_T01_005'],
      ['鸡公岭石庙', 'QUERY_A2_T01_006'],
    ];
    for (const [term, queryId] of samples) expect(findSearchQuery(term)?.id).toBe(queryId);
  });

  it('classifies only frozen queries and only into the two frozen topics', () => {
    expect(classifyAct2T01Search('鸡公岭 石庙')).toBe('bu');
    expect(classifyAct2T01Search('双S 十字')).toBe('ss');
    expect(classifyAct2T01Search('鸡公岭')).toBeNull();
    expect(classifyAct2T01Search('   ')).toBeNull();
  });

  it('keeps first-act queries untouched', () => {
    expect(browserPages.filter((page) => page.act === 1).length).toBe(20);
    expect(searchQueries.filter((query) => query.act === 1).length).toBe(7);
  });
});

describe('act2 T06 gated search data', () => {
  it('registers the frozen T06 page and query sets, hidden until qiming stage', () => {
    expect(browserPages.filter((page) => page.phase === 'A2_T06').map((page) => page.id).sort()).toEqual([...ACT2_T06_PAGE_IDS].sort());
    expect(searchQueries.filter((query) => query.phase === 'A2_T06').map((query) => query.id).sort()).toEqual([...ACT2_T06_QUERY_IDS].sort());
    expect(getSuggestions('启明', 'school').some((term) => term.includes('经历') || term.includes('论坛'))).toBe(false);
    expect(getResultsForQuery('启明 投诉', 'school')).toEqual([]);
    expect(getResultsForQuery('启明 投诉', 'qiming')[0]?.id).toBe('PAGE_A2_T06_006');
    expect(getResultsForQuery('启明青少年成长中心', 'qiming')[0]?.id).toBe('PAGE_A2_T06_001');
  });
});

import { describe, expect, it } from 'vitest';
import { findSearchQuery, getResultsForQuery, normalizeSearchQuery, validateBrowserData } from './browserData';

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

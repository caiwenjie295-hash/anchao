import { describe, expect, it } from 'vitest';
import { browserPageById, searchQueries } from '../../data/browserData';
import { PAGE_TYPE_LABEL, labeledEntries, leadLinesAndNote, parseForumPosts, resultShowsKeywords, resultVariantFor, siteIdentity, urlCrumbs } from './browserPresentation';

const page = (id: string) => browserPageById.get(id)!;

describe('browserPresentation', () => {
  it('labels every registered page type', () => {
    const types = new Set([...browserPageById.values()].map((item) => item.pageType));
    for (const type of types) expect(PAGE_TYPE_LABEL[type]).toBeTruthy();
  });

  it('maps page types to result variants without reading resultTier', () => {
    expect(resultVariantFor('news')).toBe('report');
    expect(resultVariantFor('forum')).toBe('thread');
    expect(resultVariantFor('weather')).toBe('reference');
    expect(resultVariantFor('map')).toBe('reference');
    expect(resultVariantFor('trail-guide')).toBe('reference');
    expect(resultVariantFor('encyclopedia')).toBe('report');
    // 同一个变体里必须同时存在强弱不同的页面，证明变体不是按相关度划分的。
    const tiers = new Set([...browserPageById.values()].filter((item) => item.pageType === 'news').map((item) => item.resultTier));
    expect(tiers.has('strong')).toBe(true);
    expect(tiers.has('noise')).toBe(true);
  });

  it('gives one source one stable visual identity', () => {
    const first = siteIdentity(page('PAGE_A1_E_003'));
    const second = siteIdentity(page('PAGE_A1_E_013'));
    expect(first.name).toBe('baike.local');
    expect(first.hue).toBe(second.hue);
    expect(first.monogram).toBe('BA');
    expect(second.monogram).toBe('BA');
    const chinese = siteIdentity(page('PAGE_A2_T06_001'));
    expect(chinese.name).toBe('启明青少年成长中心旧站');
    expect(chinese.monogram).toBe('启');
    const board = siteIdentity(page('PAGE_A2_T06_006'));
    expect(board.name).toBe('旧校园论坛');
    expect(board.board).toBe('生活互助区');
  });

  it('never turns a site-name domain into a broken host and reads crumbs safely', () => {
    expect(siteIdentity(page('PAGE_A2_T06_001')).host).toBe('qiming-old.local');
    expect(urlCrumbs('https://oldboard.local/thread/18427?page=2')).toEqual(['thread', '18427', '第 2 页']);
    expect(urlCrumbs('not a url')).toEqual([]);
  });

  it('splits both bracketed and plain forum prefixes into posts', () => {
    const bracketed = parseForumPosts(page('PAGE_A2_T06_006'));
    expect(bracketed).toHaveLength(4);
    expect(bracketed[0]?.author).toBe('黄山');
    expect(bracketed[0]?.date).toBe('2020-04-12');
    expect(bracketed[1]?.author).toBe('2楼');
    const plain = parseForumPosts(page('PAGE_A1_E_006'));
    expect(plain.map((post) => post.author)).toEqual(['楼主', '回复', '回复']);
  });

  it('groups labeled case lines only when at least two leading rows share the pattern', () => {
    const cases = labeledEntries(page('PAGE_A2_T06_004').body);
    expect(cases?.entries.map((entry) => entry.label)).toEqual(['黄子山', '钟子月']);
    expect(cases?.rest).toHaveLength(1);
    expect(labeledEntries(page('PAGE_A1_E_007').body)).toBeNull();
  });

  it('keeps the last line of a board page as a separate note', () => {
    expect(leadLinesAndNote(page('PAGE_A1_E_004').body).note).toBe('天气数据仅供出行参考，请以现场预警为准。');
    expect(leadLinesAndNote(['只有一行'])).toEqual({ rows: ['只有一行'], note: null });
  });

  it('shows keyword rows only for lookup pages', () => {
    expect(resultShowsKeywords('encyclopedia')).toBe(true);
    expect(resultShowsKeywords('news')).toBe(false);
  });

  it('covers every result page id with a resolvable page', () => {
    for (const definition of searchQueries) for (const id of definition.resultPageIds) expect(browserPageById.get(id)).toBeDefined();
  });
});

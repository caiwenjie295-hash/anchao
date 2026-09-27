import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { browserPageById, browserPages, findSearchQuery, getResultsForQuery } from '../../data/browserData';
import { labeledEntries, parseForumPosts } from './browserPresentation';
import { BrowserApp, BrowserPageView } from './BrowserApp';

describe('WB-0009 browser page layouts', () => {
  let host: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(() => {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    manager = new StateManager(new EventBus(), createDefaultState());
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); });
  const openPage = async (pageId: string) => {
    await act(async () => { root.render(createElement(BrowserPageView, { page: browserPageById.get(pageId), manager })); });
    return host.querySelector('.browser-page') as HTMLElement;
  };

  it('renders every body line of every page, whatever template it maps to', async () => {
    for (const page of browserPages) {
      const article = await openPage(page.id);
      expect(article.textContent).toContain(page.headline);
      const expected = page.pageType === 'forum'
        ? parseForumPosts(page).map((post) => post.text)
        : labeledEntries(page.body)?.entries.map((entry) => `${entry.label}${entry.text}`) ?? page.body;
      for (const line of [...expected, ...(labeledEntries(page.body)?.rest ?? [])]) expect(article.textContent).toContain(line);
    }
  });

  it('gives each page type its own structure while keeping the shared masthead', async () => {
    const news = await openPage('PAGE_A1_E_001');
    expect(news.className).toContain('browser-page--news');
    expect(news.querySelector('.browser-page__masthead')).not.toBeNull();
    expect(news.querySelectorAll('.browser-page__figure')).toHaveLength(2);
    expect(news.querySelector('.evidence-thumbnail img')?.getAttribute('data-asset-id')).toBe('IMG_A1_E_001');
    expect(news.querySelector('.browser-prose__lead')?.textContent).toContain('XX县融媒4月27日讯');

    const encyclopedia = await openPage('PAGE_A1_E_003');
    expect(encyclopedia.querySelector('.browser-page__aside')?.textContent).toContain('最近更新');
    expect(encyclopedia.querySelector('.browser-page__columns')).not.toBeNull();

    const forum = await openPage('PAGE_A1_E_006');
    expect(forum.querySelectorAll('.browser-thread__post')).toHaveLength(3);
    expect(forum.querySelector('.browser-thread__author strong')?.textContent).toBe('楼主');

    const guide = await openPage('PAGE_A1_E_002');
    expect(guide.querySelectorAll('.browser-guide__steps > li')).toHaveLength(3);
    expect(guide.querySelector('.browser-guide')?.textContent).toContain('路线要点');

    const weather = await openPage('PAGE_A1_E_004');
    expect(weather.querySelectorAll('.browser-weather__rows > li')).toHaveLength(2);
    expect(weather.querySelector('.browser-page__note')?.textContent).toContain('天气数据仅供出行参考');

    const map = await openPage('PAGE_A1_E_005');
    expect(map.querySelector('.browser-mapboard__notes')).not.toBeNull();
    expect(map.querySelector('.evidence-thumbnail img')?.getAttribute('data-asset-id')).toBe('IMG_A1_E_003');

    const journal = await openPage('PAGE_A1_E_007');
    expect(journal.querySelector('.browser-prose__lead')?.textContent).toContain('清晨的溪谷');
    expect(journal.querySelector('.browser-cases')).toBeNull();

    const listing = await openPage('PAGE_A1_E_010');
    expect(listing.querySelectorAll('.browser-listing__rows > li')).toHaveLength(3);
    expect(listing.querySelector('.browser-listing')?.textContent).toContain('请勿将本页面作为户外路线或安全建议');

    const cases = await openPage('PAGE_A2_T06_004');
    expect(cases.querySelectorAll('.browser-cases li')).toHaveLength(2);
    expect(cases.querySelector('.browser-page__actions button')?.textContent).toBe('复制黄子山');
  });

  it('keeps the same masthead identity for pages coming from one source', async () => {
    const first = await openPage('PAGE_A1_E_002');
    const second = await openPage('PAGE_A1_E_016');
    const identity = (article: HTMLElement) => article.querySelector('.browser-page__masthead')?.textContent;
    expect(identity(first)).toBe(identity(second));
    expect(first.getAttribute('style')).toBe(second.getAttribute('style'));
  });

  it('shows the rendered url instead of trusting the domain as a host name', async () => {
    const article = await openPage('PAGE_A2_T06_001');
    expect(article.querySelector('.browser-page__url')?.textContent).toBe('https://qiming-old.local/about/education');
    expect(article.querySelector('.browser-page__crumb')?.textContent).toBe('about › education');
  });
});

describe('WB-0009 search result structure', () => {
  let host: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(() => {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    manager = new StateManager(new EventBus(), createDefaultState());
  });
  afterEach(() => { act(() => root.unmount()); host.remove(); });
  const search = async (query: string) => {
    await act(async () => { root.render(createElement(BrowserApp, { manager })); });
    await act(async () => {
      const input = host.querySelector('#browser-search') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(async () => { host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  };

  it('keeps the result order defined by resultPageIds and reports query plus counts', async () => {
    const definition = findSearchQuery('鸡公岭')!;
    const expected = getResultsForQuery('鸡公岭');
    await search('鸡公岭');
    expect(host.querySelector('.browser-results__summary h2')?.textContent).toBe('鸡公岭');
    const titles = [...host.querySelectorAll('.browser-result__title')].map((node) => node.textContent);
    expect(titles).toEqual(expected.map((page) => page.headline));
    expect(titles.map((title) => browserPages.find((page) => page.headline === title)!.id)).toEqual(definition.resultPageIds);
    const sourceCount = new Set(expected.map((page) => page.domain)).size;
    expect(host.querySelector('.browser-results__stats')?.textContent).toContain(`${expected.length} 条结果`);
    expect(host.querySelector('.browser-results__stats')?.textContent).toContain(`来自 ${sourceCount} 个来源`);
  });

  it('renders source, date, snippet and type per result without leaking resultTier', async () => {
    await search('鸡公岭');
    const results = [...host.querySelectorAll('.browser-result')];
    expect(results).toHaveLength(7);
    for (const result of results) {
      expect(result.querySelector('.browser-result__site')?.textContent).toBeTruthy();
      expect(result.querySelector('.browser-result__snippet')?.textContent).toBeTruthy();
      expect(result.querySelector('.browser-result__footer')?.textContent).toBeTruthy();
      expect(result.querySelectorAll('.browser-result__date')).toHaveLength(1);
    }
    expect(host.innerHTML).not.toContain('resultTier');
    expect(host.innerHTML).not.toContain('strong"');
    expect([...host.querySelectorAll('.browser-result')].map((item) => item.className)).toEqual(expect.arrayContaining([expect.stringContaining('browser-result--reference'), expect.stringContaining('browser-result--report')]));
  });

  it('shows the picture of pages that carry one and keyword rows only for lookup pages', async () => {
    await search('XX县失踪');
    expect(host.querySelectorAll('.browser-result__thumb img')).toHaveLength(1);
    await search('鸡公岭');
    expect(host.querySelectorAll('.browser-result__keywords')).toHaveLength(2);
    expect(host.querySelectorAll('.browser-result__thumb img')).toHaveLength(0);
  });
});

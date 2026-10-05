import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { Act2T06Controller } from '../../story/act2T06Controller';
import { Act2T01Controller } from '../../story/act2T01Controller';
import { browserPageById } from '../../data/browserData';
import { BrowserApp, BrowserPageView } from './BrowserApp';
import { siteIdentity } from './browserPresentation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('BrowserApp T06 visibility gates', () => {
  let root: Root; let host: HTMLDivElement; let manager: StateManager; let bus: EventBus;
  beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); bus = new EventBus(); const state = createDefaultState(); state.game.act = 2; state.game.phase = 'A2_T05'; state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SS_MATCH_CONFIRMED: true }; state.modules.act2Research.stage = 'school'; manager = new StateManager(bus, state); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });
  const render = async () => act(async () => { root.render(createElement(BrowserApp, { manager })); });
  const search = async (query: string) => {
    await act(async () => {
    const input = host.querySelector('#browser-search') as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  };
  it('does not surface T06 suggestions or results before the valid active search enters qiming', async () => {
    await render(); await search('启明');
    expect(host.textContent).not.toContain('旧帖：那阵子我被送去一个训练中心');
    expect(host.textContent).not.toContain('PAGE_A2_T06_006');
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(manager.getState().modules.browser.queryHistory).toEqual(['启明']);
    manager.enterAct2QimingResearch();
    await search('启明 投诉');
    expect(host.textContent).toContain('启明 投诉');
    expect(manager.getState().modules.browser.queryHistory).toEqual(['启明 投诉', '启明']);
  });
  it('keeps an intentionally cleared address empty instead of restoring the previous query', async () => {
    await render();
    await search('鸡公岭');
    const input = host.querySelector('#browser-search') as HTMLInputElement;
    expect(input.value).toBe('鸡公岭');
    await act(async () => {
      input.focus();
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(input.value).toBe('');
  });
  it('shows search results and tab destinations after navigation from the qiming review workspace', async () => {
    manager.enterAct2QimingResearch();
    await render();
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('review');
    expect(host.querySelector('.browser-toolbar__source')?.textContent).toBe('实名材料核对');
    expect(host.querySelector('.browser-content')?.hasAttribute('hidden')).toBe(true);

    await search('启明 黄子山');
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('browser');
    expect(host.querySelector('.browser-content')?.hasAttribute('hidden')).toBe(false);
    expect(host.querySelector('.browser-results')).not.toBeNull();

    await act(async () => (host.querySelector('.browser-qiming-toolbar button') as HTMLButtonElement).click());
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('review');
    expect(host.querySelector('.browser-toolbar__source')?.textContent).toBe('实名材料核对');
    await act(async () => (host.querySelector('.browser-new-tab') as HTMLButtonElement).click());
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('browser');
    expect(host.querySelector('.browser-content')?.hasAttribute('hidden')).toBe(false);
  });
  it('keeps the named case through source pages, preserves an unsubmitted finding and continues by choice', async () => {
    manager.enterAct2QimingResearch();
    await render();
    const click = async (element: Element | null) => {
      expect(element).not.toBeNull();
      await act(async () => { (element as HTMLElement).click(); });
    };
    const zhongChoice = [...host.querySelectorAll('.browser-case-review__person')].find((button) => button.textContent?.includes('钟子月')) ?? null;
    await click(zhongChoice);
    expect(host.querySelector('.browser-case-review__case')?.getAttribute('aria-label')).toBe('钟子月材料');
    await click(host.querySelector('[data-case-action="open-official"]'));
    const sourcePage = browserPageById.get("PAGE_A2_T06_004")!;
    expect(host.querySelector(".browser-toolbar__source")?.textContent).toBe(`${siteIdentity(sourcePage).name} · ${sourcePage.headline}`);
    expect(host.querySelector('.browser-page__case-path')?.textContent).toContain('正在调查：钟子月');
    expect(host.querySelector('.browser-page__case-path')?.textContent).toContain('钟子月后续报道');
    await click([...host.querySelectorAll('.browser-page__case-path button')].find((button) => button.textContent === '打开钟子月后续报道') ?? null);
    expect(manager.getState().modules.browser.visitedPageIds).toEqual(expect.arrayContaining(['PAGE_A2_T06_004', 'PAGE_A2_T06_009']));
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);
    const returnButton = host.querySelector('.browser-page__case-context-return');
    await click(returnButton);
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); });
    expect((document.activeElement as HTMLElement).textContent).toBe('钟子月材料');

    const radios = [...host.querySelectorAll('.browser-case-review__choices input[type="radio"]')];
    await click(radios[1] ?? null);
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
    await click(host.querySelector('[data-case-action="open-followup"]'));
    await click(host.querySelector('.browser-page__case-context-return'));
    const returnedRadios = [...host.querySelectorAll('.browser-case-review__choices input[type="radio"]')] as HTMLInputElement[];
    expect(returnedRadios[1]?.checked).toBe(true);
    await click(host.querySelector('[data-case-action="record"]'));
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);
    expect(host.querySelector('.browser-case-review__feedback--error')?.textContent).toContain('它们还没有说明原因');
    await click(returnedRadios[0] ?? null);
    await click(host.querySelector('[data-case-action="record"]'));
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['zhong']);
    expect(host.querySelector('[data-case-action="next-person"]')?.textContent).toBe('继续核对黄子山');
    await click(host.querySelector('[data-case-action="next-person"]'));
    expect(host.querySelector('.browser-case-review__case')?.getAttribute('aria-label')).toBe('黄子山材料');
    expect(host.querySelector('[data-case-action="open-followup"]')?.textContent).toBe('打开黄子山后续报道');
    expect(manager.getState().modules.browser.visitedPageIds).not.toContain('PAGE_A2_T06_008');
    expect(manager.getState().modules.browser.visitedPageIds).not.toContain('PAGE_A2_T06_006');
  });
  it('keeps legacy T06 completion accurate after one additional case review', async () => {
    manager.getState().modules.act2Research.t06.legacyCompletionMigrated = true;
    manager.enterAct2QimingResearch();
    await render();
    const click = async (element: Element | null) => {
      expect(element).not.toBeNull();
      await act(async () => { (element as HTMLElement).click(); });
    };

    await click(host.querySelector('[data-case-action="open-official"]'));
    await click(host.querySelector('.browser-qiming-toolbar button'));
    await click(host.querySelector('[data-case-action="open-followup"]'));
    await click(host.querySelector('.browser-qiming-toolbar button'));
    await click(host.querySelector('.browser-case-review__choices label'));
    await click(host.querySelector('[data-case-action="record"]'));

    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang']);
    expect(host.querySelector('.browser-case-review__progress')?.textContent).toBe('调查记录可回看');
    expect(host.querySelector('.browser-case-review__next-step')?.textContent).toBe('之前的个案调查已经整理好；材料可以回看，也可以和小月继续核对资料。');
    expect(host.querySelector('.browser-case-review__next p')?.textContent).toBe('之前的个案调查已经整理好；材料可以回看，也可以和小月继续核对资料。');
    expect(host.querySelector('.browser-case-review__next p')?.textContent).not.toContain('两名学员');
    expect(host.querySelector('.browser-case-review__next-step')?.textContent).not.toContain('钟子月');
  });
  it('offers a direct named-person path from the shared official page and keeps it on return', async () => {
    manager.enterAct2QimingResearch();
    await render();
    await search('启明 钟子月');
    const officialResult = [...host.querySelectorAll('.browser-result')].find((button) => button.textContent?.includes('学员黄子山、钟子月的成长记录')) as HTMLButtonElement | undefined;
    expect(officialResult).toBeDefined();
    await act(async () => { officialResult?.click(); });
    expect(host.querySelectorAll('.browser-page__case-entry')).toHaveLength(2);
    await act(async () => { (host.querySelectorAll('.browser-page__case-entry')[1] as HTMLButtonElement).click(); });
    expect(host.querySelector('.browser-case-review__case')?.getAttribute('aria-label')).toBe('钟子月材料');
    expect(manager.getState().modules.browser.visitedPageIds).toContain('PAGE_A2_T06_004');
    await act(async () => { (host.querySelector('.browser-qiming-toolbar button') as HTMLButtonElement).click(); });
    expect(host.querySelector('.browser-page__case-path')?.textContent).toContain('正在调查：钟子月');
    expect(host.querySelector('.browser-qiming-toolbar button')?.textContent).toBe('返回钟子月材料核对');
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);
  });
  it('records bounded named-case evidence without treating forum nicknames as identity proof', async () => {
    manager.enterAct2QimingResearch();
    const controller = new Act2T06Controller(manager, bus); controller.start();
    await render();
    const openFromPanel = async (label: string) => {
      const button = [...host.querySelectorAll('.browser-case-review button')].find((item) => item.textContent === label) as HTMLButtonElement;
      expect(button).toBeDefined(); await act(async () => button.click());
    };
    await openFromPanel('打开共用宣传案例（黄子山）');
    expect(manager.getState().modules.browser.visitedPageIds).toContain('PAGE_A2_T06_004');
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('browser');
    expect(host.textContent).toContain('学员黄子山');
    await act(async () => (host.querySelector('.browser-qiming-toolbar button') as HTMLButtonElement).click());
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('review');
    await openFromPanel('打开黄子山后续报道');
    expect(host.textContent).toContain('黄子山后续：家属多年未能联系上');
    await act(async () => (host.querySelector('.browser-qiming-toolbar button') as HTMLButtonElement).click());
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('review');
    const huangCase = host.querySelector('.browser-case-review__case[aria-label="黄子山材料"]')!;
    await act(async () => (huangCase.querySelectorAll('label')[0] as HTMLLabelElement).click());
    await act(async () => (huangCase.querySelector('.browser-case-review__submit') as HTMLButtonElement).click());
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang']);
    expect(manager.getState().game.flags.FLAG_A2_HUANG_MATCH_INFERRED).toBeUndefined();
    await search('启明 投诉');
    const forum = [...host.querySelectorAll('.browser-results button')].find((button) => button.textContent?.includes('旧帖：那阵子')) as HTMLButtonElement;
    expect(forum).toBeDefined(); await act(async () => forum.click());
    expect(host.textContent).toContain('论坛昵称线索（可选，身份未核实）');
    expect(host.textContent).not.toContain('黄山可能对应黄子山');
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang']);
    controller.dispose();
  });

  it('keeps the same hook order when a page changes from available to missing', async () => {
    await act(async () => { root.render(createElement(BrowserPageView, { page: browserPageById.get('PAGE_A2_T06_004'), manager })); });
    expect(host.textContent).toContain('学员黄子山');
    await expect(act(async () => { root.render(createElement(BrowserPageView, { page: undefined, manager })); })).resolves.toBeUndefined();
    expect(host.textContent).toContain('该内部页面已不可用');
  });
});

describe('BrowserApp T01 flexible offline route', () => {
  it('matches reversed keywords and offers the bridge after one relevant search', async () => {
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    const bus = new EventBus();
    const state = createDefaultState();
    state.game.act = 2; state.game.phase = 'A2_T01'; state.game.flags.FLAG_A1_COMPLETE = true;
    state.modules.act2Research.stage = 'search';
    const manager = new StateManager(bus, state);
    const controller = new Act2T01Controller(manager, bus);
    controller.start();
    const search = async (query: string) => {
      await act(async () => {
        const input = host.querySelector('#browser-search') as HTMLInputElement;
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
        input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await act(async () => { host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    };
    try {
      await act(async () => { root.render(createElement(BrowserApp, { manager })); });
      await search('补 鸡公岭');
      expect(host.textContent).toContain('鸡公岭 补');
      expect(host.textContent).toContain('这次搜索没有找到能回答问题的资料');
      expect(host.textContent).toContain('去桥头问问当地人');
      expect(manager.getState().game.flags.FLAG_A2_SEARCH_BU_ATTEMPTED).toBe(true);
      expect(manager.getState().game.flags.FLAG_A2_SEARCH_SS_ATTEMPTED).toBeUndefined();
      expect(manager.getState().game.flags.FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();
      await act(async () => { [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('去桥头问问'))?.click(); });
      expect(manager.getState().modules.act2Research.stage).toBe('bridge');
    } finally {
      controller.dispose();
      await act(async () => root.unmount()); host.remove();
    }
  });
});
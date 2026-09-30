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
  it('records bounded named-case evidence without treating forum nicknames as identity proof', async () => {
    manager.enterAct2QimingResearch();
    const controller = new Act2T06Controller(manager, bus); controller.start();
    await render();
    const openFromPanel = async (label: string) => {
      const button = [...host.querySelectorAll('.browser-case-review button')].find((item) => item.textContent === label) as HTMLButtonElement;
      expect(button).toBeDefined(); await act(async () => button.click());
    };
    await openFromPanel('打开宣传案例');
    expect(manager.getState().modules.browser.visitedPageIds).toContain('PAGE_A2_T06_004');
    await openFromPanel('调查黄子山后续');
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

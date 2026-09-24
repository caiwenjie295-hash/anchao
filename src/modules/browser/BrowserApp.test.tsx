import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { Act2T06Controller } from '../../story/act2T06Controller';
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
  it('records a page only after opening it and offers explicit comparisons and later-case confirmation', async () => {
    manager.enterAct2QimingResearch();
    const controller = new Act2T06Controller(manager, bus); controller.start();
    await render(); await search('启明 黄子山');
    const result = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('成长记录')) as HTMLButtonElement;
    await act(async () => result.click());
    expect(manager.getState().modules.browser.visitedPageIds).toContain('PAGE_A2_T06_004');
    expect(host.textContent).toContain('复制黄子山');
    await search('启明 投诉');
    const forum = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('旧帖：那阵子')) as HTMLButtonElement;
    await act(async () => forum.click());
    expect(host.textContent).toContain('黄山可能对应黄子山');
    await act(async () => host.querySelector('.browser-page__actions button:nth-of-type(1)')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(manager.getState().game.flags.FLAG_A2_HUANG_MATCH_INFERRED).toBe(true);
    await search('启明 投诉');
    const followup = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('跟帖：有人说')) as HTMLButtonElement;
    await act(async () => followup.click());
    await act(async () => (host.querySelector('.browser-page__actions button') as HTMLButtonElement).click());
    expect(manager.getState().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED).toBe(true);
    controller.dispose();
  });

  it('keeps the same hook order when a page changes from available to missing', async () => {
    await act(async () => { root.render(createElement(BrowserPageView, { page: browserPageById.get('PAGE_A2_T06_004'), manager })); });
    expect(host.textContent).toContain('学员黄子山');
    await expect(act(async () => { root.render(createElement(BrowserPageView, { page: undefined, manager })); })).resolves.toBeUndefined();
    expect(host.textContent).toContain('该内部页面已不可用');
  });
});

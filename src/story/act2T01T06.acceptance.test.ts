import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { hydrateState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import { BrowserApp } from '../modules/browser/BrowserApp';
import { Act2T06Controller } from './act2T06Controller';

describe('T06 browser acceptance', () => {
  let host: HTMLDivElement; let root: Root; let bus: EventBus; let manager: StateManager; let controller: Act2T06Controller;
  beforeEach(() => {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host); bus = new EventBus();
    const state = createDefaultState(); state.game.act = 2; state.game.phase = 'A2_T05';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true };
    state.modules.act2Research.stage = 'school';
    state.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM'], inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE'] };
    manager = new StateManager(bus, state); controller = new Act2T06Controller(manager, bus); controller.start();
    act(() => root.render(createElement(BrowserApp, { manager })));
  });
  afterEach(() => { controller.dispose(); act(() => root.unmount()); host.remove(); });
  const search = async (query: string) => {
    await act(async () => {
      const input = host.querySelector('#browser-search') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  };
  const open = async (text: string) => {
    const button = [...host.querySelectorAll('.browser-results button')].find((item) => item.textContent?.includes(text)) as HTMLButtonElement;
    expect(button).toBeDefined(); await act(async () => button.click());
  };
  it('enters on the first valid active search, requires opened pages and explicit comparisons, then migrates qiming progress', async () => {
    await search('启明');
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(host.textContent).not.toContain('旧帖：那阵子我被送去一个训练中心');
    await search('启明 投诉');
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    expect(manager.getState().game.phase).toBe('A2_T06');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).not.toBe(true);
    await open('旧帖：那阵子');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).toBe(true);
    await search('启明 黄子山'); await open('成长记录');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ).toBe(true);
    await search('启明 投诉'); await open('旧帖：那阵子');
    await act(async () => { (host.querySelector('.browser-page__actions button') as HTMLButtonElement).click(); });
    expect(manager.getState().game.flags.FLAG_A2_HUANG_MATCH_INFERRED).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED).not.toBe(true);
    await search('启明 投诉'); await open('跟帖：有人说');
    await act(async () => { (host.querySelector('.browser-page__actions button') as HTMLButtonElement).click(); });
    expect(manager.getState().game.flags.FLAG_A2_ZHONG_MATCH_INFERRED).toBe(true);
    const restored = hydrateState(JSON.parse(JSON.stringify(manager.getState())));
    expect(restored.schemaVersion).toBe(6);
    expect(restored.modules.act2Research.stage).toBe('qiming');
    expect(restored.modules.browser.visitedPageIds).toContain('PAGE_A2_T06_006');
  });
});

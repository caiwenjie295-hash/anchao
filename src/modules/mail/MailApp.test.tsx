import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { BrowserApp } from '../browser/BrowserApp';
import { MailApp } from './MailApp';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('MailApp first act search handoff', () => {
  let root: Root;
  let host: HTMLDivElement;
  let manager: StateManager;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const state = createDefaultState();
    state.game.act = 1;
    state.game.phase = 'C';
    state.game.flags.FLAG_A1_MAIL_XIAOA_FOUND = true;
    state.game.flags.FLAG_A1_MAIL_XIAOA_OPENED = true;
    manager = new StateManager(new EventBus(), state);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const render = async () => act(async () => { root.render(createElement('div', null, createElement(MailApp, { manager }), createElement(BrowserApp, { manager }))); });
  const openXiaoaMail = async () => act(async () => {
    const row = host.querySelector<HTMLButtonElement>('.mail-row__open[aria-label*="小A"]');
    expect(row).not.toBeNull();
    row!.click();
  });

  it('does not search automatically, then sends a one-shot request from the opened old email', async () => {
    await render();
    await openXiaoaMail();
    expect(host.querySelector('.mail-detail__investigation-step')).not.toBeNull();
    expect(host.querySelector('.browser-results')).toBeNull();
    expect(manager.getState().modules.browser.queryHistory).toEqual([]);

    await act(async () => { host.querySelector<HTMLButtonElement>('.mail-detail__investigation-step button')!.click(); });

    expect(host.querySelector('.browser-results__summary h2')?.textContent).toBe('XX县失踪');
    expect(manager.getState().modules.browser.queryHistory).toEqual(['XX县失踪']);
  });

  it('does not offer the cross-app search outside the valid first-act window', async () => {
    manager.setPhase('B');
    manager.setFlag('FLAG_A1_MAIL_XIAOA_OPENED', false);
    await render();
    await openXiaoaMail();
    expect(host.querySelector('.mail-detail__investigation-step')).toBeNull();
    expect(host.textContent).not.toContain('在浏览器搜索“XX县失踪”');
  });

  it('does not attach the search prompt to another opened email', async () => {
    await render();
    await act(async () => { host.querySelector<HTMLButtonElement>('.mail-row__open[aria-label*="教务处"]')!.click(); });
    expect(host.querySelector('.mail-detail__investigation-step')).toBeNull();
    expect(host.querySelector('.browser-results')).toBeNull();
    expect(manager.getState().modules.browser.queryHistory).toEqual([]);
  });
});

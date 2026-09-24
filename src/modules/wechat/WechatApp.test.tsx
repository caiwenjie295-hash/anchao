import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { MOM_READ_FLAG, MOM_TRIGGERED_FLAG, XIAOA_MISSING_KNOWN_FLAG } from '../../data/wechatData';
import { Act1PhaseBController } from '../../story/act1PhaseBController';
import { WechatApp } from './WechatApp';

describe('WechatApp phase B read acknowledgement', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('acknowledges the new mother message when her conversation was already open at 1200ms', async () => {
    const bus = new EventBus();
    const manager = new StateManager(bus, createDefaultState());
    const controller = new Act1PhaseBController(manager, bus);
    controller.start();
    await act(async () => {
      root.render(<WechatApp manager={manager} bus={bus} />);
    });
    const motherButton = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('母亲'));
    expect(motherButton).toBeDefined();
    await act(async () => {
      manager.openApp('wechat');
      motherButton?.click();
    });
    const messageArea = container.querySelector<HTMLDivElement>('.wechat-chat__messages');
    expect(messageArea).not.toBeNull();
    Object.defineProperty(messageArea!, 'scrollHeight', { configurable: true, value: 372 });
    await act(async () => { vi.advanceTimersByTime(1199); });
    expect(manager.getState().game.flags[MOM_TRIGGERED_FLAG]).not.toBe(true);
    expect(manager.getState().game.flags[MOM_READ_FLAG]).not.toBe(true);
    expect(manager.getState().game.flags[XIAOA_MISSING_KNOWN_FLAG]).not.toBe(true);
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(manager.getState().game.flags[MOM_TRIGGERED_FLAG]).toBe(true);
    expect(manager.getState().game.flags[MOM_READ_FLAG]).toBe(true);
    expect(manager.getState().game.flags[XIAOA_MISSING_KNOWN_FLAG]).toBe(true);
    expect(container.querySelector('.wechat-unread')).toBeNull();
    expect(messageArea!.scrollTop).toBe(372);
    controller.dispose();
  });
});

describe('WechatApp T05 school transition', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    if (!HTMLDialogElement.prototype.showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
    if (!HTMLDialogElement.prototype.close) Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute('open'); } });
  });

  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it('shows Xiaoyue’s gated life photos and enters school on request', async () => {
    const state = createDefaultState();
    state.game.act = 2; state.game.phase = 'A2_T04'; state.game.flags.FLAG_A2_TRANSFER_RULE_INFERRED = true; state.modules.act2Research.stage = 'tales';
    const manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<WechatApp manager={manager} />); });
    const xiaoyue = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('小月'));
    await act(async () => { xiaoyue?.click(); });
    expect(container.textContent).toContain('去年聚会拍的');
    expect(container.textContent).toContain('小A');
    const photo = container.querySelector<HTMLButtonElement>('.wechat-message__body[data-asset-id="IMG_A2_T05_011"] .evidence-thumbnail');
    expect(photo?.querySelector('img')?.getAttribute('src')).toBeTruthy();
    await act(async () => { photo?.click(); });
    const dialog = container.querySelector<HTMLDialogElement>('.evidence-lightbox[open]');
    expect(dialog?.open).toBe(true);
    await act(async () => { dialog?.querySelector<HTMLButtonElement>('[aria-label="关闭图片"]')?.click(); });
    expect(dialog?.open).toBe(false);
    await act(async () => { container.querySelector<HTMLButtonElement>('.wechat-school-transition button')?.click(); });
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(manager.getState().game.phase).toBe('A2_T05');
    expect(manager.getState().game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);
  });
});

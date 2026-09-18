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

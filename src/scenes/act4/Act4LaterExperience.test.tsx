import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { Act4Experience } from './Act4Experience';
import { Act4LaterExperience } from './Act4LaterExperience';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const renderExperience = async (component: ReactNode) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(component); });
  return { host, root };
};

describe('Act4 reading experience', () => {
  it('ignores a rapid second continue click after React has rendered the next section', async () => {
    vi.useFakeTimers();
    const state = createDefaultState();
    state.game.phase = 'A4_T05';
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const continueButton = () => host.querySelector<HTMLButtonElement>('[data-action-id$="_CONTINUE_READING"]')!;
    try {
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T06');

      // This second click sees the newly rendered T06 button, as a native rapid double-click does.
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T06');

      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T07');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.useRealTimers();
    }
  });

  it('uses the shared reader and reveals archive material only after opening it', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T08';
    state.modules.act4.stage = 'T08';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4LaterExperience manager={manager} onExit={() => {}} />);
    const click = async (label: string) => act(async () => {
      const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(label));
      button?.click();
    });
    try {
      expect(host.querySelector('.a4-reader')?.getAttribute('data-act4-stage')).toBe('T08');
      expect(host.querySelector('[data-block-id="T08_RETURN"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T08_ARCHIVE"]')).toBeNull();
      expect(host.textContent).not.toContain('2008 年改造成功');
      const action = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T08_CONTINUE_READING"]')!;
      expect(action.getAttribute('data-action-state')).toBe('blocked');

      await click('从档案架抽出 2008 年档案');
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T08_ARCHIVE_OPENED');
      expect(host.querySelector('[data-block-id="T08_ARCHIVE"]')).not.toBeNull();
      expect(host.querySelector('[data-explanation-id="A4_EXPLAIN_T08"]')).not.toBeNull();
      expect(host.textContent).toContain('黄子山，2008 年改造成功');

      await click('收好这一段，继续阅读');
      expect(manager.getState().modules.act4.stage).toBe('T09');
      manager.advanceAct4NarrativeSection('T08');
      expect(manager.getState().modules.act4.stage).toBe('T09');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps 20200419 entry behind both mail checks and unlocks its excerpt only on success', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T02';
    state.modules.act4.stage = 'T02';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      expect(host.querySelector('[data-block-id="T02_PASSWORD_REVEAL"]')).toBeNull();
      const login = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__interaction button')].find((button) => button.textContent === '主动登录')!;
      expect(login.disabled).toBe(true);
      const mailButtons = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__mail button')];
      await click(mailButtons[0]);
      expect(login.disabled).toBe(true);
      await click(mailButtons[1]);
      expect(login.disabled).toBe(false);
      const input = host.querySelector<HTMLInputElement>('#a4-shared-date')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '20200419');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(login);
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T02_LOGIN_SUCCEEDED');
      expect(host.querySelector('[data-block-id="T02_PASSWORD_REVEAL"]')).not.toBeNull();
      expect(host.querySelector('[data-explanation-id="A4_EXPLAIN_T02"]')).not.toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('reveals the last-page and broadcast blocks in order', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T09';
    state.modules.act4.stage = 'T09';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4LaterExperience manager={manager} onExit={() => {}} />);
    const click = async (label: string) => act(async () => {
      const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(label));
      button?.click();
    });
    try {
      expect(host.querySelector('[data-block-id="T09_NOTE_HIDDEN"]')).toBeNull();
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).toBeNull();
      await click('把笔记藏到消防箱后');
      expect(host.querySelector('[data-block-id="T09_NOTE_HIDDEN"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T09_WALK_TO_DOOR"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).toBeNull();
      await click('走到门外，听完广播');
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).not.toBeNull();
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toEqual(expect.arrayContaining(['A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED']));
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

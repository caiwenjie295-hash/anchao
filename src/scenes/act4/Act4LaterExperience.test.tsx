import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { Act4LaterExperience } from './Act4LaterExperience';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Act4LaterExperience navigation', () => {
  it('shows the blocked reason nearby and opens the relevant memory in read-only review', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A4_T06';
    state.modules.act4.stage = 'T06';
    state.modules.act4.laterNodeId = 'A4_T06_CONFINEMENT';
    state.modules.act4.seenLaterNodeIds = ['A4_T06_WAKE', 'A4_T06_BROADCAST', 'A4_T06_CONFINEMENT'];
    const manager = new StateManager(new EventBus(), state);
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      await act(async () => { root.render(<Act4LaterExperience manager={manager} onExit={() => {}} />); });
      const continueAction = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T06_CONTINUE"]')!;
      expect(continueAction.disabled).toBe(false);
      expect(continueAction.getAttribute('data-action-state')).toBe('blocked');
      await click(continueAction);
      expect(host.querySelector('.investigation-navigation__reason')?.textContent).toContain('主线判断还未确认');
      expect(host.querySelector('[role="dialog"]')).toBeNull();
      const material = host.querySelector<HTMLButtonElement>('.investigation-navigation__material')!;
      expect(material.textContent).toContain('早晚广播记录');
      await click(material);
      expect(host.querySelector('.investigation-shell__place h1')?.textContent).toBe('早与晚的广播');
      expect(host.querySelector('.investigation-shell__status')?.textContent).toContain('回看中');
      expect(host.querySelector('[data-action-id="A4_RETURN_TO_CURRENT_PROGRESS"]')?.textContent).toContain('返回当前进度');
      expect(manager.getState().modules.act4.laterNodeId).toBe('A4_T06_CONFINEMENT');
      expect(manager.getState().modules.act4.solvedPuzzleIds).not.toContain('A4_P13');
      await click(host.querySelector<HTMLButtonElement>('[data-action-id="A4_RETURN_TO_CURRENT_PROGRESS"]')!);
      expect(host.querySelector('.investigation-shell__place h1')?.textContent).toBe('禁闭室');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

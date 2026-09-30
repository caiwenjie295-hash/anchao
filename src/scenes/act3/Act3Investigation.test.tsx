import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { Act3Investigation } from './Act3Investigation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Third-act investigation interface', () => {
  it('explains a known blocked route and opens the related material with focus return', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_004';
    state.game.phase = 'A3_T04';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const route = container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T04_004_005"]');
      expect(route).not.toBeNull();
      expect(route?.disabled).toBe(false);
      expect(route?.getAttribute('data-action-state')).toBe('blocked');
      await click(route!);
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('还没有核对蹲下检查角落纸边');
      const material = container.querySelector<HTMLButtonElement>('.investigation-navigation__material');
      expect(material?.textContent).toContain('查看相关材料');
      material!.focus();
      await click(material!);
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T04_004');
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T04_PAPER_EDGE');
      expect(container.querySelector('[role="dialog"] h2')?.textContent).toContain('角落纸边');
      const close = container.querySelector<HTMLButtonElement>('[role="dialog"] button');
      expect(document.activeElement).toBe(close);
      await click(close!);
      expect(document.activeElement).toBe(container.querySelector('[data-clue-id="CLUE_A3_T04_PAPER_EDGE"]'));
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps place, objective and exit controls visible outside the photo viewport', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    const manager = new StateManager(new EventBus(), state);
    manager.startAct3();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(container.querySelector('.investigation-shell__place h1')?.textContent).toBe('再次出发');
      expect(container.querySelector('.investigation-shell__goal')?.textContent).toContain('核对人工设施与旧路痕迹');
      expect(container.querySelector('.investigation-shell__exit')?.textContent).toBe('退出调查，返回桌面');
      expect(container.querySelector('.investigation-shell__operations')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

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
      expect(document.activeElement).toBe(container.querySelector('[data-clue-id="CLUE_A3_T04_PAPER_EDGE"]') ?? container.querySelector('.photo-viewport__fallback button'));
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
      expect(container.querySelector('.investigation-shell__goal')?.textContent).toContain('核对山路上的人工痕迹');
      expect(container.querySelector('.investigation-shell__exit')?.textContent).toBe('退出调查，返回桌面');
      expect(container.querySelector('.investigation-shell__operations')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps unrevealed vocabulary out of the complete T04 and T05 interface', async () => {
    for (const scenario of [
      { stage: 'T04' as const, lensId: 'LENS_A3_T04_004', forbidden: ['VVaKe', '蜘蛛', '曼陀罗'], blockedRoute: 'A3_ROUTE_T04_004_005', nextLabel: '继续查看架脚附近' },
      { stage: 'T05' as const, lensId: 'LENS_A3_T05_004', forbidden: ['13aCK', '老鼠', '草垛', '玫瑰'], blockedRoute: 'A3_ROUTE_T05_004_005', nextLabel: '继续查看桌脚附近' },
    ]) {
      localStorage.clear();
      const state = createDefaultState();
      state.game.phase = `A3_${scenario.stage}` as typeof state.game.phase;
      state.modules.act3.stage = scenario.stage;
      state.modules.act3.currentLensId = scenario.lensId;
      const manager = new StateManager(new EventBus(), state);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
        const initialDom = container.textContent ?? '';
        for (const word of scenario.forbidden) expect(initialDom).not.toContain(word);
        expect(container.querySelector(`[data-action-id="${scenario.blockedRoute}"]`)?.textContent).toContain(scenario.nextLabel);
        expect(container.querySelector(`[data-action-id="${scenario.blockedRoute}"]`)?.getAttribute('data-action-state')).toBe('blocked');

        const route = container.querySelector<HTMLButtonElement>(`[data-action-id="${scenario.blockedRoute}"]`)!;
        await act(async () => { route.click(); });
        const fullDomWithBlockedReason = container.textContent ?? '';
        for (const word of scenario.forbidden) expect(fullDomWithBlockedReason).not.toContain(word);
        expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('还没有核对');
        expect(container.querySelector('.investigation-navigation__material')?.textContent).toContain('查看相关材料');
      } finally {
        await act(async () => { root.unmount(); });
        container.remove();
      }
    }
  });

  it('keeps the T07 return action understandable without exposing the hidden object or location', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T07';
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_001';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const initialDom = container.textContent ?? '';
      for (const word of ['消防栓', '缝隙', '包裹', '笔记本']) expect(initialDom).not.toContain(word);
      const exit = container.querySelector<HTMLButtonElement>('[data-action-id="A3_T07_LEAVE_SITE"]')!;
      expect(exit.textContent).toContain('与小月一起离开旧址');
      expect(exit.getAttribute('data-action-state')).toBe('blocked');
      await act(async () => { exit.click(); });
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('先听小月');
      expect(container.querySelector('.investigation-navigation__material')?.textContent).toContain('小月的回忆');
      const completeDom = container.textContent ?? '';
      for (const word of ['消防栓', '缝隙', '包裹', '笔记本']) expect(completeDom).not.toContain(word);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('requires the memory, crouched view, pickup and first-page confirmation in order', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T07';
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_004';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(manager.enterAct3Lens('LENS_A3_T07_005')).toBe(false);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_XIAOYUE_MEMORY'); });
      let entered = false;
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_005'); });
      expect(entered).toBe(true);
      expect(container.textContent).not.toContain('笔记本');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T07_NOTEBOOK_PICKUP');

      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_BACK_GAP'); });
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_006'); });
      expect(entered).toBe(true);
      expect(container.querySelector('.act3-investigation__caption')?.textContent).toContain('缝隙里的物件');
      const beforePickup = container.textContent ?? '';
      for (const word of ['笔记本', '包裹', 'A.W']) expect(beforePickup).not.toContain(word);
      const firstPageRoute = container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T07_006_007"]')!;
      expect(firstPageRoute.textContent).toContain('继续核对这一物件');
      expect(firstPageRoute.getAttribute('data-action-state')).toBe('blocked');
      await act(async () => { firstPageRoute.click(); });
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('当前取物动作');
      expect(container.querySelector('.investigation-navigation__material')?.textContent).toContain('继续核对当前发现');
      for (const word of ['笔记本', '包裹', 'A.W']) expect(container.textContent).not.toContain(word);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_NOTEBOOK_PICKUP'); });
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T07_NOTEBOOK_PICKUP');
      expect(container.textContent).toContain('笔记本');
      expect(container.querySelector('.act3-investigation__caption')?.textContent).toContain('取出的笔记本');
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_007'); });
      expect(entered).toBe(true);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_FIRST_PAGE'); });
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T07_FIRST_PAGE');
      expect(manager.getState().game.flags.FLAG_A3_COMPLETE).not.toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('uses one ready action to confirm the current stage and advance it', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.game.phase = 'A3_T00';
    state.modules.act3.stage = 'T00';
    state.modules.act3.currentLensId = 'LENS_A3_T00_001';
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T00_CABLE_BREAK', 'CLUE_A3_T00_DRAIN_DISCOVERED'];
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const leave = container.querySelector<HTMLButtonElement>('[data-action-id="A3_T00_LEAVE_AND_CONTINUE"]')!;
      expect(leave.textContent).toContain('离开本处，前往');
      await act(async () => { leave.click(); });
      expect(manager.getState().modules.act3.stage).toBe('T01');
      expect(manager.getState().game.flags.FLAG_A3_OLD_ROAD_FOUND).toBe(true);
      expect(manager.getState().game.flags.FLAG_A3_GATE_REACHED).toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

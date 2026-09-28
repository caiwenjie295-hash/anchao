import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { act3StageDoc } from '../../data/act3Data';
import { Act3Investigation } from './Act3Investigation';

describe('Third-act player path', () => {
  it('walks from T00 through the T07 notebook and exit', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    const manager = new StateManager(new EventBus(), state);
    manager.startAct3();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (button: HTMLButtonElement | undefined) => {
      expect(button).toBeDefined();
      await act(async () => { button!.click(); });
    };
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} />); });
      for (const stage of ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'] as const) {
        const lenses = act3StageDoc(stage).lenses.filter((lens) => lens.id !== 'LENS_A3_T03_000');
        for (const [index, lens] of lenses.entries()) {
          expect(container.querySelector('.act3-investigation__lens')?.getAttribute('data-asset-id')).toBe(lens.assetId);
          for (const hotspot of lens.hotspots) {
            await click(container.querySelector<HTMLButtonElement>(`[data-clue-id="${hotspot.clueId}"]`) ?? undefined);
            expect(container.querySelector('[role="dialog"]')).not.toBeNull();
            await click(container.querySelector<HTMLButtonElement>('.act3-investigation__dialog [aria-label="关闭"]') ?? undefined);
          }
          if (index + 1 < lenses.length) {
            const next = lenses[index + 1];
            await click([...container.querySelectorAll<HTMLButtonElement>('.photo-viewport__marker--direction')].find((button) => button.textContent?.includes(next.title)));
          }
        }
        if (stage === 'T05') expect(container.querySelector('[aria-label="两张词表"]')?.textContent).toContain('VVaKe');
        if (stage === 'T06') expect(container.querySelector('[aria-label="破庙与空神龛对照"] img')).not.toBeNull();
        await click(container.querySelector<HTMLButtonElement>('.act3-investigation__action button') ?? undefined);
      }
      expect(manager.getState().game.phase).toBe('A3_T07');
      expect(manager.getState().game.flags.FLAG_A3_VVAKE_PAPER_FOUND).toBe(true);
      expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T04_001');
      expect(manager.getState().game.flags.FLAG_A3_13ACK_PAPER_FOUND).toBe(true);
      expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T05_001');
      expect(manager.getState().game.flags.FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED).toBe(true);
      expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A3_T06_001');
      expect(manager.getState().game.flags.FLAG_A3_NOTEBOOK_FOUND).toBe(true);
      expect(manager.getState().game.flags.FLAG_A3_SITE_EXITED).toBe(true);
      expect(manager.getState().game.flags.FLAG_A3_COMPLETE).toBe(true);
      expect(container.textContent).toContain('第三幕已完成');
      expect(container.textContent).not.toContain('进入第四幕');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

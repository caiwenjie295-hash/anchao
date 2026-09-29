import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { SchoolSymbolComparison } from './SchoolSymbolComparison';

describe('T05 school symbol comparison', () => {
  let container: HTMLDivElement;
  let root: Root;
  let manager: StateManager;
  beforeEach(() => {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    const state = createDefaultState(); state.game.act = 2; state.game.phase = 'A2_T05';
    state.game.flags = { FLAG_A1_SS_FOUND: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_SS_FOUND: true };
    state.modules.act2Research.stage = 'school';
    state.modules.act2Research.school.inspectedHotspotIds = ['HOTSPOT_A2_T05_SCHOLAR_NOTE'];
    manager = new StateManager(new EventBus(), state);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it('provides side-by-side zoom and adjustable overlay, and confirms only from the overlay view', async () => {
    const matches: number[] = []; const bus = new EventBus();
    manager = new StateManager(bus, manager.getState()); bus.on('act2:school-symbol-matched', () => matches.push(1));
    await act(async () => { root.render(<SchoolSymbolComparison manager={manager} onClose={() => undefined} />); });
    expect((document.activeElement as HTMLElement)?.textContent).toContain('返回笔记');
    expect(container.textContent).toContain('并排'); expect(container.querySelector('[aria-label="山洞图案缩放"]')).not.toBeNull(); expect(container.querySelector('[aria-label="笔记图案缩放"]')).not.toBeNull();
    expect(container.querySelector('button')?.textContent).not.toContain('确认图案一致');
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '半透明重合')?.click(); });
    expect(container.querySelector('[aria-label="重合图案透明度"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="左右对齐"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="上下对齐"]')).not.toBeNull();
    const caveSymbol = container.querySelector<SVGElement>('[aria-label="山洞双 S 底图"]');
    const schoolSymbol = container.querySelector<SVGElement>('[aria-label="笔记双 S 半透明叠图"]');
    expect(caveSymbol?.style.transform).toContain('translate(-50%, -50%)');
    expect(schoolSymbol?.style.transform).toContain('translate(calc(-50% + 0px), calc(-50% + 0px))');
    const setRange = async (label: string, value: string) => act(async () => {
      const input = container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await setRange('左右对齐', '18');
    await setRange('笔记图案缩放', '1.4');
    expect(caveSymbol?.style.transform).toContain('scale(1)');
    expect(schoolSymbol?.style.transform).toContain('translate(calc(-50% + 18px), calc(-50% + 0px))');
    expect(schoolSymbol?.style.transform).toContain('scale(1.4)');
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '确认图案一致')?.click(); });
    expect(manager.getState().modules.act2Research.school.symbolMatchConfirmed).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).not.toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).not.toContain('NOTE_A2_T05_004');
    expect(matches).toEqual([]);
  });
});

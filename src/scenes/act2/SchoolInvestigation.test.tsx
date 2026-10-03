import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { SchoolInvestigation } from './SchoolInvestigation';

describe('T05 school exploration', () => {
  let container: HTMLDivElement;
  let root: Root;
  let manager: StateManager;
  beforeEach(() => {
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    const state = createDefaultState(); state.game.act = 2; state.game.phase = 'A2_T05'; state.game.flags = { FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true }; state.modules.act2Research.stage = 'school';
    manager = new StateManager(new EventBus(), state);
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });

  it('exposes the frozen locations and shows the hydrant as an ordinary corridor detail', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    for (const title of ['校门', '走廊', '小A旧教室', '小月旧教室', '厕所方向', '光荣榜', '老师办公室', '宣传栏']) expect(container.textContent).toContain(title);
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '走廊')?.click(); });
    expect(container.textContent).toContain('墙边的消防栓');
    expect(manager.getState().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds.some((id) => id.includes('HYDRANT'))).toBe(false);
    expect(container.querySelector('[aria-label="墙边的消防栓"]')?.tagName).not.toBe('BUTTON');
  });

  it('moves keyboard focus into the teacher dialog and lets Escape close it', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '老师办公室')?.click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '听听老师回忆')?.click(); });
    expect(container.querySelector('.t05-school__backdrop .t05-school__image-hotspot')).not.toBeNull();
    expect((document.activeElement as HTMLElement)?.textContent).toContain('关闭');
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('听听老师回忆');
  });

  it('places existing daily messages and high-school photos before the anomaly timeline', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    const memory = container.querySelector('.t05-school__memory');
    const timeline = container.querySelector('.t05-school__timeline');
    expect(memory).not.toBeNull();
    const memoryDisclosure = memory?.querySelector<HTMLDetailsElement>('.t05-school__memory-disclosure');
    const timelineDisclosure = container.querySelector<HTMLDetailsElement>('.t05-school__timeline-disclosure');
    expect(memoryDisclosure?.open).toBe(false);
    expect(memoryDisclosure?.querySelector('summary')?.textContent).toContain('展开小月的日常消息与两张旧照片');
    expect(timelineDisclosure?.open).toBe(false);
    expect(timelineDisclosure?.querySelector('summary')?.textContent).toContain('已读 0 / 3 · 已选不同来源 0 / 2');
    expect([...memory!.querySelectorAll('blockquote[data-message-id]')].map((node) => node.getAttribute('data-message-id'))).toEqual([
      'CHAT_A2_T05_001',
      'CHAT_A2_T05_011',
    ]);
    expect([...memory!.querySelectorAll('figure[data-message-id]')].map((node) => node.getAttribute('data-message-id'))).toEqual([
      'CHAT_A2_T05_004',
      'CHAT_A2_T05_007',
    ]);
    expect(memory?.textContent).toContain('想起');
    expect(memory!.compareDocumentPosition(timeline!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const flagsBeforeDisclosure = { ...manager.getState().game.flags };
    await act(async () => { memoryDisclosure!.querySelector('summary')?.click(); });
    await act(async () => { timelineDisclosure!.querySelector('summary')?.click(); });
    expect(memoryDisclosure?.open).toBe(true);
    expect(timelineDisclosure?.open).toBe(true);
    expect(manager.getState().game.flags).toEqual(flagsBeforeDisclosure);
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual([]);
    expect(manager.getState().modules.act2Research.school.selectedInferenceId).toBeNull();
  });
});

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

  it('keeps a compact daily-memory entry and the evidence choices visible without opening folds', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    const memory = container.querySelector('.t05-school__memory');
    const timeline = container.querySelector('.t05-school__timeline');
    expect(memory).not.toBeNull();
    expect(memory?.querySelector('details')).toBeNull();
    expect(container.querySelector('.t05-school__timeline-disclosure')).toBeNull();
    expect(timeline?.querySelector('h2')?.textContent).toContain('已读 0 / 3 · 已选不同来源 0 / 2');
    expect(timeline?.querySelectorAll('.t05-school__evidence-options button')).toHaveLength(3);
    expect([...memory!.querySelectorAll('blockquote[data-message-id]')].map((node) => node.getAttribute('data-message-id'))).toEqual([
      'CHAT_A2_T05_001',
      'CHAT_A2_T05_011',
    ]);
    expect([...memory!.querySelectorAll('figure[data-message-id]')].map((node) => node.getAttribute('data-message-id'))).toEqual([
      'CHAT_A2_T05_004',
      'CHAT_A2_T05_007',
    ]);
    expect(memory?.textContent).toContain('小月记得的日常与两张旧照片');
    expect(memory!.compareDocumentPosition(timeline!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    expect(manager.getState().game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN).toBeUndefined();
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual([]);
    expect(manager.getState().modules.act2Research.school.selectedInferenceId).toBeNull();
  });

  it('offers already-read school records as support choices and keeps reading separate from selection', async () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T05';
    state.game.flags = { FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true };
    state.modules.act2Research.stage = 'school';
    state.modules.act2Research.school.symbolMatchConfirmed = true;
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });

    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A2_T05_CONFIRM_TIMELINE"]')?.click(); });
    const materials = [...container.querySelectorAll<HTMLButtonElement>('.investigation-navigation__reason .investigation-navigation__material')];
    expect(materials.map((button) => button.textContent)).toEqual([
      '查看相关材料：班主任的回忆 · 选作支持来源',
      '查看相关材料：历次成绩记录 · 选作支持来源',
    ]);
    await act(async () => { materials[0].click(); });
    const teacherEvidence = container.querySelector<HTMLButtonElement>('[data-evidence-id="teacher-account"]');
    expect(teacherEvidence).toBe(document.activeElement);
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual([]);

    await act(async () => { teacherEvidence?.click(); });
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual(['teacher-account']);
    expect(manager.getState().game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN).toBe(true);
    expect(container.querySelector('.t05-school__timeline h2')?.textContent).toContain('已读 2 / 3 · 已选不同来源 1 / 2');
    const remainingMaterial = container.querySelector('.investigation-navigation__reason .investigation-navigation__material');
    expect(remainingMaterial?.textContent).toContain('历次成绩记录 · 选作支持来源');
    expect(container.querySelectorAll('.investigation-navigation__reason .investigation-navigation__material')).toHaveLength(1);
  });
});

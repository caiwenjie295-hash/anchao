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

  it('opens on the north-up campus map, enters the building interior, and keeps the hydrant as an ordinary detail', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    expect(container.querySelector('.t05-school__campus-plan')?.getAttribute('data-asset-id')).toBe('IMG_A2_SCHOOL_MAP_001');
    expect(container.querySelectorAll('.t05-school__campus-plan [data-location-id]')).toHaveLength(7);
    expect(container.querySelector('.t05-school__indoor-plan')).toBeNull();
    for (const title of ['南门', '室外广场', '光荣榜', '宣传栏', '教学楼', '西操场', '东北宿舍']) expect(container.textContent).toContain(title);
    const visitedBeforeEnvironment = [...manager.getState().modules.act2Research.school.visitedAreaIds];
    for (const [locationId, imageId] of [
      ['CAMPUS_COURTYARD', 'IMG_A2_SCHOOL_COURTYARD_001'],
      ['CAMPUS_PLAYGROUND', 'IMG_A2_SCHOOL_PLAYGROUND_001'],
      ['CAMPUS_DORM', 'IMG_A2_SCHOOL_DORM_001'],
    ]) {
      await act(async () => { container.querySelector<HTMLButtonElement>(`[data-location-id="${locationId}"]`)?.click(); });
      expect(container.querySelector('.t05-school__backdrop')?.getAttribute('data-asset-id')).toBe(imageId);
      expect(manager.getState().modules.act2Research.school.visitedAreaIds).toEqual(visitedBeforeEnvironment);
    }
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_COURTYARD"]')?.click(); });
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_BUILDING"]')?.click(); });
    expect(container.querySelector('.t05-school__backdrop')?.getAttribute('data-asset-id')).toBe('IMG_A2_SCHOOL_BUILDING_001');
    expect(container.querySelector('.t05-school__indoor-plan')).toBeNull();
    expect(container.querySelector('.t05-school__building-entry')?.textContent).toBe('进入教学楼走廊');
    expect(manager.getState().modules.act2Research.school.visitedAreaIds).toEqual(visitedBeforeEnvironment);
    await act(async () => { container.querySelector<HTMLButtonElement>('.t05-school__building-entry')?.click(); });
    expect(container.querySelector('.t05-school__indoor-plan')).not.toBeNull();
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '返回校园总图')?.click(); });
    expect(container.querySelector('[data-location-id="CAMPUS_BUILDING"]')?.getAttribute('aria-current')).toBe('location');
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('刚才走过的路线：室外广场 → 教学楼');
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_HONOR"]')?.click(); });
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('刚才走过的路线：教学楼 → 室外广场 → 光荣榜');
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_BUILDING"]')?.click(); });
    await act(async () => { container.querySelector<HTMLButtonElement>('.t05-school__building-entry')?.click(); });
    expect(container.querySelector('.t05-school__indoor-plan')).not.toBeNull();
    expect(container.querySelectorAll('.t05-school__indoor-plan [data-location-id]')).toHaveLength(5);
    for (const title of ['走廊', '小A旧教室', '小月旧教室', '厕所方向', '老师办公室']) expect(container.textContent).toContain(title);
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="AREA_A2_T05_CORRIDOR"]')?.click(); });
    expect(container.textContent).toContain('墙边的消防栓');
    expect(manager.getState().game.flags.FLAG_A2_FIRE_HYDRANT_SEEN).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds.some((id) => id.includes('HYDRANT'))).toBe(false);
    expect(container.querySelector('[aria-label="墙边的消防栓"]')?.tagName).not.toBe('BUTTON');
  });

  it('keeps the building as the outdoor route origin after opening a classroom from a timeline material shortcut', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('当前位置：南门');

    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A2_T05_CONFIRM_TIMELINE"]')?.click(); });
    const scholarNote = [...container.querySelectorAll<HTMLButtonElement>('.investigation-navigation__reason .investigation-navigation__material')]
      .find((button) => button.textContent === '查看相关材料：小 A 旧教室里的学霸笔记');
    expect(scholarNote).toBeDefined();
    await act(async () => { scholarNote?.click(); });
    expect(container.querySelector('.t05-school__indoor-plan')).not.toBeNull();
    expect(container.querySelector('[role="dialog"] h2')?.textContent).toBeTruthy();

    await act(async () => { container.querySelector<HTMLButtonElement>('[role="dialog"] [aria-label="关闭"]')?.click(); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '返回校园总图')?.click(); });
    expect(container.querySelector('[data-location-id="CAMPUS_BUILDING"]')?.getAttribute('aria-current')).toBe('location');
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('刚才走过的路线：南门 → 室外广场 → 教学楼');

    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_HONOR"]')?.click(); });
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('刚才走过的路线：教学楼 → 室外广场 → 光荣榜');
  });

  it('moves keyboard focus into the teacher dialog and lets Escape close it', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_BUILDING"]')?.click(); });
    await act(async () => { container.querySelector<HTMLButtonElement>('.t05-school__building-entry')?.click(); });
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="AREA_A2_T05_TEACHER_OFFICE"]')?.click(); });
    expect(container.querySelector('.t05-school__route-status')?.textContent).toContain('刚才走过的路线：走廊 → 老师办公室');
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '老师办公室')?.click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '听听老师回忆')?.click(); });
    expect(container.querySelector('.t05-school__backdrop .t05-school__image-hotspot')).not.toBeNull();
    expect((document.activeElement as HTMLElement)?.textContent).toContain('关闭');
    await act(async () => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('听听老师回忆');
  });

  it('draws the seven exact rank values over the paper background when opened from the outdoor honor board', async () => {
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-location-id="CAMPUS_HONOR"]')?.click(); });
    await act(async () => { [...container.querySelectorAll('button')].find((button) => button.textContent === '查看历次名次')?.click(); });
    const chart = container.querySelector<HTMLElement>('.t05-school__rank-chart');
    expect(chart?.dataset.assetId).toBe('IMG_A2_SCHOOL_RANK_PAPER_001');
    expect([...chart!.querySelectorAll('.t05-school__rank-value')].map((item) => item.textContent)).toEqual(['600', '400', '300', '130', '88', '53', '20']);
    expect(chart?.getAttribute('aria-label')).toContain('600、400、300、130、88、53、20');
    expect([...container.querySelectorAll('.t05-school__ranks strong')].map((item) => item.textContent)).toEqual(['600', '400', '300', '130', '88', '53', '20']);
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

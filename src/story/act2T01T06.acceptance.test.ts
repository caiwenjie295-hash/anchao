import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { EventBus } from '../core/eventBus';
import { hydrateState } from '../core/saveManager';
import { StateManager } from '../core/stateManager';
import { BrowserApp } from '../modules/browser/BrowserApp';
import { Act2T06Controller } from './act2T06Controller';

describe('T06 browser acceptance', () => {
  let host: HTMLDivElement; let root: Root; let bus: EventBus; let manager: StateManager; let controller: Act2T06Controller;
  beforeEach(() => {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host); bus = new EventBus();
    const state = createDefaultState(); state.game.act = 2; state.game.phase = 'A2_T05';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A1_SS_FOUND: true, FLAG_A2_TRANSFER_RULE_INFERRED: true, FLAG_A2_SCHOOL_ENTERED: true, FLAG_A2_SCHOOL_SS_FOUND: true, FLAG_A2_SS_MATCH_CONFIRMED: true, FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true, FLAG_A2_SCORE_CHANGE_KNOWN: true };
    state.modules.act2Research.stage = 'school';
    state.modules.act2Research.school = { visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'], inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'], selectedEvidenceIds: ['rank-record', 'teacher-account'], selectedInferenceId: 'bounded-timeline', symbolMatchConfirmed: true, legacyCompletionMigrated: false };
    manager = new StateManager(bus, state); controller = new Act2T06Controller(manager, bus); controller.start();
    act(() => root.render(createElement(BrowserApp, { manager })));
  });
  afterEach(() => { controller.dispose(); act(() => root.unmount()); host.remove(); });
  const search = async (query: string) => {
    await act(async () => {
      const input = host.querySelector('#browser-search') as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => { host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  };
  it('opens实名 source pages directly, records bounded findings once and keeps nickname optional', async () => {
    await search('启明');
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(host.textContent).not.toContain('旧帖：那阵子我被送去一个训练中心');
    await search('启明 投诉');
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    expect(manager.getState().game.phase).toBe('A2_T06');
    const returnToReview = async () => {
      const returnButton = host.querySelector<HTMLButtonElement>('.browser-page__case-context-return');
      if (returnButton) await act(async () => returnButton.click());
      else if (host.querySelector('.browser-app[data-qiming-view="browser"]')) {
        await act(async () => (host.querySelector('.browser-qiming-toolbar button') as HTMLButtonElement).click());
      }
    };
    const openSource = async (person: '黄子山' | '钟子月', source: 'official' | 'followup') => {
      const personButton = [...host.querySelectorAll<HTMLButtonElement>('.browser-case-review__person')]
        .find((item) => item.textContent?.includes(`核对${person}`));
      if (personButton && personButton.getAttribute('aria-pressed') !== 'true') await act(async () => personButton.click());
      const button = host.querySelector<HTMLButtonElement>(`.browser-case-review__step-action[data-case-action="open-${source}"]`);
      expect(button, `${person} ${source} source action should be visible`).not.toBeNull();
      await act(async () => button!.click());
      expect(host.querySelector('.browser-page__case-path')?.textContent).toContain(`正在调查：${person}`);
      if (source === 'followup') expect(host.querySelector('.browser-page__case-context-return')?.textContent).toContain(`返回${person}材料核对`);
    };
    await openSource('黄子山', 'official');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_QIMING_FORUM_FOUND).not.toBe(true);
    await returnToReview();
    await openSource('黄子山', 'followup');
    await returnToReview();
    const huangCase = host.querySelector('.browser-case-review__case[aria-label="黄子山材料"]')!;
    await act(async () => (huangCase.querySelectorAll('label')[1] as HTMLLabelElement).click());
    await act(async () => (huangCase.querySelector('.browser-case-review__submit') as HTMLButtonElement).click());
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);
    expect(huangCase.textContent).toContain('不能据此认定因果');
    await act(async () => (huangCase.querySelectorAll('label')[0] as HTMLLabelElement).click());
    await act(async () => (huangCase.querySelector('.browser-case-review__submit') as HTMLButtonElement).click());
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang']);
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).not.toBe(true);
    await act(async () => (host.querySelector<HTMLButtonElement>('.browser-case-review__person[aria-pressed="false"]')!).click());
    await openSource('钟子月', 'followup');
    await returnToReview();
    const zhongCase = host.querySelector('.browser-case-review__case[aria-label="钟子月材料"]')!;
    await act(async () => (zhongCase.querySelectorAll('label')[0] as HTMLLabelElement).click());
    await act(async () => (zhongCase.querySelector('.browser-case-review__submit') as HTMLButtonElement).click());
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['huang', 'zhong']);
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T06_004');
    const restored = hydrateState(JSON.parse(JSON.stringify(manager.getState())));
    expect(restored.schemaVersion).toBe(13);
    expect(restored.modules.act2Research.stage).toBe('qiming');
    expect(restored.modules.act2Research.t06.reviewedCases).toHaveLength(2);
    expect(restored.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);
    await act(async () => { (host.querySelector('.browser-case-review__next button') as HTMLButtonElement).click(); });
    expect(manager.getState().modules.act2Research.stage).toBe('finale');
  });
});

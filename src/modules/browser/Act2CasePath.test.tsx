import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { BrowserApp } from './BrowserApp';
import { Act2T06Controller } from '../../story/act2T06Controller';

describe('T06 visible case path', () => {
  let host: HTMLDivElement;
  let root: Root;
  let manager: StateManager;
  let controller: Act2T06Controller;
  let originalClipboard: PropertyDescriptor | undefined;

  const click = async (target: Element | null, message = 'visible control should exist') => {
    expect(target, message).not.toBeNull();
    await act(async () => { (target as HTMLElement).click(); });
  };
  const findButton = (selector: string, text: string) => [...host.querySelectorAll<HTMLButtonElement>(selector)]
    .find((button) => button.textContent?.includes(text)) ?? null;
  const search = async (query: string) => {
    await act(async () => {
      const input = host.querySelector<HTMLInputElement>('#browser-search')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await act(async () => {
      host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T05';
    state.game.flags = {
      FLAG_A1_COMPLETE: true,
      FLAG_A1_SS_FOUND: true,
      FLAG_A2_TRANSFER_RULE_INFERRED: true,
      FLAG_A2_SCHOOL_ENTERED: true,
      FLAG_A2_SCHOOL_SS_FOUND: true,
      FLAG_A2_SS_MATCH_CONFIRMED: true,
      FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true,
      FLAG_A2_SCORE_CHANGE_KNOWN: true,
    };
    state.modules.act2Research.stage = 'school';
    state.modules.act2Research.school = {
      visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
      inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'],
      selectedEvidenceIds: ['rank-record', 'teacher-account'],
      selectedInferenceId: 'bounded-timeline',
      symbolMatchConfirmed: true,
      legacyCompletionMigrated: false,
    };
    const bus = new EventBus();
    manager = new StateManager(bus, state);
    controller = new Act2T06Controller(manager, bus);
    controller.start();
    originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('clipboard denied')) },
    });
    act(() => root.render(createElement(BrowserApp, { manager })));
  });

  afterEach(() => {
    controller.dispose();
    act(() => root.unmount());
    host.remove();
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else Reflect.deleteProperty(navigator, 'clipboard');
    vi.restoreAllMocks();
  });

  it('completes a person-specific route without clipboard or forum access and keeps the source gate', async () => {
    await search('启明 钟子月');
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    const officialResult = findButton('.browser-result', '学员黄子山、钟子月的成长记录');
    await click(officialResult, 'the official case result should be visible');
    expect(manager.getState().modules.browser.visitedPageIds).toContain('PAGE_A2_T06_004');
    expect(manager.getState().game.flags.FLAG_A2_QIMING_TESTIMONIALS_READ).toBe(true);

    await act(async () => {
      findButton('.browser-page__actions button', '复制钟子月')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(host.querySelector('.browser-page__copy-feedback--failure')?.textContent).toContain('复制不可用');
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);

    await click(findButton('.browser-page__case-entry', '调查钟子月材料'));
    expect(host.querySelector('.browser-app')?.getAttribute('data-qiming-view')).toBe('review');
    expect(host.querySelector('.browser-case-review__case[aria-label="钟子月材料"]')).not.toBeNull();
    expect(host.querySelector('.browser-case-review__choices')).toBeNull();
    expect(findButton('.browser-case-review__step-action', '钟子月后续报道')).not.toBeNull();
    expect(manager.reviewAct2QimingCase('zhong', ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'], 'public-claims-and-followup-differ')).toBe('missing-source');
    expect(manager.reviewAct2QimingCase('zhong', ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], 'public-claims-and-followup-differ')).toBe('invalid-source');
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);

    await click(findButton('.browser-qiming-toolbar button', '查看已读网页'));
    expect(host.querySelector('.browser-page__case-path[aria-label="正在调查钟子月"]')).not.toBeNull();
    await click(findButton('.browser-page__case-path-actions button', '打开钟子月后续报道'));
    expect(host.querySelector('.browser-page__case-context-return')?.textContent).toBe('返回钟子月材料核对');
    expect(host.querySelector('.browser-page__case-path')?.textContent).toContain('当前来源：钟子月后续报道');
    await click(host.querySelector('.browser-page__case-context-return'));

    const zhongCase = host.querySelector<HTMLElement>('.browser-case-review__case[aria-label="钟子月材料"]')!;
    expect(zhongCase.querySelector('.browser-case-review__choices')).not.toBeNull();
    const zhongRadios = [...zhongCase.querySelectorAll<HTMLInputElement>('.browser-case-review__choices input[type="radio"]')];
    await click(zhongRadios[1], 'the overclaim choice should be available after both sources are read');
    await click(zhongCase.querySelector('[data-case-action="record"]'));
    expect(zhongCase.querySelector('.browser-case-review__feedback--error')?.textContent).toContain('不能据此认定因果');
    expect(manager.getState().modules.act2Research.t06.reviewedCases).toEqual([]);

    await click(findButton('.browser-case-review__source-link', '回看钟子月后续报道'));
    await click(host.querySelector('.browser-page__case-context-return'));
    const returnedZhong = host.querySelector<HTMLElement>('.browser-case-review__case[aria-label="钟子月材料"]')!;
    expect([...returnedZhong.querySelectorAll<HTMLInputElement>('.browser-case-review__choices input[type="radio"]')][1].checked).toBe(true);
    await click(returnedZhong.querySelectorAll<HTMLLabelElement>('.browser-case-review__choices label')[0]);
    await click(returnedZhong.querySelector('[data-case-action="record"]'));
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['zhong']);
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).not.toBe(true);

    await click(findButton('.browser-case-review__next-person button', '继续核对黄子山'));
    const huangCase = host.querySelector<HTMLElement>('.browser-case-review__case[aria-label="黄子山材料"]')!;
    expect(findButton('.browser-case-review__step-action', '黄子山后续报道')).not.toBeNull();
    await click(findButton('.browser-case-review__step-action', '黄子山后续报道'));
    expect(host.querySelector('.browser-page__case-path')?.textContent).toContain('正在调查：黄子山');
    await click(host.querySelector('.browser-page__case-context-return'));
    const huangChoices = [...huangCase.querySelectorAll<HTMLInputElement>('.browser-case-review__choices input[type="radio"]')];
    await click(huangChoices[0]);
    await click(huangCase.querySelector('[data-case-action="record"]'));
    expect(manager.getState().modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId)).toEqual(['zhong', 'huang']);
    expect(manager.getState().game.flags.FLAG_A2_OTHER_CASES_ABNORMAL).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T06_004');
    expect(manager.getState().modules.browser.visitedPageIds).not.toContain('PAGE_A2_T06_006');
    expect(manager.getState().modules.browser.visitedPageIds).not.toContain('PAGE_A2_T06_007');
    expect(manager.getState().modules.act2Research.stage).toBe('qiming');
    expect(host.querySelector('[data-case-action="continue"]')?.textContent).toBe('与小月继续核对资料');

    await click(host.querySelector('[data-case-action="continue"]'));
    expect(manager.getState().modules.act2Research.stage).toBe('finale');
  });
});

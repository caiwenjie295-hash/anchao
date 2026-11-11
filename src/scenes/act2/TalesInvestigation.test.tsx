import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { tales } from '../../data/act2TalesData';
import { countDistinctTaleSources, TalesInvestigation } from './TalesInvestigation';

describe('TalesInvestigation', () => {
  let container: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<TalesInvestigation manager={manager} />); });
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const click = async (selector: string) => {
    const node = container.querySelector<HTMLButtonElement>(selector);
    expect(node).not.toBeNull();
    await act(async () => { node?.click(); });
  };
  const openCatalog = async () => {
    const catalog = container.querySelector<HTMLButtonElement>('.act2-library__to-catalog');
    if (catalog) await act(async () => { catalog.click(); });
  };
  const openTale = async (title: string) => {
    await openCatalog();
    const node = [...container.querySelectorAll<HTMLButtonElement>('.act2-library__toc-link, .act2-tales__record')].find((button) => button.textContent?.includes(title));
    expect(node).toBeTruthy();
    await act(async () => { node?.click(); });
  };
  const openSupport = async () => {
    const tab = container.querySelector<HTMLButtonElement>('.act2-library__support-tab');
    if (tab && container.querySelector('.act2-library__support-drawer') == null) {
      await act(async () => { tab.click(); });
    }
  };
  const selectFirstEvidence = async () => {
    await openSupport();
    await click('.act2-tales__evidence button');
  };

  const finishCurrentTaleChunks = async () => {
    for (let step = 0; step < 16; step += 1) {
      const label = container.querySelector('.act2-library__tale-cont')?.textContent ?? '';
      const match = label.match(/续 (\d+)\/(\d+)/);
      if (!match || match[1] === match[2]) return;
      const next = container.querySelector<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]');
      if (!next || next.disabled) return;
      await act(async () => { next.click(); });
    }
  };

  it('opens the 风土志 book at 卷末, with stories available as pages rather than a separate shelf', async () => {
    expect(container.querySelector('.investigation-shell--reading')).not.toBeNull();
    expect(container.querySelector('.act2-library')).not.toBeNull();
    expect(container.textContent).toContain('卷末 · 乡录残页');
    expect(container.querySelector('[data-tale-id]')).toBeNull();
    expect(container.querySelector('.act2-tales__shelf')).toBeNull();
  });

  it('routes a catalogue entry to its matching 志异 and writes the existing read flag when that page is reached', async () => {
    await openTale('石工补指');
    expect(container.querySelector('[data-tale-id="TALE_A2_T04_001"] h3')?.textContent).toBe('石工补指');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().game.flags.FLAG_A2_TALE_01_READ).toBe(true);
  });

  it('registers a tale source as soon as its page is reached and keeps noise pages inert', async () => {
    await openTale('西岭采药札记');
    expect(container.textContent).toContain('西岭采药札记');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual([]);
    expect(manager.getState().game.flags.FLAG_A2_TALE_01_READ).not.toBe(true);
    await openTale('石工补指');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().game.flags.FLAG_A2_TALE_01_READ).toBe(true);
    await openSupport();
    expect(container.textContent).toContain('现代文说明');
    await selectFirstEvidence();
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001']);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toEqual(['EVIDENCE_A2_T04_001']);
  });

  it('shows 做出判断 only after all three tales are read, then confirms the bounded inference', async () => {
    await openTale('石工补指'); await finishCurrentTaleChunks(); await selectFirstEvidence();
    await openTale('书生遗事'); await finishCurrentTaleChunks(); await selectFirstEvidence();
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(2);
    expect(container.querySelector('[data-action-id="A2_T04_OPEN_JUDGMENT"]')).toBeNull();
    expect(container.querySelector('[data-action-id="A2_T04_CONFIRM_PATTERN"]')).toBeNull();
    await openTale('哑女借声');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toHaveLength(3);
    expect(container.querySelector('[data-action-id="A2_T04_OPEN_JUDGMENT"]')).toBeNull();
    await finishCurrentTaleChunks();
    const judge = container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_OPEN_JUDGMENT"]');
    expect(judge?.textContent).toBe('做出判断');
    expect(container.querySelector('[data-action-id="A2_T04_TO_SCHOOL"]')).toBeNull();
    await act(async () => { judge?.click(); });
    const alternative = container.querySelector<HTMLButtonElement>('button[data-inference-id="recovery-or-imitation"]');
    await act(async () => { alternative?.click(); });
    await click('.act2-library__judgment-drawer [data-action-id="A2_T04_CONFIRM_PATTERN"]');
    expect(container.textContent).toContain('解释不了六儿留下的陌生姓名');
    expect(manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED).not.toBe(true);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(2);
    const bounded = container.querySelector<HTMLButtonElement>('button[data-inference-id="accompanied-change"]');
    await act(async () => { bounded?.click(); });
    await click('.act2-library__judgment-drawer [data-action-id="A2_T04_CONFIRM_PATTERN"]');
    expect(manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED).toBe(true);
    expect(container.textContent).toContain('来源和机制仍不清楚');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T04_004');
    expect(container.querySelector('[data-action-id="A2_T04_TO_SCHOOL"]')?.textContent).toBe('前往高中调查');
    expect(container.querySelector('.investigation-navigation [data-action-id="A2_T04_CONFIRM_PATTERN"]')).toBeNull();
    expect(container.querySelector('.act2-library__judgment-drawer [data-action-id="A2_T04_CONFIRM_PATTERN"]')?.textContent).toBe('暂定结论已记下');
  });

  it('counts multiple selected passages from one tale as one distinct supporting source', () => {
    const evidenceById = new Map([
      ['passage-a', { taleId: 'tale-one' }],
      ['passage-b', { taleId: 'tale-one' }],
      ['passage-c', { taleId: 'tale-two' }],
    ]);
    expect(countDistinctTaleSources(['passage-a', 'passage-b'], evidenceById)).toBe(1);
    expect(countDistinctTaleSources(['passage-a', 'passage-b', 'passage-c'], evidenceById)).toBe(2);
  });

  it('after all three are read, opens a related tale’s evidence from the judgment materials', async () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
    state.modules.act2Research.tales.readTaleIds = tales.map((tale) => tale.id);
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<TalesInvestigation manager={manager} />); });

    expect(container.querySelector('[data-action-id="A2_T04_OPEN_JUDGMENT"]')).toBeNull();
    expect(container.querySelector('[data-action-id="A2_T04_TO_SCHOOL"]')).toBeNull();
    await openTale('石工补指'); await finishCurrentTaleChunks();
    await openTale('书生遗事'); await finishCurrentTaleChunks();
    await openTale('哑女借声'); await finishCurrentTaleChunks();
    expect(container.querySelector('[data-action-id="A2_T04_OPEN_JUDGMENT"]')?.textContent).toBe('做出判断');
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_OPEN_JUDGMENT"]')?.click(); });
    const review = [...container.querySelectorAll<HTMLButtonElement>('.act2-library__text-link')].find((button) => button.textContent?.includes('回看原文'));
    expect(review).toBeTruthy();
    await act(async () => { review?.click(); });
    const openedTale = container.querySelector<HTMLElement>('[data-tale-id]');
    expect(openedTale?.getAttribute('data-tale-id')).toBe(tales[0].id);
    expect(container.querySelector('[data-evidence-id] button')).toBe(document.activeElement);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toEqual([]);

    await click('[data-evidence-id] button');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(tales.map((tale) => tale.id));
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(1);
  });

  it('collapses the judgment drawer on 回看原文 and keeps the selected option when it reopens', async () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
    state.modules.act2Research.tales.readTaleIds = tales.map((tale) => tale.id);
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<TalesInvestigation manager={manager} />); });

    await openTale('石工补指'); await finishCurrentTaleChunks();
    await openTale('书生遗事'); await finishCurrentTaleChunks();
    await openTale('哑女借声'); await finishCurrentTaleChunks();
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_OPEN_JUDGMENT"]')?.click(); });
    const option = container.querySelector<HTMLButtonElement>('button[data-inference-id="accompanied-change"]');
    await act(async () => { option?.click(); });
    expect(option?.getAttribute('aria-pressed')).toBe('true');
    const review = [...container.querySelectorAll<HTMLButtonElement>('.act2-library__text-link')].find((button) => button.textContent?.includes('回看原文'));
    await act(async () => { review?.click(); });
    expect(container.querySelector('.act2-library__judgment-drawer')).toBeNull();
    expect(manager.getState().modules.act2Research.tales.selectedInferenceId).toBe('accompanied-change');
    await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_OPEN_JUDGMENT"]')?.click(); });
    const reopened = container.querySelector<HTMLButtonElement>('button[data-inference-id="accompanied-change"]');
    expect(container.querySelector('.act2-library__judgment-drawer')).not.toBeNull();
    expect(reopened?.getAttribute('aria-pressed')).toBe('true');
    expect(manager.getState().modules.act2Research.tales.selectedInferenceId).toBe('accompanied-change');
  });

  it('keeps 哑女 spread 2 续 label and first paragraph when the judgment drawer opens', async () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
    state.modules.act2Research.tales.readTaleIds = tales.map((tale) => tale.id);
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<TalesInvestigation manager={manager} />); });

    await openTale('石工补指'); await finishCurrentTaleChunks();
    await openTale('书生遗事'); await finishCurrentTaleChunks();
    await openTale('哑女借声'); await finishCurrentTaleChunks();
    await openTale('哑女借声');
    const next = container.querySelector<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]');
    expect(next?.disabled).not.toBe(true);
    await act(async () => { next?.click(); });

    const liveLabels = () => [...container.querySelectorAll('[data-tale-id] .act2-library__tale-cont')].map((node) => node.textContent);
    const liveFirst = () => container.querySelector('[data-tale-id] .act2-library__page-text p')?.textContent ?? '';
    const labelsBefore = liveLabels();
    const firstBefore = liveFirst();
    expect(labelsBefore.some((label) => label?.includes('续 2/'))).toBe(true);
    expect(firstBefore.length).toBeGreaterThan(0);

    const judge = container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_OPEN_JUDGMENT"]');
    expect(judge).not.toBeNull();
    await act(async () => { judge?.click(); });
    expect(container.querySelector('.act2-library__judgment-drawer')).not.toBeNull();
    expect(liveLabels()).toEqual(labelsBefore);
    expect(liveFirst()).toBe(firstBefore);
  });

});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { tales } from '../../data/act2TalesData';
import { TalesInvestigation } from './TalesInvestigation';

describe('TalesInvestigation', () => {
  let container: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(async () => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.append(container); root = createRoot(container); const state = createDefaultState(); state.modules.act2Research.stage = 'tales'; manager = new StateManager(new EventBus(), state); await act(async () => { root.render(<TalesInvestigation manager={manager} />); }); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const click = async (selector: string) => { const node = container.querySelector<HTMLButtonElement>(selector); expect(node).not.toBeNull(); await act(async () => { node?.click(); }); };
  const openIndex = async () => { const detail = container.querySelector<HTMLDetailsElement>('.act2-tales__index'); if (detail && !detail.open) await act(async () => { detail.querySelector('summary')?.click(); }); };
  const openTale = async (title: string) => { await openIndex(); const node = [...container.querySelectorAll<HTMLButtonElement>('.act2-tales__record')].find((button) => button.textContent?.includes(title)); expect(node).toBeTruthy(); await act(async () => { node?.click(); }); };
  const selectFirstEvidence = async () => { await click('.act2-tales__evidence button'); };

  it('keeps the same library location and volume visible, with stories hidden until a player opens one', async () => {
    expect(container.querySelector('.investigation-shell--reading')).not.toBeNull();
    expect(container.querySelector('.act2-reading-room__archive .act2-shelf-map[data-asset-id="IMG_A2_T03_001"]')).not.toBeNull();
    expect(container.querySelector('.act2-reading-room__reader .act2-tales__idle')?.textContent).toContain('三处带书签痕迹的卷末旧录');
    expect(container.querySelector('[data-tale-id]')).toBeNull();
    expect(container.textContent).toContain('卷末三篇旧录留有书签痕迹');
    expect(container.textContent).not.toContain('不是三本独立的新档案');
    expect(container.textContent).not.toContain('照片上的区域与文字索引');
    expect(container.querySelectorAll('.act2-shelf-map__text-links [data-shelf-entry-id]')).toHaveLength(3);
  });

  it('routes a shelf text entry to its matching original and remains usable when the photograph is missing', async () => {
    await act(async () => { root.render(<TalesInvestigation manager={manager} shelfImageSrc="/missing-shelf.jpg" />); });
    const image = container.querySelector<HTMLImageElement>('.act2-shelf-map img');
    await act(async () => image?.dispatchEvent(new Event('error')));
    expect(container.querySelector('.act2-shelf-map__fallback')?.textContent).toContain('文字入口');
    const entry = container.querySelector<HTMLButtonElement>('[data-shelf-entry-id="TALE_A2_T04_001"]');
    expect(entry?.textContent).toContain('石工补指');
    await act(async () => entry?.click());
    expect(container.querySelector('[data-tale-id="TALE_A2_T04_001"] h3')?.textContent).toBe('石工补指');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
  });

  it('registers a tale source as soon as it is opened and keeps noise pages inert', async () => {
    await openIndex();
    await click('.act2-tales__record');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual([]);
    await openTale('石工补指');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().game.flags.FLAG_A2_TALE_01_READ).toBe(true);
    expect(container.textContent).toContain('现代文说明');
    await selectFirstEvidence();
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001']);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toEqual(['EVIDENCE_A2_T04_001']);
  });

  it('keeps evidence after an insufficient theory, then confirms the bounded cross-tale inference', async () => {
    await openTale('石工补指'); await selectFirstEvidence();
    await openTale('书生遗事'); await selectFirstEvidence();
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(2);
    const alternative = container.querySelector<HTMLInputElement>('button[data-inference-id="recovery-or-imitation"]');
    await act(async () => { alternative?.click(); });
    await click('[data-action-id="A2_T04_CONFIRM_PATTERN"]');
    expect(container.textContent).toContain('解释不了六儿留下的陌生姓名');
    expect(manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED).not.toBe(true);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(2);
    const bounded = container.querySelector<HTMLInputElement>('button[data-inference-id="accompanied-change"]');
    await act(async () => { bounded?.click(); });
    await click('[data-action-id="A2_T04_CONFIRM_PATTERN"]');
    expect(manager.getState().game.flags.FLAG_A2_TRANSFER_RULE_INFERRED).toBe(true);
    expect(container.textContent).toContain('来源和机制仍不清楚');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T04_004');
  });

  it('offers read, unselected stories before an unread third story and focuses that story’s evidence', async () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.modules.act2Research.tales.readTaleIds = tales.slice(0, 2).map((tale) => tale.id);
    manager = new StateManager(new EventBus(), state);
    await act(async () => { root.render(<TalesInvestigation manager={manager} />); });

    const inferenceAction = container.querySelector<HTMLButtonElement>('[data-action-id="A2_T04_CONFIRM_PATTERN"]')!;
    await act(async () => { inferenceAction.click(); });
    const materialButtons = [...container.querySelectorAll<HTMLButtonElement>('.investigation-navigation__reason .investigation-navigation__material')];
    expect(materialButtons).toHaveLength(2);
    expect(materialButtons.map((button) => button.textContent)).toEqual(tales.slice(0, 2).map((tale) => `查看相关材料：${tale.title} · 选取支持片段`));
    expect(materialButtons.map((button) => button.textContent?.includes(tales[2].title))).not.toContain(true);

    await act(async () => { materialButtons[0].click(); });
    const openedTale = container.querySelector<HTMLElement>('[data-tale-id]');
    expect(openedTale?.getAttribute('data-tale-id')).toBe(tales[0].id);
    expect(container.querySelector('[data-evidence-id] button')).toBe(document.activeElement);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toEqual([]);

    await click('[data-evidence-id] button');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(tales.slice(0, 2).map((tale) => tale.id));
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toHaveLength(1);
    const remainingMaterialButtons = container.querySelectorAll('.investigation-navigation__reason .investigation-navigation__material');
    expect(remainingMaterialButtons).toHaveLength(1);
    expect(remainingMaterialButtons[0].textContent).toContain(`${tales[1].title} · 选取支持片段`);
  });
});

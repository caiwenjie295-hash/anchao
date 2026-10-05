import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import {
  bridgeClueElder,
  bridgeEvidence,
  bridgePuzzle,
  bridgeResolution,
} from '../../data/act2BridgeData';
import { BridgeInvestigation } from './BridgeInvestigation';
import { SchoolInvestigation } from './SchoolInvestigation';

function makeSchoolManager(withReadMaterials = false): StateManager {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T04';
  state.game.flags = {
    FLAG_A1_COMPLETE: true,
    FLAG_A1_SS_FOUND: true,
    FLAG_A2_TALES_SORTED: true,
    FLAG_A2_TRANSFER_RULE_INFERRED: true,
  };
  state.modules.act2Research.stage = 'tales';
  state.modules.act2Research.tales = {
    ...state.modules.act2Research.tales,
    sorted: true,
    inferenceAcknowledged: true,
  };

  const manager = new StateManager(new EventBus(), state);
  manager.enterAct2School();

  if (withReadMaterials) {
    manager.visitAct2SchoolArea('AREA_A2_T05_TEACHER_OFFICE');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_TEACHER');
    manager.acknowledgeAct2TeacherAccount();
    manager.visitAct2SchoolArea('AREA_A2_T05_HONOR_ROLL');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_RANKS');
    manager.readAct2SchoolRanks();
    manager.visitAct2SchoolArea('AREA_A2_T05_XIAOA_CLASSROOM');
    manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_SCHOLAR_NOTE');
    manager.inspectAct2SchoolNotebook();
    manager.confirmAct2SchoolSymbolMatch();
  }
  return manager;
}

function makeBridgeManager(): StateManager {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = 'A2_T01';
  state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A2_OFFLINE_RESEARCH_NEEDED: true };
  state.modules.act2Research.stage = 'search';
  const manager = new StateManager(new EventBus(), state);
  manager.setAct2Stage('bridge');
  return manager;
}

const click = async (target: HTMLElement | null, label: string) => {
  expect(target, `${label} should exist`).not.toBeNull();
  await act(async () => { target!.click(); });
};

const clickTextButton = async (container: HTMLElement, text: string) => {
  const target = [...container.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent?.includes(text)) ?? null;
  await click(target, `button containing “${text}”`);
};

describe('Act2 spacious scene layout interactions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function stubShowModal(this: HTMLDialogElement) { this.setAttribute('open', ''); };
    }
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('opens and closes the school memory without discovering sources or advancing state', async () => {
    const manager = makeSchoolManager();
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });
    const memory = container.querySelector<HTMLDetailsElement>('details.t05-school__memory-disclosure');
    const summary = memory?.querySelector<HTMLElement>(':scope > summary') ?? null;
    expect(memory).not.toBeNull();
    expect(memory!.open).toBe(false);
    expect(container.querySelector('.investigation-shell')?.classList.contains('investigation-shell--act2-spacious')).toBe(true);

    const afterMount = manager.getState();
    await click(summary, 'school memory summary');
    expect(memory!.open).toBe(true);
    expect(manager.getState()).toBe(afterMount);
    await click(summary, 'school memory summary');
    expect(memory!.open).toBe(false);
    expect(manager.getState()).toBe(afterMount);
    expect(manager.getState().modules.act2Research.stage).toBe('school');
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual([]);
    expect(manager.getState().game.flags.FLAG_A2_LEAVE_OF_ABSENCE_KNOWN).toBeUndefined();
    expect(manager.getState().game.flags.FLAG_A2_SCORE_CHANGE_KNOWN).toBeUndefined();
  });

  it('keeps a selected school source through disclosure toggles and blocks confirmation below two sources', async () => {
    const manager = makeSchoolManager(true);
    expect(manager.getState().modules.act2Research.school.symbolMatchConfirmed).toBe(true);
    await act(async () => { root.render(<SchoolInvestigation manager={manager} />); });

    const materials = container.querySelector<HTMLDetailsElement>('details.t05-school__timeline-disclosure');
    const summary = materials?.querySelector<HTMLElement>(':scope > summary') ?? null;
    expect(materials).not.toBeNull();
    expect(materials!.open).toBe(false);
    await click(summary, 'school materials summary');
    expect(materials!.open).toBe(true);

    const teacherSource = [...container.querySelectorAll<HTMLButtonElement>('.t05-school__evidence-options button')]
      .find((button) => button.textContent?.includes('班主任的回忆')) ?? null;
    await click(teacherSource, 'teacher evidence selector');
    await clickTextButton(container, '休学后他的表现和成绩都有明显变化');
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual(['teacher-account']);

    const confirm = () => container.querySelector<HTMLButtonElement>('button[data-action-id="A2_T05_CONFIRM_TIMELINE"]');
    expect(confirm()?.getAttribute('data-action-state')).toBe('blocked');
    await click(confirm(), 'confirm timeline action');
    expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('两种不同来源');
    const relatedSource = container.querySelector<HTMLButtonElement>('.investigation-navigation__material');
    expect(relatedSource?.textContent).toContain('成绩表下方的感谢文字');
    await click(relatedSource, 'directly open the missing school source');
    expect(manager.getState().modules.act2Research.school.inspectedHotspotIds).toContain('HOTSPOT_A2_T05_QIMING_TEXT');
    expect(container.querySelector('.t05-school__dialog')).not.toBeNull();
    await click(container.querySelector<HTMLButtonElement>('.t05-school__dialog [aria-label="关闭"]'), 'close the related school source');
    expect(manager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBeUndefined();

    await click(summary, 'school materials summary');
    expect(materials!.open).toBe(false);
    await click(summary, 'school materials summary');
    expect(materials!.open).toBe(true);
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual(['teacher-account']);
    expect(summary?.textContent).toContain('1 / 2');

    const rankSource = [...container.querySelectorAll<HTMLButtonElement>('.t05-school__evidence-options button')]
      .find((button) => button.textContent?.includes('历次成绩记录')) ?? null;
    await click(rankSource, 'rank evidence selector');
    expect(manager.getState().modules.act2Research.school.selectedEvidenceIds).toEqual(['teacher-account', 'rank-record']);
    expect(confirm()?.getAttribute('data-action-state')).toBe('ready');
    await click(confirm(), 'confirm timeline action');
    expect(manager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    expect(manager.getState().modules.act2Research.stage).toBe('school');
  });

  it('preserves the bridge oral sequence from question to photo, retelling and solved name', async () => {
    const manager = makeBridgeManager();
    await act(async () => { root.render(<BridgeInvestigation manager={manager} />); });
    expect(manager.getState().modules.act2Research.stage).toBe('bridge');
    expect(container.querySelector('.investigation-shell')?.classList.contains('investigation-shell--act2-spacious')).toBe(true);
    expect(container.querySelectorAll('.act2-bridge__stage .act2-bridge__elder')).toHaveLength(4);

    await clickTextButton(container, bridgeClueElder.name);
    expect(container.querySelectorAll('button[aria-label^="出示"]')).toHaveLength(0);
    expect(container.querySelector('.act2-bridge__phrase')).toBeNull();
    await clickTextButton(container, '打听鸡公岭');
    expect(container.querySelector('.act2-bridge__phrase')).toBeNull();
    expect(container.querySelectorAll('button[aria-label^="出示"]')).toHaveLength(bridgeEvidence.length);

    await click(container.querySelector<HTMLButtonElement>(`button[aria-label="出示${bridgeEvidence[1].name}"]`), 'show bridge evidence');
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual([bridgeEvidence[1].assetId]);
    expect(manager.getState().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD).toBe(true);
    expect(container.querySelector('.act2-bridge__phrase')?.textContent).toContain('黑捕木');
    expect(container.querySelector('.act2-bridge__phrase-after')?.textContent).toContain('就叫这个');
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T02_001');

    const replay = container.querySelector<HTMLButtonElement>('.act2-bridge__replay');
    expect(replay).not.toBeNull();
    await click(replay, 'focus the heard oral phrase');
    expect(document.activeElement).toBe(container.querySelector('.act2-bridge__phrase'));
    expect(container.querySelector('.act2-bridge__replay-echo')).toBeNull();
    expect(manager.getState().modules.act2Research.bridge.heardPhrase).toBe(true);
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual([bridgeEvidence[1].assetId]);
    expect(manager.getState().modules.act2Research.stage).toBe('bridge');
    for (const part of ['first', 'middle', 'last'] as const) {
      const choice = bridgePuzzle.correct[part];
      await click(container.querySelector<HTMLInputElement>(`input[name="act2-bridge-${part}"][value="${choice}"]`), `${part} character option`);
    }
    await clickTextButton(container, bridgePuzzle.confirmLabel);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBe(true);
    expect(container.textContent).toContain(bridgeResolution.entryTitle);
    await clickTextButton(container, bridgeResolution.continueLabel);
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(manager.getState().game.phase).toBe('A2_T03');
  });
});
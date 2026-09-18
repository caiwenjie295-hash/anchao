import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../core/eventBus';
import { createDefaultState } from '../../core/defaultState';
import { StateManager } from '../../core/stateManager';
import type { AppState } from '../../core/types';
import {
  bridgeClueElder,
  bridgeElders,
  bridgeEvidence,
  bridgePuzzle,
  bridgeResolution,
  bridgeScene,
} from '../../data/act2BridgeData';
import { BridgeInvestigation } from './BridgeInvestigation';

const buildBridgeState = (): AppState => {
  const state = createDefaultState();
  state.game.phase = 'A2_T02';
  state.modules.act2Research = { ...state.modules.act2Research, stage: 'bridge' };
  return state;
};

describe('BridgeInvestigation', () => {
  let container: HTMLDivElement;
  let root: Root;
  let bus: EventBus;
  let manager: StateManager;

  const render = async (state: AppState = buildBridgeState()) => {
    localStorage.clear();
    bus = new EventBus();
    manager = new StateManager(bus, state);
    await act(async () => {
      root.render(<BridgeInvestigation manager={manager} onReturnDesktop={vi.fn()} />);
    });
  };

  const clickButton = async (text: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(text));
    expect(button, `button ${text} should exist`).toBeDefined();
    await act(async () => { button!.click(); });
    return button!;
  };

  const showEvidence = async (evidenceName: string) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === `出示${evidenceName}`);
    expect(button, `evidence ${evidenceName} should be presentable`).toBeDefined();
    await act(async () => { button!.click(); });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the neutral bridge scene without task headers and lets bystander elders chat without evidence', async () => {
    await render();

    expect(container.textContent).toContain(bridgeScene.title);
    expect(container.textContent).not.toMatch(/任务|T02|WB-0003/);

    const bystander = bridgeElders.find((elder) => !elder.isClueElder)!;
    await clickButton(bystander.name);
    expect(manager.getState().modules.act2Research.bridge.talkedElderIds).toContain(bystander.id);
    expect(container.textContent).toContain(bystander.chat[0]);

    for (const item of bridgeEvidence) {
      expect([...container.querySelectorAll('button')].some((button) => button.getAttribute('aria-label') === `出示${item.name}`)).toBe(false);
    }
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual([]);
    expect(manager.getState().modules.act2Research.bridge.heardPhrase).toBe(false);
    expect(manager.getState().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN).toBeUndefined();
  });

  it('lets the clue elder hear the oral phrase after evidence and writes flags and the note idempotently', async () => {
    await render();

    await clickButton(bridgeClueElder.name);
    await showEvidence(bridgeEvidence[1].name);
    await showEvidence(bridgeEvidence[1].name);

    const bridgeState = manager.getState().modules.act2Research.bridge;
    expect(bridgeState.heardPhrase).toBe(true);
    expect(bridgeState.shownEvidenceAssetIds).toEqual(['IMG_A1_I_002']);

    expect(manager.getState().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T02_001']);

    expect(container.textContent).toContain('黑捕木');
    const replay = container.querySelector<HTMLButtonElement>('button[data-audio-id="AUDIO_A2_T02_001"]');
    expect(replay).not.toBeNull();
    expect(replay!.textContent).toContain('重听口述');
    const live = container.querySelector<HTMLElement>('.act2-bridge__phrase');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    await act(async () => { replay!.click(); });
    expect(container.textContent).toContain('重听口述');
  });

  it('does not complete on wrong answers and locks only the middle character after three failures', async () => {
    await render();
    await clickButton(bridgeClueElder.name);
    await showEvidence(bridgeEvidence[0].name);

    const choose = async (part: string, value: string) => {
      const input = container.querySelector<HTMLInputElement>(`input[name="act2-bridge-${part}"][value="${value}"]`);
      expect(input, `radio ${part} ${value} should exist`).toBeDefined();
      await act(async () => { input!.click(); });
    };
    const confirm = async () => { await clickButton(bridgePuzzle.confirmLabel); };

    await choose('first', '嘿');
    await choose('middle', '捕');
    await choose('last', '木');
    await confirm();
    await confirm();
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBeUndefined();

    await confirm();
    expect(manager.getState().modules.act2Research.bridge.nameChoices.middle).toBe('补');
    const middleFieldset = container.querySelector<HTMLFieldSetElement>('fieldset.act2-bridge__part input[value="捕"]')!.closest('fieldset');
    expect(middleFieldset?.disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-first"]')!.closest('fieldset')!.disabled).toBe(false);
    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-last"]')!.closest('fieldset')!.disabled).toBe(false);
    expect(container.textContent).toContain(bridgePuzzle.lockedHint);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBeUndefined();
    expect(container.querySelector('button.act2-bridge__continue')).toBeNull();
  });

  it('writes the solved flag, county hint flag and note, then advances to the library stage', async () => {
    await render();
    await clickButton(bridgeClueElder.name);
    await showEvidence(bridgeEvidence[2].name);

    const solvedListener = vi.fn();
    bus.on('act2:name-solved', solvedListener);

    for (const [part, value] of [['first', '黑'], ['middle', '补'], ['last', '母']] as const) {
      const input = container.querySelector<HTMLInputElement>(`input[name="act2-bridge-${part}"][value="${value}"]`)!;
      await act(async () => { input.click(); });
    }
    await clickButton(bridgePuzzle.confirmLabel);

    expect(solvedListener).toHaveBeenCalledTimes(1);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_COUNTY_RECORD_HINT_KNOWN).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T02_001', 'NOTE_A2_T02_002']);
    expect(container.textContent).toContain(bridgeResolution.entryTitle);
    expect(container.textContent).toContain('县志');

    await clickButton(bridgeResolution.continueLabel);
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(manager.getState().game.phase).toBe('A2_T03');
  });

  it('refuses to advance before the name is solved', async () => {
    await render();
    await clickButton(bridgeClueElder.name);
    await showEvidence(bridgeEvidence[0].name);

    const stageListener = vi.fn();
    bus.on('act2:stage-changed', stageListener);

    for (const [part, value] of [['first', '嘿'], ['middle', '埔'], ['last', '墓']] as const) {
      const input = container.querySelector<HTMLInputElement>(`input[name="act2-bridge-${part}"][value="${value}"]`)!;
      await act(async () => { input.click(); });
    }
    await clickButton(bridgePuzzle.confirmLabel);

    expect(manager.getState().modules.act2Research.stage).toBe('bridge');
    expect(stageListener).not.toHaveBeenCalled();
    expect(container.querySelector('button.act2-bridge__continue')).toBeNull();
  });

  it('resumes from a reloaded state without redoing the investigation', async () => {
    const state = buildBridgeState();
    state.game.flags.FLAG_A2_ELDER_PHOTO_SHOWN = true;
    state.game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD = true;
    state.game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED = true;
    state.modules.act2Research.bridge = {
      ...state.modules.act2Research.bridge,
      shownEvidenceAssetIds: ['IMG_A1_I_001'],
      heardPhrase: true,
      nameChoices: { first: '黑', middle: '补', last: '母' },
    };
    await render(state);

    expect(container.textContent).toContain(bridgeResolution.entryTitle);
    expect(container.querySelector('form.act2-bridge__puzzle, .act2-bridge__puzzle')).toBeNull();
    await clickButton(bridgeResolution.continueLabel);
    expect(manager.getState().modules.act2Research.stage).toBe('library');
  });

  it('renders persisted name choices in the puzzle when resuming before solving', async () => {
    const state = buildBridgeState();
    state.modules.act2Research.bridge = {
      ...state.modules.act2Research.bridge,
      shownEvidenceAssetIds: ['IMG_A1_I_002'],
      heardPhrase: true,
      nameChoices: { first: '黑', middle: '捕', last: null },
    };
    await render(state);

    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-first"][value="黑"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-middle"][value="捕"]')?.checked).toBe(true);
    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-last"][value="母"]')?.checked ?? false).toBe(false);
  });

  it('renders nothing outside the bridge stage', async () => {
    const state = buildBridgeState();
    state.modules.act2Research = { ...state.modules.act2Research, stage: 'search' };
    await render(state);
    expect(container.querySelector('.act2-bridge')).toBeNull();
  });
});

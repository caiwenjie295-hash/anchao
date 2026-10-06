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
import { ACT2_BRIDGE_ELDER_TARGETS, validateBridgeElderTargets } from '../../data/act2BridgePresentation';
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
    const ask = [...container.querySelectorAll('button')].find((item) => item.textContent?.includes(bridgeScene.askMountainLabel));
    if (ask) await act(async () => { ask.click(); });
    const button = [...container.querySelectorAll('button')].find((item) => item.getAttribute('aria-label') === `出示${evidenceName}`);
    expect(button, `evidence ${evidenceName} should be presentable`).toBeDefined();
    await act(async () => { button!.click(); });
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function stubShowModal(this: HTMLDialogElement) {
        this.setAttribute('open', '');
      };
    }
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the neutral bridge scene without task headers and lets bystander elders chat without evidence', async () => {
    await render();

    expect(container.textContent).toContain(bridgeScene.title);
    expect(container.textContent).not.toMatch(/任务|T02|WB-0003/);
    expect(container.querySelectorAll('.act2-bridge__stage .act2-bridge__elder')).toHaveLength(4);

    const bystander = bridgeElders.find((elder) => !elder.isClueElder)!;
    await clickButton(bystander.name);
    expect(manager.getState().modules.act2Research.bridge.talkedElderIds).toContain(bystander.id);
    expect(container.textContent).toContain(bystander.chat[0]);
    expect(container.querySelector('.act2-bridge__portrait')).toBeNull();
    expect(container.querySelectorAll('.act2-bridge__dialogue')).toHaveLength(1);

    for (const item of bridgeEvidence) {
      expect([...container.querySelectorAll('button')].some((button) => button.getAttribute('aria-label') === `出示${item.name}`)).toBe(false);
    }
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual([]);
    expect(manager.getState().modules.act2Research.bridge.heardPhrase).toBe(false);
    expect(manager.getState().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN).toBeUndefined();
  });

  it('maps four dashed picture buttons to the inspected elder identities and keeps a text route', async () => {
    validateBridgeElderTargets();
    await render();
    const buttons = [...container.querySelectorAll<HTMLButtonElement>('.act2-bridge__stage .act2-bridge__elder')];
    expect(buttons).toHaveLength(4);
    expect(ACT2_BRIDGE_ELDER_TARGETS.map(({ elderId }) => elderId)).toEqual(bridgeElders.map(({ id }) => id));
    for (const elder of bridgeElders) {
      const button = buttons.find((item) => item.dataset.elderId === elder.id)!;
      expect(button.getAttribute('aria-label')).toContain(elder.name);
      expect(button.getAttribute('aria-label')).toContain('还没聊');
      expect(button.style.left).not.toBe('');
      await act(async () => { button.click(); });
      expect(manager.getState().modules.act2Research.bridge.talkedElderIds).toContain(elder.id);
    }
    expect(container.querySelector('.act2-bridge__elder-list[aria-label="从文字名单选择老人"]')).not.toBeNull();
    expect(container.querySelector('.act2-bridge__elder-dot')).toBeNull();
  });

  it('keeps the text route available when the scene photo fails to load', async () => {
    await render();
    const image = container.querySelector<HTMLImageElement>('.act2-bridge__scene-image')!;
    await act(async () => { image.dispatchEvent(new Event('error')); });
    expect(container.querySelector('.act2-bridge__scene-fallback')).not.toBeNull();
    expect(container.querySelectorAll('.act2-bridge__stage .act2-bridge__elder')).toHaveLength(0);
    await clickButton(bridgeElders[0].name);
    expect(manager.getState().modules.act2Research.bridge.talkedElderIds).toContain(bridgeElders[0].id);
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
    const replay = container.querySelector<HTMLButtonElement>('.act2-bridge__replay');
    expect(replay).not.toBeNull();
    expect(replay!.textContent).toContain('再看看老人原话');
    const live = container.querySelector<HTMLElement>('.act2-bridge__phrase');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    expect(document.activeElement).toBe(live);
    expect(container.querySelector<HTMLDetailsElement>('.act2-bridge__evidence')?.open).toBe(false);
    await act(async () => { replay!.click(); });
    expect(container.textContent).not.toContain('录音暂缺');
    expect(live?.textContent).toContain('黑捕木');
  });

  it('restores the clue reply, original quote and solved result from saved progress', async () => {
    const state = buildBridgeState();
    state.modules.act2Research.bridge = {
      ...state.modules.act2Research.bridge,
      heardPhrase: false,
      shownEvidenceAssetIds: [bridgeEvidence[1].assetId],
    };
    state.game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED = true;
    await render(state);

    const selectedChoice = [...container.querySelectorAll<HTMLButtonElement>('.act2-bridge__elder-list button')].find((button) => button.getAttribute('aria-pressed') === 'true')?.textContent;
    expect(selectedChoice).toContain(bridgeClueElder.name);
    expect(container.textContent).toContain(bridgeClueElder.mountainReply[0]);
    expect(container.querySelector('.act2-bridge__evidence')).not.toBeNull();
    expect(container.querySelector<HTMLDetailsElement>('.act2-bridge__evidence')?.open).toBe(false);
    expect(container.querySelector('.act2-bridge__phrase')?.textContent).toContain('黑捕木');
    expect(container.querySelector('.act2-bridge__replay')).not.toBeNull();
    expect(container.querySelector('.act2-bridge__puzzle')).toBeNull();
    expect(container.querySelector('.act2-bridge__resolution')).not.toBeNull();
    await clickButton('再看看老人原话');
    expect(document.activeElement).toBe(container.querySelector('.act2-bridge__phrase'));
  });

  it('matches each presented photo locally even after the correct response is already saved', async () => {
    const state = buildBridgeState();
    state.modules.act2Research.bridge = {
      ...state.modules.act2Research.bridge,
      heardPhrase: true,
      shownEvidenceAssetIds: [bridgeEvidence[1].assetId],
    };
    state.game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD = true;
    await render(state);

    const evidencePanel = container.querySelector<HTMLDetailsElement>('.act2-bridge__evidence')!;
    await act(async () => { evidencePanel.querySelector('summary')?.click(); });
    await showEvidence(bridgeEvidence[0].name);
    expect(container.querySelector('.act2-bridge__photo-feedback')?.textContent).toContain('没有认出这张照片');
    expect(manager.getState().modules.act2Research.bridge.heardPhrase).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD).toBe(true);

    await showEvidence(bridgeEvidence[1].name);
    expect(container.querySelector('.act2-bridge__photo-feedback')?.textContent).toContain('已经说过这处地名');
    expect(container.querySelector('.act2-bridge__photo-feedback')?.textContent).toContain('再看看老人原话');
  });

  it('never nests buttons and clicking zoom does not present evidence or trigger the oral phrase', async () => {
    await render();
    await clickButton(bridgeClueElder.name);
    await clickButton(bridgeScene.askMountainLabel);

    expect(container.querySelector('button button')).toBeNull();
    const items = [...container.querySelectorAll('li.act2-bridge__evidence-item')];
    expect(items).toHaveLength(bridgeEvidence.length);
    const thumbnail = container.querySelector<HTMLButtonElement>('button[aria-label^="放大查看"]');
    expect(thumbnail).not.toBeNull();
    const present = container.querySelector<HTMLButtonElement>(`button[aria-label="出示${bridgeEvidence[0].name}"]`);
    expect(present).not.toBeNull();
    expect(thumbnail!.parentElement).toBe(present!.parentElement);

    await act(async () => { thumbnail!.click(); });
    expect(thumbnail!.closest('dialog')?.hasAttribute('open') ?? container.querySelector('dialog[open]') !== null).toBe(true);
    expect(container.querySelector('dialog[open]')).not.toBeNull();
    expect(manager.getState().modules.act2Research.bridge.shownEvidenceAssetIds).toEqual([]);
    expect(manager.getState().modules.act2Research.bridge.heardPhrase).toBe(false);
    expect(manager.getState().game.flags.FLAG_A2_ELDER_PHOTO_SHOWN).toBeUndefined();
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_AUDIO_HEARD).toBeUndefined();
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual([]);
    expect(container.textContent).not.toContain('黑捕木');
  });

  it('keeps the confirm disabled until all three parts are chosen and empty submits never count', async () => {
    await render();
    await clickButton(bridgeClueElder.name);
    await showEvidence(bridgeEvidence[0].name);

    const confirmButton = () => container.querySelector<HTMLButtonElement>('button.act2-bridge__confirm')!;
    expect(confirmButton()).not.toBeNull();
    expect(confirmButton()!.disabled).toBe(true);

    const choose = async (part: string, value: string) => {
      const input = container.querySelector<HTMLInputElement>(`input[name="act2-bridge-${part}"][value="${value}"]`)!;
      await act(async () => { input.click(); });
    };
    const confirm = async () => { await act(async () => { confirmButton()!.click(); }); };

    await confirm();
    await confirm();
    await choose('first', '嘿');
    await confirm();
    expect(confirmButton()!.disabled).toBe(true);
    await choose('middle', '埔');
    expect(confirmButton()!.disabled).toBe(true);
    await choose('last', '墓');
    expect(confirmButton()!.disabled).toBe(false);

    await confirm();
    expect(container.querySelector('fieldset.act2-bridge__part[disabled], fieldset.act2-bridge__part input[value="捕"]')!.closest('fieldset')!.disabled).toBe(false);
    await confirm();
    expect(manager.getState().modules.act2Research.bridge.nameChoices.middle).toBe('埔');

    await confirm();
    expect(manager.getState().modules.act2Research.bridge.nameChoices.middle).toBe('补');
    expect(container.querySelector<HTMLInputElement>('input[name="act2-bridge-middle"][value="捕"]')!.closest('fieldset')!.disabled).toBe(true);
    expect(manager.getState().game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED).toBeUndefined();
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

    await clickButton(bridgeClueElder.name);
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

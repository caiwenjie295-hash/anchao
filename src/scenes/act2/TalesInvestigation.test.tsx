import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { TalesInvestigation } from './TalesInvestigation';

describe('TalesInvestigation', () => {
  let container: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(async () => { (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true; container = document.createElement('div'); document.body.append(container); root = createRoot(container); const state = createDefaultState(); state.modules.act2Research.stage = 'tales'; manager = new StateManager(new EventBus(), state); await act(async () => { root.render(<TalesInvestigation manager={manager} />); }); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const click = async (selector: string) => { const node = container.querySelector<HTMLButtonElement>(selector); expect(node).not.toBeNull(); await act(async () => { node?.click(); }); };
  const openTale = async (title: string) => { const node = [...container.querySelectorAll<HTMLButtonElement>('.act2-tales__record')].find((button) => button.textContent?.includes(title)); expect(node).toBeTruthy(); await act(async () => { node?.click(); }); };

  it('registers a tale source as soon as it is opened and keeps noise pages inert', async () => {
    await click('.act2-tales__record');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual([]);
    await openTale('石工补指');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(manager.getState().game.flags.FLAG_A2_TALE_01_READ).toBe(true);
    expect(container.textContent).toContain('现代文说明');
    await click('.act2-tales__evidence button');
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001']);
    expect(manager.getState().modules.act2Research.tales.supportingEvidenceIds).toEqual(['EVIDENCE_A2_T04_001']);
  });

  it('keeps evidence after an insufficient theory, then confirms the bounded cross-tale inference', async () => {
    await openTale('石工补指'); await click('.act2-tales__evidence button');
    await openTale('书生遗事'); await click('.act2-tales__evidence button');
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
});

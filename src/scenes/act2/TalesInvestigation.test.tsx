import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { TalesInvestigation } from './TalesInvestigation';

describe('TalesInvestigation', () => {
  let container: HTMLDivElement; let root: Root; let manager: StateManager;
  beforeEach(async () => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); const state = createDefaultState(); state.modules.act2Research.stage = 'tales'; manager = new StateManager(new EventBus(), state); await act(async () => { root.render(<TalesInvestigation manager={manager} />); }); });
  afterEach(() => { act(() => root.unmount()); container.remove(); });
  const click = async (selector: string) => { const node = container.querySelector<HTMLButtonElement>(selector); expect(node).not.toBeNull(); await act(async () => { node?.click(); }); };
  it('keeps noise inert and writes a note only after reading then collecting a tale', async () => {
    await click('.act2-tales__record');
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual([]);
    const tale = [...container.querySelectorAll<HTMLButtonElement>('.act2-tales__record')].find((node) => node.textContent?.includes('石工补指'));
    await act(async () => { tale?.click(); });
    expect(container.textContent).toContain('现代文说明');
    await click('.act2-tales__read');
    await click('.act2-tales__collect');
    await click('.act2-tales__collect');
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T04_001']);
  });
});

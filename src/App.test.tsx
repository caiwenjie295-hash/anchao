import type { ReactNode } from 'react';
import type { StateManager } from './core/stateManager';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ReaderProps = { onExit: () => void };
type MemoReader = { type: (props: ReaderProps) => ReactNode };

describe('App Act 4 reader integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.useRealTimers();
  });
  afterEach(() => {
    localStorage.clear();
    vi.doUnmock('./core/stateManager');
    vi.resetModules();
    vi.useRealTimers();
  });

  it('keeps the real Reader entry stable through App clock and desktop updates', async () => {
    let injectedManager: StateManager | undefined;
    let managerSubscriptions = 0;
    vi.doMock('./core/stateManager', async () => {
      const actual = await vi.importActual<typeof import('./core/stateManager')>('./core/stateManager');
      if (!injectedManager) {
        const { createDefaultState } = await vi.importActual<typeof import('./core/defaultState')>('./core/defaultState');
        const initial = createDefaultState();
        initial.game.act = 4;
        initial.game.phase = 'A4_T01';
        initial.modules.act4.stage = 'T01';
        initial.modules.act4.readNotebookPages = [];
        injectedManager = new actual.StateManager(undefined, initial);
        const subscribe = injectedManager.subscribe;
        injectedManager.subscribe = (listener) => {
          managerSubscriptions += 1;
          return subscribe(listener);
        };
      }
      return { ...actual, stateManager: injectedManager };
    });

    const [{ act, createElement }, { createRoot }, { default: App }, { Act4NarrativeReader }, act4Policy] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('./App'),
      import('./scenes/act4/Act4NarrativeReader'),
      import('./story/act4/narrativePolicy'),
    ]);
    const manager = injectedManager;
    expect(manager?.getState().modules.act4.stage).toBe('T01');
    const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnvironment = reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();

    const reader = Act4NarrativeReader as unknown as MemoReader;
    const originalReaderView = reader.type;
    const calculateNarrativeActions = act4Policy.act4NarrativeActionsSatisfied;
    let readerRenders = 0;
    let readerDerivedCalculations = 0;
    let insideReaderView = false;
    reader.type = (props) => {
      readerRenders += 1;
      insideReaderView = true;
      try { return originalReaderView(props); }
      finally { insideReaderView = false; }
    };
    const derivedActions = vi.spyOn(act4Policy, 'act4NarrativeActionsSatisfied').mockImplementation((stage, actions) => {
      if (insideReaderView) readerDerivedCalculations += 1;
      return calculateNarrativeActions(stage, actions);
    });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => { root.render(createElement(App)); });
      expect(host.querySelector('.a4-reader')).not.toBeNull();
      expect(managerSubscriptions).toBeGreaterThan(0);
      const initialRenders = readerRenders;
      const initialDerivedCalculations = readerDerivedCalculations;
      expect(initialRenders).toBeGreaterThan(0);
      expect(initialDerivedCalculations).toBeGreaterThan(0);

      await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
      expect(readerRenders).toBe(initialRenders);
      expect(readerDerivedCalculations).toBe(initialDerivedCalculations);

      await act(async () => { manager?.openApp('wechat'); });
      expect(readerRenders).toBe(initialRenders);
      expect(readerDerivedCalculations).toBe(initialDerivedCalculations);

      await act(async () => { manager?.readAct4NotebookPage(9); });
      expect(manager?.getState().modules.act4.readNotebookPages).toContain(9);
      expect(readerRenders).toBe(initialRenders + 1);
      expect(readerDerivedCalculations).toBe(initialDerivedCalculations + 1);
    } finally {
      await act(async () => { await vi.advanceTimersByTimeAsync(300); });
      await act(async () => { root.unmount(); });
      host.remove();
      derivedActions.mockRestore();
      reader.type = originalReaderView;
      vi.useRealTimers();
      reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });
});

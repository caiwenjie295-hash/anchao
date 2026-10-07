import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as act4Policy from '../../story/act4/narrativePolicy';
import { EventBus } from '../eventBus';
import { createDefaultState } from '../defaultState';
import { StateManager } from '../stateManager';
import type { SaveStoragePort } from '../persistence/browserStorage';
import { Act4NarrativeReader } from '../../scenes/act4/Act4NarrativeReader';

class MemoryStorage implements SaveStoragePort {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

type ReaderProps = { manager: StateManager; onExit: () => void };
type MemoReader = { type: (props: ReaderProps) => ReactNode };

describe('useAppSelector with the Act 4 reader consumer', () => {
  beforeEach(() => localStorage.clear());

  it('skips actual reader renders and derived action calculations on unrelated updates and parent rerenders', async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const initial = createDefaultState();
    initial.game.act = 4;
    initial.game.phase = 'A4_T01';
    initial.modules.act4.stage = 'T01';
    const manager = new StateManager(new EventBus(), initial, new MemoryStorage());
    const onExit = () => {};
    const reader = Act4NarrativeReader as unknown as MemoReader;
    const originalReaderView = reader.type;
    let readerRenders = 0;
    reader.type = (props) => {
      readerRenders += 1;
      return originalReaderView(props);
    };
    const derivedActions = vi.spyOn(act4Policy, 'act4NarrativeActionsSatisfied');

    const ReaderHost = ({ version }: { version: number }) => <>
      <span>{version}</span>
      <Act4NarrativeReader manager={manager} onExit={onExit} />
    </>;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => { root.render(<ReaderHost version={0} />); });
      const initialRenders = readerRenders;
      const initialDerivedCalculations = derivedActions.mock.calls.length;
      expect(initialRenders).toBeGreaterThan(0);
      expect(initialDerivedCalculations).toBeGreaterThan(0);

      await act(async () => { root.render(<ReaderHost version={1} />); });
      expect(readerRenders).toBe(initialRenders);
      expect(derivedActions).toHaveBeenCalledTimes(initialDerivedCalculations);

      await act(async () => { manager.openApp('wechat'); });
      expect(readerRenders).toBe(initialRenders);
      expect(derivedActions).toHaveBeenCalledTimes(initialDerivedCalculations);

      await act(async () => { manager.readAct4NotebookPage(1); });
      expect(readerRenders).toBe(initialRenders + 1);
      expect(derivedActions).toHaveBeenCalledTimes(initialDerivedCalculations + 1);
    } finally {
      await act(async () => { root.unmount(); });
      host.remove();
      derivedActions.mockRestore();
      reader.type = originalReaderView;
    }
  });
});

import type { ReactNode } from 'react';
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
    vi.resetModules();
    vi.useRealTimers();
  });

  it('keeps the real Reader entry stable through App clock and desktop updates', async () => {
    const { stateManager } = await import('./core/stateManager');
    const initial = stateManager.getState();
    initial.game.act = 4;
    initial.game.phase = 'A4_T01';
    initial.game.flags.FLAG_A2_COMPLETE = true;
    initial.game.flags.FLAG_A3_COMPLETE = true;
    initial.game.flags.FLAG_A3_SITE_EXITED = true;
    initial.game.flags.FLAG_A3_NOTEBOOK_FOUND = true;
    initial.game.flags.FLAG_A3_KITCHEN_EXITED = true;
    initial.modules.act3.stage = 'T07';
    initial.modules.act4.stage = 'T01';
    initial.modules.act4.readNotebookPages = [];

    const [{ act, createElement }, { createRoot }, { default: App }, { Act4NarrativeReader }, act4Policy] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('./App'),
      import('./scenes/act4/Act4NarrativeReader'),
      import('./story/act4/narrativePolicy'),
    ]);
    expect(stateManager.getState().modules.act4.stage).toBe('T01');
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
    const buttonByText = (text: string) => Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
      .find((button) => button.textContent?.trim() === text);
    const visiblePage = () => host.querySelector('.a4-reader__pager span[aria-live="polite"]')?.textContent;
    try {
      await act(async () => { root.render(createElement(App)); });
      expect(host.querySelector('.a4-reader')).not.toBeNull();
      const initialRenders = readerRenders;
      const initialDerivedCalculations = readerDerivedCalculations;
      expect(initialRenders).toBeGreaterThan(0);
      expect(initialDerivedCalculations).toBeGreaterThan(0);

      await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
      expect(readerRenders).toBe(initialRenders);
      expect(readerDerivedCalculations).toBe(initialDerivedCalculations);

      await act(async () => { stateManager.openApp('wechat'); });
      expect(stateManager.getState().desktop.activeAppId).toBe('wechat');
      expect(readerRenders).toBe(initialRenders);
      expect(readerDerivedCalculations).toBe(initialDerivedCalculations);

      const openCover = buttonByText('翻开小 A 的笔记');
      expect(openCover).toBeDefined();
      await act(async () => { openCover?.click(); });
      expect(stateManager.getState().modules.act4.readNotebookPages).toContain(1);
      const rendersAfterOpeningCover = readerRenders;
      const calculationsAfterOpeningCover = readerDerivedCalculations;
      expect(rendersAfterOpeningCover).toBe(initialRenders + 1);
      expect(calculationsAfterOpeningCover).toBe(initialDerivedCalculations + 1);
      expect(visiblePage()).toMatch(/^1\s*\//);

      const nextPage = buttonByText('下一页');
      expect(nextPage).toBeDefined();
      await act(async () => { nextPage?.click(); });
      expect(stateManager.getState().modules.act4.readNotebookPages).toContain(2);
      expect(visiblePage()).toMatch(/^2\s*\//);
      expect(readerRenders).toBe(rendersAfterOpeningCover + 1);
      expect(readerDerivedCalculations).toBe(calculationsAfterOpeningCover + 1);
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

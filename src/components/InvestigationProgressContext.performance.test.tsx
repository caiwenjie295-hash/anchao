import { act, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as progressData from '../data/investigationProgressData';
import { createDefaultState } from '../core/defaultState';
import type { AppState } from '../core/types';
import { InvestigationProgressProvider, useInvestigationProgress } from './InvestigationProgressContext';

const onOpenApp = () => {};
const onContinueInvestigation = () => {};
const onReviewAct3 = () => {};
let observedContext: ReturnType<typeof useInvestigationProgress> = null;
let consumerRenders = 0;

function ProgressConsumer() {
  consumerRenders += 1;
  observedContext = useInvestigationProgress();
  return <span>{observedContext?.progress.location}</span>;
}

const MemoProgressConsumer = memo(ProgressConsumer);

describe('InvestigationProgressProvider memoization', () => {
  beforeEach(() => {
    localStorage.clear();
    observedContext = null;
    consumerRenders = 0;
  });

  it('reuses progress and context for desktop-only changes, then updates on story changes', async () => {
    const reactActEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const previousActEnvironment = reactActEnvironment.IS_REACT_ACT_ENVIRONMENT;
    reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
    const initial = createDefaultState();
    const desktopChanged: AppState = {
      ...initial,
      desktop: { ...initial.desktop, activeAppId: 'wechat' },
    };
    const progressSpy = vi.spyOn(progressData, 'deriveInvestigationProgress');
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const renderProvider = (state: AppState) => root.render(<InvestigationProgressProvider
      state={state}
      onOpenApp={onOpenApp}
      onContinueInvestigation={onContinueInvestigation}
      onReviewAct3={onReviewAct3}
    ><MemoProgressConsumer /></InvestigationProgressProvider>);

    try {
      await act(async () => { renderProvider(initial); });
      const firstContext = observedContext;
      expect(firstContext).not.toBeNull();
      expect(progressSpy).toHaveBeenCalledTimes(1);
      expect(consumerRenders).toBe(1);

      await act(async () => { renderProvider(desktopChanged); });
      expect(progressSpy).toHaveBeenCalledTimes(1);
      expect(consumerRenders).toBe(1);
      expect(observedContext).toBe(firstContext);

      await act(async () => { renderProvider(desktopChanged); });
      expect(progressSpy).toHaveBeenCalledTimes(1);
      expect(consumerRenders).toBe(1);
      expect(observedContext).toBe(firstContext);

      const storyChanged: AppState = {
        ...desktopChanged,
        modules: {
          ...desktopChanged.modules,
          act2Research: { ...desktopChanged.modules.act2Research, stage: 'bridge' },
        },
      };
      await act(async () => { renderProvider(storyChanged); });
      expect(progressSpy).toHaveBeenCalledTimes(2);
      expect(consumerRenders).toBe(2);
      expect(observedContext).not.toBe(firstContext);
      expect(observedContext?.progress).not.toBe(firstContext?.progress);
      expect(observedContext?.progress.act).toBe(2);
    } finally {
      await act(async () => { root.unmount(); });
      host.remove();
      progressSpy.mockRestore();
      reactActEnvironment.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
    }
  });
});

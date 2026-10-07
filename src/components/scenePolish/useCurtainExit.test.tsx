import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useCurtainExit } from './useCurtainExit';
import { installMatchMediaMock } from './matchMediaMock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function CurtainHarness({ onExit }: { onExit: () => void }) {
  const { closing, beginExit } = useCurtainExit(onExit);
  return <button type="button" className={closing ? 'is-closing' : ''} onClick={() => beginExit()}>继续</button>;
}

function CompetingExitHarness({ onFirst, onSecond }: { onFirst: () => void; onSecond: () => void }) {
  const { closing, beginExit } = useCurtainExit(onFirst);
  return <div className={closing ? 'is-closing' : ''}>
    <button type="button" onClick={() => beginExit(onFirst)}>继续</button>
    <button type="button" onClick={() => beginExit(onSecond)}>回看</button>
  </div>;
}

afterEach(() => vi.useRealTimers());

describe('useCurtainExit', () => {
  it('keeps an exit action single-shot through the short fade and respects reduced motion', async () => {
    const media = installMatchMediaMock(false);
    vi.useFakeTimers();
    const onExit = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<CurtainHarness onExit={onExit} />));
      const button = host.querySelector('button')!;
      await act(async () => { button.click(); button.click(); });
      expect(button.classList.contains('is-closing')).toBe(true);
      expect(onExit).not.toHaveBeenCalled();
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(onExit).toHaveBeenCalledTimes(1);

      media.matchMedia.mockReturnValue({ matches: true } as MediaQueryList);
      const reducedOnExit = vi.fn();
      const reducedHost = document.createElement('div');
      document.body.append(reducedHost);
      const reducedRoot = createRoot(reducedHost);
      await act(async () => reducedRoot.render(<CurtainHarness onExit={reducedOnExit} />));
      await act(async () => { reducedHost.querySelector('button')?.click(); });
      expect(reducedOnExit).toHaveBeenCalledTimes(1);
      await act(async () => reducedRoot.unmount());
      reducedHost.remove();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      media.restore();
    }
  });

  it('keeps the first selected action and cancels a pending action when its curtain unmounts', async () => {
    const media = installMatchMediaMock(false);
    vi.useFakeTimers();
    const onFirst = vi.fn();
    const onSecond = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    let unmounted = false;
    try {
      await act(async () => root.render(<CompetingExitHarness onFirst={onFirst} onSecond={onSecond} />));
      const buttons = host.querySelectorAll('button');
      await act(async () => { buttons[0].click(); buttons[1].click(); });
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(onFirst).toHaveBeenCalledTimes(1);
      expect(onSecond).not.toHaveBeenCalled();

      const interrupted = vi.fn();
      await act(async () => root.render(<CurtainHarness onExit={interrupted} />));
      await act(async () => host.querySelector('button')?.click());
      await act(async () => root.unmount());
      unmounted = true;
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(interrupted).not.toHaveBeenCalled();
    } finally {
      if (!unmounted) await act(async () => root.unmount());
      host.remove();
      media.restore();
    }
  });
});

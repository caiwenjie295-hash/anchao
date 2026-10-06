import { act, useLayoutEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { useAct4ReaderSession } from './useAct4ReaderSession';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;

function SessionHarness() {
  const readerRef = useRef<HTMLElement>(null);
  const session = useAct4ReaderSession(readerRef, 'T04', (update) => update());
  useLayoutEffect(() => {
    if (session.skipPageAutoScrollRef.current) session.skipPageAutoScrollRef.current = false;
  }, [session.reviewStage]);
  return <div className="investigation-shell__scene" data-testid="scene">
    <button type="button" onClick={() => session.openReview('T03', 'index-T03')}>打开已读篇章</button>
    <button type="button" onClick={session.returnToCurrent}>返回当前阅读</button>
    <article ref={readerRef} tabIndex={-1} data-review-state={session.reviewing ? 'review' : 'current'}>
      <button type="button" data-review-trigger="index-T03">阅读已读篇章</button>
    </article>
  </div>;
}

afterEach(async () => {
  if (root) await act(async () => { root?.unmount(); });
  host?.remove();
  host = undefined;
  root = undefined;
});

describe('Act4 reader review session', () => {
  it('restores the current scroll position and returns focus to the review trigger', async () => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => { root?.render(<SessionHarness />); });
    const scene = host.querySelector<HTMLElement>('[data-testid="scene"]')!;
    const reader = host.querySelector<HTMLElement>('[data-review-state]')!;
    const trigger = host.querySelector<HTMLButtonElement>('[data-review-trigger]')!;
    scene.scrollTop = 137;

    await act(async () => { host?.querySelector<HTMLButtonElement>('button')?.click(); });
    expect(reader.getAttribute('data-review-state')).toBe('review');
    expect(scene.scrollTop).toBe(0);
    expect(document.activeElement).toBe(reader);

    await act(async () => { host?.querySelectorAll<HTMLButtonElement>('button')[1]?.click(); });
    expect(reader.getAttribute('data-review-state')).toBe('current');
    expect(scene.scrollTop).toBe(137);
    expect(document.activeElement).toBe(trigger);
  });
});

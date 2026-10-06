import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runAppSceneTransition, runSceneTransition, type TransitionDocumentLike, type TransitionEnvironment } from './sceneTransition';

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function environment(
  startViewTransition?: TransitionDocumentLike['startViewTransition'],
  { protocol = 'https:', reducedMotion = false }: { protocol?: string; reducedMotion?: boolean } = {},
) {
  const root = { dataset: {} as Record<string, string | undefined> };
  const document = { documentElement: root, ...(startViewTransition ? { startViewTransition } : {}) } satisfies TransitionDocumentLike;
  const window = { location: { protocol }, matchMedia: vi.fn(() => ({ matches: reducedMotion })) };
  const runtime = { window, document, flushSync: (callback: () => void) => callback() } satisfies TransitionEnvironment;
  return { root, runtime };
}

describe('shared scene transition service', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('commits once and clears the scope after ready and finished settle', async () => {
    let callback: (() => void) | undefined;
    const ready = deferred();
    const finished = deferred();
    const host = environment((update) => {
      callback = update;
      update();
      return { ready: ready.promise, finished: finished.promise };
    });
    const update = vi.fn();

    const completion = runSceneTransition(update, { scope: 'scene', environment: host.runtime });
    expect(host.root.dataset.sceneTransition).toBe('active');
    callback?.();
    ready.resolve();
    await Promise.resolve();
    expect(update).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.sceneTransition).toBe('active');
    finished.resolve();
    await completion;
    expect(host.root.dataset.sceneTransition).toBeUndefined();
  });

  it('uses synchronous fallback for missing document/API, file URLs, and reduced motion', async () => {
    const absentRuntime = { flushSync: (callback: () => void) => callback() } satisfies TransitionEnvironment;
    const noDocumentUpdate = vi.fn();
    await runSceneTransition(noDocumentUpdate, { scope: 'reader', environment: absentRuntime });
    expect(noDocumentUpdate).toHaveBeenCalledTimes(1);

    for (const settings of [{ protocol: 'file:' }, { reducedMotion: true }]) {
      const startViewTransition = vi.fn(() => ({ ready: Promise.resolve(), finished: Promise.resolve() }));
      const host = environment(startViewTransition, settings);
      const update = vi.fn();
      const arrival = vi.fn();
      await runSceneTransition(update, { scope: 'reader', onFallbackArrival: arrival, environment: host.runtime });
      expect(update).toHaveBeenCalledTimes(1);
      expect(startViewTransition).not.toHaveBeenCalled();
      expect(arrival).toHaveBeenCalledTimes(settings.reducedMotion ? 0 : 1);
      expect(host.root.dataset.a4ReaderTransition).toBeUndefined();
    }

    const noApi = environment();
    const noApiUpdate = vi.fn();
    const noApiArrival = vi.fn();
    await runSceneTransition(noApiUpdate, { scope: 'reader', onFallbackArrival: noApiArrival, environment: noApi.runtime });
    expect(noApiUpdate).toHaveBeenCalledTimes(1);
    expect(noApiArrival).toHaveBeenCalledTimes(1);
  });

  it('falls back exactly once after API throws synchronously', async () => {
    const apiError = new Error('view transition unavailable');
    const host = environment(() => { throw apiError; });
    const update = vi.fn();
    const arrival = vi.fn();

    await runSceneTransition(update, { scope: 'reader', onFallbackArrival: arrival, environment: host.runtime });
    expect(update).toHaveBeenCalledTimes(1);
    expect(arrival).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.a4ReaderTransition).toBeUndefined();
  });

  it('does not rerun a retained callback after the transition API throws', async () => {
    let retainedCallback: (() => void) | undefined;
    const host = environment((callback) => {
      retainedCallback = callback;
      throw new Error('API failed after retaining callback');
    });
    const update = vi.fn();
    const completion = runSceneTransition(update, { scope: 'scene', environment: host.runtime });
    expect(update).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.sceneTransition).toBeUndefined();
    retainedCallback?.();
    await completion;
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('commits immediately while retaining the reader CSS scope for the configured no-finished interval', async () => {
    vi.useFakeTimers();
    const host = environment(() => ({}));
    const update = vi.fn();
    const completion = runSceneTransition(update, { scope: 'reader', holdScopeMsWithoutFinished: 260, environment: host.runtime });
    expect(update).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.a4ReaderTransition).toBe('active');
    await vi.advanceTimersByTimeAsync(259);
    expect(host.root.dataset.a4ReaderTransition).toBe('active');
    await vi.advanceTimersByTimeAsync(1);
    await completion;
    expect(host.root.dataset.a4ReaderTransition).toBeUndefined();
  });

  it('commits once and cleans the scope when ready or finished rejects', async () => {
    const readyRejected = deferred();
    const readyHost = environment(() => ({ ready: readyRejected.promise, finished: new Promise(() => {}) }));
    const readyUpdate = vi.fn();
    const readyArrival = vi.fn();
    const readyCompletion = runSceneTransition(readyUpdate, { scope: 'reader', onFallbackArrival: readyArrival, environment: readyHost.runtime });
    readyRejected.reject(new Error('ready failed'));
    await readyCompletion;
    expect(readyUpdate).toHaveBeenCalledTimes(1);
    expect(readyArrival).toHaveBeenCalledTimes(1);
    expect(readyHost.root.dataset.a4ReaderTransition).toBeUndefined();

    const finishedRejected = deferred();
    const finishedHost = environment((update) => {
      update();
      return { ready: Promise.resolve(), finished: finishedRejected.promise };
    });
    const finishedUpdate = vi.fn();
    const finishedArrival = vi.fn();
    const finishedCompletion = runSceneTransition(finishedUpdate, { scope: 'ending', onFallbackArrival: finishedArrival, environment: finishedHost.runtime });
    finishedRejected.reject(new Error('finished failed'));
    await finishedCompletion;
    expect(finishedUpdate).toHaveBeenCalledTimes(1);
    expect(finishedArrival).toHaveBeenCalledTimes(1);
    expect(finishedHost.root.dataset.a4ReaderTransition).toBeUndefined();
  });

  it('does not swallow an action exception or run it a second time', () => {
    const failure = new Error('story action failed');
    const update = vi.fn(() => { throw failure; });
    const host = environment((callback) => {
      callback();
      return {};
    });
    const arrival = vi.fn();

    expect(() => runSceneTransition(update, { scope: 'scene', onFallbackArrival: arrival, environment: host.runtime })).toThrow(failure);
    expect(update).toHaveBeenCalledTimes(1);
    expect(arrival).not.toHaveBeenCalled();
    expect(host.root.dataset.sceneTransition).toBeUndefined();
  });

  it('rejects and cleans up when a delayed transition callback action throws', async () => {
    const finished = deferred();
    let callback: (() => void) | undefined;
    const failure = new Error('delayed story action failed');
    const host = environment((update) => {
      callback = update;
      return { finished: finished.promise };
    });
    const completion = runSceneTransition(() => { throw failure; }, { scope: 'ending', environment: host.runtime });
    expect(() => callback?.()).toThrow(failure);
    finished.resolve();
    await expect(completion).rejects.toBe(failure);
    expect(host.root.dataset.a4ReaderTransition).toBeUndefined();
  });

  it('reports rejected product transitions while preserving the rejected completion for callers', async () => {
    const ready = deferred();
    const failure = new Error('async action failed');
    const previous = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
    const startViewTransition = vi.fn(() => ({ ready: ready.promise }));
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: startViewTransition });
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    try {
      const completion = runAppSceneTransition(() => { throw failure; });
      ready.reject(new Error('transition ready failed'));
      await expect(completion).rejects.toBe(failure);
      expect(reportError).toHaveBeenCalledWith(failure);
      expect(document.documentElement.dataset.sceneTransition).toBeUndefined();
    } finally {
      if (previous) Object.defineProperty(document, 'startViewTransition', previous);
      else Reflect.deleteProperty(document, 'startViewTransition');
      vi.unstubAllGlobals();
    }
  });

  it('keeps an overlapping scope active until every transition closes', async () => {
    const finishes = [deferred(), deferred()];
    let transitionIndex = 0;
    const host = environment((callback) => {
      callback();
      return { finished: finishes[transitionIndex++].promise };
    });
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();
    const first = runSceneTransition(firstUpdate, { scope: 'scene', environment: host.runtime });
    const second = runSceneTransition(secondUpdate, { scope: 'scene', environment: host.runtime });
    expect(host.root.dataset.sceneTransition).toBe('active');

    finishes[0].resolve();
    await Promise.resolve();
    expect(host.root.dataset.sceneTransition).toBe('active');
    finishes[1].resolve();
    await Promise.all([first, second]);
    expect(firstUpdate).toHaveBeenCalledTimes(1);
    expect(secondUpdate).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.sceneTransition).toBeUndefined();
  });

  it('commits a nested action once and lets the last completion clear its dataset', async () => {
    const finishes = [deferred(), deferred()];
    let transitionIndex = 0;
    const host = environment((callback) => {
      callback();
      return { finished: finishes[transitionIndex++].promise };
    });
    const innerUpdate = vi.fn();
    let innerCompletion: Promise<void> | undefined;
    const outerUpdate = vi.fn(() => {
      innerCompletion = runSceneTransition(innerUpdate, { scope: 'scene', environment: host.runtime });
    });
    const outerCompletion = runSceneTransition(outerUpdate, { scope: 'scene', environment: host.runtime });
    expect(innerCompletion).toBeDefined();
    expect(host.root.dataset.sceneTransition).toBe('active');

    // The outer browser call invokes its callback, which starts the inner call
    // before returning. Resolve the older outer transition first.
    finishes[1].resolve();
    await outerCompletion;
    expect(host.root.dataset.sceneTransition).toBe('active');
    finishes[0].resolve();
    await innerCompletion;
    expect(outerUpdate).toHaveBeenCalledTimes(1);
    expect(innerUpdate).toHaveBeenCalledTimes(1);
    expect(host.root.dataset.sceneTransition).toBeUndefined();
  });
});

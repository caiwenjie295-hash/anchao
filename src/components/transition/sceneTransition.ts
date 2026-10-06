import { flushSync } from 'react-dom';

export type SceneTransitionScope = 'scene' | 'reader' | 'ending';

export interface ViewTransitionLike {
  ready?: PromiseLike<unknown>;
  finished?: PromiseLike<unknown>;
}

export interface TransitionDocumentLike {
  documentElement: { dataset: Record<string, string | undefined> };
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike;
}

export interface TransitionWindowLike {
  location?: { protocol: string };
  matchMedia?: (query: string) => { matches: boolean };
}

export interface TransitionEnvironment {
  window?: TransitionWindowLike;
  document?: TransitionDocumentLike;
  flushSync?: (callback: () => void) => void;
}

export interface SceneTransitionOptions {
  scope: SceneTransitionScope;
  skipIfActive?: boolean;
  onFallbackArrival?: () => void;
  /** Preserve the arrival CSS scope briefly when the browser omits `finished`. */
  holdScopeMsWithoutFinished?: number;
  environment?: TransitionEnvironment;
}

type DatasetKey = 'sceneTransition' | 'a4ReaderTransition';

const activeCounts = new WeakMap<object, Map<DatasetKey, number>>();

function datasetKey(scope: SceneTransitionScope): DatasetKey {
  return scope === 'scene' ? 'sceneTransition' : 'a4ReaderTransition';
}

function rootCounts(root: object): Map<DatasetKey, number> {
  let counts = activeCounts.get(root);
  if (!counts) {
    counts = new Map();
    activeCounts.set(root, counts);
  }
  return counts;
}

function hasActiveTransition(root: TransitionDocumentLike['documentElement']): boolean {
  const counts = rootCounts(root);
  return root.dataset.sceneTransition === 'active'
    || root.dataset.a4ReaderTransition === 'active'
    || [...counts.values()].some((count) => count > 0);
}

function acquire(root: TransitionDocumentLike['documentElement'], key: DatasetKey): () => void {
  const counts = rootCounts(root);
  counts.set(key, (counts.get(key) ?? 0) + 1);
  root.dataset[key] = 'active';
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = Math.max(0, (counts.get(key) ?? 1) - 1);
    if (remaining > 0) {
      counts.set(key, remaining);
      return;
    }
    counts.delete(key);
    delete root.dataset[key];
    if (counts.size === 0) activeCounts.delete(root);
  };
}

function defaultEnvironment(): TransitionEnvironment {
  return {
    window: typeof window === 'undefined' ? undefined : window,
    document: typeof document === 'undefined' ? undefined : document,
    flushSync,
  };
}

/** Commits a view action once, falling back to a synchronous update when view transitions fail. */
export function runSceneTransition(update: () => void, options: SceneTransitionOptions): Promise<void> {
  const environment = options.environment ?? defaultEnvironment();
  const hostWindow = environment.window;
  const hostDocument = environment.document;
  const root = hostDocument?.documentElement;
  const flush = environment.flushSync ?? flushSync;
  let reducedMotion = false;
  try {
    reducedMotion = hostWindow?.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    reducedMotion = false;
  }
  const startViewTransition = hostDocument?.startViewTransition;
  const hasRuntime = hostWindow !== undefined && root !== undefined;
  const unsupported = !hasRuntime
    || reducedMotion
    || hostWindow.location?.protocol === 'file:'
    || typeof startViewTransition !== 'function';
  const active = root ? hasActiveTransition(root) : false;
  if (unsupported || (options.skipIfActive && active)) {
    flush(update);
    if (unsupported && hasRuntime && !reducedMotion && options.onFallbackArrival) options.onFallbackArrival();
    return Promise.resolve();
  }

  const release = acquire(root!, datasetKey(options.scope));
  let attempted = false;
  let actionThrew = false;
  let actionError: unknown;
  let fallbackCalled = false;
  let settled = false;
  let resolveCompletion!: () => void;
  let rejectCompletion!: (reason: unknown) => void;
  const completion = new Promise<void>((resolve, reject) => {
    resolveCompletion = resolve;
    rejectCompletion = reject;
  });
  const cleanup = () => release();
  const settle = (error?: unknown) => {
    if (settled) return;
    settled = true;
    cleanup();
    if (error !== undefined || actionThrew) rejectCompletion(actionThrew ? actionError : error);
    else resolveCompletion();
  };
  const commitOnce = () => {
    if (attempted) return;
    attempted = true;
    try {
      flush(update);
    } catch (error) {
      actionThrew = true;
      actionError = error;
      throw error;
    }
  };
  const applyFallback = () => {
    if (actionThrew) {
      settle(actionError);
      return;
    }
    try {
      if (!attempted) commitOnce();
      if (!fallbackCalled && !reducedMotion && options.onFallbackArrival) {
        fallbackCalled = true;
        options.onFallbackArrival();
      }
      settle();
    } catch (error) {
      settle(error);
    }
  };
  const completeSuccessfully = () => {
    if (settled) return;
    if (actionThrew) {
      settle(actionError);
      return;
    }
    try {
      if (!attempted) commitOnce();
      settle();
    } catch (error) {
      settle(error);
    }
  };

  let transition: ViewTransitionLike;
  try {
    transition = startViewTransition.call(hostDocument, commitOnce);
  } catch (error) {
    cleanup();
    if (actionThrew) throw actionError;
    if (!attempted) {
      commitOnce();
      if (!reducedMotion) options.onFallbackArrival?.();
    } else if (!reducedMotion) {
      options.onFallbackArrival?.();
    }
    settle();
    return completion;
  }

  const ready = transition?.ready;
  const finished = transition?.finished;
  if (ready) {
    Promise.resolve(ready).then(() => {
      if (actionThrew) settle(actionError);
      else if (!finished) {
        const holdMs = options.holdScopeMsWithoutFinished ?? 0;
        if (holdMs > 0) {
          try {
            if (!attempted) commitOnce();
            globalThis.setTimeout(() => settle(), holdMs);
          } catch (error) { settle(error); }
        } else completeSuccessfully();
      }
      else if (!attempted) {
        try { commitOnce(); } catch { settle(actionError); }
      }
    }, () => applyFallback());
  }
  if (finished) Promise.resolve(finished).then(completeSuccessfully, () => applyFallback());
  if (!ready && !finished) {
    const complete = () => {
      try {
        if (!attempted) commitOnce();
        settle();
      } catch (error) {
        cleanup();
        rejectCompletion(error);
      }
    };
    const holdMs = options.holdScopeMsWithoutFinished ?? 0;
    if (holdMs > 0) {
      try {
        if (!attempted) commitOnce();
        globalThis.setTimeout(() => settle(), holdMs);
      } catch (error) {
        cleanup();
        rejectCompletion(error);
      }
    } else complete();
  }
  return completion;
}

/** App-level transitions retain their historical synchronous callback contract. */
function reportTransitionError(error: unknown): void {
  const reportError = (globalThis as typeof globalThis & { reportError?: (reason: unknown) => void }).reportError;
  if (reportError) reportError(error);
  else globalThis.setTimeout(() => { throw error; }, 0);
}

function observeCompletion(completion: Promise<void>): Promise<void> {
  void completion.catch(reportTransitionError);
  return completion;
}

export function runAppSceneTransition(update: () => void): Promise<void> {
  return observeCompletion(runSceneTransition(update, { scope: 'scene' }));
}

/** Reader and ending transitions share one counter and the reader's no-API arrival cue. */
export function runAct4ViewTransition(update: () => void): Promise<void> {
  return observeCompletion(runSceneTransition(update, {
    scope: 'reader',
    skipIfActive: true,
    onFallbackArrival: animateAct4Arrival,
    holdScopeMsWithoutFinished: 260,
  }));
}

/** Ending exits use the same reader scope as navigation inside the reader. */
export function runAct4EndingTransition(update: () => void): Promise<void> {
  return observeCompletion(runSceneTransition(update, { scope: 'ending', skipIfActive: true, holdScopeMsWithoutFinished: 260 }));
}

function animateAct4Arrival(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const reader = document.querySelector<HTMLElement>('.a4-reader');
  if (!reader) return;
  window.requestAnimationFrame(() => {
    reader.classList.remove('a4-reader--transition-arrival');
    void reader.offsetWidth;
    reader.classList.add('a4-reader--transition-arrival');
    window.setTimeout(() => reader.classList.remove('a4-reader--transition-arrival'), 260);
  });
}

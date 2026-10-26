import type { StateManager } from '../../core/stateManager';

export interface BrowserSearchRequest {
  query: string;
}

type RequestListener = (request: BrowserSearchRequest) => void;

const pendingByManager = new WeakMap<StateManager, BrowserSearchRequest>();
const listenersByManager = new WeakMap<StateManager, Set<RequestListener>>();

/** Queues one explicitly requested search until the browser window can consume it. */
export function requestBrowserSearch(manager: StateManager, query: string): void {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return;
  const request = { query: normalizedQuery };
  const listeners = listenersByManager.get(manager);
  const listener = listeners?.values().next().value as RequestListener | undefined;
  if (listener) {
    listener(request);
    return;
  }
  pendingByManager.set(manager, request);
}

/** The first mounted browser consumes a queued request once; history is never replayed. */
export function subscribeToBrowserSearchRequest(manager: StateManager, listener: RequestListener): () => void {
  const listeners = listenersByManager.get(manager) ?? new Set<RequestListener>();
  listenersByManager.set(manager, listeners);
  listeners.add(listener);
  const pending = pendingByManager.get(manager);
  if (pending) {
    pendingByManager.delete(manager);
    listener(pending);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) listenersByManager.delete(manager);
  };
}

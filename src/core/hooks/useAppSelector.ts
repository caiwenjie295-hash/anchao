import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { AppState } from '../types';
import type { EqualityFn, StateSelector } from '../store/selectors';

export interface StateSnapshotStore {
  getState(): AppState;
  subscribe(listener: () => void): () => void;
}

interface SelectionCache<Selected> {
  state: AppState;
  selector: StateSelector<Selected>;
  equality: EqualityFn<Selected>;
  selected: Selected;
}

/** Subscribes React to the selected immutable slice, retaining equal snapshot references. */
export function useAppSelector<Selected>(
  store: StateSnapshotStore,
  selector: StateSelector<Selected>,
  equality: EqualityFn<Selected> = Object.is,
): Selected {
  const selectorRef = useRef(selector);
  const equalityRef = useRef(equality);
  const cacheRef = useRef<SelectionCache<Selected> | null>(null);
  selectorRef.current = selector;
  equalityRef.current = equality;

  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => {
    const state = store.getState();
    const currentSelector = selectorRef.current;
    const currentEquality = equalityRef.current;
    const cached = cacheRef.current;
    if (cached && cached.state === state && cached.selector === currentSelector && cached.equality === currentEquality) return cached.selected;
    const selected = currentSelector(state);
    if (cached && cached.selector === currentSelector && currentEquality(cached.selected, selected)) {
      cacheRef.current = { state, selector: currentSelector, equality: currentEquality, selected: cached.selected };
      return cached.selected;
    }
    cacheRef.current = { state, selector: currentSelector, equality: currentEquality, selected };
    return selected;
  }, [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

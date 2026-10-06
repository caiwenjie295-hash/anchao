import type { AnchaoEventMap, AppState } from '../types';

export type DomainEvent = {
  [K in keyof AnchaoEventMap]: { type: K; payload: AnchaoEventMap[K] }
}[keyof AnchaoEventMap];

export type SavePolicy = 'immediate' | 'deferred';

export interface DomainTransition<Result = void> {
  readonly state: AppState;
  readonly commit: boolean;
  readonly savePolicy?: SavePolicy;
  readonly events: readonly DomainEvent[];
  readonly result: Result;
}

export function noDomainChange<Result = void>(state: AppState, result?: Result, events: readonly DomainEvent[] = []): DomainTransition<Result> {
  return { state, commit: false, events, result: result as Result };
}

export function domainChange<Result = void>(
  state: AppState,
  nextState: AppState,
  events: readonly DomainEvent[] = [],
  result?: Result,
  savePolicy?: SavePolicy,
): DomainTransition<Result> {
  return { state: nextState, commit: nextState !== state, ...(savePolicy === undefined ? {} : { savePolicy }), events, result: result as Result };
}

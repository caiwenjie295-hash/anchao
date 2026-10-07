import type { AppState } from '../types';
import type { DomainTransition } from './transitions';

export type DomainStep = (current: AppState) => DomainTransition;

export interface DomainPlan<Result = void> {
  readonly steps: readonly DomainStep[];
  readonly result: Result;
}

export function domainPlan<Result = void>(steps: readonly DomainStep[] = [], result?: Result): DomainPlan<Result> {
  return { steps, result: result as Result };
}

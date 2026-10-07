import type { StateManager } from '../../../core/stateManager';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';

export function advanceReaderStage(manager: StateManager, expectedStage: ActiveAct4NarrativeStage, transition: (update: () => void) => unknown): void {
  if (expectedStage === 'T10') manager.advanceAct4NarrativeSection(expectedStage);
  else transition(() => manager.advanceAct4NarrativeSection(expectedStage));
}

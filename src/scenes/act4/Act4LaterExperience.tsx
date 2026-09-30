import { Act4NarrativeReader } from './Act4NarrativeReader';
import { stateManager, type StateManager } from '../../core/stateManager';

/** Compatibility entry point; all Act4 stages use the same reading contract. */
export function Act4LaterExperience({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  return <Act4NarrativeReader manager={manager} onExit={onExit} />;
}

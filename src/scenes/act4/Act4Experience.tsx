import { useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { Act4NarrativeReader } from './Act4NarrativeReader';

export function Act4Experience({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  if (state.modules.act4.stage === 'inactive') return null;
  return <Act4NarrativeReader manager={manager} onExit={onExit} />;
}

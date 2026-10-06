import { stateManager, type StateManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { selectAct4 } from '../../core/store/selectors';
import { Act4NarrativeReader } from './Act4NarrativeReader';

export function Act4Experience({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const state = useAppSelector(manager, selectAct4);
  if (state.stage === 'inactive') return null;
  return <Act4NarrativeReader manager={manager} onExit={onExit} />;
}

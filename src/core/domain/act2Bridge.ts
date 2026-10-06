import { bridgeFlagIds, bridgeNoteIds, bridgeResolution } from '../../data/act2BridgeData';
import type { AppState } from '../types';
import { addNotepadAutoEntry, setFlag } from './applications';
import { domainPlan, type DomainPlan, type DomainStep } from './plans';
import { noDomainChange } from './transitions';

const ensureFlag = (flagId: string): DomainStep => (state) => state.game.flags[flagId] === true
  ? noDomainChange(state)
  : setFlag(state, flagId, true);

const ensureNote = (entryId: string): DomainStep => (state) => state.modules.notepad.autoEntryIds.includes(entryId)
  ? noDomainChange(state)
  : addNotepadAutoEntry(state, entryId);

/** Reconciles legacy bridge progress through the same semantic writes as the original stage effects. */
export function reconcileAct2BridgeProgress(state: AppState): DomainPlan {
  const steps: DomainStep[] = [];
  if (state.modules.act2Research.bridge.heardPhrase) {
    steps.push(
      ensureFlag(bridgeFlagIds.evidenceShown),
      ensureFlag(bridgeFlagIds.audioHeard),
      ensureNote(bridgeNoteIds.phraseHeard),
    );
  }
  if (state.game.flags.FLAG_A2_HEIBUMU_NAME_SOLVED === true) {
    steps.push(ensureFlag(bridgeResolution.flagId), ensureNote(bridgeResolution.noteId));
  }
  return domainPlan(steps);
}

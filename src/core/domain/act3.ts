import { act3FirstLensId, act3LensById, act3RequiredClueIds, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_GATE_FLAG, ACT3_STAGE_NEXT } from '../../data/act3Data';
import type { AppState, GamePhase } from '../types';
import { getAct3RouteAvailability } from '../../story/investigation/act3RoutePolicy';
import { addNotepadAutoEntry, setFlag } from './applications';
import { domainChange, noDomainChange, type DomainTransition } from './transitions';
import { domainPlan, type DomainPlan } from './plans';

export const ACT3_ENTRY_FLAG = 'FLAG_A2_COMPLETE';

export function startAct3(state: AppState): DomainTransition {
  if (state.game.flags[ACT3_ENTRY_FLAG] !== true || state.modules.act3.stage !== 'inactive') return noDomainChange(state);
  return domainChange(state, {
    ...state,
    game: { ...state.game, act: 3, phase: 'A3_T00' },
    modules: { ...state.modules, act3: { ...state.modules.act3, stage: 'T00' } },
  }, [{ type: 'act3:started', payload: { act: 3 } }, { type: 'phase:changed', payload: { phase: 'A3_T00' } }]);
}

export function enterAct3Lens(state: AppState, lensId: string): DomainTransition<boolean> {
  const id = lensId.trim();
  const stage = state.modules.act3.stage;
  if (stage === 'inactive' || !id || !act3LensById(stage, id)) return noDomainChange(state, false);
  if (getAct3RouteAvailability(stage, state.modules.act3.currentLensId, id, state.modules.act3.inspectedClueIds).state !== 'ready') return noDomainChange(state, false);
  const visitedLensIds = state.modules.act3.visitedLensIds.includes(id) ? state.modules.act3.visitedLensIds : [...state.modules.act3.visitedLensIds, id];
  return domainChange(state, { ...state, modules: { ...state.modules, act3: { ...state.modules.act3, currentLensId: id, visitedLensIds } } }, [{ type: 'act3:lens-entered', payload: { lensId: id } }], true);
}

export function inspectAct3Clue(state: AppState, clueId: string): DomainPlan {
  const id = clueId.trim();
  const stage = state.modules.act3.stage;
  const currentId = state.modules.act3.currentLensId;
  if (stage === 'inactive' || !id || !currentId) return domainPlan();
  const lens = act3LensById(stage, currentId);
  if (!lens || !lens.hotspots.some((hotspot) => hotspot.clueId === id) || state.modules.act3.inspectedClueIds.includes(id)) return domainPlan();
  const confirmedFlag = stage === 'T05' && id === 'CLUE_A3_T05_13ACK_PAPER' ? 'FLAG_A3_13ACK_PAPER_FOUND'
    : stage === 'T06' && id === 'CLUE_A3_T06_TEMPLE_COMPARE' ? 'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED'
      : stage === 'T07' && id === 'CLUE_A3_T07_NOTEBOOK_PICKUP' ? 'FLAG_A3_NOTEBOOK_FOUND' : null;
  const noteId = stage === 'T05' && id === 'CLUE_A3_T05_13ACK_PAPER' ? 'NOTE_A3_T05_001'
    : stage === 'T06' && id === 'CLUE_A3_T06_TEMPLE_COMPARE' ? 'NOTE_A3_T06_001'
      : stage === 'T07' && id === 'CLUE_A3_T07_FIRST_PAGE' ? 'NOTE_A3_T07_001' : null;
  return domainPlan([
    (current) => domainChange(current, { ...current, modules: { ...current.modules, act3: { ...current.modules.act3, inspectedClueIds: [...current.modules.act3.inspectedClueIds, id] } } }, [{ type: 'act3:clue-inspected', payload: { clueId: id } }]),
    ...(confirmedFlag ? [(current: AppState) => setFlag(current, confirmedFlag, true)] : []),
    ...(noteId ? [(current: AppState) => addNotepadAutoEntry(current, noteId)] : []),
  ]);
}

export function confirmAct3Stage(state: AppState): DomainPlan {
  const stage = state.modules.act3.stage;
  if (stage === 'inactive' || stage === 'T07') return domainPlan();
  const required = act3RequiredClueIds(stage);
  const id = ACT3_STAGE_COMPLETION_FLAG[stage];
  if (!required.length || !required.every((clueId) => state.modules.act3.inspectedClueIds.includes(clueId)) || state.modules.act3.confirmedFlagIds.includes(id)) return domainPlan();
  const confirmedFlagIds = [...new Set([...state.modules.act3.confirmedFlagIds, id])];
  return domainPlan([
    (current) => domainChange(current, {
      ...current,
      game: { ...current.game, flags: { ...current.game.flags, [id]: true } },
      modules: { ...current.modules, act3: { ...current.modules.act3, confirmedFlagIds } },
    }, [{ type: 'act3:stage-confirmed', payload: { flagId: id } }]),
    ...(stage === 'T03' ? [(current: AppState) => addNotepadAutoEntry(current, 'NOTE_A3_T03_001')] : []),
    ...(stage === 'T04' ? [(current: AppState) => addNotepadAutoEntry(current, 'NOTE_A3_T04_001')] : []),
  ]);
}

export function advanceAct3Stage(state: AppState): DomainTransition {
  const stage = state.modules.act3.stage;
  if (stage === 'inactive') return noDomainChange(state);
  const nextStage = ACT3_STAGE_NEXT[stage];
  const completionId = ACT3_STAGE_COMPLETION_FLAG[stage];
  if (stage === 'T07' || !nextStage || state.game.flags[completionId] !== true || !state.modules.act3.confirmedFlagIds.includes(completionId)) return noDomainChange(state);
  const nextLensId = act3FirstLensId(nextStage);
  const gateId = ACT3_STAGE_GATE_FLAG[stage];
  const phase = `A3_${nextStage}` as GamePhase;
  return domainChange(state, {
    ...state,
    game: { ...state.game, flags: { ...state.game.flags, [gateId]: true }, phase },
    modules: { ...state.modules, act3: { ...state.modules.act3, stage: nextStage, currentLensId: nextLensId, visitedLensIds: state.modules.act3.visitedLensIds.includes(nextLensId) ? state.modules.act3.visitedLensIds : [...state.modules.act3.visitedLensIds, nextLensId] } },
  }, [{ type: 'act3:stage-changed', payload: { stage: nextStage } }, { type: 'phase:changed', payload: { phase } }]);
}

export function leaveAct3Stage(state: AppState): DomainTransition {
  if (state.modules.act3.stage !== 'T07' || state.game.flags.FLAG_A3_SITE_EXITED === true
    || !act3RequiredClueIds('T07').every((clueId) => state.modules.act3.inspectedClueIds.includes(clueId))) return noDomainChange(state);
  const completionId = ACT3_STAGE_COMPLETION_FLAG.T07;
  const gateId = ACT3_STAGE_GATE_FLAG.T07;
  return domainChange(state, {
    ...state,
    game: { ...state.game, flags: { ...state.game.flags, [completionId]: true, [gateId]: true } },
    modules: { ...state.modules, act3: { ...state.modules.act3, confirmedFlagIds: [...new Set([...state.modules.act3.confirmedFlagIds, completionId])] } },
  }, [{ type: 'act3:stage-confirmed', payload: { flagId: completionId } }]);
}

export function startAct4(state: AppState): DomainTransition {
  if (state.game.flags.FLAG_A3_COMPLETE !== true || state.game.flags.FLAG_A3_SITE_EXITED !== true
    || state.modules.act3.stage !== 'T07' || state.modules.act4.stage !== 'inactive') return noDomainChange(state);
  return domainChange(state, { ...state, game: { ...state.game, act: 4, phase: 'A4_T01' }, modules: { ...state.modules, act4: { ...state.modules.act4, stage: 'T01' } } });
}

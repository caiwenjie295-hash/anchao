import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { getPendingStoryTransition, storyTransitions, validateStoryTransitions } from './storyTransitionData';

describe('story transitions', () => {
  it('validates every authored card and starts a new game with the prologue', () => {
    expect(validateStoryTransitions()).toBeUndefined();
    expect(storyTransitions).toHaveLength(15);
    expect(getPendingStoryTransition(createDefaultState())?.id).toBe('TRANSITION_A1_INTRO');
  });

  it('waits until the mother has actually revealed Xiao A is missing', () => {
    const state = createDefaultState();
    state.game.phase = 'B';
    expect(getPendingStoryTransition(state)).toBeNull();
    state.game.flags.FLAG_A1_XIAOA_MISSING_KNOWN = true;
    expect(getPendingStoryTransition(state)?.id).toBe('TRANSITION_A1_B');
  });

  it('shows the return card only after the mountain trip ends', () => {
    const state = createDefaultState();
    state.game.phase = 'I';
    state.modules.storyTransitions.seenIds.push('TRANSITION_A1_I');
    state.modules.scene.journeyStarted = true;
    state.modules.scene.currentSceneId = 'SCENE_A1_I_001';
    state.modules.scene.capturedPhotoIds = ['IMG_A1_H_003', 'IMG_A1_I_004'];
    expect(getPendingStoryTransition(state)).toBeNull();
    state.modules.scene.journeyStarted = false;
    state.modules.scene.currentSceneId = null;
    expect(getPendingStoryTransition(state)?.id).toBe('TRANSITION_A1_RETURN');
  });

  it('keeps T06 within the already discovered school evidence', () => {
    const card = storyTransitions.find((item) => item.id === 'TRANSITION_A2_T06');
    expect(card?.paragraphs.join('')).toMatch(/休学.*成绩.*启明.*双 S/);
    expect(card?.paragraphs.join('')).not.toMatch(/破庙|影像|真相/);
  });
});

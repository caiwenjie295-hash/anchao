import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stateManager } from '../../core/stateManager';
import { act1Scenes } from '../../data/sceneData';
import { Act1SceneExperience } from './Act1SceneExperience';

describe('Act1SceneExperience transitions', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    stateManager.resetProgress();
    stateManager.setPhase('F');
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    stateManager.resetProgress();
  });

  it('runs the provided transition callback once for departure and scene advance', async () => {
    const runTransition = vi.fn((action: () => void) => action());
    const startJourney = vi.spyOn(stateManager, 'startJourney');
    await act(async () => { root.render(<Act1SceneExperience state={stateManager.getState()} onSceneTransition={runTransition} />); });
    expect(container.textContent).toContain('前往鸡公岭');
    await act(async () => { container.querySelector<HTMLButtonElement>('.journey-transition button:not(.investigation-progress-trigger)')?.click(); });

    expect(runTransition).toHaveBeenCalledTimes(1);
    expect(startJourney).toHaveBeenCalledTimes(1);
    expect(stateManager.getState().modules.scene.currentSceneId).toBe(act1Scenes[0].id);

    for (const flagId of act1Scenes[0].requiredFlagIds) stateManager.setFlag(flagId, true);
    await act(async () => { root.render(<Act1SceneExperience state={stateManager.getState()} onSceneTransition={runTransition} />); });
    await act(async () => { container.querySelector<HTMLButtonElement>('.scene-continue')?.click(); });

    expect(runTransition).toHaveBeenCalledTimes(2);
    expect(stateManager.getState().modules.scene.currentSceneId).toBe(act1Scenes[0].nextSceneId);
  });

  it('executes the original action directly when no transition callback is supplied', async () => {
    await act(async () => { root.render(<Act1SceneExperience state={stateManager.getState()} />); });
    await act(async () => { container.querySelector<HTMLButtonElement>('.journey-transition button:not(.investigation-progress-trigger)')?.click(); });
    expect(stateManager.getState().modules.scene.journeyStarted).toBe(true);
    expect(stateManager.getState().modules.scene.currentSceneId).toBe(act1Scenes[0].id);
  });

  it('lets the player return to the still-readable materials without starting the journey', async () => {
    const onCancel = vi.fn();
    const startJourney = vi.spyOn(stateManager, 'startJourney');
    await act(async () => { root.render(<Act1SceneExperience state={stateManager.getState()} onCancelJourneyIntro={onCancel} />); });
    const cancel = [...container.querySelectorAll<HTMLButtonElement>('.journey-transition button')].find((button) => button.textContent?.includes('暂不出发'));
    expect(cancel).not.toBeNull();
    await act(async () => { cancel!.click(); });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(startJourney).not.toHaveBeenCalled();
    expect(stateManager.getState().game.phase).toBe('F');
    expect(stateManager.getState().modules.scene.journeyStarted).toBe(false);
  });
});

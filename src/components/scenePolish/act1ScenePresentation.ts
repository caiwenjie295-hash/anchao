/** A dismissed field scene is a local presentation choice; it never changes story state. */
export function shouldRenderAct1Scene(
  sceneReached: boolean,
  currentSceneId: string | null,
  dismissedSceneId: string | null,
): boolean {
  return sceneReached && !(dismissedSceneId !== null && currentSceneId === dismissedSceneId);
}

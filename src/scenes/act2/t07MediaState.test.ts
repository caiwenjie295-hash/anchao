import { describe, expect, it } from 'vitest';
import { createT07MediaResource, isT07MediaLoaded, shouldPauseT07Playback, updateT07MediaState } from './t07MediaState';

describe('T07 media request identity', () => {
  it('changes identity and request URL for every retry while preserving the registered asset source', () => {
    const first = createT07MediaResource('IMG_A2_T07_005', '/assets/temple.webp');
    const retry = createT07MediaResource('IMG_A2_T07_005', '/assets/temple.webp', 1);
    const secondRetry = createT07MediaResource('IMG_A2_T07_005', '/assets/temple.webp', 2);

    expect(first.requestSource).toBe('/assets/temple.webp');
    expect(retry.source).toBe(first.source);
    expect(retry.requestSource).toBe('/assets/temple.webp?t07-retry=1');
    expect(secondRetry.requestSource).toBe('/assets/temple.webp?t07-retry=2');
    expect(new Set([first.resourceKey, retry.resourceKey, secondRetry.resourceKey]).size).toBe(3);
  });

  it('ignores callbacks from a previous frame and pauses until the current image is loaded', () => {
    const oldFrame = createT07MediaResource('IMG_A2_T07_TRAIL_WALK_001', '/assets/trail.webp');
    const currentFrame = createT07MediaResource('IMG_A2_T07_005', '/assets/temple.webp');
    const loading = updateT07MediaState(null, currentFrame.resourceKey, currentFrame.resourceKey, 'loading');
    const staleSuccess = updateT07MediaState(loading, currentFrame.resourceKey, oldFrame.resourceKey, 'loaded');

    expect(staleSuccess).toEqual(loading);
    expect(isT07MediaLoaded(staleSuccess, currentFrame.resourceKey)).toBe(false);
    expect(shouldPauseT07Playback(staleSuccess, currentFrame.resourceKey)).toBe(true);

    const loaded = updateT07MediaState(staleSuccess, currentFrame.resourceKey, currentFrame.resourceKey, 'loaded');
    expect(isT07MediaLoaded(loaded, currentFrame.resourceKey)).toBe(true);
    expect(shouldPauseT07Playback(loaded, currentFrame.resourceKey)).toBe(false);
    expect(shouldPauseT07Playback(loaded, createT07MediaResource('IMG_A2_T07_005', currentFrame.source, 1).resourceKey)).toBe(true);
  });
});

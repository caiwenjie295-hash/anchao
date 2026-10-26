export type T07MediaStatus = 'loading' | 'loaded' | 'failed';

export interface T07MediaState {
  resourceKey: string;
  status: T07MediaStatus;
}

export interface T07MediaResource {
  assetId: string;
  source: string;
  retryToken: number;
  resourceKey: string;
  requestSource: string;
}

export function createT07MediaResource(assetId: string, source: string | undefined, retryToken = 0): T07MediaResource {
  const stableSource = source ?? '';
  const requestSource = stableSource && retryToken > 0
    ? `${stableSource}${stableSource.includes('?') ? '&' : '?'}t07-retry=${retryToken}`
    : stableSource;
  return {
    assetId,
    source: stableSource,
    retryToken,
    resourceKey: `${assetId}\u0000${stableSource}\u0000${retryToken}`,
    requestSource,
  };
}

export function updateT07MediaState(
  previous: T07MediaState | null,
  activeResourceKey: string,
  eventResourceKey: string,
  status: T07MediaStatus,
): T07MediaState | null {
  if (!activeResourceKey || eventResourceKey !== activeResourceKey) return previous;
  return { resourceKey: eventResourceKey, status };
}

export function isT07MediaLoaded(state: T07MediaState | null, activeResourceKey: string): boolean {
  return Boolean(activeResourceKey && state?.resourceKey === activeResourceKey && state.status === 'loaded');
}

export function shouldPauseT07Playback(state: T07MediaState | null, activeResourceKey: string): boolean {
  return !isT07MediaLoaded(state, activeResourceKey);
}

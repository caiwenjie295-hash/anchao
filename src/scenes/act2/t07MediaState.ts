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

function appendRetryIdentity(source: string, retryToken: number): string {
  if (retryToken <= 0) return source;
  // data:, blob: and file: URLs cannot safely take an HTTP query parameter.
  // Their React key/resource key still changes, so a retry remounts the image.
  const usesHttp = /^https?:\/\//i.test(source);
  const isRelative = !/^[a-z][a-z\d+.-]*:/i.test(source);
  if (!usesHttp && !isRelative) return source;
  const hashIndex = source.indexOf('#');
  const pathAndQuery = hashIndex < 0 ? source : source.slice(0, hashIndex);
  const hash = hashIndex < 0 ? '' : source.slice(hashIndex);
  const separator = pathAndQuery.includes('?') ? '&' : '?';
  return `${pathAndQuery}${separator}t07-retry=${retryToken}${hash}`;
}

export function createT07MediaResource(assetId: string, source: string | undefined, retryToken = 0): T07MediaResource {
  const stableSource = source ?? '';
  return {
    assetId,
    source: stableSource,
    retryToken,
    resourceKey: `${assetId}\u0000${stableSource}\u0000${retryToken}`,
    requestSource: appendRetryIdentity(stableSource, retryToken),
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

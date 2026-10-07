import { vi } from 'vitest';

export function installMatchMediaMock(initialMatches = false) {
  const descriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const matchMedia = vi.fn().mockReturnValue({ matches: initialMatches } as MediaQueryList);
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: matchMedia });
  return {
    matchMedia,
    restore() {
      if (descriptor) Object.defineProperty(window, 'matchMedia', descriptor);
      else delete (window as unknown as { matchMedia?: unknown }).matchMedia;
    },
  };
}

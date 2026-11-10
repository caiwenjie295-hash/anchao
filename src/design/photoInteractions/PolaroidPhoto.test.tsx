import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PolaroidPhoto } from './PolaroidPhoto';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
type MediaState = { matches: boolean; listeners: Set<(event: MediaQueryListEvent) => void> };

describe('PolaroidPhoto', () => {
  let container: HTMLDivElement;
  let root: Root;
  let mediaStates: Map<string, MediaState>;
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let requestFrame: ReturnType<typeof vi.fn>;
  let cancelFrame: ReturnType<typeof vi.fn>;
  let frameId: number;
  let matchMediaDescriptor: PropertyDescriptor | undefined;
  let requestFrameDescriptor: PropertyDescriptor | undefined;
  let cancelFrameDescriptor: PropertyDescriptor | undefined;

  const render = (options: { finePointer?: boolean; reducedMotion?: boolean; matchMedia?: boolean } = {}) => {
    const finePointer = options.finePointer ?? true;
    const reducedMotion = options.reducedMotion ?? false;
    mediaStates = new Map([
      [FINE_POINTER_QUERY, { matches: finePointer, listeners: new Set() }],
      [REDUCED_MOTION_QUERY, { matches: reducedMotion, listeners: new Set() }],
    ]);
    if (options.matchMedia === false) {
      Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    } else {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        value: (query: string) => {
          const state = mediaStates.get(query);
          return {
            media: query,
            get matches() { return state?.matches ?? false; },
            onchange: null,
            addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => state?.listeners.add(listener),
            removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => state?.listeners.delete(listener),
            addListener: (listener: (event: MediaQueryListEvent) => void) => state?.listeners.add(listener),
            removeListener: (listener: (event: MediaQueryListEvent) => void) => state?.listeners.delete(listener),
            dispatchEvent: () => true,
          } as MediaQueryList;
        },
      });
    }
    act(() => root.render(<PolaroidPhoto caption="实物细节"><img src="detail.webp" alt="现场纸片近景" /></PolaroidPhoto>));
    return container.querySelector<HTMLElement>('.polaroid-photo')!;
  };

  const move = (card: HTMLElement, x: number, y: number, pointerType = 'mouse') => {
    const event = new Event('pointermove', { bubbles: true });
    Object.defineProperties(event, {
      clientX: { value: x },
      clientY: { value: y },
      pointerType: { value: pointerType },
    });
    act(() => card.dispatchEvent(event));
  };

  const flushAnimationFrame = () => {
    const entry = [...rafCallbacks.entries()][0];
    if (!entry) return;
    const [id, callback] = entry;
    rafCallbacks.delete(id);
    act(() => callback(16));
  };

  const changeMedia = (query: string, matches: boolean) => {
    const state = mediaStates.get(query)!;
    state.matches = matches;
    const event = new Event('change') as MediaQueryListEvent;
    for (const listener of state.listeners) listener(event);
  };

  beforeEach(() => {
    matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');
    requestFrameDescriptor = Object.getOwnPropertyDescriptor(window, 'requestAnimationFrame');
    cancelFrameDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelAnimationFrame');
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    rafCallbacks = new Map();
    frameId = 0;
    requestFrame = vi.fn((callback: FrameRequestCallback) => {
      const nextId = ++frameId;
      rafCallbacks.set(nextId, callback);
      return nextId;
    });
    cancelFrame = vi.fn((id: number) => rafCallbacks.delete(id));
    Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, writable: true, value: requestFrame });
    Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, writable: true, value: cancelFrame });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (!this.classList.contains('polaroid-photo')) return { width: 0, height: 0 } as DOMRect;
      return { left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200 } as DOMRect;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    for (const [key, descriptor] of [
      ['matchMedia', matchMediaDescriptor],
      ['requestAnimationFrame', requestFrameDescriptor],
      ['cancelAnimationFrame', cancelFrameDescriptor],
    ] as const) {
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else Reflect.deleteProperty(window, key);
    }
  });

  it('tilts the paper by at most three degrees from the card frame and resets on leave', () => {
    const card = render();
    expect(card.querySelector('img')?.getAttribute('alt')).toBe('现场纸片近景');
    expect(card.querySelector('figcaption')?.textContent).toBe('实物细节');
    move(card, 900, -50);
    flushAnimationFrame();
    expect(card.style.getPropertyValue('--polaroid-tilt-x')).toBe('3.00deg');
    expect(card.style.getPropertyValue('--polaroid-tilt-y')).toBe('3.00deg');
    expect(card.dataset.pointerActive).toBe('true');

    act(() => card.dispatchEvent(new Event('pointerleave')));
    expect(card.dataset.pointerActive).toBe('false');
    expect(card.style.getPropertyValue('--polaroid-tilt-x')).toBe('');
    expect(card.style.getPropertyValue('--polaroid-tilt-y')).toBe('');
  });

  it('keeps touch, coarse-pointer, and reduced-motion cards still', () => {
    const card = render({ finePointer: false });
    expect(card.dataset.followPointer).toBe('false');
    move(card, 300, 150);
    move(card, 300, 150, 'touch');
    expect(requestFrame).not.toHaveBeenCalled();

    changeMedia(FINE_POINTER_QUERY, true);
    changeMedia(REDUCED_MOTION_QUERY, true);
    expect(card.dataset.followPointer).toBe('false');
    expect(card.dataset.pointerActive).toBe('false');
  });

  it('cancels pending motion when reduced-motion preference changes or the card unmounts', () => {
    const card = render();
    move(card, 300, 150);
    expect(rafCallbacks.size).toBe(1);
    changeMedia(REDUCED_MOTION_QUERY, true);
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(0);
    move(card, 400, 150);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it('leaves a still paper card when matchMedia is unavailable', () => {
    const card = render({ matchMedia: false });
    expect(card.dataset.followPointer).toBe('false');
    move(card, 300, 150);
    expect(requestFrame).not.toHaveBeenCalled();
  });
});

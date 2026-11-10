import { act, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvestigationSpotlight } from './InvestigationSpotlight';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
type MediaState = { matches: boolean; listeners: Set<(event: MediaQueryListEvent) => void> };

describe('InvestigationSpotlight', () => {
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

  function render(options: { finePointer?: boolean; reducedMotion?: boolean; matchMedia?: boolean } = {}) {
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

    function Harness() {
      const frameRef = useRef<HTMLDivElement>(null);
      return <div ref={frameRef} className="test-photo-frame"><InvestigationSpotlight frameRef={frameRef} /></div>;
    }

    act(() => root.render(<Harness />));
    return container.querySelector<HTMLDivElement>('.test-photo-frame')!;
  }

  const move = (frame: HTMLElement, x: number, y: number, pointerType = 'mouse') => {
    const event = new Event('pointermove', { bubbles: true });
    Object.defineProperties(event, {
      clientX: { value: x },
      clientY: { value: y },
      pointerType: { value: pointerType },
    });
    act(() => frame.dispatchEvent(event));
  };

  const changeMedia = (query: string, matches: boolean) => {
    const state = mediaStates.get(query)!;
    state.matches = matches;
    const event = new Event('change') as MediaQueryListEvent;
    for (const listener of state.listeners) listener(event);
  };

  const flushAnimationFrame = () => {
    const [id, callback] = [...rafCallbacks.entries()][0];
    if (id === undefined || !callback) return;
    rafCallbacks.delete(id);
    act(() => callback(16));
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
      if (!this.classList.contains('test-photo-frame')) return { width: 0, height: 0 } as DOMRect;
      return { left: 100, top: 50, right: 500, bottom: 250, width: 400, height: 200 } as DOMRect;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    vi.useRealTimers();
    for (const [key, descriptor] of [
      ['matchMedia', matchMediaDescriptor],
      ['requestAnimationFrame', requestFrameDescriptor],
      ['cancelAnimationFrame', cancelFrameDescriptor],
    ] as const) {
      if (descriptor) Object.defineProperty(window, key, descriptor);
      else Reflect.deleteProperty(window, key);
    }
  });

  it('coalesces pointer motion to one animation frame and positions the light in frame coordinates', () => {
    const frame = render();
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    expect(layer.dataset.followPointer).toBe('true');

    move(frame, 200, 100);
    move(frame, 400, 150);
    expect(requestFrame).toHaveBeenCalledTimes(1);
    const [id, callback] = [...rafCallbacks.entries()][0];
    rafCallbacks.delete(id);
    act(() => callback(16));

    expect(layer.style.getPropertyValue('--spotlight-x')).toBe('75%');
    expect(layer.style.getPropertyValue('--spotlight-y')).toBe('50%');
    expect(layer.dataset.pointerActive).toBe('true');
    expect(layer.dataset.hintDismissed).toBe('false');
    expect(rafCallbacks.size).toBe(0);

    act(() => frame.dispatchEvent(new Event('pointerleave')));
    expect(layer.dataset.pointerActive).toBe('false');
    expect(layer.style.getPropertyValue('--spotlight-x')).toBe('');
  });

  it('keeps the hint static for touch, coarse pointers, and reduced motion', () => {
    const frame = render({ finePointer: false });
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    expect(layer.textContent).toContain('滑动鼠标调查，点击高亮点查看');
    expect(layer.dataset.followPointer).toBe('false');
    move(frame, 300, 150);
    move(frame, 300, 150, 'touch');
    expect(requestFrame).not.toHaveBeenCalled();
    expect(layer.dataset.hintDismissed).toBe('false');
  });

  it('turns off an active spotlight when reduced motion is enabled and cancels queued work', () => {
    const frame = render();
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    move(frame, 300, 150);
    expect(rafCallbacks.size).toBe(1);

    changeMedia(REDUCED_MOTION_QUERY, true);
    expect(layer.dataset.followPointer).toBe('false');
    expect(layer.dataset.pointerActive).toBe('false');
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(0);
    move(frame, 350, 160);
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it('cleans up a pending animation frame, timers, media listeners, and host listeners on unmount', () => {
    const frame = render();
    move(frame, 300, 150);
    expect(rafCallbacks.size).toBe(1);
    expect(mediaStates.get(FINE_POINTER_QUERY)?.listeners.size).toBe(1);
    act(() => root.unmount());
    expect(cancelFrame).toHaveBeenCalledTimes(1);
    expect(rafCallbacks.size).toBe(0);
    expect(mediaStates.get(FINE_POINTER_QUERY)?.listeners.size).toBe(0);
    expect(mediaStates.get(REDUCED_MOTION_QUERY)?.listeners.size).toBe(0);
    root = createRoot(container);
  });

  it('dismisses the mouse guide once without repeatedly scheduling timers on later movement', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const frame = render();
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    const timerSpy = vi.spyOn(window, 'setTimeout');
    move(frame, 300, 150);
    flushAnimationFrame();
    expect(timerSpy).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1900);
    expect(layer.dataset.hintDismissed).toBe('true');

    move(frame, 320, 150);
    flushAnimationFrame();
    expect(timerSpy).toHaveBeenCalledTimes(1);
  });

  it('uses a timeout fallback when requestAnimationFrame is unavailable', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const frame = render();
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    Object.defineProperty(window, 'requestAnimationFrame', { configurable: true, value: undefined });
    Object.defineProperty(window, 'cancelAnimationFrame', { configurable: true, value: undefined });
    move(frame, 300, 150);
    expect(requestFrame).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(16));
    expect(layer.style.getPropertyValue('--spotlight-x')).toBe('50%');
    expect(layer.style.getPropertyValue('--spotlight-y')).toBe('50%');
  });

  it('falls back safely when matchMedia is unavailable', () => {
    const frame = render({ matchMedia: false });
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight')!;
    expect(layer.dataset.followPointer).toBe('false');
    move(frame, 300, 150);
    expect(requestFrame).not.toHaveBeenCalled();
  });
});

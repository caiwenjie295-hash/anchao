import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoViewport, type PhotoMarker } from './PhotoViewport';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NATURAL = { width: 1920, height: 1080 };
const FRAME = { width: 800, height: 600, left: 100, top: 80 };
const PLANE = { width: 800, height: 450, left: 100, top: 155 };

type SpotlightOp = {
  type: string;
  op?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  r?: number;
  fillStyle?: string;
};

type StubContext = CanvasRenderingContext2D & { ops: SpotlightOp[] };

const stubMatchMedia = (reducedMotion: boolean) => {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
    matches: reducedMotion && String(query).includes('prefers-reduced-motion: reduce'),
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
};

const rect = (left: number, top: number, width: number, height: number) => ({
  width, height, left, top, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}),
}) as DOMRect;

const createStubContext = (canvas: HTMLCanvasElement): StubContext => {
  const ops: SpotlightOp[] = [];
  let arc: { x: number; y: number; r: number } | undefined;
  const ctx = {
    canvas,
    ops,
    fillStyle: '',
    globalCompositeOperation: 'source-over',
    setTransform() {},
    beginPath() {},
    arc(x: number, y: number, r: number) { arc = { x, y, r }; },
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
      const gradient = {
        x0, y0, r0, x1, y1, r1,
        stops: [] as { offset: number; color: string }[],
        addColorStop(offset: number, color: string) { this.stops.push({ offset, color }); },
      };
      return gradient;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      ops.push({ type: 'fillRect', x, y, w, h, fillStyle: String(this.fillStyle), op: this.globalCompositeOperation });
    },
    clearRect(x: number, y: number, w: number, h: number) {
      ops.push({ type: 'clearRect', x, y, w, h });
    },
    fill() {
      const gradient = this.fillStyle as { x0?: number; y0?: number; r1?: number };
      ops.push({
        type: 'fill',
        op: this.globalCompositeOperation,
        x: gradient?.x0 ?? arc?.x,
        y: gradient?.y0 ?? arc?.y,
        r: gradient?.r1 ?? arc?.r,
        fillStyle: String(this.fillStyle),
      });
    },
    drawImage() { ops.push({ type: 'drawImage' }); },
  };
  return ctx as unknown as StubContext;
};

describe('PhotoViewport pointer spotlight', () => {
  let host: HTMLDivElement;
  let root: Root;
  const onActivate = vi.fn();
  const hotspot: PhotoMarker = { id: 'SPOT', label: '聚光热点', x: 0.5, y: 0.5, onActivate };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    onActivate.mockClear();
    stubMatchMedia(false);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('photo-viewport__frame')) return rect(FRAME.left, FRAME.top, FRAME.width, FRAME.height);
      if (this.classList.contains('photo-viewport__plane') || this.classList.contains('photo-viewport__spotlight')) {
        return rect(PLANE.left, PLANE.top, PLANE.width, PLANE.height);
      }
      return rect(0, 0, 0, 0);
    });
    Object.defineProperty(Element.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type !== '2d') return originalGetContext.call(this, type, ...args as []);
      const holder = this as HTMLCanvasElement & { __spotlightCtx?: StubContext };
      if (!holder.__spotlightCtx) holder.__spotlightCtx = createStubContext(this);
      return holder.__spotlightCtx;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const render = async (options: { pointerSpotlight?: boolean; loadImage?: boolean; sceneKey?: string; imageUrl?: string } = {}) => {
    const { pointerSpotlight, loadImage = true, sceneKey = 'spotlight', imageUrl = 'spotlight.jpg' } = options;
    await act(async () => {
      root.render(<PhotoViewport sceneKey={sceneKey} imageUrl={imageUrl} imageAlt="调查照片" hotspots={[hotspot]} routes={[]} pointerSpotlight={pointerSpotlight} />);
    });
    const image = host.querySelector<HTMLImageElement>('.photo-viewport__plane > img');
    if (!loadImage || !image) return;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: NATURAL.width });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: NATURAL.height });
    await act(async () => { image.dispatchEvent(new Event('load')); });
  };

  const spotlight = () => host.querySelector<HTMLCanvasElement>('.photo-viewport__spotlight');
  const glowSpot = () => host.querySelector<HTMLElement>('[data-glow-id="SPOT"]');
  const frame = () => host.querySelector<HTMLElement>('.photo-viewport__frame')!;
  const context = () => (spotlight() as HTMLCanvasElement & { __spotlightCtx?: StubContext } | null)?.__spotlightCtx;
  const holes = () => (context()?.ops ?? []).filter((op) => op.type === 'fill' && op.op === 'destination-out');
  const covers = () => (context()?.ops ?? []).filter((op) => op.type === 'fillRect' && String(op.fillStyle).includes('52%'));
  const firePointer = async (target: Element, type: string, clientX: number, clientY: number) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, { pointerId: { value: 1 }, clientX: { value: clientX }, clientY: { value: clientY } });
    await act(async () => { target.dispatchEvent(event); });
  };
  const intensity = () => Number.parseFloat(glowSpot()?.style.getPropertyValue('--spotlight-glow-intensity') || '0');

  it('does not mount a spotlight unless the opt-in prop is on', async () => {
    await render();
    expect(spotlight()).toBeNull();
    expect(host.querySelector('.photo-viewport__spotlight-glow')).toBeNull();
    expect(host.querySelector('.photo-viewport')?.classList.contains('photo-viewport--spotlight')).toBe(false);
  });

  it('mounts a covering non-interactive mask after the image loads when the opt-in is on', async () => {
    await render({ pointerSpotlight: true, loadImage: false });
    expect(spotlight()).toBeNull();
    expect(host.querySelector('.photo-viewport')?.classList.contains('photo-viewport--spotlight')).toBe(true);

    await render({ pointerSpotlight: true });
    const mask = spotlight();
    expect(mask).not.toBeNull();
    expect(mask?.tagName).toBe('CANVAS');
    expect(mask?.getAttribute('aria-hidden')).toBe('true');
    expect(mask?.style.pointerEvents || getComputedStyle(mask!).pointerEvents).toBe('none');
    expect(mask?.style.opacity === '' || mask?.style.opacity === '1').toBe(true);
    expect(getComputedStyle(mask!).opacity === '' || Number(getComputedStyle(mask!).opacity) > 0).toBe(true);
    expect(covers().length).toBeGreaterThan(0);
    expect(holes()).toHaveLength(0);
    expect(host.querySelector('.photo-viewport__spotlight-glow')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('erases persistent holes on pointer moves and keeps them after leave', async () => {
    await render({ pointerSpotlight: true });
    const mask = spotlight()!;
    await firePointer(frame(), 'pointermove', 300, 200);
    const first = holes();
    expect(first.some((hole) => hole.x === 200 && hole.y === 45)).toBe(true);

    await firePointer(frame(), 'pointermove', 450, 300);
    const second = holes();
    expect(second.length).toBeGreaterThan(first.length);
    expect(second.some((hole) => hole.x === 350 && hole.y === 145)).toBe(true);

    const coverCount = covers().length;
    const holeCount = second.length;
    await firePointer(frame(), 'pointerleave', 450, 300);
    expect(spotlight()).toBe(mask);
    expect(mask.isConnected).toBe(true);
    expect(covers()).toHaveLength(coverCount);
    expect(holes()).toHaveLength(holeCount);
  });

  it('resets the erase buffer when the photo resource changes', async () => {
    await render({ pointerSpotlight: true });
    await firePointer(frame(), 'pointermove', 300, 200);
    expect(holes().length).toBeGreaterThan(0);

    await render({ pointerSpotlight: true, sceneKey: 'spotlight-next', imageUrl: 'spotlight-next.jpg' });
    expect(holes()).toHaveLength(0);
    expect(covers().length).toBeGreaterThan(0);
  });

  it('raises the gold glow as the pointer approaches a hotspot and clears glow, not holes, on leave', async () => {
    await render({ pointerSpotlight: true });
    await firePointer(frame(), 'pointermove', 300, 200);
    expect(intensity()).toBeCloseTo(0);
    const holeCount = holes().length;
    expect(holeCount).toBeGreaterThan(0);

    await firePointer(frame(), 'pointermove', 500, 380);
    expect(intensity()).toBeCloseTo(1);
    await firePointer(frame(), 'pointermove', 500, 280);
    expect(intensity()).toBeCloseTo(0.5);

    const holesAfterApproach = holes().length;
    await firePointer(frame(), 'pointerleave', 500, 280);
    expect(intensity()).toBeCloseTo(0);
    expect(holes()).toHaveLength(holesAfterApproach);
    expect(holesAfterApproach).toBeGreaterThan(holeCount);
  });

  it('lets a hotspot click through the mask', async () => {
    await render({ pointerSpotlight: true });
    expect(spotlight()).not.toBeNull();
    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="SPOT"]')!;
    await act(async () => { marker.click(); });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('does not erase or follow glow when reduced motion is preferred', async () => {
    stubMatchMedia(true);
    await render({ pointerSpotlight: true });
    const mask = spotlight()!;
    expect(mask.dataset.reduced).toBe('true');
    expect(host.querySelector('.photo-viewport__spotlight-glow')?.getAttribute('data-reduced')).toBe('true');
    await firePointer(frame(), 'pointermove', 500, 380);
    expect(holes()).toHaveLength(0);
    expect(intensity()).toBeCloseTo(0);
  });
});

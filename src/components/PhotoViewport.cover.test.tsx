import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatePhotoFitScale, calculatePhotoPanLimits, PhotoViewport, type PhotoMarker } from './PhotoViewport';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NATURAL = { width: 1920, height: 1080 };
const FRAME = { width: 800, height: 600 };

describe('PhotoViewport cover mode', () => {
  let host: HTMLDivElement;
  let root: Root;
  const onActivate = vi.fn();
  const hotspot: PhotoMarker = { id: 'EDGE', label: '边缘热点', x: 0.02, y: 0.02, presentation: 'focus-box', onActivate };

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    onActivate.mockClear();
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const frame = this.classList.contains('photo-viewport__frame');
      const width = frame ? FRAME.width : 0;
      const height = frame ? FRAME.height : 0;
      const left = frame ? 100 : 0;
      const top = frame ? 80 : 0;
      return { width, height, left, top, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
    });
    Object.defineProperty(Element.prototype, 'setPointerCapture', { configurable: true, value: vi.fn() });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  const render = async (sceneKey = 'wide', fit?: 'contain' | 'cover') => {
    await act(async () => { root.render(<PhotoViewport sceneKey={sceneKey} imageUrl={`${sceneKey}.jpg`} imageAlt="测试照片" hotspots={[hotspot]} routes={[]} {...(fit ? { fit } : {})} />); });
    const image = host.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: NATURAL.width });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: NATURAL.height });
    await act(async () => { image.dispatchEvent(new Event('load')); });
  };

  const plane = () => host.querySelector<HTMLElement>('.photo-viewport__plane')!;
  const world = () => host.querySelector<HTMLElement>('.photo-viewport__world')!;
  const firePointer = async (target: Element, type: string, pointerId: number, clientX: number, clientY: number) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, { pointerId: { value: pointerId }, clientX: { value: clientX }, clientY: { value: clientY } });
    await act(async () => { target.dispatchEvent(event); });
  };

  it('keeps contain as the default and uses one proportional scale for cover and pan bounds', async () => {
    await render();
    expect(plane().style.width).toBe('800px');
    expect(plane().style.height).toBe('450px');
    expect(calculatePhotoPanLimits(800, 450, FRAME.width, FRAME.height, 1)).toEqual({ x: 0, y: 0 });

    await render('cover', 'cover');
    const width = parseFloat(plane().style.width);
    const height = parseFloat(plane().style.height);
    expect(calculatePhotoFitScale('cover', NATURAL.width, NATURAL.height, FRAME.width, FRAME.height)).toBeCloseTo(5 / 9);
    expect(width).toBeCloseTo(1066.67, 1);
    expect(height).toBe(600);
    expect(width / height).toBeCloseTo(NATURAL.width / NATURAL.height);
    expect(calculatePhotoPanLimits(width, height, FRAME.width, FRAME.height, 1)).toMatchObject({ x: expect.closeTo(133.33, 1), y: 0 });
    expect(calculatePhotoPanLimits(width, height, FRAME.width, FRAME.height, 1.5)).toMatchObject({ x: expect.closeTo(400, 1), y: expect.closeTo(150, 1) });
  });

  it('offers the full original image and returns to cover without changing aspect ratio', async () => {
    await render('cover', 'cover');
    const fullImage = host.querySelector<HTMLButtonElement>('button[aria-pressed]')!;
    expect(fullImage.textContent).toBe('全图查看');
    await act(async () => { fullImage.click(); });
    expect(fullImage.textContent).toBe('铺满画面');
    expect(plane().style.width).toBe('800px');
    expect(plane().style.height).toBe('450px');
    await act(async () => { fullImage.click(); });
    expect(parseFloat(plane().style.width)).toBeCloseTo(1066.67, 1);
    expect(parseFloat(plane().style.height)).toBe(600);
  });

  it('keeps the photo unobstructed until an explicit control is used and isolates controls from wheel zoom', async () => {
    await render('cover', 'cover');
    expect(host.querySelector('.photo-viewport__zoom-guidance')).toBeNull();
    expect(host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')?.textContent).toBe('放大');

    await act(async () => { host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    expect(host.querySelector('.photo-viewport__controls span')?.textContent).toBe('125%');

    const control = document.createElement('div');
    control.dataset.photoControl = 'true';
    host.querySelector('.photo-viewport__frame')!.append(control);
    await act(async () => { control.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 })); });
    expect(host.querySelector('.photo-viewport__controls span')?.textContent).toBe('125%');
    await act(async () => { host.querySelector('.photo-viewport__frame')!.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 })); });
    expect(host.querySelector('.photo-viewport__controls span')?.textContent).toBe('145%');

    await render('cover-next', 'cover');
    expect(host.querySelector('.photo-viewport__zoom-guidance')).toBeNull();
  });

  it('pans in both axes after zoom, supports keyboard movement, and focuses an edge hotspot without observing it', async () => {
    await render('cover', 'cover');
    const frame = host.querySelector<HTMLElement>('.photo-viewport__frame')!;
    await act(async () => { host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    await firePointer(frame, 'pointerdown', 1, 200, 200);
    await firePointer(frame, 'pointermove', 1, 160, 150);
    await firePointer(frame, 'pointerup', 1, 160, 150);
    expect(world().style.transform).toBe('translate(-40px, -50px) scale(1.25)');

    frame.focus();
    await act(async () => { frame.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(world().style.transform).toBe('translate(-85px, -50px) scale(1.25)');

    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="EDGE"]')!;
    marker.focus();
    expect(onActivate).not.toHaveBeenCalled();
    await act(async () => { marker.click(); });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

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
  const regionHotspot: PhotoMarker = {
    id: 'REGION', label: '区域线索', x: 0.5, y: 0.5, presentation: 'focus-box',
    region: { width: 0.2, height: 0.1 }, onActivate,
  };

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

  const render = async (sceneKey = 'wide', fit?: 'contain' | 'cover', options: { quietHotspotLabels?: boolean; compactMobileControls?: boolean } = {}, markers: PhotoMarker[] = [hotspot]) => {
    await act(async () => { root.render(<PhotoViewport sceneKey={sceneKey} imageUrl={`${sceneKey}.jpg`} imageAlt="测试照片" hotspots={markers} routes={[]} {...(fit ? { fit } : {})} {...options} />); });
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

  it('keeps quiet hotspot names aligned across the marker, title and screen-reader label while preserving one-tap activation', async () => {
    await render('quiet-labels', 'cover', { quietHotspotLabels: true });
    const viewport = host.querySelector('.photo-viewport')!;
    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="EDGE"]')!;
    expect(viewport.classList.contains('photo-viewport--quiet-hotspot-labels')).toBe(true);
    expect(marker.getAttribute('aria-label')).toBe('边缘热点');
    expect(marker.title).toBe('边缘热点');
    expect(marker.querySelector('.photo-viewport__marker-label')?.textContent).toBe('边缘热点');
    marker.focus();
    expect(onActivate).not.toHaveBeenCalled();
    await act(async () => { marker.click(); });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('scales photo-normalized regions with the image while keeping the screen hit area and label size stable', async () => {
    await render('region-layout', 'cover', {}, [regionHotspot, hotspot]);
    const region = host.querySelector<HTMLButtonElement>('[data-clue-id="REGION"]')!;
    const ordinary = host.querySelector<HTMLButtonElement>('[data-clue-id="EDGE"]')!;
    expect(region.dataset.region).toBe('true');
    expect(region.style.getPropertyValue('--marker-region-width')).toBe('20%');
    expect(region.style.getPropertyValue('--marker-region-height')).toBe('10%');
    expect(region.style.getPropertyValue('--marker-scale')).toBe('1');
    expect(region.style.getPropertyValue('--marker-hit-size')).toBe('44px');
    expect(region.style.getPropertyValue('--marker-label-scale')).toBe('1');
    expect(ordinary.dataset.region).toBeUndefined();
    expect(ordinary.style.getPropertyValue('--marker-scale')).toBe('1');

    await act(async () => { host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    expect(region.style.getPropertyValue('--marker-scale')).toBe('1');
    expect(region.style.getPropertyValue('--marker-hit-size')).toBe('35.2px');
    expect(region.style.getPropertyValue('--marker-label-scale')).toBe('0.8');
    expect(ordinary.style.getPropertyValue('--marker-scale')).toBe('0.8');
  });

  it('pans from a large region after a drag while a tap still activates the clue', async () => {
    await render('region-drag', 'cover', {}, [regionHotspot]);
    await act(async () => { host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    await act(async () => { host.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="REGION"]')!;
    await firePointer(marker, 'pointerdown', 11, 300, 300);
    await firePointer(marker, 'pointermove', 11, 330, 325);
    await firePointer(marker, 'pointerup', 11, 330, 325);
    expect(world().style.transform).toBe('translate(30px, 25px) scale(1.5)');
    await act(async () => { marker.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
    expect(onActivate).not.toHaveBeenCalled();

    await firePointer(marker, 'pointerdown', 12, 300, 300);
    await firePointer(marker, 'pointerup', 12, 301, 300);
    await act(async () => { marker.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('keeps two-finger zoom available when a gesture starts inside a large region', async () => {
    await render('region-pinch', 'cover', {}, [regionHotspot]);
    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="REGION"]')!;
    await firePointer(marker, 'pointerdown', 21, 300, 300);
    await firePointer(marker, 'pointerdown', 22, 350, 300);
    await firePointer(marker, 'pointermove', 22, 400, 300);
    expect(host.querySelector('.photo-viewport__controls span')?.textContent).toBe('200%');
    await firePointer(marker, 'pointerup', 21, 300, 300);
    await firePointer(marker, 'pointerup', 22, 400, 300);
    await act(async () => { marker.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); });
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('centers oversized focus on its label in contain view without hiding that label', async () => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('photo-viewport__frame')) {
        return { width: FRAME.width, height: FRAME.height, left: 100, top: 80, right: 900, bottom: 680, x: 100, y: 80, toJSON: () => ({}) } as DOMRect;
      }
      if (this.classList.contains('photo-viewport__marker--region')) {
        return { width: 900, height: 700, left: 50, top: 30, right: 950, bottom: 730, x: 50, y: 30, toJSON: () => ({}) } as DOMRect;
      }
      if (this.classList.contains('photo-viewport__marker-label')) {
        return { width: 90, height: 24, left: 400, top: 350, right: 490, bottom: 374, x: 400, y: 350, toJSON: () => ({}) } as DOMRect;
      }
      return { width: 0, height: 0, left: 0, top: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
    await render('region-contain', 'contain', { quietHotspotLabels: true }, [regionHotspot]);
    const marker = host.querySelector<HTMLButtonElement>('[data-clue-id="REGION"]')!;
    marker.focus();
    expect(world().style.transform).toBe('translate(0px, 0px) scale(1)');
  });

  it('keeps secondary zoom tools behind one mobile disclosure and resets it on lens changes', async () => {
    let onMediaChange: (() => void) | undefined;
    let compactMatches = true;
    const media = {
      get matches() { return compactMatches; },
      media: '(max-width: 600px)',
      onchange: null,
      addEventListener: (_type: string, listener: () => void) => { onMediaChange = listener; },
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    await render('compact-mobile', 'cover', { compactMobileControls: true });
    const controls = host.querySelector<HTMLElement>('.photo-viewport__controls')!;
    const adjustments = controls.querySelector<HTMLDetailsElement>('.photo-viewport__adjustments')!;
    expect(adjustments.open).toBe(false);
    expect(controls.querySelectorAll('[aria-label="放大画面"]')).toHaveLength(1);
    expect(controls.querySelectorAll('[aria-label="缩小"]')).toHaveLength(1);
    expect(controls.querySelectorAll('button[aria-pressed]')).toHaveLength(1);

    await act(async () => { controls.querySelector<HTMLButtonElement>('.photo-viewport__zoom-in')!.click(); });
    expect(adjustments.querySelector('span')?.textContent).toBe('125%');
    await act(async () => { adjustments.querySelector('summary')?.click(); });
    expect(adjustments.open).toBe(true);
    await act(async () => { adjustments.querySelector<HTMLButtonElement>('[aria-label="缩小"]')!.click(); });
    expect(adjustments.querySelector('span')?.textContent).toBe('100%');

    const pointerCapture = Element.prototype.setPointerCapture as unknown as ReturnType<typeof vi.fn>;
    pointerCapture.mockClear();
    const panel = adjustments.querySelector<HTMLElement>('.photo-viewport__adjustment-panel')!;
    await firePointer(panel, 'pointerdown', 7, 20, 20);
    expect(pointerCapture).not.toHaveBeenCalled();
    await act(async () => { panel.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -100 })); });
    expect(adjustments.querySelector('span')?.textContent).toBe('100%');

    compactMatches = false;
    await act(async () => { onMediaChange?.(); });
    expect(adjustments.open).toBe(true);
    compactMatches = true;
    await act(async () => { onMediaChange?.(); });
    expect(adjustments.open).toBe(false);
    await act(async () => { adjustments.querySelector('summary')?.click(); });
    expect(adjustments.open).toBe(true);
    await render('compact-mobile-next', 'cover', { compactMobileControls: true });
    expect(host.querySelector<HTMLDetailsElement>('.photo-viewport__adjustments')?.open).toBe(false);
  });

  it('keeps compact opt-in controls complete on desktop without duplicate zoom actions', async () => {
    const media = {
      matches: false,
      media: '(max-width: 600px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList;
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    await render('compact-desktop', 'cover', { compactMobileControls: true });
    const controls = host.querySelector<HTMLElement>('.photo-viewport__controls')!;
    expect(controls.querySelector<HTMLDetailsElement>('.photo-viewport__adjustments')?.open).toBe(true);
    expect(controls.querySelectorAll('[aria-label="缩小"]')).toHaveLength(1);
    expect(controls.querySelectorAll('[aria-label="放大画面"]')).toHaveLength(1);
    expect(controls.querySelectorAll('button[aria-pressed]')).toHaveLength(1);
    expect(controls.querySelectorAll('button')).toHaveLength(4);
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

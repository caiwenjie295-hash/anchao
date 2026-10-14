import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculatePhotoInitialOffset, calculatePhotoPanLimits, PhotoViewport, type PhotoMarker } from './PhotoViewport';

// React 19 需要在测试环境中显式开启 act 支持。
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** 第三幕调查素材的真实尺寸与比例（1448x1086 = 4:3）。 */
const NATURAL = { width: 1448, height: 1086 };
/** 测试视口：比图片更宽，fit 应受高度限制。 */
const FRAME = { width: 800, height: 600 };

/**
 * 工单 §16 工作包 I：第三幕调查图片必须保持原图比例。
 *
 * jsdom 没有布局引擎，因此显式给出 frame 矩形，让组件内部的 fit 计算真正生效。
 * 这里断言的是组件的几何决策；真实像素绘制比例属浏览器验收，
 * 见 docs/ux-t07-ui-0001/act3-image-audit.md。
 */
describe('PhotoViewport aspect ratio', () => {
  let container: HTMLDivElement;
  let root: Root;
  const hotspot: PhotoMarker = { id: 'CLUE_TEST', label: '查看痕迹', x: 0.5, y: 0.5, onActivate: () => {} };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    // 只有 frame 需要布局尺寸；其余元素返回零，避免污染。
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const width = this.classList.contains('photo-viewport__frame') ? FRAME.width : 0;
      const height = this.classList.contains('photo-viewport__frame') ? FRAME.height : 0;
      return { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const plane = () => container.querySelector<HTMLElement>('.photo-viewport__plane')!;
  const render = async (props: Partial<React.ComponentProps<typeof PhotoViewport>> = {}) => {
    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST" imageUrl="test.jpg" imageAlt="测试照片" hotspots={[hotspot]} routes={[]} {...props} />);
    });
  };
  const reportSize = async (natural = NATURAL) => {
    const img = container.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    Object.defineProperty(img, 'naturalWidth', { value: natural.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: natural.height, configurable: true });
    await act(async () => { img.dispatchEvent(new Event('load')); });
  };

  it('sizes the drawn plane to the original aspect ratio', async () => {
    await render();
    await reportSize();
    const { width, height } = plane().style;
    expect(parseFloat(width)).toBeGreaterThan(0);
    // 宽高必须来自同一缩放系数，不能各自独立拉伸。
    expect(Math.abs(parseFloat(width) / parseFloat(height) - NATURAL.width / NATURAL.height)).toBeLessThan(0.001);
  });

  it('limits panning by the actual contained image dimensions per axis and recomputes after resize', () => {
    // 16:9 图片被 contain 到 800×600 frame 后只有 800×450；2×时纵向允许
    // 平移 150px，而不是按 frameHeight*(2-1)/2 放大到 300px。
    expect(calculatePhotoPanLimits(800, 450, 800, 600, 2)).toEqual({ x: 400, y: 150 });
    expect(calculatePhotoPanLimits(800, 450, 800, 600, 1)).toEqual({ x: 0, y: 0 });
    // resize 后 fit plane 先按新 frame 重算，再分别约束两个方向。
    const resizedPlaneWidth = 1920 * Math.min(600 / 1920, 600 / 1080);
    const resizedPlaneHeight = 1080 * Math.min(600 / 1920, 600 / 1080);
    expect(calculatePhotoPanLimits(resizedPlaneWidth, resizedPlaneHeight, 600, 600, 2)).toEqual({ x: 300, y: 37.5 });
  });

  it('positions a requested focal point in the enlarged photo plane within real pan limits', () => {
    const centered = calculatePhotoInitialOffset(800, 450, 800, 600, 2, { x: .65, y: .6 });
    expect(centered.x).toBeCloseTo(-240);
    expect(centered.y).toBeCloseTo(-90);
    const clamped = calculatePhotoInitialOffset(800, 450, 800, 600, 2, { x: .95, y: .95 });
    expect(clamped.x).toBe(-400);
    expect(clamped.y).toBe(-150);
  });

  it('keeps the viewport stable and withholds hotspots while the natural dimensions are unknown', async () => {
    await render();
    expect(plane().style.width).toBe('0px');
    expect(plane().style.height).toBe('0px');
    expect(container.querySelector('.photo-viewport__load-state')?.textContent).toContain('正在载入');
    expect(container.querySelector('[data-clue-id="CLUE_TEST"]')).toBeNull();
    expect(container.querySelector('.photo-viewport__fallback button')?.textContent).toBe('查看痕迹');
  });

  it('drops the previous image size when the scene changes image', async () => {
    await render();
    await reportSize();
    const measuredHeight = plane().style.height;
    expect(measuredHeight).not.toBe('');

    // 换图后必须回到未测量状态，不能沿用上一张图的高度。
    const staleImage = container.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST_2" imageUrl="other.jpg" imageAlt="另一张" hotspots={[hotspot]} routes={[]} />);
    });
    expect(container.querySelector('.photo-viewport__fallback button')?.textContent).toBe('查看痕迹');
    expect(plane().style.width).toBe('0px');
    expect(container.querySelector('.photo-viewport__load-state')?.textContent).toContain('正在载入');
    expect(plane().style.height).not.toBe(measuredHeight);
    Object.defineProperty(staleImage, 'naturalWidth', { value: 1000, configurable: true });
    Object.defineProperty(staleImage, 'naturalHeight', { value: 500, configurable: true });
    await act(async () => { staleImage.dispatchEvent(new Event('load')); });
    expect(plane().style.width).toBe('0px');
    await reportSize({ width: 1600, height: 900 });
    expect(container.querySelector('.photo-viewport__fallback')).toBeNull();
    expect(container.querySelector('[data-clue-id="CLUE_TEST"]')).not.toBeNull();
  });

  it('keeps hotspots available when no image is supplied at all', async () => {
    await render({ imageUrl: undefined });
    expect(container.querySelector('.photo-viewport__missing')).not.toBeNull();
    expect(container.querySelectorAll('.photo-viewport__fallback button')).toHaveLength(1);
  });

  it('applies local edge treatment only in exploration mode and keeps the full image hotspot plane', async () => {
    await render({ explorationMode: true, revealBeat: true });
    await reportSize();
    const viewport = container.querySelector('.photo-viewport')!;
    const marker = container.querySelector<HTMLButtonElement>('[data-clue-id="CLUE_TEST"]')!;
    expect(viewport.classList.contains('photo-viewport--exploration')).toBe(true);
    expect(container.querySelector<HTMLElement>('.photo-viewport__scene')?.style.getPropertyValue('--scene-transition-ms')).toBe('420ms');
    expect(marker.style.getPropertyValue('--marker-x')).toBe('50%');
    expect(marker.style.getPropertyValue('--marker-y')).toBe('50%');
    expect(Math.abs(parseFloat(plane().style.width) / parseFloat(plane().style.height) - NATURAL.width / NATURAL.height)).toBeLessThan(0.001);

    await render({ explorationMode: false });
    expect(container.querySelector('.photo-viewport')?.classList.contains('photo-viewport--exploration')).toBe(false);
  });

  it('crossfades a changed scene immediately and restores focus to the matching hotspot', async () => {
    await render();
    await reportSize();
    const firstFrame = container.querySelector('.photo-viewport__frame')!;
    const firstHotspot = container.querySelector<HTMLButtonElement>('[data-clue-id="CLUE_TEST"]')!;
    firstHotspot.focus();
    expect(document.activeElement).toBe(firstHotspot);

    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST_2" imageUrl="next.jpg" imageAlt="另一张照片" hotspots={[hotspot]} routes={[]} />);
    });
    expect(container.querySelector('.photo-viewport__frame')).not.toBe(firstFrame);
    expect(container.querySelector('.photo-viewport__scene')?.classList.contains('is-transitioning')).toBe(true);
    expect(container.querySelector('.photo-viewport__handoff img')?.getAttribute('src')).toBe('test.jpg');
    const nextImage = container.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    Object.defineProperty(nextImage, 'naturalWidth', { value: NATURAL.width, configurable: true });
    Object.defineProperty(nextImage, 'naturalHeight', { value: NATURAL.height, configurable: true });
    await act(async () => { nextImage.dispatchEvent(new Event('load')); });
    expect(document.activeElement).toBe(container.querySelector('[data-clue-id="CLUE_TEST"]'));
    expect(container.querySelector('.photo-viewport__marker')?.getAttribute('aria-label')).toBe('查看痕迹');
  });

  it('skips the image handoff when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, media: '(prefers-reduced-motion: reduce)', onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })));
    await render();
    await reportSize();
    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST_2" imageUrl="next.jpg" imageAlt="另一张照片" hotspots={[hotspot]} routes={[]} />);
    });
    expect(container.querySelector('.photo-viewport__handoff')).toBeNull();
    expect(container.querySelector('.photo-viewport__scene')?.classList.contains('is-transitioning')).toBe(false);
  });
});

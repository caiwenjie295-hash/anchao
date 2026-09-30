import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoViewport, type PhotoMarker } from './PhotoViewport';

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
  });

  const plane = () => container.querySelector<HTMLElement>('.photo-viewport__plane')!;
  const render = async (props: Partial<React.ComponentProps<typeof PhotoViewport>> = {}) => {
    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST" imageUrl="test.jpg" imageAlt="测试照片" hotspots={[hotspot]} routes={[]} {...props} />);
    });
  };
  const reportSize = async () => {
    const img = container.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    Object.defineProperty(img, 'naturalWidth', { value: NATURAL.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: NATURAL.height, configurable: true });
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

  it('never falls back to a stretched 100% x 100% plane before the image is measured', async () => {
    await render();
    // 未测量的兜底必须保持比例，不能是会把 4:3 压扁的 fill。
    expect(plane().style.height).not.toBe('100%');
    expect(plane().style.aspectRatio).toBe('4 / 3');
  });

  it('drops the previous image size when the scene changes image', async () => {
    await render();
    await reportSize();
    const measuredHeight = plane().style.height;
    expect(measuredHeight).not.toBe('');

    // 换图后必须回到未测量状态，不能沿用上一张图的高度。
    await act(async () => {
      root.render(<PhotoViewport sceneKey="LENS_TEST_2" imageUrl="other.jpg" imageAlt="另一张" hotspots={[hotspot]} routes={[]} />);
    });
    expect(plane().style.aspectRatio).toBe('4 / 3');
    expect(plane().style.height).not.toBe(measuredHeight);
  });

  it('keeps hotspots available when no image is supplied at all', async () => {
    await render({ imageUrl: undefined });
    expect(container.querySelector('.photo-viewport__missing')).not.toBeNull();
    expect(container.querySelectorAll('.photo-viewport__fallback button')).toHaveLength(1);
  });
});

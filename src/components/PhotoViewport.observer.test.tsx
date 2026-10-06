import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoViewport } from './PhotoViewport';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * 审查 `docs/reviews/Bunny_1-2026-09-30.md` [P1] 的回归覆盖。
 *
 * 内部根节点带 `key={sceneKey}`，切镜头会替换整棵 DOM，但组件本身不重新挂载；
 * 若观察器只在挂载时绑定一次，就会一直观察已分离的旧节点，新视口尺寸永不生效。
 */
interface ObserverRecord { element?: Element; callback: ResizeObserverCallback; disconnected: boolean }

describe('PhotoViewport observes the current frame after a lens change', () => {
  let container: HTMLDivElement;
  let observers: ObserverRecord[];
  let dimensions: { width: number; height: number };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    observers = [];
    dimensions = { width: 800, height: 600 };

    class FakeObserver {
      record: ObserverRecord;
      constructor(callback: ResizeObserverCallback) {
        this.record = { callback, disconnected: false };
        observers.push(this.record);
      }
      observe(element: Element) { this.record.element = element; }
      unobserve() {}
      disconnect() { this.record.disconnected = true; }
    }
    vi.stubGlobal('ResizeObserver', FakeObserver);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const isFrame = this.classList.contains('photo-viewport__frame');
      const { width, height } = isFrame ? dimensions : { width: 0, height: 0 };
      return { width, height, top: 0, left: 0, right: width, bottom: height, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });
  });

  afterEach(() => {
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const reportLoad = async (natural = { width: 1448, height: 1086 }) => {
    const img = container.querySelector('.photo-viewport__plane > img')!;
    Object.defineProperty(img, 'naturalWidth', { value: natural.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: natural.height, configurable: true });
    await act(async () => { img.dispatchEvent(new Event('load')); });
  };

  const render = async (sceneKey: string, natural = { width: 1448, height: 1086 }) => {
    const root = createRoot(container);
    await act(async () => { root.render(<PhotoViewport sceneKey={sceneKey} imageUrl={`${sceneKey}.jpg`} imageAlt={sceneKey} hotspots={[]} routes={[]} />); });
    await reportLoad(natural);
    return root;
  };

  /** 切到新镜头：重渲染并上报新图尺寸。 */
  const switchLens = async (root: ReturnType<typeof createRoot>, sceneKey: string) => {
    await act(async () => { root.render(<PhotoViewport sceneKey={sceneKey} imageUrl={`${sceneKey}.jpg`} imageAlt={sceneKey} hotspots={[]} routes={[]} />); });
    await reportLoad();
  };

  const planeWidth = () => container.querySelector<HTMLElement>('.photo-viewport__plane')!.style.width;

  it('refits the image when the frame resizes after a lens change', async () => {
    const root = await render('first');
    try {
      expect(container.querySelector('.photo-viewport__frame')).not.toBeNull();
      const oldFrame = container.querySelector('.photo-viewport__frame')!;

      // 切到第二个镜头：内部子树被 key 替换，frame 必须是新节点。
      await switchLens(root, 'second');
      const newFrame = container.querySelector('.photo-viewport__frame')!;
      expect(newFrame).not.toBe(oldFrame);

      dimensions = { width: 400, height: 300 };
      // 只有仍绑定在当前节点上的观察器才会收到通知。
      await act(async () => {
        for (const observer of observers) {
          if (!observer.disconnected && observer.element === newFrame) observer.callback([], {} as ResizeObserver);
        }
      });

      expect(planeWidth()).toBe('400px');
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('binds an observer to the newly created frame on every lens change', async () => {
    const root = await render('first');
    try {
      await switchLens(root, 'second');
      const newFrame = container.querySelector('.photo-viewport__frame')!;
      const live = observers.filter((observer) => !observer.disconnected && observer.element === newFrame);
      expect(live.length).toBeGreaterThan(0);
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('disconnects the observer of the replaced frame', async () => {
    const root = await render('first');
    try {
      await switchLens(root, 'second');
      const live = observers.filter((observer) => !observer.disconnected);
      const bound = new Set(live.map((observer) => observer.element));
      expect(bound.size).toBe(live.length);
    } finally {
      await act(async () => { root.unmount(); });
    }
  });

  it('does not stretch a non 4:3 source inside a mismatched frame', async () => {
    // 16:9 素材放进 4:3 视口：contain 留白是正常的，比例必须仍然正确。
    const root = await render('wide', { width: 1920, height: 1080 });
    try {
      const plane = container.querySelector<HTMLElement>('.photo-viewport__plane')!;
      const width = parseFloat(plane.style.width);
      const height = parseFloat(plane.style.height);
      expect(Math.abs(width / height - 1920 / 1080)).toBeLessThan(0.01);
    } finally {
      await act(async () => { root.unmount(); });
    }
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoViewport, type PhotoMarker } from '../../components/PhotoViewport';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('PhotoViewport spotlight opt-in', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onActivate = vi.fn();
  const marker: PhotoMarker = { id: 'MARKER', label: '观察标记', x: 0.5, y: 0.5, onActivate };
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  const loadCurrentImage = async () => {
    const image = container.querySelector<HTMLImageElement>('.photo-viewport__plane > img')!;
    Object.defineProperty(image, 'naturalWidth', { configurable: true, value: 800 });
    Object.defineProperty(image, 'naturalHeight', { configurable: true, value: 600 });
    await act(async () => image.dispatchEvent(new Event('load')));
  };

  const render = async (investigationSpotlight?: boolean) => {
    await act(async () => {
      root.render(<PhotoViewport
        sceneKey="lens-one"
        imageUrl="lens-one.webp"
        imageAlt="一张调查照片"
        hotspots={[marker]}
        routes={[]}
        {...(investigationSpotlight === undefined ? {} : { investigationSpotlight })}
      />);
    });
    await loadCurrentImage();
  };

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    onActivate.mockClear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        media: query,
        matches: query.includes('pointer: fine'),
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (!this.classList.contains('photo-viewport__frame')) return { width: 0, height: 0 } as DOMRect;
      return { left: 100, top: 50, right: 900, bottom: 650, width: 800, height: 600 } as DOMRect;
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
    if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  it('leaves every existing caller unchanged unless the spotlight is explicitly enabled', async () => {
    await render();
    expect(container.querySelector('.investigation-spotlight')).toBeNull();
    expect(container.querySelector('[data-clue-id="MARKER"]')).not.toBeNull();

    await render(true);
    const frame = container.querySelector('.photo-viewport__frame')!;
    const layer = frame.querySelector<HTMLElement>('.investigation-spotlight');
    expect(layer).not.toBeNull();
    expect(layer?.parentElement).toBe(frame);
    expect(layer?.textContent).toContain('滑动鼠标调查，点击高亮点查看');
    await act(async () => container.querySelector<HTMLButtonElement>('[data-clue-id="MARKER"]')!.click());
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

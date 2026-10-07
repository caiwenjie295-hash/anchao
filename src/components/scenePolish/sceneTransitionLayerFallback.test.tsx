import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SceneTransitionLayer } from '../transition/SceneTransitionLayer';
import { installMatchMediaMock } from './matchMediaMock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('scene transition CSS fallback', () => {
  it('fades in and clears its fallback class without the Web Animations API', async () => {
    const media = installMatchMediaMock(false);
    const animationDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: undefined });
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<SceneTransitionLayer><p>场景内容</p></SceneTransitionLayer>));
      const layer = host.querySelector<HTMLElement>('.scene-transition-layer')!;
      expect(layer.classList.contains('scene-transition-layer--arriving')).toBe(true);
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(layer.classList.contains('scene-transition-layer--arriving')).toBe(false);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      if (animationDescriptor) Object.defineProperty(HTMLElement.prototype, 'animate', animationDescriptor);
      else delete (HTMLElement.prototype as unknown as { animate?: unknown }).animate;
      media.restore();
      vi.useRealTimers();
    }
  });
});

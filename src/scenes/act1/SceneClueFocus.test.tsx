import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hotspotById } from '../../data/sceneData';
import { SceneClueFocus } from './SceneClueFocus';

describe('SceneClueFocus', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('uses the current background as a positioned local close-up and supports keyboard dismissal', async () => {
    const hotspot = hotspotById.get('HOTSPOT_A1_G_001');
    const onClose = vi.fn();
    expect(hotspot).toBeDefined();
    await act(async () => {
      root.render(<SceneClueFocus hotspot={hotspot!} backgroundSrc="/scene.png" onClose={onClose} />);
    });

    const closeButton = container.querySelector<HTMLButtonElement>('button');
    const image = container.querySelector<HTMLImageElement>('.scene-clue-focus__image--background img');
    expect(closeButton?.textContent).toContain('关闭特写');
    expect(document.activeElement).toBe(closeButton);
    expect(image?.style.transformOrigin).toBe('28% 27.5%');

    await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('prefers a hotspot-specific image when one is available and allows backdrop dismissal', async () => {
    const hotspot = hotspotById.get('HOTSPOT_A1_H_014');
    const onClose = vi.fn();
    expect(hotspot).toBeDefined();
    await act(async () => {
      root.render(<SceneClueFocus hotspot={hotspot!} imageSrc="/close-up.png" backgroundSrc="/scene.png" onClose={onClose} />);
    });

    const image = container.querySelector<HTMLImageElement>('.scene-clue-focus__image--independent img');
    expect(image?.dataset.assetId).toBe('IMG_A1_H_002');
    expect(image?.getAttribute('src')).toBe('/close-up.png');
    await act(async () => { container.querySelector<HTMLElement>('.scene-clue-focus')?.click(); });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ACT2_SHELF_ROW_RECTS } from '../../data/act2Presentation';
import { Act2ShelfMap } from './Act2ShelfMap';

describe('Act2ShelfMap', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  const renderMap = async (source: string, onSelect = vi.fn()) => {
    await act(async () => root.render(<Act2ShelfMap
      assetId="IMG_A2_T03_001"
      source={source}
      imageAlt="县图书馆书架"
      label="地方志书架"
      entries={[
        { id: 'VOLUME_A2_T03_001', label: '地理沿革', rect: ACT2_SHELF_ROW_RECTS[0] },
        { id: 'VOLUME_A2_T03_002', label: '风土志', rect: ACT2_SHELF_ROW_RECTS[1] },
        { id: 'VOLUME_A2_T03_003', label: '祠庙录', rect: ACT2_SHELF_ROW_RECTS[2] },
      ]}
      onSelect={onSelect}
    />));
    return onSelect;
  };

  it('binds accessible dashed photo areas and their text equivalents to the same existing entry', async () => {
    const onSelect = await renderMap('/shelf.jpg');
    const image = container.querySelector<HTMLImageElement>('img');
    expect(image).not.toBeNull();
    Object.defineProperties(image, { naturalWidth: { value: 1448 }, naturalHeight: { value: 1086 } });
    await act(async () => image?.dispatchEvent(new Event('load')));

    const hotspot = container.querySelector<HTMLButtonElement>('[aria-label="风土志"]');
    expect(hotspot).not.toBeNull();
    expect(hotspot?.style.left).toBe('4.8%');
    expect(hotspot?.style.top).toBe('38.2%');
    expect(hotspot?.style.width).toBe('39%');
    expect(hotspot?.getAttribute('aria-pressed')).toBe('false');
    await act(async () => hotspot?.click());
    expect(onSelect).toHaveBeenCalledWith('VOLUME_A2_T03_002');

    await act(async () => container.querySelector<HTMLButtonElement>('[data-shelf-entry-id="VOLUME_A2_T03_002"]')?.click());
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(container.querySelector('.act2-shelf-map')?.getAttribute('data-image-status')).toBe('loaded');
  });

  it('keeps the same text entry usable after the source image fails', async () => {
    const onSelect = await renderMap('/missing-shelf.jpg');
    const image = container.querySelector<HTMLImageElement>('img');
    await act(async () => image?.dispatchEvent(new Event('error')));

    expect(container.querySelector('.act2-shelf-map__fallback')?.textContent).toContain('文字入口');
    expect(container.querySelector('.act2-shelf-map__hotspot')).toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>('[data-shelf-entry-id="VOLUME_A2_T03_002"]')?.click());
    expect(onSelect).toHaveBeenCalledWith('VOLUME_A2_T03_002');
  });

  it('keeps gated shelf labels generic until the catalog area is available', async () => {
    await act(async () => root.render(<Act2ShelfMap
      assetId="IMG_A2_T03_001" source="/shelf.jpg" imageAlt="县图书馆书架" label="地方志书架"
      entries={[{ id: 'VOLUME_A2_T03_002', label: 'XX县风土志', rect: ACT2_SHELF_ROW_RECTS[1] }]}
      disabled lockedHint="先从目录选择地方传说。" onSelect={vi.fn()}
    />));
    expect(container.querySelector('[data-shelf-entry-id="VOLUME_A2_T03_002"]')?.textContent).toBe('书架第 1 区域');
    expect(container.querySelector<HTMLButtonElement>('[data-shelf-entry-id]')?.disabled).toBe(true);
    const image = container.querySelector<HTMLImageElement>('img');
    expect(image).not.toBeNull();
    Object.defineProperties(image, { naturalWidth: { value: 1448 }, naturalHeight: { value: 1086 } });
    await act(async () => image?.dispatchEvent(new Event('load')));
    const hotspot = container.querySelector<HTMLButtonElement>('.act2-shelf-map__hotspot');
    expect(hotspot?.getAttribute('aria-label')).toContain('书架第 1 区域');
    expect(hotspot?.textContent).toBe('待查阅');
  });
});

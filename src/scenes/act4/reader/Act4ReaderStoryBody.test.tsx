import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Act4TextSegment } from '../../../data/narrative/act4Presentation';
import { Act4ReaderStoryBody } from './Act4ReaderStoryBody';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Act4ReaderStoryBody emphasis', () => {
  let host: HTMLDivElement;
  let root: Root;
  beforeEach(() => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
  afterEach(() => { act(() => root.unmount()); host.remove(); });

  it('bolds one phrase only on the current page and leaves the paragraph sequence intact', async () => {
    const paragraphs = [
      '回到县城，我们吃了一顿烧烤，但说实话，心不在焉。',
      '笔记第一页：凌晨一点，我摸黑进了山。',
      '笔记第二页：凌晨两点半，我到达那个石洞。',
    ];
    const segments: Act4TextSegment[] = [
      { id: 'before', label: '回到酒店', from: 0, to: 1, role: 'lead' },
      { id: 'current', label: '笔记第一页', from: 1, to: 2, role: 'page' },
      { id: 'after', label: '笔记第二页', from: 2, to: 3, role: 'page' },
    ];
    await act(async () => { root.render(<Act4ReaderStoryBody stage="T01" blockId="T01_ORIGINAL" paragraphs={paragraphs} currentPage={segments[1]} visibleSegments={segments} pageIndex={1} pageCount={3} />); });

    expect([...host.querySelectorAll('.a4-reader__paragraph')].map((node) => node.textContent)).toEqual(paragraphs);
    expect([...host.querySelectorAll('strong')].map((node) => node.textContent)).toEqual(['凌晨一点']);
    expect(host.querySelector('[data-segment-id="before"] strong')).toBeNull();
    expect(host.querySelector('[data-segment-id="after"] strong')).toBeNull();
  });
});

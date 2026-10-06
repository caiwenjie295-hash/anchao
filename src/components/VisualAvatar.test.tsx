import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VisualAvatar } from './VisualAvatar';

// React 19 needs explicit act support in jsdom tests.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('VisualAvatar', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    container.remove();
  });

  it('shows a wordless vector fallback when a local avatar image fails', async () => {
    await act(async () => { root.render(<VisualAvatar imageId="IMG_UI_IDENTITY_WANGAO_001" fallbackIcon="profile" />); });
    const image = container.querySelector('img');
    expect(image?.getAttribute('alt')).toBe('');
    expect(container.querySelector('svg.visual-avatar__fallback')).not.toBeNull();

    await act(async () => { image!.dispatchEvent(new Event('error')); });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.visual-avatar__fallback')).not.toBeNull();
    expect(container.textContent).toBe('');
  });
});

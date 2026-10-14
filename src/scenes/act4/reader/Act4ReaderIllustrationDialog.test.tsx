import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Act4ReaderIllustrationDialog } from './Act4ReaderIllustrationDialog';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Act 4 illustration zoom dialog', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('keeps the close action available and announces a text fallback when the close-up is missing', async () => {
    const onClose = vi.fn();
    await act(async () => {
      root.render(<Act4ReaderIllustrationDialog
        source={undefined}
        alt="打开旧笔记的手部近景"
        fallback="打开旧笔记的手部近景的独立放大近景暂不可用。"
        dialogRef={createRef<HTMLDivElement>()}
        onKeyDown={() => {}}
        onClose={onClose}
      />);
    });

    const dialog = document.body.querySelector('[role="dialog"][aria-label="放大配图"]');
    expect(dialog?.querySelector('[role="status"]')?.textContent).toBe('打开旧笔记的手部近景的独立放大近景暂不可用。');
    expect(dialog?.querySelector('img')).toBeNull();
    await act(async () => { dialog?.querySelector<HTMLButtonElement>('button')?.click(); });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { InvestigationDetail } from './InvestigationDetail';

describe('InvestigationDetail', () => {
  it('focuses the close action, traps Tab, and restores the opener after close', async () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    opener.textContent = '查看门牌';
    document.body.append(opener);
    opener.focus();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<InvestigationDetail title="门牌" onClose={onClose}><button type="button">打开相关记录</button></InvestigationDetail>));
      const close = host.querySelector<HTMLButtonElement>('button')!;
      const related = host.querySelectorAll<HTMLButtonElement>('button')[1];
      expect(document.activeElement).toBe(close);
      await act(async () => related.focus());
      await act(async () => related.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
      expect(document.activeElement).toBe(close);
      await act(async () => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount());
      expect(document.activeElement).toBe(opener);
      host.remove();
      opener.remove();
    }
  });
});

import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { T07FinaleCurtain } from './T07FinaleCurtain';
import { installMatchMediaMock } from './matchMediaMock';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness({ onContinue }: { onContinue: () => void }) {
  const [open, setOpen] = useState(true);
  return open
    ? <T07FinaleCurtain lines={['尾声']} cueIndex={0} onContinue={onContinue} onReview={() => setOpen(false)} />
    : <button type="button" onClick={() => setOpen(true)}>继续这一幕</button>;
}

describe('T07 finale curtain instance lifecycle', () => {
  it('allows review, close, and a fresh continue action on the next opening', async () => {
    const media = installMatchMediaMock(false);
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () => root.render(<Harness onContinue={onContinue} />));
      const reviewButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === '回看资料')!;
      await act(async () => reviewButton.click());
      expect(reviewButton.disabled).toBe(true);
      await act(async () => { vi.advanceTimersByTime(240); });
      const reopenButton = host.querySelector<HTMLButtonElement>('button')!;
      expect(reopenButton.textContent).toBe('继续这一幕');

      await act(async () => reopenButton.click());
      const continueButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) => button.textContent === '再次进山，调查启明旧址')!;
      expect(continueButton.disabled).toBe(false);
      await act(async () => continueButton.click());
      expect(continueButton.disabled).toBe(true);
      await act(async () => { vi.advanceTimersByTime(240); });
      expect(onContinue).toHaveBeenCalledTimes(1);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      media.restore();
      vi.useRealTimers();
    }
  });
});

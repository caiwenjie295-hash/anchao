import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Act4Ending } from './Act4Ending';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

afterEach(async () => {
  await act(async () => { root.unmount(); });
  host.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Act4Ending', () => {
  it('reveals the title, credits, and entry in order, while the visible skip sends focus to the first entry', async () => {
    vi.useFakeTimers();
    await act(async () => { root.render(<Act4Ending onReview={() => {}} onReturnToDesktop={() => {}} />); });
    const skip = host.querySelector<HTMLButtonElement>('.act4-ending__skip')!;
    expect(skip.textContent).toBe('立即显示全部');
    expect(document.activeElement).toBe(skip);
    expect(host.querySelector('h1')).toBeNull();
    expect(host.querySelector('.act4-ending__credits')).toBeNull();
    expect(host.querySelector('.act4-ending__actions')).toBeNull();

    await act(async () => { vi.advanceTimersByTime(240); });
    expect(host.querySelector('h1')?.textContent).toBe('故事已结束');
    expect(host.querySelector('.act4-ending__credits')).toBeNull();

    await act(async () => { vi.advanceTimersByTime(240); });
    expect(host.querySelectorAll('.act4-ending__credits p')).toHaveLength(3);
    expect(host.querySelector('.act4-ending__actions')).toBeNull();

    await act(async () => { skip.click(); });
    expect(skip.textContent).toBe('前往入口');
    expect(host.querySelectorAll('.act4-ending__actions button')).toHaveLength(2);
    expect(document.activeElement).toBe(host.querySelector('.act4-ending__actions button'));
  });

  it('shows the complete ending immediately with reduced motion and keeps the first action focused', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    await act(async () => { root.render(<Act4Ending onReview={() => {}} onReturnToDesktop={() => {}} />); });

    expect(host.querySelector('h1')?.textContent).toBe('故事已结束');
    expect(host.querySelectorAll('.act4-ending__credits p')).toHaveLength(3);
    expect(host.querySelectorAll('.act4-ending__actions button')).toHaveLength(2);
    expect(document.activeElement).toBe(host.querySelector('.act4-ending__actions button'));
  });
});

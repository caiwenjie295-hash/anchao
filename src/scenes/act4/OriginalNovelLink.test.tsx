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

describe('original novel ending link', () => {
  it('appears after the credits and participates in the ending focus loop', async () => {
    vi.useFakeTimers();
    const onReview = vi.fn();
    const onReturnToDesktop = vi.fn();
    await act(async () => { root.render(<Act4Ending onReview={onReview} onReturnToDesktop={onReturnToDesktop} />); });

    expect(host.querySelector('a')).toBeNull();
    await act(async () => { vi.advanceTimersByTime(240); });
    await act(async () => { vi.advanceTimersByTime(240); });
    expect(host.querySelector('.act4-ending__credits')).not.toBeNull();
    expect(host.querySelector('a')).toBeNull();

    const skip = host.querySelector<HTMLButtonElement>('.act4-ending__skip')!;
    await act(async () => { skip.click(); });
    const link = host.querySelector<HTMLAnchorElement>('.act4-ending__actions a')!;
    expect(host.querySelectorAll('.act4-ending__actions button')).toHaveLength(2);
    expect(link.textContent).toBe('点击查看原文《暗潮》');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.rel).toContain('noreferrer');
    const novelHref = link.getAttribute('href');
    expect(novelHref).toContain('anchao-original.html');
    expect(novelHref).not.toMatch(/^data:/);
    expect(new URL(novelHref!, window.location.href).pathname).toMatch(/anchao-original\.html$/);
    expect(document.activeElement).toBe(host.querySelector('.act4-ending__actions button'));

    skip.focus();
    const backward = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    await act(async () => { skip.dispatchEvent(backward); });
    expect(backward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(link);

    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    await act(async () => { link.dispatchEvent(forward); });
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(skip);
    expect(onReview).not.toHaveBeenCalled();
    expect(onReturnToDesktop).not.toHaveBeenCalled();
  });
});

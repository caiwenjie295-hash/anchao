import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { DesktopTaskCard } from './DesktopTaskCard';

describe('DesktopTaskCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('shows completed and current steps, and opens the guide application from its CTA', async () => {
    const state = createDefaultState();
    state.game.phase = 'B';
    state.game.flags.FLAG_A1_MOM_MSG_TRIGGERED = true;
    const onOpenApp = vi.fn();
    await act(async () => { root.render(<DesktopTaskCard state={state} onOpenApp={onOpenApp} />); });

    expect(container.textContent).toContain('当前待办');
    await act(async () => { (container.querySelector('.desktop-task-card__toggle') as HTMLButtonElement).click(); });
    expect(container.querySelectorAll('.desktop-task-card__step--complete')).toHaveLength(1);
    expect(container.querySelectorAll('.desktop-task-card__step--current')).toHaveLength(1);
    await act(async () => { (container.querySelector('.desktop-task-card__action') as HTMLButtonElement).click(); });
    expect(onOpenApp).toHaveBeenCalledWith('wechat');
  });

  it('collapses and expands without altering the supplied game state', async () => {
    const state = createDefaultState();
    await act(async () => { root.render(<DesktopTaskCard state={state} onOpenApp={vi.fn()} />); });
    const toggle = container.querySelector('.desktop-task-card__toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.desktop-task-card__body')).toBeNull();
    await act(async () => { toggle.click(); });
    expect(container.querySelector('.desktop-task-card__body')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(state.game.phase).toBe('A');
  });

  it('starts compact on a narrow viewport', async () => {
    (window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({ matches: false });
    await act(async () => { root.render(<DesktopTaskCard state={createDefaultState()} onOpenApp={vi.fn()} />); });
    expect((container.querySelector('.desktop-task-card__toggle') as HTMLButtonElement).getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.desktop-task-card__body')).toBeNull();
  });

  it('does not render outside an available guide', async () => {
    const state = createDefaultState();
    state.game.phase = 'F';
    await act(async () => { root.render(<DesktopTaskCard state={state} onOpenApp={vi.fn()} />); });
    expect(container.innerHTML).toBe('');
  });
});

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { DesktopTaskCard } from './DesktopTaskCard';
import { InvestigationProgressProvider } from './InvestigationProgressContext';

describe('DesktopTaskCard', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
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

    expect(container.textContent).toContain('当前步骤');
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

  it('keeps the phase-F return-to-material entry visible even without the optional prepare callback', async () => {
    const state = createDefaultState();
    state.game.phase = 'F';
    await act(async () => { root.render(<DesktopTaskCard state={state} onOpenApp={vi.fn()} />); });
    expect(container.textContent).toContain('徒步资料已整理');
    expect(container.querySelector('.desktop-task-card__resume')).not.toBeNull();
    expect(container.querySelector('.desktop-task-card__prepare')).toBeNull();
  });

  it('keeps a direct next step and progress entry available in a no-guide desktop phase', async () => {
    const state = createDefaultState();
    state.game.phase = 'F';
    await act(async () => root.render(<InvestigationProgressProvider state={state}>
      <DesktopTaskCard state={state} onOpenApp={vi.fn()} />
    </InvestigationProgressProvider>));

    expect(container.textContent).toContain('继续查阅资料');
    expect(container.querySelector('[aria-label="打开调查进度"]')).not.toBeNull();
  });

  it('keeps phase-F material readable and offers a separate, explicit departure action', async () => {
    const state = createDefaultState();
    state.game.phase = 'F';
    const onOpenApp = vi.fn();
    const onPrepareDeparture = vi.fn();
    await act(async () => root.render(<DesktopTaskCard state={state} onOpenApp={onOpenApp} onPrepareDeparture={onPrepareDeparture} />));
    expect(container.textContent).toContain('徒步资料已整理');
    expect(container.textContent).toContain('资料仍可继续查阅');
    await act(async () => { (container.querySelector('.desktop-task-card__resume') as HTMLButtonElement).click(); });
    expect(onOpenApp).toHaveBeenCalledWith('browser');
    await act(async () => { (container.querySelector('.desktop-task-card__prepare') as HTMLButtonElement).click(); });
    expect(onPrepareDeparture).toHaveBeenCalledTimes(1);
    expect(state.modules.scene.journeyStarted).toBe(false);
  });

  it('shows only the search terms available from the current stage and discovered material', async () => {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T01';
    state.game.flags.FLAG_A1_COMPLETE = true;
    state.modules.act2Research.stage = 'search';
    await act(async () => { root.render(<DesktopTaskCard state={state} onOpenApp={vi.fn()} />); });
    expect(container.querySelector('.desktop-task-card__search-guidance')?.textContent).toContain('鸡公岭 补');
    expect(container.querySelector('.desktop-task-card__search-guidance')?.textContent).not.toContain('双S 十字');
    expect(container.textContent).not.toContain('启明青少年成长中心');
  });
});

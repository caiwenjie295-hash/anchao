import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { LIBRARY_FORBIDDEN_TERMS, libraryTargetPageId } from '../../data/act2LibraryData';
import { LibraryResearch } from './LibraryResearch';

const CORRECT_SECTION = 'SECTION_A2_T03_009';
const WRONG_SECTION = 'SECTION_A2_T03_001';
const TARGET_VOLUME = 'VOLUME_A2_T03_002';
const CORE_KEYWORDS = ['KW_A2_T03_001', 'KW_A2_T03_002', 'KW_A2_T03_003'];

describe('LibraryResearch (act2 T03)', () => {
  let container: HTMLDivElement;
  let root: Root;
  let manager: StateManager;

  const setup = async (stage: 'library' | 'inactive' = 'library', onReturnToDesktop?: () => void) => {
    const state = createDefaultState();
    state.modules.act2Research.stage = stage;
    const bus = new EventBus();
    manager = new StateManager(bus, state);
    await act(async () => { root.render(<LibraryResearch manager={manager} onReturnToDesktop={onReturnToDesktop} />); });
  };

  const pick = <T extends Element>(selector: string) => container.querySelector<T>(selector);
  const click = async (element: Element | null) => {
    expect(element).not.toBeNull();
    await act(async () => { (element as HTMLButtonElement).click(); });
  };
  const libraryState = () => manager.getState().modules.act2Research.library;
  const flags = () => manager.getState().game.flags;

  const reachTargetPage = async () => {
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    await click(pick(`[data-volume-id="${TARGET_VOLUME}"]`));
    await click(pick('.act2-library__next'));
    await click(pick('.act2-library__next'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
  };

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('only renders inside the library stage and writes FLAG_A2_LIBRARY_ENTERED once', async () => {
    await setup('inactive');
    expect(container.innerHTML).toBe('');
    expect(flags().FLAG_A2_LIBRARY_ENTERED).toBeUndefined();

    await setup('library');
    expect(container.querySelector('.act2-library')).not.toBeNull();
    expect(flags().FLAG_A2_LIBRARY_ENTERED).toBe(true);
    // 幂等：再次渲染不改变其它状态。
    expect(libraryState().visitedSectionIds).toEqual([]);
  });

  it('shows only the ordinary catalog note for a wrong section without advancing', async () => {
    await setup();
    await click(pick(`[data-section-id="${WRONG_SECTION}"]`));

    expect(libraryState().visitedSectionIds).toEqual([WRONG_SECTION]);
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBeUndefined();
    expect(container.querySelector('.act2-library__section-note')?.textContent).toContain('建置');
    expect(pick('.act2-library__shelf-locked')).not.toBeNull();
    expect(pick(`[data-volume-id="${TARGET_VOLUME}"]`)).toBeNull();
  });

  it('narrows the catalog, opens the volume and turns pages to reach the gazette', async () => {
    await setup();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBe(true);
    expect(pick(`[data-volume-id="${TARGET_VOLUME}"]`)).not.toBeNull();

    await click(pick(`[data-volume-id="${TARGET_VOLUME}"]`));
    expect(libraryState().openedVolumeIds).toEqual([TARGET_VOLUME]);

    await click(pick('.act2-library__next'));
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');

    await click(pick('.act2-library__next'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);
    // 到达目标页仍未完成 T03。
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBeUndefined();
    expect(pick('.act2-library__conclusion')).toBeNull();
  });

  it('toggles the bookmark for the current leaf only', async () => {
    await setup();
    await reachTargetPage();
    const bookmark = pick<HTMLButtonElement>('.act2-library__bookmark');
    expect(bookmark?.getAttribute('aria-pressed')).toBe('false');

    await click(bookmark);
    expect(libraryState().bookmarkedPageIds).toEqual([libraryTargetPageId]);
    expect(pick('.act2-library__bookmark')?.getAttribute('aria-pressed')).toBe('true');

    await click(pick('.act2-library__bookmark'));
    expect(libraryState().bookmarkedPageIds).toEqual([]);
    expect(pick('.act2-library__bookmark')?.getAttribute('aria-pressed')).toBe('false');
  });

  it('clamps the zoom to its documented bounds', async () => {
    await setup();
    await reachTargetPage();
    expect(pick<HTMLButtonElement>('.act2-library__zoom-out')?.disabled).toBe(true);
    expect(pick('.act2-library__zoom-value')?.textContent).toBe('×1.00');

    for (let index = 0; index < 4; index += 1) await click(pick('.act2-library__zoom-in'));
    expect(pick('.act2-library__zoom-value')?.textContent).toBe('×2.00');
    expect(pick<HTMLButtonElement>('.act2-library__zoom-in')?.disabled).toBe(true);

    await click(pick('.act2-library__zoom-in'));
    expect(pick('.act2-library__zoom-value')?.textContent).toBe('×2.00');

    for (let index = 0; index < 4; index += 1) await click(pick('.act2-library__zoom-out'));
    expect(pick('.act2-library__zoom-value')?.textContent).toBe('×1.00');
    expect(pick<HTMLButtonElement>('.act2-library__zoom-out')?.disabled).toBe(true);
  });

  it('keeps the excerpt locked until three core keywords are marked on the target page', async () => {
    await setup();
    await reachTargetPage();
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(true);

    await click(pick(`[data-keyword-id="${CORE_KEYWORDS[0]}"]`));
    await click(pick(`[data-keyword-id="${CORE_KEYWORDS[1]}"]`));
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(true);
    expect(pick('.act2-library__keyword-status')?.textContent).toContain('2 / 3');

    await click(pick(`[data-keyword-id="${CORE_KEYWORDS[2]}"]`));
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(false);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBeUndefined();
  });

  it('excerpts to the notepad and completes T03 once the gate is met', async () => {
    await setup();
    await reachTargetPage();
    for (const keywordId of CORE_KEYWORDS) await click(pick(`[data-keyword-id="${keywordId}"]`));
    for (const keywordId of CORE_KEYWORDS) await click(pick(`[data-keyword-id="${keywordId}"]`));

    await click(pick('.act2-library__excerpt-button'));
    expect(libraryState().markedKeywordIds).toEqual(CORE_KEYWORDS);
    expect(libraryState().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T03_001']);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);

    // 重复操作幂等。
    await click(pick('.act2-library__excerpt-button'));
    expect(libraryState().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
    expect(manager.getState().modules.notepad.autoEntryIds).toEqual(['NOTE_A2_T03_001']);

    expect(pick('.act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');
  });

  it('stays in the T03 completion state and never shows T04 material', async () => {
    await setup();
    await reachTargetPage();
    for (const keywordId of CORE_KEYWORDS) await click(pick(`[data-keyword-id="${keywordId}"]`));
    await click(pick('.act2-library__excerpt-button'));

    const text = container.textContent ?? '';
    for (const term of LIBRARY_FORBIDDEN_TERMS) expect(text).not.toContain(term);
    expect(text).not.toContain('T04');
    expect(text).toContain('缺什么，就用某种东西补什么。');
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(container.querySelector('.act2-library__reader')).not.toBeNull();
  });

  it('exposes an explicit return-to-desktop callback', async () => {
    const onReturnToDesktop = vi.fn();
    await setup('library', onReturnToDesktop);
    await click(pick('.act2-library__return'));
    expect(onReturnToDesktop).toHaveBeenCalledTimes(1);
  });
});

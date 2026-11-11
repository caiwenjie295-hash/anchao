import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { LIBRARY_FORBIDDEN_TERMS, libraryPagesByVolumeId, librarySections, libraryTargetPageId, libraryVolumes } from '../../data/act2LibraryData';
import { isLibraryVolumePullable, LibraryResearch } from './LibraryResearch';

const CORRECT_SECTION = 'SECTION_A2_T03_009';
const WRONG_SECTION = 'SECTION_A2_T03_001';
const TARGET_VOLUME = 'VOLUME_A2_T03_002';
const GEOGRAPHY_VOLUME = 'VOLUME_A2_T03_001';

describe('LibraryResearch (act2 T03)', () => {
  let container: HTMLDivElement;
  let root: Root;
  let manager: StateManager;

  const setup = async (
    stage: 'library' | 'inactive' = 'library',
    onReturnToDesktop?: () => void,
    lockedVolumeIds?: readonly string[],
  ) => {
    const state = createDefaultState();
    state.modules.act2Research.stage = stage;
    const bus = new EventBus();
    manager = new StateManager(bus, state);
    await act(async () => {
      root.render(
        <LibraryResearch manager={manager} onReturnToDesktop={onReturnToDesktop} lockedVolumeIds={lockedVolumeIds} />,
      );
    });
  };

  const pick = <T extends Element>(selector: string) => container.querySelector<T>(selector);
  const click = async (element: Element | null) => {
    expect(element).not.toBeNull();
    await act(async () => { (element as HTMLButtonElement).click(); });
  };
  const libraryState = () => manager.getState().modules.act2Research.library;
  const flags = () => manager.getState().game.flags;
  const enterShelf = async () => {
    if (pick('.act2-library__consult')) await click(pick('.act2-library__consult'));
  };

  const reachTargetPage = async () => {
    await enterShelf();
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    await click(pick('.act2-library__next'));
    const bumuzhiRow = [...container.querySelectorAll<HTMLButtonElement>('[data-toc-target="bumuzhi"]')][0];
    expect(bumuzhiRow).toBeTruthy();
    await click(bumuzhiRow);
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
  };

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
    }));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('only renders inside the library stage and writes FLAG_A2_LIBRARY_ENTERED once', async () => {
    await setup('inactive');
    expect(container.innerHTML).toBe('');
    expect(flags().FLAG_A2_LIBRARY_ENTERED).toBeUndefined();

    await setup('library');
    expect(container.querySelector('.act2-library')).not.toBeNull();
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('panorama');
    expect(flags().FLAG_A2_LIBRARY_ENTERED).toBe(true);
    expect(libraryState().visitedSectionIds).toEqual([]);
  });

  it('zooms from the single consult shelf into a nine-bay shelf and returns on leave', async () => {
    await setup();
    expect(pick('.act2-library__consult')).not.toBeNull();
    expect(pick('.act2-library__tab')).toBeNull();
    await enterShelf();
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('shelf');
    expect(container.querySelectorAll('.act2-library__tab')).toHaveLength(librarySections.length);
    expect(container.querySelectorAll('.act2-library__bay-ledge')).toHaveLength(librarySections.length);
    expect(container.querySelectorAll('[data-shelf-entry-id]')).toHaveLength(libraryVolumes.length);
    expect(container.querySelectorAll('.act2-library__bay--empty')).toHaveLength(librarySections.length - libraryVolumes.length);
    expect(container.querySelectorAll('.act2-library__filler').length).toBeGreaterThan(20);
    for (const filler of container.querySelectorAll('.act2-library__filler')) {
      expect(filler.closest('[aria-hidden="true"]')).not.toBeNull();
      expect(filler.closest('button')).toBeNull();
      expect(filler.getAttribute('tabindex')).toBeNull();
    }
    expect(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)?.className).toContain('act2-library__spine--legend');
    expect(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)?.className).toContain('act2-library__spine--pullable');
    expect(pick(`[data-shelf-entry-id="${GEOGRAPHY_VOLUME}"]`)?.className).not.toContain('act2-library__spine--legend');
    await click(pick('.act2-library__leave'));
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('panorama');
    expect(pick('.act2-library__consult')).not.toBeNull();
  });

  it('keeps every catalog tab visually identical and reserves gilt only for the 风土志 spine', async () => {
    await setup();
    await enterShelf();
    expect(container.querySelector('.act2-library__tab--gilt')).toBeNull();
    const tabs = [...container.querySelectorAll('.act2-library__tab')];
    expect(tabs).toHaveLength(librarySections.length);
    const tabClasses = new Set(tabs.map((tab) => [...tab.classList].sort().join(' ')));
    expect(tabClasses.size).toBe(1);
    expect(container.querySelectorAll('.act2-library__spine--legend')).toHaveLength(1);
    expect(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)?.className).toContain('act2-library__spine--legend');
  });

  it('lets the player pull a spine, flip pages, and close back to the shelf', async () => {
    await setup();
    await enterShelf();
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    expect(libraryState().openedVolumeIds).toEqual([TARGET_VOLUME]);
    expect(libraryState().visitedSectionIds).toContain(CORRECT_SECTION);
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBe(true);
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('reader');
    expect(pick('.act2-library__page')?.getAttribute('data-page-id')).toBe('PAGE_A2_T03_003');
    expect(pick('.act2-library__book-title')?.textContent).toBe('XX县风土志');
    expect(pick('.act2-library__page-indicator')?.textContent).toBe('');
    expect(pick('[aria-label="翻到下一页（页角）"]')).not.toBeNull();

    await click(pick('[aria-label="翻到下一页（页角）"]'));
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');
    expect(pick('.act2-library__book-heading')?.textContent).toBe('本卷目次');
    await click(pick('.act2-library__close-reader'));
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('shelf');
    expect(pick('.act2-library__spine')).not.toBeNull();
    expect(pick('.act2-library__consult')).toBeNull();
    expect(pick('.act2-library__page')).toBeNull();
  });

  it('keeps a locked spine recessed, unpullable, and free of body text', async () => {
    expect(isLibraryVolumePullable(TARGET_VOLUME)).toBe(true);
    expect(isLibraryVolumePullable(TARGET_VOLUME, [TARGET_VOLUME])).toBe(false);
    await setup('library', undefined, [TARGET_VOLUME]);
    await enterShelf();
    const locked = pick<HTMLButtonElement>(`[data-shelf-entry-id="${TARGET_VOLUME}"]`);
    expect(locked?.className).toContain('act2-library__spine--locked');
    expect(locked?.disabled).toBe(true);
    expect(locked?.textContent).toContain('XX县风土志');
    expect(locked?.textContent).not.toContain('补母');
    expect(container.textContent).not.toContain('缺什么，就用某种东西补什么。');
    await click(locked);
    expect(libraryState().openedVolumeIds).toEqual([]);
    expect(libraryState().currentPageId).toBeNull();
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('shelf');
    expect(pick('.act2-library__page')).toBeNull();

    const openable = pick<HTMLButtonElement>(`[data-shelf-entry-id="${GEOGRAPHY_VOLUME}"]`);
    expect(openable?.disabled).toBe(false);
    expect(openable?.className).not.toContain('act2-library__spine--locked');
  });

  it('skips zoom motion when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
    }));
    await setup();
    expect(pick('.act2-library')?.className).toContain('act2-library--reduced');
    await enterShelf();
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('shelf');
    expect(pick('.act2-library')?.className).not.toContain('act2-library--zoom-in');
    await click(pick(`[data-shelf-entry-id="${GEOGRAPHY_VOLUME}"]`));
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('reader');
    expect(pick('.act2-library')?.className).not.toContain('act2-library--zoom-in');
    await click(pick('.act2-library__close-reader'));
    await click(pick('.act2-library__leave'));
    expect(pick('.act2-library')?.getAttribute('data-library-view')).toBe('panorama');
    expect(pick('.act2-library')?.className).not.toContain('act2-library--zoom-out');
  });

  it('matches one-page and multi-page reader guidance to the current page controls', async () => {
    await setup();
    await enterShelf();
    const onePageVolume = libraryVolumes.find((volume) => (libraryPagesByVolumeId.get(volume.id)?.length ?? 0) === 1);
    expect(onePageVolume).toBeDefined();
    await click(pick(`[data-shelf-entry-id="${onePageVolume!.id}"]`));
    expect(pick('.act2-library__reader-instruction')?.textContent).toBe('当前卷册只有一页，已经读到末页。可以回到目录或选择另一册。');
    expect(pick<HTMLButtonElement>('[aria-label="翻到上一页（页角）"]')?.disabled).toBe(true);
    expect(pick<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]')?.disabled).toBe(true);

    await click(pick('.act2-library__close-reader'));
    await reachTargetPage();
    expect(pick('.act2-library__reader-instruction')?.textContent).toContain('当前卷册共 13 页，正在阅读第 3–4 页');
    expect(pick('.act2-library__reader-instruction')?.textContent).toContain('可翻到卷末乡录残页');
    expect(pick<HTMLButtonElement>('[aria-label="翻到上一页（页角）"]')?.disabled).toBe(false);
    expect(pick<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]')?.disabled).toBe(false);
  });

  it('shows only the ordinary catalog visit for a wrong section without advancing', async () => {
    await setup();
    await enterShelf();
    await click(pick(`[data-section-id="${WRONG_SECTION}"]`));

    expect(libraryState().visitedSectionIds).toEqual([WRONG_SECTION]);
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBeUndefined();
    expect(pick(`[data-section-id="${WRONG_SECTION}"]`)?.getAttribute('aria-pressed')).toBe('true');
    expect(pick<HTMLButtonElement>(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)?.disabled).toBe(false);
  });

  it('narrows via the correct section, opens the volume and turns pages to reach the gazette', async () => {
    await setup();
    await enterShelf();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBe(true);
    expect(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)).not.toBeNull();

    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    expect(libraryState().openedVolumeIds).toEqual([TARGET_VOLUME]);

    await click(pick('[aria-label="翻到下一页（页角）"]'));
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');

    await click(pick('[data-toc-target="bumuzhi"]'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    await click(pick('.act2-library__inpage-excerpt'));
    expect(pick('.act2-library__conclusion')).not.toBeNull();
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T03_001');
    await click(pick('.act2-library__excerpt-close'));
  });

  it('requires sequential page turns and never exposes a control that jumps to the gazette page', async () => {
    await setup();
    await enterShelf();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_003');

    expect(pick('.act2-library__leaves')).toBeNull();
    expect(
      container.querySelectorAll('button[data-page-id], a[data-page-id], [role="button"][data-page-id], [tabindex][data-page-id]'),
    ).toHaveLength(0);
    expect(pick('.act2-library__page')?.getAttribute('data-page-id')).toBe('PAGE_A2_T03_003');
    expect(pick('.act2-library__page-indicator')?.textContent).toBe('');

    await click(pick('[aria-label="翻到下一页（页角）"]'));
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();

    await click(pick('[aria-label="翻到下一页（页角）"]'));
    expect(pick('.act2-library__page')?.getAttribute('data-missing-id')).toBe('suishi');
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();
    expect(pick('.act2-library__page-indicator')?.textContent).toBe('第 1–2 页 / 共 13 页');
    expect(container.textContent).toContain('本卷阙');

    await click(pick('[aria-label="翻到下一页（页角）"]'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);

    expect(pick('.act2-library__page')?.getAttribute('data-page-id')).toBe(libraryTargetPageId);
    expect(pick('.act2-library__page-indicator')?.textContent).toBe('第 3–4 页 / 共 13 页');

    expect(pick<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]')?.disabled).toBe(false);
    expect(pick('.act2-library__book')?.textContent).toContain('乡人岁时以新谷');
  });

  it('toggles the bookmark for the current page only', async () => {
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

  it('automatically records the target-page source and offers a separate optional excerpt action', async () => {
    await setup();
    await reachTargetPage();
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T03_001');
    expect(libraryState().excerptedEntryIds).toEqual([]);
    expect(pick('.act2-library__excerpt-drawer')).toBeNull();
    expect(pick('.act2-library__inpage-excerpt')?.textContent).toBe('摘录此段');
    expect(pick('.investigation-shell__operations [data-action-id="A2_T03_TO_TALES"]')).toBeNull();
    expect(pick('.act2-library__keyword-list')).toBeNull();
    await click(pick('.act2-library__inpage-excerpt'));
    expect(pick('.act2-library__excerpt-drawer')).not.toBeNull();
    expect(pick('.act2-library__excerpt-status')?.textContent).toBe('本页已登记，可把这段收入笔记');
    expect(pick('.act2-library__excerpt-button')?.textContent).toBe('摘录到调查笔记');
    expect(pick('.act2-library__excerpt-source')?.textContent).toContain('县西鸡公岭野祠');
    expect(pick('.act2-library__excerpt-quote')?.textContent).toContain('黑补母不增不减');
    expect(pick('.act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');
    expect(pick('.act2-library__excerpt-drawer [data-action-id="A2_T03_TO_TALES"]')?.textContent).toBe('继续对照三篇志异');
    await click(pick('.act2-library__drawer-tab[aria-selected="false"]'));
    expect(pick('.act2-library__keyword-list')).not.toBeNull();
    await click(pick('.act2-library__drawer-tab'));
    await click(pick('.act2-library__excerpt-button'));
    expect(libraryState().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
    expect(pick('.act2-library__excerpt-drawer')).toBeNull();
    expect(pick('.act2-library__excerpt-toast')?.textContent).toBe('✓ 已记入调查笔记');
    expect(pick('.act2-library__inpage-excerpt')?.textContent).toBe('✓ 已摘录');
    expect(pick<HTMLButtonElement>('.act2-library__inpage-excerpt')?.disabled).toBe(true);
    expect(pick('.act2-library__afterword [data-action-id="A2_T03_TO_TALES"]')?.getAttribute('data-action-state')).toBe('ready');
    expect(pick('.act2-library__afterword .act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');
  });

  it('lets the player take the story action from the drawer or after closing the book without excerpting', async () => {
    await setup();
    await reachTargetPage();
    expect(libraryState().excerptedEntryIds).toEqual([]);
    expect(pick('.investigation-shell__operations [data-action-id="A2_T03_TO_TALES"]')).toBeNull();
    await click(pick('.act2-library__inpage-excerpt'));
    await click(pick('.act2-library__excerpt-drawer [data-action-id="A2_T03_TO_TALES"]'));
    expect(manager.getState().modules.act2Research.stage).toBe('tales');
  });

  it('keeps T03 and opens T04 only after the player chooses the story action', async () => {
    await setup();
    await reachTargetPage();
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(pick('.investigation-shell__operations [data-action-id="A2_T03_TO_TALES"]')).toBeNull();
    await click(pick('.act2-library__inpage-excerpt'));
    expect(pick('.act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');
    await click(pick('.act2-library__excerpt-close'));
    await click(pick('.act2-library__close-reader'));
    expect(pick('[data-action-id="A2_T03_TO_TALES"]')?.getAttribute('data-action-state')).toBe('ready');
    await click(pick('[data-action-id="A2_T03_TO_TALES"]'));
    expect(manager.getState().modules.act2Research.stage).toBe('tales');
    expect(container.querySelector('.act2-library')).not.toBeNull();
    expect(container.textContent).toContain('卷末 · 乡录残页');
    for (const term of LIBRARY_FORBIDDEN_TERMS) expect(container.textContent).not.toContain(term);
  });

  it('exposes an explicit return-to-desktop callback', async () => {
    const onReturnToDesktop = vi.fn();
    await setup('library', onReturnToDesktop);
    await click(pick('.investigation-shell__exit'));
    expect(onReturnToDesktop).toHaveBeenCalledTimes(1);
  });

  it('shows a gray 先读补母志 note and jumps to 补母志 without writing flags', async () => {
    await setup();
    await enterShelf();
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    await click(pick('.act2-library__next'));
    const notes = [...container.querySelectorAll('.act2-library__toc-note')];
    expect(notes).toHaveLength(1);
    expect(notes[0]?.textContent).toBe('圈出三篇，读完补母志后可翻');
    expect(pick('[data-tale-toc="TALE_A2_T04_001"] .act2-library__toc-arrow')).toBeNull();
    const flagsBefore = { ...flags() };
    await click(pick('[data-tale-toc="TALE_A2_T04_001"]'));
    expect(pick('.act2-library__book')?.textContent).toContain('县西鸡公岭');
    expect(pick('.act2-library__toc-toast')?.textContent).toBe('先读补母志');
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(flags().FLAG_A2_TALE_01_READ).not.toBe(true);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(flagsBefore.FLAG_A2_BUMUZHI_FOUND);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).not.toBe(true);
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual([]);
  });

  it('jumps from a 志异 TOC row after the rule is known, writes the tale read flag, and offers 回目录', async () => {
    await setup();
    await reachTargetPage();
    expect(container.querySelector('.act2-library__toc-note')).toBeNull();
    await click(pick('.act2-library__to-catalog'));
    expect(pick('.act2-library__page')?.getAttribute('data-page-id')).toBe('PAGE_A2_T03_004');
    expect(container.querySelector('.act2-library__toc-note')).toBeNull();
    await click(pick('[data-tale-toc="TALE_A2_T04_001"]'));
    expect(container.querySelector('[data-tale-id="TALE_A2_T04_001"]')).not.toBeNull();
    expect(manager.getState().modules.act2Research.tales.readTaleIds).toEqual(['TALE_A2_T04_001']);
    expect(flags().FLAG_A2_TALE_01_READ).toBe(true);
    expect(pick('.act2-library__to-catalog')?.textContent).toBe('回目录');
  });

  const finishCurrentTaleChunks = async () => {
    for (let step = 0; step < 16; step += 1) {
      const labels = [...document.querySelectorAll('.act2-library__tale-cont')].map((node) => node.textContent ?? '');
      if (labels.length === 0) return;
      if (labels.some((label) => {
        const match = label.match(/续 (\d+)\/(\d+)/);
        return Boolean(match && match[1] === match[2]);
      })) return;
      const next = pick<HTMLButtonElement>('[aria-label="翻到下一页（页角）"]');
      if (!next || next.disabled) return;
      await click(next);
    }
  };

  it('shows 做出判断 only after all three tales have been read to their last chunk', async () => {
    await setup();
    await reachTargetPage();
    await click(pick('.act2-library__to-catalog'));
    await click(pick('[data-tale-toc="TALE_A2_T04_001"]'));
    await finishCurrentTaleChunks();
    await click(pick('.act2-library__to-catalog'));
    await click(pick('[data-tale-toc="TALE_A2_T04_002"]'));
    await finishCurrentTaleChunks();
    expect(pick('[data-action-id="A2_T04_OPEN_JUDGMENT"]')).toBeNull();
    await click(pick('.act2-library__to-catalog'));
    await click(pick('[data-tale-toc="TALE_A2_T04_003"]'));
    expect(pick('[data-action-id="A2_T04_OPEN_JUDGMENT"]')).toBeNull();
    await finishCurrentTaleChunks();
    expect(pick('[data-action-id="A2_T04_OPEN_JUDGMENT"]')?.textContent).toBe('做出判断');
    expect(pick('[data-action-id="A2_T04_TO_SCHOOL"]')).toBeNull();
    await click(pick('[data-action-id="A2_T04_OPEN_JUDGMENT"]'));
    expect(pick('.act2-library__judgment-drawer')).not.toBeNull();
  });

  it('opens an old tales-stage save at the 卷末 divider', async () => {
    const state = createDefaultState();
    state.modules.act2Research.stage = 'tales';
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
    manager = new StateManager(new EventBus(), state);
    await act(async () => {
      root.render(<LibraryResearch manager={manager} />);
    });
    expect(pick('.act2-library')).not.toBeNull();
    expect(container.textContent).toContain('卷末 · 乡录残页');
    expect(pick('.act2-library__page')?.getAttribute('data-endmatter-index')).toBe('0');
  });
});

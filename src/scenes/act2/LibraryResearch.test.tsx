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
  const openCatalog = async () => {
    const detail = pick<HTMLDetailsElement>('.act2-library__catalog');
    if (detail && !detail.open) await click(detail.querySelector('summary'));
  };

  const reachTargetPage = async () => {
    await openCatalog();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
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
    await openCatalog();
    await click(pick(`[data-section-id="${WRONG_SECTION}"]`));

    expect(libraryState().visitedSectionIds).toEqual([WRONG_SECTION]);
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBeUndefined();
    expect(container.querySelector('.act2-library__section-note')?.textContent).toContain('建置');
    expect(pick('.act2-shelf-map__locked')).not.toBeNull();
    expect(pick<HTMLButtonElement>(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)?.disabled).toBe(true);
  });

  it('narrows the catalog, opens the volume and turns pages to reach the gazette', async () => {
    await setup();
    await openCatalog();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBe(true);
    expect(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`)).not.toBeNull();

    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    expect(libraryState().openedVolumeIds).toEqual([TARGET_VOLUME]);

    await click(pick('.act2-library__next'));
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');

    await click(pick('.act2-library__next'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(pick('.act2-library__conclusion')).not.toBeNull();
    expect(manager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T03_001');
  });

  it('requires sequential page turns and never exposes a control that jumps to the gazette page', async () => {
    await setup();
    await openCatalog();
    await click(pick(`[data-section-id="${CORRECT_SECTION}"]`));
    await click(pick(`[data-shelf-entry-id="${TARGET_VOLUME}"]`));
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_003');

    // 页序只作静态进度展示：不存在可直接激活的页控件，更没有直达目标页的入口。
    const leaves = pick('.act2-library__leaves');
    expect(leaves).not.toBeNull();
    expect(leaves?.querySelectorAll('button, a, [role="button"], [role="link"], [tabindex]')).toHaveLength(0);
    expect(
      container.querySelectorAll('button[data-page-id], a[data-page-id], [role="button"][data-page-id], [tabindex][data-page-id]'),
    ).toHaveLength(0);

    const pendingTargetLeaf = pick(`[data-leaf-state="pending"][data-page-id="${libraryTargetPageId}"]`);
    expect(pendingTargetLeaf?.tagName).toBe('LI');
    expect(pick(`.act2-library__leaves [data-page-id="${libraryTargetPageId}"]`)?.getAttribute('aria-current')).toBeNull();

    // 第一次“下一页”只到 PAGE_A2_T03_004，尚未发现《补母志》。
    await click(pick('.act2-library__next'));
    expect(libraryState().currentPageId).toBe('PAGE_A2_T03_004');
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();

    // 第二次“下一页”才到 PAGE_A2_T03_005，此时写入 FLAG_A2_BUMUZHI_FOUND。
    await click(pick('.act2-library__next'));
    expect(libraryState().currentPageId).toBe(libraryTargetPageId);
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);

    // 当前页继续提供等价的可访问状态。
    expect(pick(`.act2-library__leaves [data-page-id="${libraryTargetPageId}"]`)?.getAttribute('aria-current')).toBe('page');
    expect(pick(`[data-leaf-state="current"][data-page-id="${libraryTargetPageId}"]`)?.tagName).toBe('LI');

    // 末页之后不能继续翻页。
    expect(pick<HTMLButtonElement>('.act2-library__next')?.disabled).toBe(true);
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
    expect(pick('.act2-library__excerpt')).not.toBeNull();
    expect(pick('.act2-library__keyword-list')).not.toBeNull();
    await click(pick('.act2-library__excerpt-button'));
    expect(libraryState().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
    expect(pick('.act2-library__excerpt-button')?.textContent).toBe('已收入调查笔记');
  });

  it('keeps T03 and opens T04 only after the player chooses the story action', async () => {
    await setup();
    await reachTargetPage();
    expect(manager.getState().modules.act2Research.stage).toBe('library');
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(pick('.act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');
    await click(pick('[data-action-id="A2_T03_TO_TALES"]'));
    expect(manager.getState().modules.act2Research.stage).toBe('tales');
    expect(container.querySelector('.act2-library')).toBeNull();
    // stage 变为 T04 后，上层场景宿主会挂载志异调查。
    for (const term of LIBRARY_FORBIDDEN_TERMS) expect(container.textContent).not.toContain(term);
  });

  it('exposes an explicit return-to-desktop callback', async () => {
    const onReturnToDesktop = vi.fn();
    await setup('library', onReturnToDesktop);
    await click(pick('.investigation-shell__exit'));
    expect(onReturnToDesktop).toHaveBeenCalledTimes(1);
  });
});

import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { clearAct4ReadingPositions, setAct4ReadingPosition } from '../../core/uiPreferences';
import { StateManager } from '../../core/stateManager';
import { act4NarrativeSections } from '../../data/narrative/act4Narrative';
import { act4Existing560ReaderTextPages, act4LegacyReaderTextPages, act4PrivateBlogPosts, act4ReaderTextPages } from '../../data/narrative/act4Presentation';
import { Act4Experience } from './Act4Experience';
import { clearAct4ReaderProgress } from './reader/readerProgress';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const renderExperience = async (component: ReactNode) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(component); });
  return { host, root };
};

beforeEach(() => {
  clearAct4ReadingPositions();
  clearAct4ReaderProgress();
  window.localStorage.removeItem('anchao.a4-reader-layout');
  window.localStorage.removeItem('anchao.a4-private-blog-bookmarks');
});

describe('Act 4 reader behavior', () => {
  it('clears an old saved page layout before remounting the same block with the current layout', async () => {
    const archiveReturn = act4NarrativeSections.find((item) => item.stage === 'T08')!.blocks.find((item) => item.id === 'T08_RETURN')!;
    const paragraphIndex = archiveReturn.paragraphs.findIndex((paragraph) => paragraph.replace(/[\s“”"‘’']/g, '') === '应该只是撞伤吧。我安慰自己。');
    const oldPages = act4Existing560ReaderTextPages('T08', archiveReturn.id, archiveReturn.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    const savedPageIndex = oldPages.findIndex((page) => paragraphIndex >= page.from && paragraphIndex < page.to);
    expect(savedPageIndex).toBeGreaterThanOrEqual(0);
    window.localStorage.setItem('anchao.a4-reader-layout', '2');
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archiveReturn.id,
      pageIndexByBlock: { [archiveReturn.id]: savedPageIndex },
      openedCoverKeys: [],
    });
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T08';
    state.modules.act4.stage = 'T08';
    state.modules.act4.completedNarrativeSectionIds = Array.from({ length: 7 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    let { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);

    try {
      const pageControl = host.querySelector<HTMLElement>('[data-block-id="T08_RETURN"] .a4-reader__segment-pages')!;
      expect(pageControl.getAttribute('data-active-page')).toBe(String(savedPageIndex + 1));
      expect(pageControl.getAttribute('data-page-count')).toBe(String(oldPages.length));
      expect(pageControl.textContent).toContain('应该只是撞伤吧');
      expect(window.localStorage.getItem('anchao.a4-reader-layout')).toBe('3');

      await act(async () => root.unmount());
      host.remove();
      clearAct4ReadingPositions();
      ({ host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />));

      const remountedPages = act4ReaderTextPages('T08', archiveReturn.id, archiveReturn.paragraphs, true)
        .filter((page) => page.role === 'page' || page.role === 'whole');
      expect(host.querySelector('.a4-reader__cover')).toBeNull();
      expect(window.localStorage.getItem('anchao.a4-reader-layout-positions')).toBeNull();
      const remountedPageControl = host.querySelector<HTMLElement>('[data-block-id="T08_RETURN"] .a4-reader__segment-pages')!;
      expect(remountedPageControl.getAttribute('data-active-page')).toBe('1');
      expect(remountedPageControl.getAttribute('data-page-count')).toBe(String(remountedPages.length));
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps a saved unversioned T08 archive page on its original legacy boundary', async () => {
    const archive = act4NarrativeSections.find((item) => item.stage === 'T08')!.blocks.find((item) => item.id === 'T08_ARCHIVE')!;
    const legacyPages = act4LegacyReaderTextPages('T08', archive.id, archive.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    const legacyPageIndex = legacyPages.findIndex((page) => page.sceneId === 'T08_ARCHIVE_MIRROR');
    const legacyPage = legacyPages[legacyPageIndex];
    expect(legacyPage).toBeDefined();

    const state = createDefaultState();
    state.game.phase = 'A4_T08';
    state.modules.act4.stage = 'T08';
    state.modules.act4.completedNarrativeSectionIds = Array.from({ length: 7 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
    state.modules.act4.completedNarrativeActionIds = [
      'A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED',
    ];
    setAct4ReadingPosition('T08:current', {
      activeBlockId: archive.id,
      pageIndexByBlock: { [archive.id]: legacyPageIndex },
      openedCoverKeys: ['T08:current:T08_ARCHIVE:T08_ARCHIVE_MIRROR:cover'],
    });
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);

    try {
      const archiveView = host.querySelector<HTMLElement>(`[data-block-id="${archive.id}"]`)!;
      const newActivePage = Number(archiveView.querySelector('.a4-reader__segment-pages')?.getAttribute('data-active-page')) - 1;
      const preservedPages = act4LegacyReaderTextPages('T08', archive.id, archive.paragraphs, true)
        .filter((page) => page.role === 'page' || page.role === 'whole');
      const mappedPage = preservedPages[newActivePage];

      expect(mappedPage.sceneId).toBe('T08_ARCHIVE_MIRROR');
      expect(newActivePage).toBe(legacyPageIndex);
      expect(mappedPage.from).toBe(legacyPage.from);
      expect(mappedPage.to).toBe(legacyPage.to);
      expect(archiveView.textContent).toContain(archive.paragraphs[legacyPage.from]);
      expect(host.querySelector('.a4-reader__cover')).toBeNull();
      const persisted = JSON.parse(window.localStorage.getItem('anchao.ui.v1') ?? '{}');
      expect(persisted.act4Reading['T08:current'].pageIndexByBlock.T08_ARCHIVE).toBe(newActivePage);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('moves directly from the final-mail action into the mail without completing T10', async () => {
    const section = act4NarrativeSections.find((item) => item.stage === 'T10')!;
    const aftermath = section.blocks.find((block) => block.id === 'T10_AFTERMATH')!;
    const finalMail = section.blocks.find((block) => block.id === 'T10_FINAL_MAIL')!;
    const aftermathPages = act4ReaderTextPages('T10', aftermath.id, aftermath.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    const finalMailPages = act4ReaderTextPages('T10', finalMail.id, finalMail.paragraphs, true)
      .filter((page) => page.role === 'page' || page.role === 'whole');
    expect(finalMailPages).toHaveLength(2);
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T10';
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.modules.act3.stage = 'T07';
    state.modules.act4.stage = 'T10';
    state.modules.act4.completedNarrativeSectionIds = Array.from({ length: 9 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
    state.modules.act4.completedNarrativeActionIds = [
      'A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED',
      'A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED',
    ];
    state.modules.act4.packageStep = 3;
    state.modules.act4.broadcastIndex = 6;
    state.modules.act4.viewedWakeMail = true;
    setAct4ReadingPosition('T10:current', {
      activeBlockId: aftermath.id,
      pageIndexByBlock: { [aftermath.id]: aftermathPages.length - 1 },
      openedCoverKeys: ['T10:current:T10_AFTERMATH:cover'],
    });
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);

    try {
      expect(host.querySelector('[data-block-id="T10_AFTERMATH"] .a4-reader__segment-pages')?.getAttribute('data-active-page'))
        .toBe(String(aftermathPages.length));
      const openMail = host.querySelector<HTMLButtonElement>('.a4-reader__interaction[aria-label="打开最后一封邮件"] button')!;
      await act(async () => { openMail.click(); });

      const mailBlock = host.querySelector<HTMLElement>('[data-block-id="T10_FINAL_MAIL"]')!;
      expect(mailBlock.querySelector('.a4-reader__cover')).toBeNull();
      expect(host.querySelector('[data-action-id^="A4_T10_OPEN_COVER_T10_FINAL_MAIL_"]')).toBeNull();
      expect(mailBlock.textContent).toContain('主题：关于王澳同学相关事项的说明');
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T10_FINAL_MAIL_OPENED');
      expect(manager.getState().modules.act4.completedNarrativeSectionIds).not.toContain('A4_READ_T10');
      expect(manager.getState().game.flags.FLAG_A4_T10_COMPLETE).not.toBe(true);
      expect(manager.getState().game.flags.FLAG_A4_COMPLETE).not.toBe(true);
      const readingIndex = host.querySelector<HTMLDetailsElement>('.a4-reader__index')!;
      const readingIndexSummary = readingIndex.querySelector('summary')!;
      expect(readingIndexSummary.textContent).toContain('当前材料：最后一封邮件 · 已显示 1 / 2 页');

      expect(mailBlock.textContent).toContain('几个月后，我收到了一封邮件。');
      expect(mailBlock.textContent).toContain('主题：关于王澳同学相关事项的说明');
      expect(host.querySelector('.investigation-shell__place h1')?.textContent).toBe('最后一封邮件');
      expect(mailBlock.querySelector('.a4-reader__pager span[aria-live="polite"]')?.textContent).toBe('1 / 2');
      const mailDirectory = mailBlock.querySelector<HTMLDetailsElement>('.a4-reader__page-directory')!;
      await act(async () => { mailDirectory.querySelector('summary')!.click(); });
      const directoryButtons = [...mailDirectory.querySelectorAll<HTMLButtonElement>('button')];
      expect(directoryButtons).toHaveLength(2);
      expect(directoryButtons[0].disabled).toBe(false);
      expect(directoryButtons[1].disabled).toBe(true);
      expect(directoryButtons[1].textContent).toBe('第 2 页');
      await act(async () => { mailBlock.querySelector<HTMLButtonElement>('.a4-reader__pager button:last-child')!.click(); });
      expect(host.querySelector('.investigation-shell__place h1')?.textContent).toBe('最后一封邮件');
      expect(mailBlock.querySelector('.a4-reader__pager span[aria-live="polite"]')?.textContent).toBe('2 / 2');
      expect(mailBlock.querySelector('.a4-reader__displayed-progress')).toBeNull();
      expect(readingIndexSummary.textContent).toContain('当前材料：最后一封邮件 · 已显示 2 / 2 页');
      await act(async () => { mailBlock.querySelector<HTMLButtonElement>('.a4-reader__pager button:first-child')!.click(); });
      expect(mailBlock.querySelector('.a4-reader__pager span[aria-live="polite"]')?.textContent).toBe('1 / 2');
      expect(mailBlock.querySelector('.a4-reader__displayed-progress')?.textContent).toBe('已显示至 2 / 2');
      expect(mailBlock.querySelector('.a4-reader__page-directory')?.textContent).not.toContain('第 2 段');
      expect(readingIndexSummary.textContent).toContain('当前材料：最后一封邮件 · 当前第 1 / 2 页，已显示至第 2 / 2 页');
      expect(readingIndexSummary.textContent).not.toContain('已完成章节');
      expect(readingIndex.open).toBe(false);
      await act(async () => { readingIndexSummary.click(); });
      expect(readingIndex.querySelector('.a4-reader__index-chapter-progress')?.textContent).toContain('章节推进：已完成章节 9 / 10');
      expect(readingIndexSummary.textContent).not.toContain('已完成章节');
      expect(manager.getState().modules.act4.completedNarrativeSectionIds).not.toContain('A4_READ_T10');
      expect(manager.getState().game.flags.FLAG_A4_COMPLETE).not.toBe(true);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('opens the private blog, preserves all fourteen posts, and continues into T04 from the feed end', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T03';
    state.modules.act4.stage = 'T03';
    state.modules.act4.completedNarrativeSectionIds = ['A4_READ_T01', 'A4_READ_T02'];
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED'];
    const manager = new StateManager(new EventBus(), state);
    let { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const source = act4NarrativeSections.find((item) => item.stage === 'T03')!.blocks[0].paragraphs;
    const expectedPosts = act4PrivateBlogPosts(source);
    const priorTransitionDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition');
    const startViewTransition = vi.fn((commit: () => void) => {
      commit();
      throw new Error('simulated view-transition failure after the update committed');
    });
    Object.defineProperty(document, 'startViewTransition', { configurable: true, value: startViewTransition });

    try {
      expect(host.querySelector('.a4-private-blog-gateway__source')?.textContent).toBe('微博：');
      expect(host.querySelector('.a4-reader__index summary')?.textContent).toContain('当前材料：私人动态 · 按日期浏览');
      expect(host.querySelector('.a4-reader__index summary')?.textContent).not.toContain('已显示 1 / 14 页');
      const viewBlog = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T03_VIEW_PRIVATE_BLOG"]')!;
      expect(viewBlog.textContent).toBe('查看动态');
      document.documentElement.dataset.sceneTransition = 'active';
      await act(async () => { viewBlog.click(); });
      delete document.documentElement.dataset.sceneTransition;
      expect(startViewTransition).not.toHaveBeenCalled();
      expect(host.querySelector('.investigation-shell__operations')).toBeNull();
      expect(host.querySelector('[data-action-id="A4_T03_VIEW_PRIVATE_BLOG"]')).toBeNull();

      const posts = [...host.querySelectorAll<HTMLElement>('.a4-private-blog__post')];
      expect(posts).toHaveLength(14);
      expect(host.querySelector('.a4-reader--private-blog-open')).not.toBeNull();
      expect(posts.map((post) => [post.querySelector('time')?.textContent, post.querySelector('.a4-private-blog__post-text')?.textContent]))
        .toEqual(expectedPosts.map((post) => [post.dateText, post.text]));
      expect(posts.some((post) => post.textContent?.includes(source.at(-1)!))).toBe(false);
      expect(host.querySelector('.a4-private-blog__source-context')?.textContent).toBe('微博：');
      expect(host.querySelector('.a4-private-blog__closing')?.textContent).toContain(source.at(-1));
      expect(host.querySelectorAll('.a4-private-blog__date-index button')).toHaveLength(14);
      expect(host.querySelector('.a4-private-blog')?.getAttribute('data-blog-post-count')).toBe('14');

      const firstBookmark = posts[0].querySelector<HTMLButtonElement>('.a4-private-blog__post-actions button')!;
      await act(async () => { firstBookmark.click(); });
      expect(firstBookmark.getAttribute('aria-pressed')).toBe('true');
      expect(JSON.parse(window.localStorage.getItem('anchao.a4-private-blog-bookmarks') ?? '[]')).toContain('2020-04-03');
      await act(async () => { firstBookmark.click(); });
      expect(firstBookmark.getAttribute('aria-pressed')).toBe('false');
      await act(async () => { firstBookmark.click(); });
      expect(firstBookmark.getAttribute('aria-pressed')).toBe('true');

      const lastDate = host.querySelector<HTMLButtonElement>('.a4-private-blog__date-index button:last-child')!;
      await act(async () => { lastDate.click(); });
      expect(document.activeElement).toBe(host.querySelector('#a4-private-post-2020-04-19'));

      await act(async () => { root.unmount(); });
      host.remove();
      ({ host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />));
      expect(host.querySelector('[data-reading-view="context"]')).not.toBeNull();
      await act(async () => { host.querySelector<HTMLButtonElement>('[data-action-id="A4_T03_VIEW_PRIVATE_BLOG"]')!.click(); });
      expect(host.querySelector('[data-reading-view="blog"]')).not.toBeNull();
      expect(startViewTransition).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.a4ReaderTransition).toBeUndefined();
      expect(host.querySelector('.a4-private-blog__post-actions button')?.getAttribute('aria-pressed')).toBe('true');
      const advanceNarrative = vi.spyOn(manager, 'advanceAct4NarrativeSection');
      await act(async () => { host.querySelector<HTMLButtonElement>('.a4-private-blog__closing button')!.click(); });

      expect(manager.getState().modules.act4.stage).toBe('T04');
      expect(host.querySelector('.a4-reader')?.getAttribute('data-reading-stage')).toBe('T04');
      expect(host.querySelector('.a4-reader--private-blog-open')).toBeNull();
      expect(startViewTransition).toHaveBeenCalledTimes(2);
      expect(advanceNarrative).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.a4ReaderTransition).toBeUndefined();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      delete document.documentElement.dataset.sceneTransition;
      delete document.documentElement.dataset.a4ReaderTransition;
      if (priorTransitionDescriptor) Object.defineProperty(document, 'startViewTransition', priorTransitionDescriptor);
      else Reflect.deleteProperty(document, 'startViewTransition');
    }
  });
});

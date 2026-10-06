import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { clearAct4ReadingPositions, setAct4ReadingPosition } from '../../core/uiPreferences';
import { StateManager } from '../../core/stateManager';
import { act4NarrativeSections } from '../../data/narrative/act4Narrative';
import { act4LegacyReaderTextPages, act4PrivateBlogPosts, act4ReaderTextPages } from '../../data/narrative/act4Presentation';
import { Act4Experience } from './Act4Experience';

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
  window.localStorage.removeItem('anchao.a4-reader-layout');
  window.localStorage.removeItem('anchao.a4-private-blog-bookmarks');
});

describe('Act 4 reader behavior', () => {
  it('maps a saved legacy T08 archive page back to the paragraph it began with', async () => {
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
      const newSegmentPages = act4ReaderTextPages('T08', archive.id, archive.paragraphs, true)
        .filter((page) => page.role === 'page' || page.role === 'whole');
      const mappedPage = newSegmentPages[newActivePage];

      expect(mappedPage.sceneId).toBe('T08_ARCHIVE_MIRROR');
      expect(mappedPage.from).toBeLessThanOrEqual(legacyPage.from);
      expect(mappedPage.to).toBeGreaterThan(legacyPage.from);
      expect(archiveView.textContent).toContain(archive.paragraphs[legacyPage.from]);
      expect(host.querySelector('.a4-reader__cover')).toBeNull();
      const persisted = JSON.parse(window.localStorage.getItem('anchao.ui.v1') ?? '{}');
      expect(persisted.act4Reading['T08:current'].pageIndexByBlock.T08_ARCHIVE).toBe(newActivePage);
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

    try {
      expect(host.querySelector('.a4-private-blog-gateway__source')?.textContent).toBe('微博：');
      const viewBlog = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T03_VIEW_PRIVATE_BLOG"]')!;
      expect(viewBlog.textContent).toBe('查看动态');
      await act(async () => { viewBlog.click(); });

      const posts = [...host.querySelectorAll<HTMLElement>('.a4-private-blog__post')];
      expect(posts).toHaveLength(14);
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
      expect(host.querySelector('.a4-private-blog__post-actions button')?.getAttribute('aria-pressed')).toBe('true');
      await act(async () => { host.querySelector<HTMLButtonElement>('.a4-private-blog__closing button')!.click(); });

      expect(manager.getState().modules.act4.stage).toBe('T04');
      expect(host.querySelector('.a4-reader')?.getAttribute('data-reading-stage')).toBe('T04');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

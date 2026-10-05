import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { clearAct4ReadingPositions, setAct4ReadingPosition } from '../../core/uiPreferences';
import { StateManager } from '../../core/stateManager';
import { act4NarrativeSections, act4NarrativeSources } from '../../data/narrative/act4Narrative';
import { act4ReaderTextPages } from '../../data/narrative/act4Presentation';
import { Act4Experience } from './Act4Experience';
import { Act4LaterExperience } from './Act4LaterExperience';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const renderExperience = async (component: ReactNode) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => { root.render(component); });
  return { host, root };
};

const pageNumber = (host: HTMLElement, blockId: string) => {
  const block = host.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)!;
  const shownPage = block.querySelector(':scope > .a4-reader__segment-pages')?.getAttribute('data-active-page');
  if (shownPage) return Number(shownPage);
  const coverAction = host.querySelector<HTMLButtonElement>(`[data-action-id*="OPEN_COVER_${blockId}_"]`);
  const coverPage = coverAction?.getAttribute('data-action-id')?.match(/_(\d+)$/)?.[1];
  return Number(coverPage ?? '1');
};

const openCurrentCover = async (host: HTMLElement, blockId: string) => {
  const block = host.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)!;
  if (!block.querySelector('.a4-reader__cover')) return;
  const openCover = host.querySelector<HTMLButtonElement>(`[data-action-id*="OPEN_COVER_${blockId}_"]`);
  expect(openCover, `${blockId} should expose its current cover action`).not.toBeNull();
  await act(async () => { openCover!.click(); });
};

const selectPage = async (host: HTMLElement, blockId: string, targetPage: number, openTargetCover = true) => {
  expect(targetPage).toBeGreaterThan(0);
  for (let step = 0; pageNumber(host, blockId) !== targetPage; step += 1) {
    expect(step).toBeLessThan(80);
    await openCurrentCover(host, blockId);
    const block = host.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)!;
    const buttons = block.querySelectorAll<HTMLButtonElement>('.a4-reader__pager button');
    const button = pageNumber(host, blockId) < targetPage ? buttons[1] : buttons[0];
    expect(button, `${blockId} should expose a pager to reach page ${targetPage}`).not.toBeUndefined();
    expect(button!.disabled, `${blockId} should allow paging from ${pageNumber(host, blockId)} to ${targetPage}`).toBe(false);
    await act(async () => { button!.click(); });
  }
  if (openTargetCover) await openCurrentCover(host, blockId);
  expect(pageNumber(host, blockId)).toBe(targetPage);
};

const selectLastPage = async (host: HTMLElement, blockId: string) => {
  for (let step = 0; step < 80; step += 1) {
    await openCurrentCover(host, blockId);
    const block = host.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`)!;
    const pageControl = block.querySelector<HTMLElement>(':scope > .a4-reader__segment-pages');
    expect(pageControl, `${blockId} should render its current page after opening a cover`).not.toBeNull();
    const activePage = Number(pageControl!.getAttribute('data-active-page'));
    const count = Number(pageControl!.getAttribute('data-page-count'));
    expect(count).toBeGreaterThan(0);
    if (activePage >= count) return;
    const next = block.querySelector<HTMLButtonElement>('.a4-reader__pager button:last-child');
    expect(next, `${blockId} should expose its next page`).not.toBeNull();
    expect(next!.disabled).toBe(false);
    await act(async () => { next!.click(); });
  }
  throw new Error(`${blockId} did not reach its last page`);
};

const advanceReaderUntilBlock = async (host: HTMLElement, blockId: string) => {
  for (let step = 0; step < 100; step += 1) {
    if (host.querySelector(`[data-block-id="${blockId}"]`)) return;
    const action = host.querySelector<HTMLButtonElement>('.investigation-shell__operations .investigation-navigation__action[data-action-id]');
    expect(action, `reader should expose a next action before ${blockId}`).not.toBeNull();
    expect(action!.getAttribute('data-action-state')).toBe('ready');
    expect(action!.disabled).toBe(false);
    await act(async () => { action!.click(); });
  }
  throw new Error(`${blockId} did not become visible through the reader actions`);
};

beforeEach(() => { clearAct4ReadingPositions(); });

const paragraphsInBlock = (host: HTMLElement, blockId: string) =>
  [...host.querySelectorAll<HTMLElement>(`[data-block-id="${blockId}"] .a4-reader__paragraph`)].map((element) => element.textContent ?? '');

describe('Act4 reading experience', () => {
  it('ignores a rapid second continue click after React has rendered the next section', async () => {
    vi.useFakeTimers();
    const state = createDefaultState();
    state.game.phase = 'A4_T05';
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const continueButton = () => host.querySelector<HTMLButtonElement>('[data-action-id$="_CONTINUE_READING"]')!;
    try {
      await selectLastPage(host, 'T05_ORIGINAL');
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T06');

      // Traverse the next section without advancing fake time, then test its fresh continuation action.
      await selectLastPage(host, 'T06_ORIGINAL');
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T06');

      await act(async () => { await vi.advanceTimersByTimeAsync(500); });
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T07');
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.useRealTimers();
    }
  });

  it('uses the shared reader and reveals archive material only after opening it', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T08';
    state.modules.act4.stage = 'T08';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4LaterExperience manager={manager} onExit={() => {}} />);
    const click = async (label: string) => act(async () => {
      const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(label));
      button?.click();
    });
    try {
      expect(host.querySelector('.a4-reader')?.getAttribute('data-act4-stage')).toBe('T08');
      expect(host.querySelector('[data-block-id="T08_RETURN"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T08_ARCHIVE"]')).toBeNull();
      expect(host.textContent).not.toContain('2008 年改造成功');
      await selectLastPage(host, 'T08_RETURN');
      const action = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T08_CONTINUE_READING"]')!;
      expect(action.getAttribute('data-action-state')).toBe('blocked');

      await click('查看 2008 年档案');
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T08_ARCHIVE_OPENED');
      await advanceReaderUntilBlock(host, 'T08_ARCHIVE');
      expect(host.querySelector('[data-block-id="T08_ARCHIVE"]')).not.toBeNull();
      const archiveBlock = act4NarrativeSections.find((section) => section.stage === 'T08')!.blocks.find((block) => block.id === 'T08_ARCHIVE')!;
      const archiveTarget = '黄子山，2008 年改造成功';
      const archiveParagraphIndex = archiveBlock.paragraphs.findIndex((paragraph) => paragraph.includes(archiveTarget));
      expect(archiveParagraphIndex).toBeGreaterThanOrEqual(0);
      const archivePages = act4ReaderTextPages('T08', archiveBlock.id, archiveBlock.paragraphs, true).filter((item) => item.role === 'page' || item.role === 'whole');
      const archiveTargetPage = archivePages.findIndex((page) => archiveParagraphIndex >= page.from && archiveParagraphIndex < page.to) + 1;
      await selectPage(host, 'T08_ARCHIVE', archiveTargetPage);
      expect(paragraphsInBlock(host, 'T08_ARCHIVE').join('')).toContain(archiveTarget);
      await selectLastPage(host, 'T08_ARCHIVE');
      await advanceReaderUntilBlock(host, 'T08_KITCHEN_ESCAPE');
      await selectLastPage(host, 'T08_KITCHEN_ESCAPE');
      expect(host.querySelector('[data-explanation-id="A4_EXPLAIN_T08"]')).not.toBeNull();

      await click('读完这一段，继续');
      expect(manager.getState().modules.act4.stage).toBe('T09');
      manager.advanceAct4NarrativeSection('T08');
      expect(manager.getState().modules.act4.stage).toBe('T09');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps 20200419 entry behind both mail checks and unlocks its excerpt only on success', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T02';
    state.modules.act4.stage = 'T02';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      expect(host.querySelector('[data-block-id="T02_PASSWORD_REVEAL"]')).toBeNull();
      await selectLastPage(host, 'T02_ORIGINAL');
      const login = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__interaction button')].find((button) => button.textContent === '登录账号')!;
      expect(login.disabled).toBe(true);
      const mailButtons = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__mail button')];
      await click(mailButtons[0]);
      expect(login.disabled).toBe(true);
      await click(mailButtons[1]);
      expect(login.disabled).toBe(false);
      const input = host.querySelector<HTMLInputElement>('#a4-shared-date')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '20200419');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await click(login);
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T02_LOGIN_SUCCEEDED');
      await advanceReaderUntilBlock(host, 'T02_PASSWORD_REVEAL');
      expect(host.querySelector('[data-block-id="T02_PASSWORD_REVEAL"]')).not.toBeNull();
      expect(host.querySelector('[data-explanation-id="A4_EXPLAIN_T02"]')).not.toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('reveals the last-page and broadcast blocks in order', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T09';
    state.modules.act4.stage = 'T09';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4LaterExperience manager={manager} onExit={() => {}} />);
    const click = async (label: string) => act(async () => {
      const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((item) => item.textContent?.includes(label));
      button?.click();
    });
    try {
      expect(host.querySelector('[data-block-id="T09_NOTE_HIDDEN"]')).toBeNull();
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).toBeNull();
      await selectLastPage(host, 'T09_REPLY_AND_LAST_PAGE');
      await click('把笔记藏到消防箱后');
      await advanceReaderUntilBlock(host, 'T09_NOTE_HIDDEN');
      expect(host.querySelector('[data-block-id="T09_NOTE_HIDDEN"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T09_WALK_TO_DOOR"]')).toBeNull();
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).toBeNull();
      await selectLastPage(host, 'T09_NOTE_HIDDEN');
      await advanceReaderUntilBlock(host, 'T09_WALK_TO_DOOR');
      expect(host.querySelector('[data-block-id="T09_WALK_TO_DOOR"]')).not.toBeNull();
      await selectLastPage(host, 'T09_WALK_TO_DOOR');
      await click('走向门外，听完广播');
      await advanceReaderUntilBlock(host, 'T09_BROADCAST');
      await selectLastPage(host, 'T09_BROADCAST');
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).not.toBeNull();
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toEqual(expect.arrayContaining(['A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED']));
      const source = act4NarrativeSections.find((section) => section.stage === 'T09')!.blocks.find((block) => block.id === 'T09_BROADCAST')!;
      expect(paragraphsInBlock(host, 'T09_BROADCAST')).toEqual(source.paragraphs);
      expect(host.querySelectorAll('[data-block-id="T09_BROADCAST"] .a4-reader__pager')).toHaveLength(0);
      expect(host.querySelectorAll('[data-block-id="T09_BROADCAST"] .a4-reader__paragraph--broadcast-word')).toHaveLength(6);
      expect([...host.querySelectorAll<HTMLElement>('[data-block-id="T09_BROADCAST"] .a4-reader__paragraph--broadcast-ending')].at(-1)?.textContent).toContain('回收完成');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('presents T05 as Wang Ao’s 2014 memory and makes every original paragraph available across pages', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T05';
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    try {
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toContain('2014 年');
      expect(host.querySelector('.investigation-shell__place span')).toBeNull();
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toContain('王澳当时的回忆');
      const originalBlock = host.querySelector<HTMLElement>('[data-block-id="T05_ORIGINAL"]')!;
      expect(originalBlock.dataset.sourceRefId).toBe('T05_BIRTHDAY');
      expect(act4NarrativeSources[originalBlock.dataset.sourceRefId!]?.sourceDocument).toBe('暗潮_0916_校订稿.pdf');

      const block = act4NarrativeSections.find((section) => section.stage === 'T05')!.blocks.find((item) => item.id === 'T05_ORIGINAL')!;
      await selectPage(host, 'T05_ORIGINAL', 1);
      const pageButtons = host.querySelectorAll<HTMLButtonElement>('[data-block-id="T05_ORIGINAL"] .a4-reader__pager button');
      expect([...pageButtons].map((button) => button.textContent)).toEqual(['上一页', '下一页']);
      const allPages: string[] = [];
      const pageCount = Number(host.querySelector('[data-block-id="T05_ORIGINAL"] .a4-reader__segment-pages')?.getAttribute('data-page-count'));
      expect(pageCount).toBeGreaterThan(5);
      for (let page = 1; page <= pageCount; page += 1) {
        await selectPage(host, 'T05_ORIGINAL', page);
        allPages.push(...paragraphsInBlock(host, 'T05_ORIGINAL'));
      }
      expect(allPages).toEqual(block.paragraphs);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('keeps T05 future scenes and recap clauses out of the current semantic page', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T05';
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeSectionIds = ['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04'];
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    const forbiddenBeforeReached = ['生日与门外来人', '生日白天', '家庭晚餐', '门外来人', '被带走以前', '晚饭中父亲又恢复', '他不愿离开'];
    try {
      expect(host.querySelector('.investigation-shell__place h1')?.textContent).toBe('晚自习');
      expect(host.querySelector('.a4-reader__heading h2')?.textContent).toBe('晚自习');
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toBe('2014 年 12 月 28 日 · 王澳 · 王澳当时的回忆');
      expect(host.querySelectorAll('.a4-reader__perspective')).toHaveLength(1);
      expect(host.querySelector('.a4-reader__eyebrow')).toBeNull();
      expect(host.querySelector('.a4-reader__cover-art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_001');
      const eveningText = host.textContent ?? '';
      for (const term of forbiddenBeforeReached) expect(eveningText).not.toContain(term);
      expect(host.querySelector('.a4-reader__explanation')).toBeNull();
      const originalBlock = host.querySelector<HTMLElement>('[data-block-id="T05_ORIGINAL"]')!;
      const sourceRefId = originalBlock.dataset.sourceRefId!;
      const t05Source = act4NarrativeSources[sourceRefId]!;
      expect(t05Source.sourceChapter).toBe('第十八章《小 A 和王澳》');
      expect(t05Source.startAnchor).toBeTruthy();
      expect(t05Source.endAnchor).toBeTruthy();
      await selectPage(host, 'T05_ORIGINAL', 1);
      const firstDirectory = [...host.querySelectorAll<HTMLButtonElement>('[data-block-id="T05_ORIGINAL"] .a4-reader__page-directory button')];
      expect(firstDirectory).toHaveLength(1);
      expect(firstDirectory[0].textContent).toMatch(/^晚自习/);

      const bridge = host.querySelector<HTMLDetailsElement>('.a4-reader__past-block')!;
      expect(bridge.open).toBe(false);
      await act(async () => { bridge.querySelector('summary')!.click(); });
      expect(bridge.textContent).toContain('当下的调查者没有亲历这些事');

      const t05Block = act4NarrativeSections.find((section) => section.stage === 'T05')!.blocks.find((item) => item.id === 'T05_ORIGINAL')!;
      const t05Pages = act4ReaderTextPages('T05', t05Block.id, t05Block.paragraphs, true).filter((item) => item.role === 'page' || item.role === 'whole');
      const birthdayPage = t05Pages.findIndex((item) => item.sceneIndex === 2) + 1;
      await selectPage(host, 'T05_ORIGINAL', birthdayPage, false);
      expect(host.querySelector('.a4-reader__cover-art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_003');
      await openCurrentCover(host, 'T05_ORIGINAL');
      const birthdayRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(birthdayRecap.open).toBe(false);
      expect(birthdayRecap.querySelector('summary')?.textContent).toBe('当前阅读页回顾');
      expect(birthdayRecap.textContent).toContain('生日白天里，王澳短暂觉得自己被家人理解');
      expect(birthdayRecap.textContent).not.toContain('晚饭中父亲又恢复');
      expect(birthdayRecap.textContent).not.toContain('他不愿离开');
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toContain('2014 年 12 月 29 日');

      const dinnerPage = t05Pages.findIndex((item) => item.sceneIndex === 3) + 1;
      await selectPage(host, 'T05_ORIGINAL', dinnerPage, false);
      expect(host.querySelector('.a4-reader__cover-art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_005');
      await openCurrentCover(host, 'T05_ORIGINAL');
      const dinnerRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(dinnerRecap.querySelector('summary')?.textContent).toBe('当前阅读页回顾');
      expect(dinnerRecap.textContent).toContain('晚饭中父亲又恢复原来的态度');
      expect(dinnerRecap.textContent).not.toContain('父母仍让来人把他带走');

      const takenPage = t05Pages.findIndex((item) => item.sceneIndex === 4) + 1;
      await selectPage(host, 'T05_ORIGINAL', takenPage, false);
      expect(host.querySelector('.a4-reader__cover-art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_006');
      await openCurrentCover(host, 'T05_ORIGINAL');
      const finalTakenPage = t05Pages.map((item) => item.sceneIndex).lastIndexOf(4) + 1;
      await selectPage(host, 'T05_ORIGINAL', finalTakenPage);
      const takenRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(takenRecap.querySelector('summary')?.textContent).toBe('被带走以前');
      expect(takenRecap.textContent).toContain('父母仍让来人把他带走');
      await selectPage(host, 'T05_ORIGINAL', 1);
      expect(host.querySelector('.a4-reader__explanation')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('shows nine hotel notebook pages and records the page currently read', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T01';
    state.modules.act4.stage = 'T01';
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    try {
      const source = act4NarrativeSections.find((section) => section.stage === 'T01')!.blocks[0];
      await selectPage(host, 'T01_ORIGINAL', 1);
      const pageButtons = host.querySelectorAll<HTMLButtonElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__pager button');
      expect([...pageButtons].map((button) => button.textContent)).toEqual(['上一页', '下一页']);
      const collected = [...host.querySelectorAll<HTMLElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__segment--lead .a4-reader__paragraph')].map((item) => item.textContent ?? '');
      for (let page = 1; page <= 9; page += 1) {
        await selectPage(host, 'T01_ORIGINAL', page);
        collected.push(...[...host.querySelectorAll<HTMLElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__segment--page .a4-reader__paragraph')].map((item) => item.textContent ?? ''));
        if (page === 9) collected.push(...[...host.querySelectorAll<HTMLElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__segment--ending .a4-reader__paragraph')].map((item) => item.textContent ?? ''));
      }
      expect(collected).toEqual(source.paragraphs);
      expect(manager.getState().modules.act4.readNotebookPages).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('lets a reader revisit a completed section and return to the same current page without advancing state', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T05';
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeSectionIds = ['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04'];
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    try {
      await selectPage(host, 'T05_ORIGINAL', 2);
      await act(async () => { host.querySelector<HTMLElement>('.a4-reader__index summary')!.click(); });
      const prior = host.querySelector<HTMLButtonElement>('[data-review-trigger="index-T04"]')!;
      expect(prior).toBeDefined();
      await act(async () => { prior.click(); });
      expect(host.querySelector('.a4-reader')?.getAttribute('data-reading-stage')).toBe('T04');
      expect(host.querySelector('.a4-reader__return-current')?.textContent).toBe('回到当前阅读');
      expect(manager.getState().modules.act4.stage).toBe('T05');

      await act(async () => { host.querySelector<HTMLButtonElement>('.a4-reader__return-current')!.click(); });
      expect(host.querySelector('.a4-reader')?.getAttribute('data-reading-stage')).toBe('T05');
      expect(host.querySelector('[data-block-id="T05_ORIGINAL"] .a4-reader__segment-pages')?.getAttribute('data-active-page')).toBe('2');
      expect(manager.getState().modules.act4.stage).toBe('T05');
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toEqual(['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED']);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('places the T10 recap behind both final-mail completion and an explicit open action', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T10';
    state.modules.act4.stage = 'T10';
    state.modules.act4.completedNarrativeSectionIds = Array.from({ length: 9 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
    state.modules.act4.completedNarrativeActionIds = [
      'A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED',
      'A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED',
    ];
    const manager = new StateManager(new EventBus(), state);
    const { host, root } = await renderExperience(<Act4LaterExperience manager={manager} onExit={() => {}} />);
    try {
      expect(host.querySelector('.a4-reader__final-recap')).toBeNull();
      expect(host.querySelector('[data-block-id="T10_FINAL_MAIL"]')).toBeNull();
      await selectLastPage(host, 'T10_AFTERMATH');
      const openMail = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__interaction button')].find((button) => button.textContent === '打开启明的最后一封邮件')!;
      expect(openMail).toBeDefined();
      await act(async () => { openMail.click(); });
      await advanceReaderUntilBlock(host, 'T10_FINAL_MAIL');
      expect(host.querySelector('[data-block-id="T10_FINAL_MAIL"]')).not.toBeNull();
      expect(host.querySelector('.a4-reader__final-recap')).toBeNull();

      await selectLastPage(host, 'T10_FINAL_MAIL');
      await act(async () => { host.querySelector<HTMLButtonElement>('[data-action-id="A4_T10_CONTINUE_READING"]')!.click(); });
      expect(manager.getState().game.flags.FLAG_A4_COMPLETE).toBe(true);
      const recap = host.querySelector<HTMLDetailsElement>('.a4-reader__final-recap')!;
      expect(recap.open).toBe(false);
      expect(recap.querySelector('.a4-reader__ending')).not.toBeNull();
      expect(recap.open).toBe(false);
      await act(async () => { recap.querySelector('summary')!.click(); });
      expect(recap.open).toBe(true);
      expect(recap.querySelector('.a4-reader__ending h3')?.textContent).toContain('第四幕阅读完成');
      expect(recap.textContent).toContain('时间线');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  it('does not turn a restored future notebook page into story progress without a reader action', async () => {
    const state = createDefaultState();
    state.game.phase = 'A4_T01';
    state.modules.act4.stage = 'T01';
    const manager = new StateManager(new EventBus(), state);
    setAct4ReadingPosition('T01:current', {
      activeBlockId: 'T01_ORIGINAL',
      pageIndexByBlock: { T01_ORIGINAL: 8 },
      openedCoverKeys: ['T01:current:T01_ORIGINAL:cover'],
    });
    const persistedUi = JSON.parse(localStorage.getItem('anchao.ui.v1') ?? '{}');
    expect(persistedUi.act4Reading['T01:current'].pageIndexByBlock.T01_ORIGINAL).toBe(8);
    const { host, root } = await renderExperience(<Act4Experience manager={manager} onExit={() => {}} />);
    try {
      expect(host.querySelector('[data-block-id="T01_ORIGINAL"]')?.querySelector(':scope > .a4-reader__segment-pages')?.getAttribute('data-active-page')).toBe('9');
      expect(manager.getState().modules.act4.readNotebookPages).toEqual([]);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

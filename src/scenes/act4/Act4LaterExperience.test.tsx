import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { act4NarrativeSections, act4NarrativeSources } from '../../data/narrative/act4Narrative';
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

const selectPage = async (host: HTMLElement, blockId: string, pageNumber: number) => {
  const button = host.querySelectorAll<HTMLButtonElement>(`[data-block-id="${blockId}"] .a4-reader__page-index button`)[pageNumber - 1];
  expect(button).toBeDefined();
  await act(async () => { button.click(); });
};

const selectLastPage = async (host: HTMLElement, blockId: string) => {
  const buttons = host.querySelectorAll<HTMLButtonElement>(`[data-block-id="${blockId}"] .a4-reader__page-index button`);
  if (buttons.length) await act(async () => { buttons[buttons.length - 1].click(); });
};

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
      await act(async () => { continueButton().click(); });
      expect(manager.getState().modules.act4.stage).toBe('T06');

      // This second click sees the newly rendered T06 button, as a native rapid double-click does.
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
      const action = host.querySelector<HTMLButtonElement>('[data-action-id="A4_T08_CONTINUE_READING"]')!;
      expect(action.getAttribute('data-action-state')).toBe('blocked');

      await selectLastPage(host, 'T08_RETURN');
      await click('查看 2008 年档案');
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toContain('A4_T08_ARCHIVE_OPENED');
      expect(host.querySelector('[data-block-id="T08_ARCHIVE"]')).not.toBeNull();
      expect(host.querySelector('[data-explanation-id="A4_EXPLAIN_T08"]')).not.toBeNull();
      await selectPage(host, 'T08_ARCHIVE', 2);
      expect(host.textContent).toContain('黄子山，2008 年改造成功');

      await click('收好这一段，继续阅读');
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
      const login = [...host.querySelectorAll<HTMLButtonElement>('.a4-reader__interaction button')].find((button) => button.textContent === '主动登录')!;
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
      expect(host.querySelector('[data-block-id="T09_NOTE_HIDDEN"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T09_WALK_TO_DOOR"]')).not.toBeNull();
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).toBeNull();
      await click('走向门外，听完广播');
      expect(host.querySelector('[data-block-id="T09_BROADCAST"]')).not.toBeNull();
      expect(manager.getState().modules.act4.completedNarrativeActionIds).toEqual(expect.arrayContaining(['A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED']));
      const source = act4NarrativeSections.find((section) => section.stage === 'T09')!.blocks.find((block) => block.id === 'T09_BROADCAST')!;
      expect(paragraphsInBlock(host, 'T09_BROADCAST')).toEqual(source.paragraphs);
      expect(host.querySelectorAll('[data-block-id="T09_BROADCAST"] .a4-reader__page-index')).toHaveLength(0);
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
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toContain('王澳 · 小说中的亲历回忆');
      expect(host.querySelector('.a4-reader__evidence-boundary')?.textContent).toContain('主角与小月没有亲历');
      expect(host.querySelector('[data-block-id="T05_ORIGINAL"] .a4-reader__source summary')?.textContent).toBe('查看原文出处');

      const block = act4NarrativeSections.find((section) => section.stage === 'T05')!.blocks.find((item) => item.id === 'T05_ORIGINAL')!;
      const pageButtons = host.querySelectorAll<HTMLButtonElement>('[data-block-id="T05_ORIGINAL"] .a4-reader__page-index button');
      expect(pageButtons.length).toBeGreaterThan(1);
      const allPages: string[] = [];
      for (let page = 1; page <= pageButtons.length; page += 1) {
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
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toBe('2014 年 12 月 28 日 · 王澳 · 小说中的亲历回忆');
      expect(host.querySelectorAll('.a4-reader__perspective')).toHaveLength(1);
      expect(host.querySelector('.a4-reader__eyebrow')).toBeNull();
      expect(host.querySelector('.a4-reader__art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_001');
      const eveningText = host.textContent ?? '';
      for (const term of forbiddenBeforeReached) expect(eveningText).not.toContain(term);
      expect(host.querySelector('.a4-reader__explanation')).toBeNull();
      const sourceDetails = host.querySelector<HTMLDetailsElement>('[data-block-id="T05_ORIGINAL"] .a4-reader__source')!;
      expect(sourceDetails.open).toBe(false);
      const t05Source = act4NarrativeSources[act4NarrativeSections.find((section) => section.stage === 'T05')!.blocks.find((item) => item.id === 'T05_ORIGINAL')!.sourceRefId!]!;
      await act(async () => { sourceDetails.querySelector('summary')!.click(); });
      expect(sourceDetails.textContent).toContain(t05Source.sourceDocument);
      expect(sourceDetails.textContent).toContain(t05Source.sourceChapter);
      expect(sourceDetails.textContent).toContain(t05Source.startAnchor);
      expect(sourceDetails.textContent).toContain(t05Source.endAnchor);
      expect([...host.querySelectorAll<HTMLButtonElement>('[data-block-id="T05_ORIGINAL"] .a4-reader__page-index button')].map((button) => button.textContent))
        .toEqual(['第 1 段', '第 2 段', '第 3 段', '第 4 段', '第 5 段']);

      const boundary = host.querySelector<HTMLDetailsElement>('.a4-reader__boundary')!;
      expect(boundary.open).toBe(false);
      await act(async () => { boundary.querySelector('summary')!.click(); });
      expect(boundary.open).toBe(true);
      expect(boundary.textContent).toContain('主角与小月没有亲历这些场景');
      const bridge = host.querySelector<HTMLDetailsElement>('.a4-reader__bridge')!;
      expect(bridge.open).toBe(false);
      await act(async () => { bridge.querySelector('summary')!.click(); });
      expect(bridge.textContent).toContain('当下的调查者没有亲历这些事');

      await selectPage(host, 'T05_ORIGINAL', 3);
      const birthdayRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(birthdayRecap.open).toBe(false);
      expect(birthdayRecap.querySelector('summary')?.textContent).toBe('当前阅读页回顾');
      expect(birthdayRecap.textContent).toContain('生日白天里，王澳短暂觉得自己被家人理解');
      expect(birthdayRecap.textContent).not.toContain('晚饭中父亲又恢复');
      expect(birthdayRecap.textContent).not.toContain('他不愿离开');
      expect(host.querySelector('.a4-reader__art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_003');
      expect(host.querySelector('.a4-reader__perspective')?.textContent).toContain('2014 年 12 月 29 日');

      await selectPage(host, 'T05_ORIGINAL', 4);
      const dinnerRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(dinnerRecap.querySelector('summary')?.textContent).toBe('当前阅读页回顾');
      expect(dinnerRecap.textContent).toContain('晚饭中父亲又恢复原来的态度');
      expect(dinnerRecap.textContent).not.toContain('父母仍让来人把他带走');
      expect(host.querySelector('.a4-reader__art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_005');

      await selectPage(host, 'T05_ORIGINAL', 5);
      const takenRecap = host.querySelector<HTMLDetailsElement>('.a4-reader__explanation')!;
      expect(takenRecap.querySelector('summary')?.textContent).toBe('被带走以前');
      expect(takenRecap.textContent).toContain('父母仍让来人把他带走');
      expect(host.querySelector('.a4-reader__art')?.getAttribute('data-illustration-id')).toBe('IMG_A4_T05_006');
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
      const pageButtons = host.querySelectorAll<HTMLButtonElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__page-index button');
      expect([...pageButtons].map((button) => button.textContent)).toEqual(Array.from({ length: 9 }, (_, index) => `第 ${index + 1} 页`));
      const collected = [...host.querySelectorAll<HTMLElement>('[data-block-id="T01_ORIGINAL"] .a4-reader__segment--lead .a4-reader__paragraph')].map((item) => item.textContent ?? '');
      for (let page = 1; page <= pageButtons.length; page += 1) {
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
      expect(host.querySelector('[data-action-id="A4_RETURN_TO_CURRENT_PROGRESS"]')?.textContent).toBe('返回当前阅读进度');
      expect(manager.getState().modules.act4.stage).toBe('T05');

      await act(async () => { host.querySelector<HTMLButtonElement>('[data-action-id="A4_RETURN_TO_CURRENT_PROGRESS"]')!.click(); });
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
      expect(host.querySelector('[data-block-id="T10_FINAL_MAIL"]')).not.toBeNull();
      expect(host.querySelector('.a4-reader__final-recap')).toBeNull();

      await act(async () => { host.querySelector<HTMLButtonElement>('[data-action-id="A4_T10_CONTINUE_READING"]')!.click(); });
      expect(manager.getState().game.flags.FLAG_A4_COMPLETE).toBe(true);
      const recap = host.querySelector<HTMLDetailsElement>('.a4-reader__final-recap')!;
      expect(recap.open).toBe(false);
      expect(recap.querySelector('.a4-reader__ending')).toBeNull();
      await act(async () => { recap.querySelector('summary')!.click(); });
      expect(recap.open).toBe(true);
      expect(recap.querySelector('.a4-reader__ending h3')?.textContent).toContain('第四幕阅读完成');
      expect(recap.textContent).toContain('时间线');
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
});

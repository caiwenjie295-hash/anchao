import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { createDefaultState } from '../core/defaultState';
import { EventBus, eventBus } from '../core/eventBus';
import { loadState } from '../core/saveManager';
import { StateManager, stateManager } from '../core/stateManager';
import { ACT2_RESUME_LABELS } from '../scenes/act2/Act2Experience';

/**
 * 第二幕 T01–T03 连续接线验收。
 * 只验证跨模块接线与连续状态链，不复制 WB-0002/0003/0004 的单元测试。
 */
describe('Second-act T01–T03 acceptance: wired into the real desktop', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  const pick = <T extends Element>(selector: string): T | null => container.querySelector<T>(selector);
  const pickAll = (selector: string): Element[] => [...container.querySelectorAll(selector)];
  const desktop = () => pick<HTMLElement>('main.desktop');
  const state = () => stateManager.getState();
  const flags = () => state().game.flags;
  const stage = () => state().modules.act2Research.stage;
  const bridge = () => state().modules.act2Research.bridge;
  const library = () => state().modules.act2Research.library;
  const autoEntries = () => state().modules.notepad.autoEntryIds;

  const click = async (element: Element | null) => {
    expect(element, 'element must exist before clicking').not.toBeNull();
    await act(async () => { (element as HTMLElement).click(); });
  };
  const clickText = async (text: string, selector = 'button') => {
    const target = pickAll(selector).find((item) => item.textContent?.includes(text));
    await click(target ?? null);
  };
  const run = async (action: () => void) => { await act(async () => { action(); }); };

  const mountApp = async () => {
    container = document.createElement('div');
    document.body.append(container);
    const nextRoot = createRoot(container);
    root = nextRoot;
    await act(async () => { nextRoot.render(createElement(App)); });
  };

  /** 幂等卸载：本文件允许在用例中途卸载以验证控制器 dispose。 */
  const unmountApp = async () => {
    const current = root;
    root = undefined;
    if (current) await act(async () => { current.unmount(); });
  };

  /** 走真实入口：第一幕完成后由幕末按钮启动第二幕。 */
  const startSecondAct = async () => {
    await run(() => {
      stateManager.setFlag('FLAG_A1_BU_FOUND', true);
      stateManager.addNotepadAutoEntry('NOTE_A1_K_001');
      stateManager.recordBrowserSearch('鸡公岭');
      stateManager.recordBrowserPageVisit('PAGE_A1_E_001');
      stateManager.setFlag('FLAG_A1_COMPLETE', true);
    });
    await click(pick('.act1-ending__continue'));
  };

  const completeT01 = async () => {
    await run(() => stateManager.recordBrowserSearch('鸡公岭 补'));
    await run(() => stateManager.recordBrowserSearch('双S 十字'));
    await run(() => stateManager.setAct2Stage('bridge'));
  };

  /** 用冻结公共 API 推进 T02，供 T03 与重载用例聚焦下游接线。 */
  const skipT02 = async () => {
    await run(() => {
      stateManager.talkToAct2Elder('ELDER_A2_T02_004');
      stateManager.showAct2Evidence('IMG_A1_I_001');
      stateManager.setHeibumuNameChoice('first', '黑');
      stateManager.setHeibumuNameChoice('middle', '补');
      stateManager.setHeibumuNameChoice('last', '母');
      stateManager.confirmHeibumuName();
    });
    await run(() => stateManager.setAct2Stage('library'));
  };

  const reachLibrary = async () => {
    await mountApp();
    await startSecondAct();
    await completeT01();
    await skipT02();
  };

  beforeEach(() => {
    localStorage.clear();
    stateManager.resetProgress();
    // jsdom 没有 matchMedia；桌面任务卡默认在宽屏展开，这里补齐以断言卡片内容。
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
  });

  afterEach(async () => {
    await unmountApp();
    container?.remove();
    vi.restoreAllMocks();
  });

  it('gates the second act behind the first-act completion flag and preserves first-act state', async () => {
    await mountApp();
    expect(pick('.act1-ending')).toBeNull();
    // 门槛：第一幕未完成时启动无效。
    await run(() => stateManager.startSecondAct());
    expect(state().game.act).toBe(1);
    expect(stage()).toBe('inactive');

    await startSecondAct();
    expect(pick('.act1-ending')).toBeNull();
    expect(state().game.act).toBe(2);
    expect(state().game.phase).toBe('A2_T01');
    expect(stage()).toBe('search');
    // 第一幕证据、搜索历史、笔记与 Flag 全部保留。
    expect(flags().FLAG_A1_COMPLETE).toBe(true);
    expect(flags().FLAG_A1_BU_FOUND).toBe(true);
    expect(autoEntries()).toContain('NOTE_A1_K_001');
    expect(state().modules.browser.queryHistory).toContain('鸡公岭');
    expect(state().modules.browser.visitedPageIds).toContain('PAGE_A1_E_001');
  });

  it('starts exactly one T01 controller and disposes it with the app', async () => {
    const onSpy = vi.spyOn(EventBus.prototype, 'on');
    await mountApp();
    await startSecondAct();
    expect(onSpy.mock.calls.filter(([eventName]) => eventName === 'browser:searched')).toHaveLength(1);

    await act(async () => { root!.unmount(); });
    root = undefined;
    await run(() => eventBus.emit('browser:searched', { query: '鸡公岭 补' }));
    expect(flags().FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(stage()).toBe('search');
  });

  it('continues from the first-act ending into one immediate second-act opening', async () => {
    await mountApp();
    await startSecondAct();
    expect(pick('.story-transition')?.getAttribute('data-story-transition')).toBe('TRANSITION_A2_T01');
    expect(pick('.story-transition-launch')).toBeNull();
    expect(desktop()?.parentElement?.hasAttribute('inert')).toBe(true);
    await click(pick('.story-transition button'));
    expect(pick('.story-transition')).toBeNull();
    expect(desktop()?.parentElement?.hasAttribute('inert')).toBe(false);
  });

  it('opens the old-mail destination only after the mother-message transition is confirmed', async () => {
    await mountApp();
    await click(pick('.story-transition button'));
    await run(() => {
      stateManager.setPhase('B');
      stateManager.setFlag('FLAG_A1_XIAOA_MISSING_KNOWN', true);
    });
    expect(pick('.story-transition-launch')).not.toBeNull();
    expect(state().desktop.windows.mail.status).toBe('closed');
    await click(pick('.story-transition-launch button'));
    expect(pick('.story-transition button')?.textContent).toBe('去翻旧邮件');
    await click(pick('.story-transition button'));
    expect(state().desktop.activeAppId).toBe('mail');
    expect(state().desktop.windows.mail.status).toBe('normal');
    expect(state().modules.storyTransitions.seenIds).toContain('TRANSITION_A1_B');
  });

  it('covers the bridge and library before either destination becomes operable', async () => {
    await mountApp();
    await startSecondAct();
    await click(pick('.story-transition button'));
    await completeT01();
    expect(pick('.story-transition')?.getAttribute('data-story-transition')).toBe('TRANSITION_A2_T02');
    expect(pick('.story-transition-launch')).toBeNull();
    expect(pick('.act2-experience')?.parentElement?.hasAttribute('inert')).toBe(true);
    await click(pick('.story-transition button'));
    expect(pick('.act2-bridge')).not.toBeNull();
    await skipT02();
    expect(pick('.story-transition')?.getAttribute('data-story-transition')).toBe('TRANSITION_A2_T03');
    expect(pick('.story-transition-launch')).toBeNull();
  });

  it.each([
    ['鸡公岭 补', '双S 十字'],
    ['双S 十字', '鸡公岭 补'],
  ])('converges on the bridge stage for search order %s → %s', async (first, second) => {
    await mountApp();
    await startSecondAct();

    await run(() => stateManager.recordBrowserSearch(first));
    expect(stage()).toBe('search');
    expect(flags().FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();

    await run(() => stateManager.recordBrowserSearch(second));
    expect(flags().FLAG_A2_SEARCH_BU_ATTEMPTED).toBe(true);
    expect(flags().FLAG_A2_SEARCH_SS_ATTEMPTED).toBe(true);
    expect(flags().FLAG_A2_WEB_SEARCH_FAILED).toBe(true);
    expect(flags().FLAG_A2_OFFLINE_RESEARCH_NEEDED).toBe(true);
    expect(stage()).toBe('search');
    await run(() => stateManager.setAct2Stage('bridge'));
    expect(stage()).toBe('bridge');
    expect(state().game.phase).toBe('A2_T02');
    expect(autoEntries()).toContain('NOTE_A2_T01_001');

    // 重复搜索幂等：不重复写笔记、不改变阶段。
    await run(() => stateManager.recordBrowserSearch(first));
    expect(autoEntries().filter((id) => id === 'NOTE_A2_T01_001')).toHaveLength(1);
    expect(stage()).toBe('bridge');
  });

  it('ignores unrelated searches and keeps the desktop task card in sync with the stage', async () => {
    await mountApp();
    await startSecondAct();
    await click(pick('.desktop-task-card__toggle'));
    expect(pick('.desktop-task-card')?.textContent).toContain('在网上再查一次');

    await run(() => stateManager.recordBrowserSearch('随便搜点什么'));
    expect(stage()).toBe('search');
    expect(flags().FLAG_A2_SEARCH_BU_ATTEMPTED).toBeUndefined();
    expect(flags().FLAG_A2_SEARCH_SS_ATTEMPTED).toBeUndefined();
    expect(flags().FLAG_A2_WEB_SEARCH_FAILED).toBeUndefined();

    await completeT01();
    expect(stage()).toBe('bridge');
    expect(pick('.desktop-task-card')?.textContent).toContain('去县城桥头');
    expect(pick('.desktop-task-card')?.textContent).not.toContain('黑补母');
  });

  it('mounts the bridge scene, keeps progress across desktop round-trips and advances explicitly', async () => {
    await mountApp();
    await startSecondAct();
    await completeT01();

    // 场景默认全屏打开，桌面被隔离。
    expect(pick('.act2-experience[data-act2-stage="bridge"]')).not.toBeNull();
    expect(pick('.act2-experience[data-asset-id="IMG_A2_T02_001"]')).not.toBeNull();
    expect(pick('.act2-bridge')).not.toBeNull();
    expect(desktop()?.getAttribute('aria-hidden')).toBe('true');
    expect(desktop()?.hasAttribute('inert')).toBe(true);

    await clickText('坐在石凳尽头', '.act2-bridge__elder');
    expect(bridge().talkedElderIds).toContain('ELDER_A2_T02_004');
    // 未出示证据前没有方言口述。
    expect(pick('.act2-bridge__phrase')).toBeNull();

    // 返回桌面：恢复桌面，出现中性继续入口。
    await click(pick('.act2-bridge__return'));
    expect(pick('.act2-bridge')).toBeNull();
    expect(desktop()?.getAttribute('aria-hidden')).toBe('false');
    expect(desktop()?.hasAttribute('inert')).toBe(false);
    expect(pick('.act2-experience--resume')?.textContent).toContain(ACT2_RESUME_LABELS.bridge);

    // 继续入口恢复场景，且已交互状态不丢。
    await click(pick('.act2-experience__continue'));
    expect(pick('.act2-bridge')).not.toBeNull();
    expect(desktop()?.hasAttribute('inert')).toBe(true);
    expect(bridge().talkedElderIds).toContain('ELDER_A2_T02_004');

    // 证据门槛：只有向线索老人出示证据后才有口述。
    await clickText('坐在石凳尽头', '.act2-bridge__elder');
    await click(pick('[aria-label="出示破庙外景照片"]'));
    expect(flags().FLAG_A2_ELDER_PHOTO_SHOWN).toBe(true);
    expect(flags().FLAG_A2_HEIBUMU_AUDIO_HEARD).toBe(true);
    expect(bridge().heardPhrase).toBe(true);
    expect(pick('.act2-bridge__phrase')?.textContent).toContain('黑捕木');
    expect(autoEntries()).toContain('NOTE_A2_T02_001');

    // 正确字谜 → 县志提示，但停留在桥头直到玩家显式前往图书馆。
    await click(pick('input[name="act2-bridge-first"][value="黑"]'));
    await click(pick('input[name="act2-bridge-middle"][value="补"]'));
    await click(pick('input[name="act2-bridge-last"][value="母"]'));
    await click(pick('.act2-bridge__confirm'));
    expect(flags().FLAG_A2_HEIBUMU_NAME_SOLVED).toBe(true);
    expect(flags().FLAG_A2_COUNTY_RECORD_HINT_KNOWN).toBe(true);
    expect(autoEntries()).toContain('NOTE_A2_T02_002');
    expect(stage()).toBe('bridge');

    await click(pick('.act2-bridge__continue'));
    expect(stage()).toBe('library');
    // bridge → library 后图书馆自动打开。
    expect(pick('.act2-library')).not.toBeNull();
    expect(desktop()?.hasAttribute('inert')).toBe(true);
  });

  it('requires the sequential library flow and never exposes T04 material', async () => {
    await reachLibrary();
    expect(stage()).toBe('library');
    expect(pick('.act2-library')).not.toBeNull();

    // 错误目录无推进。
    await click(pick('[data-section-id="SECTION_A2_T03_001"]'));
    expect(library().visitedSectionIds).toEqual(['SECTION_A2_T03_001']);
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBeUndefined();
    expect(pick('[data-volume-id="VOLUME_A2_T03_002"]')).toBeNull();

    // 正确目录 → 目标卷册可见。
    await click(pick('[data-section-id="SECTION_A2_T03_009"]'));
    expect(flags().FLAG_A2_LOCAL_GAZETTE_FOUND).toBe(true);
    await click(pick('.act2-library__shelf-hotspot'));
    await click(pick('[data-volume-id="VOLUME_A2_T03_002"]'));
    expect(library().openedVolumeIds).toEqual(['VOLUME_A2_T03_002']);
    expect(library().currentPageId).toBe('PAGE_A2_T03_003');

    // 目标页不可直达：页序不是可激活控件。
    expect(container.querySelectorAll('button[data-page-id], a[data-page-id], [role="button"][data-page-id]')).toHaveLength(0);

    await click(pick('.act2-library__next'));
    expect(library().currentPageId).toBe('PAGE_A2_T03_004');
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBeUndefined();
    await click(pick('.act2-library__next'));
    expect(library().currentPageId).toBe('PAGE_A2_T03_005');
    expect(flags().FLAG_A2_BUMUZHI_FOUND).toBe(true);
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBeUndefined();

    // 少于 3 个核心词不能摘录。
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(true);
    await click(pick('[data-keyword-id="KW_A2_T03_001"]'));
    await click(pick('[data-keyword-id="KW_A2_T03_002"]'));
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(true);
    await click(pick('[data-keyword-id="KW_A2_T03_003"]'));
    expect(pick<HTMLButtonElement>('.act2-library__excerpt-button')?.disabled).toBe(false);

    await click(pick('.act2-library__excerpt-button'));
    expect(library().markedKeywordIds).toEqual(['KW_A2_T03_001', 'KW_A2_T03_002', 'KW_A2_T03_003']);
    expect(library().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
    expect(autoEntries()).toContain('NOTE_A2_T03_001');
    expect(flags().FLAG_A2_BUMU_RULE_BASIC_KNOWN).toBe(true);
    expect(pick('.act2-library__conclusion')?.textContent).toContain('缺什么，就用某种东西补什么。');

    // 完成态停留，不出现 T04 内容或入口。
    const text = container.textContent ?? '';
    for (const term of ['记忆', '身份', '性格', '转移', '案例一']) expect(text).not.toContain(term);
    expect(text).toContain('县志只记到这里');

    // 返回桌面再继续，摘录结果仍在。
    await click(pick('.act2-library__return'));
    expect(desktop()?.hasAttribute('inert')).toBe(false);
    expect(pick('.act2-experience--resume-library')?.textContent).toContain(ACT2_RESUME_LABELS.library);
    await click(pick('.act2-experience__continue'));
    expect(pick('.act2-library')).not.toBeNull();
    expect(library().excerptedEntryIds).toEqual(['ENTRY_A2_T03_001']);
  });

  it('restores a migrated second-act save mid-second-act and clears everything on reset', async () => {
    await reachLibrary();
    await click(pick('[data-section-id="SECTION_A2_T03_009"]'));
    await click(pick('.act2-library__shelf-hotspot'));
    await click(pick('[data-volume-id="VOLUME_A2_T03_002"]'));
    await click(pick('.act2-library__next'));
    await click(pick('.act2-library__next'));

    const saved = loadState();
    expect(saved.schemaVersion).toBe(6);
    expect(saved.game.act).toBe(2);
    expect(saved.modules.act2Research.stage).toBe('library');
    expect(saved.modules.act2Research.library.currentPageId).toBe('PAGE_A2_T03_005');

    // 独立读取同一份存档时，第二幕当前阶段与第一幕状态都完整。
    const restored = new StateManager(new EventBus(), loadState());
    expect(restored.getState()).toEqual(saved);
    expect(restored.getState().game.flags.FLAG_A1_COMPLETE).toBe(true);

    // 清零：第二幕状态完全回到默认值，桌面不再被场景占用。
    await run(() => stateManager.resetProgress());
    expect(loadState().modules.act2Research).toEqual(createDefaultState().modules.act2Research);
    expect(state().modules.act2Research).toEqual(createDefaultState().modules.act2Research);
    expect(state().game.flags).toEqual({});
    expect(state().game.phase).toBe('A');
    expect(pick('.act2-library')).toBeNull();
    expect(desktop()?.hasAttribute('inert')).toBe(false);
    expect(pick('.act2-experience')).toBeNull();
  });

  it('does not let a stale "returned to desktop" state leak into the next playthrough', async () => {
    await reachLibrary();
    await click(pick('.act2-library__return'));
    expect(pick('.act2-experience--resume-library')).not.toBeNull();

    await run(() => stateManager.resetProgress());
    await startSecondAct();
    await completeT01();
    await skipT02();

    // 重玩到 library 阶段时，场景必须重新自动打开。
    expect(stage()).toBe('library');
    expect(pick('.act2-experience--resume')).toBeNull();
    expect(pick('.act2-library')).not.toBeNull();
    expect(desktop()?.hasAttribute('inert')).toBe(true);
  });
});

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { EventBus } from '../core/eventBus';
import { loadState } from '../core/saveManager';
import { StateManager, stateManager } from '../core/stateManager';

describe('Second-act T05 acceptance: Xiaoyue to school scene', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeEach(() => {
    localStorage.clear(); stateManager.resetProgress();
    container = document.createElement('div'); document.body.append(container); root = createRoot(container);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
  });
  afterEach(() => { act(() => root.unmount()); container.remove(); vi.restoreAllMocks(); });

  const click = async (selector: string) => act(async () => { (container.querySelector(selector) as HTMLElement).click(); });
  const clickText = async (text: string, selector = 'button') => {
    const target = [...container.querySelectorAll(selector)].find((item) => item.textContent?.includes(text));
    expect(target).toBeDefined(); await act(async () => { (target as HTMLElement).click(); });
  };

  it('gates Xiaoyue’s message until T04, enters only after the WeChat action and resumes from school after save', async () => {
    stateManager.setFlag('FLAG_A1_COMPLETE', true); stateManager.setFlag('FLAG_A1_SS_FOUND', true); stateManager.setFlag('FLAG_A2_OFFLINE_RESEARCH_NEEDED', true);
    stateManager.startSecondAct(); stateManager.setAct2Stage('bridge'); stateManager.setAct2Stage('library');
    stateManager.setFlag('FLAG_A2_BUMU_RULE_BASIC_KNOWN', true); stateManager.setAct2Stage('tales');
    for (const taleId of ['TALE_A2_T04_001', 'TALE_A2_T04_002', 'TALE_A2_T04_003']) { stateManager.readAct2Tale(taleId); stateManager.collectAct2Tale(taleId); }
    for (let index = 1; index <= 12; index += 1) stateManager.placeAct2TaleCard(`CARD_A2_T04_${String(index).padStart(3, '0')}`);
    stateManager.finishAct2TaleSorting(); stateManager.acknowledgeAct2TransferInference();
    await act(async () => { root.render(createElement(App)); });
    expect(container.querySelector('.act2-tales')).not.toBeNull();
    await click('.investigation-shell__exit');
    await act(async () => { stateManager.openApp('wechat'); });
    await clickText('小月', '.wechat-conversation');
    expect(container.textContent).toContain('回高中看看');
    await click('.wechat-school-transition button');
    expect(stateManager.getState().game.phase).toBe('A2_T05');
    expect(stateManager.getState().modules.act2Research.stage).toBe('school');
    expect(container.querySelector('.t05-school')).not.toBeNull();
    expect(stateManager.getState().game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);

    await click('.investigation-shell__exit');
    expect(container.querySelector('.act2-experience__continue')?.textContent).toBe('继续高中调查');
    const restored = new StateManager(new EventBus(), loadState()).getState();
    expect(restored.schemaVersion).toBe(12);
    expect(restored.modules.act2Research.stage).toBe('school');
    expect(restored.game.phase).toBe('A2_T05');
    expect(restored.game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);

    await click('.act2-experience__continue');
    await clickText('走廊', '.t05-school__map nav button');
    await clickText('老师办公室', '.t05-school__map nav button');
    await clickText('听听老师回忆', '.t05-school__image-hotspot');
    await clickText('记下老师的回忆');
    await click('button[aria-label="关闭"]');
    await clickText('走廊', '.t05-school__map nav button');
    await clickText('光荣榜', '.t05-school__map nav button');
    await clickText('查看历次名次', '.t05-school__image-hotspot');
    await clickText('记下这组名次');
    await click('button[aria-label="关闭"]');
    await clickText('走廊', '.t05-school__map nav button');
    await clickText('小A旧教室', '.t05-school__map nav button');
    await clickText('翻看学霸笔记', '.t05-school__image-hotspot');
    await clickText('打开双 S 比对');
    await clickText('半透明重合', '.t05-comparison__toolbar button');
    await clickText('确认图案一致', '.t05-comparison footer button');
    await click('button[aria-label="关闭"]');
    expect(stateManager.getState().modules.act2Research.school.symbolMatchConfirmed).toBe(true);
    expect(stateManager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).not.toBe(true);

    await clickText('班主任的回忆', '.t05-school__evidence-options button');
    await clickText('历次成绩记录', '.t05-school__evidence-options button');
    await clickText('休学后他的表现和成绩都有明显变化');
    expect(container.querySelector<HTMLButtonElement>('[data-action-id="A2_T05_CONFIRM_TIMELINE"]')?.getAttribute('data-action-state')).toBe('ready');
    await click('[data-action-id="A2_T05_CONFIRM_TIMELINE"]');
    expect(stateManager.getState().game.flags.FLAG_A2_SS_MATCH_CONFIRMED).toBe(true);
    expect(stateManager.getState().modules.notepad.autoEntryIds).toContain('NOTE_A2_T05_004');
    expect(container.querySelector('.t05-school__ending')).not.toBeNull();
    expect(container.querySelector('.desktop')?.getAttribute('aria-hidden')).toBe('true');

    await click('[data-action-id="A2_T05_TO_QIMING"]');
    expect(container.querySelector('.t05-school')).toBeNull();
    expect(container.querySelector('.desktop')?.getAttribute('aria-hidden')).toBe('false');
    expect(container.querySelector('.desktop')?.hasAttribute('inert')).toBe(false);
    expect(stateManager.getState().modules.act2Research.stage).toBe('qiming');
    expect(stateManager.getState().desktop.activeAppId).toBe('browser');
  });
});

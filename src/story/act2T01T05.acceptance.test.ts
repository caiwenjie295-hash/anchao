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
    stateManager.setFlag('FLAG_A1_COMPLETE', true); stateManager.setFlag('FLAG_A1_SS_FOUND', true);
    stateManager.startSecondAct(); stateManager.setAct2Stage('bridge'); stateManager.setAct2Stage('library');
    stateManager.setFlag('FLAG_A2_BUMU_RULE_BASIC_KNOWN', true); stateManager.setAct2Stage('tales');
    for (const taleId of ['TALE_A2_T04_001', 'TALE_A2_T04_002', 'TALE_A2_T04_003']) { stateManager.readAct2Tale(taleId); stateManager.collectAct2Tale(taleId); }
    for (let index = 1; index <= 12; index += 1) stateManager.placeAct2TaleCard(`CARD_A2_T04_${String(index).padStart(3, '0')}`);
    stateManager.finishAct2TaleSorting(); stateManager.acknowledgeAct2TransferInference();
    await act(async () => { root.render(createElement(App)); });
    expect(container.querySelector('.act2-tales')).not.toBeNull();
    await click('.act2-tales__return');
    await act(async () => { stateManager.openApp('wechat'); });
    await clickText('小月', '.wechat-conversation');
    expect(container.textContent).toContain('回高中看看');
    await click('.wechat-school-transition button');
    expect(stateManager.getState().game.phase).toBe('A2_T05');
    expect(stateManager.getState().modules.act2Research.stage).toBe('school');
    expect(container.querySelector('.t05-school')).not.toBeNull();
    expect(stateManager.getState().game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);

    await click('.t05-school__return');
    expect(container.querySelector('.act2-experience__continue')?.textContent).toBe('继续高中调查');
    const restored = new StateManager(new EventBus(), loadState()).getState();
    expect(restored.schemaVersion).toBe(4);
    expect(restored.modules.act2Research.stage).toBe('school');
    expect(restored.game.phase).toBe('A2_T05');
    expect(restored.game.flags.FLAG_A2_SCHOOL_ENTERED).toBe(true);
  });
});

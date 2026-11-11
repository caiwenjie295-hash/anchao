import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../../core/defaultState';
import { EventBus } from '../../core/eventBus';
import { StateManager } from '../../core/stateManager';
import { act3RequiredClueIds, act3StageDoc } from '../../data/act3Data';
import { Act3Investigation } from './Act3Investigation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Third-act investigation interface', () => {
  it('explains a known blocked route and opens the related local material with focus return', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_004';
    state.game.phase = 'A3_T04';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(container.querySelector('.photo-viewport')?.classList.contains('photo-viewport--spotlight')).toBe(true);
      expect(container.querySelector('.investigation-shell__photo-help summary')?.textContent).toContain('看图操作');
      expect(container.textContent).not.toContain('点击照片上的＋');
      const route = container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T04_004_005"]');
      expect(route).not.toBeNull();
      expect(route?.disabled).toBe(false);
      expect(route?.getAttribute('data-action-state')).toBe('blocked');
      await click(route!);
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('还没有核对蹲下检查角落纸边');
      const material = container.querySelector<HTMLButtonElement>('.investigation-navigation__material');
      expect(material?.textContent).toContain('查看相关材料');
      material!.focus();
      await click(material!);
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T04_PAPER_EDGE');
      expect(container.querySelector('[role="dialog"] h2')?.textContent).toContain('角落纸边');
      const close = container.querySelector<HTMLButtonElement>('[role="dialog"] button');
      expect(document.activeElement).toBe(close);
      await click(close!);
      expect(document.activeElement).toBe(container.querySelector('[data-clue-id="CLUE_A3_T04_PAPER_EDGE"]') ?? container.querySelector('.photo-viewport__fallback button'));
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('describes the empty-room marker as looking while the route remains a separate move action', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T04';
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_002';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const emptyRoom = container.querySelector('[data-clue-id="CLUE_A3_T04_EMPTY_ROOM"]')
        ?? [...container.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent?.includes('看看屋内'));
      expect(emptyRoom?.textContent).toContain('看看屋内');
      expect(container.querySelector('[data-action-id="A3_ROUTE_T04_002_003"]')?.textContent).toContain('下一张');
      expect(container.querySelector('[data-action-id="A3_ROUTE_T04_002_003"]')?.textContent).not.toContain('结束本阶段');
      expect(container.querySelector('[data-action-id="A3_ROUTE_T04_002_003"]')?.textContent).not.toContain('档案室');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps T03 room titles, places and marker prompts neutral until the matching observation', async () => {
    const cases = [
      { lensId: 'LENS_A3_T03_002', clueId: 'CLUE_A3_T03_24H', neutralTitle: '门牌近处', neutralPlace: '走廊房门', neutralPrompt: '查看门上标记', forbidden: '二十四小时', knownTitle: '二十四小时门', knownPlace: '二十四小时房门' },
      { lensId: 'LENS_A3_T03_003', clueId: 'CLUE_A3_T03_PEEPHOLES', neutralTitle: '门外的孔与挡板', neutralPlace: '走廊房门', neutralPrompt: '检查窥孔与挡板', forbidden: '二十四小时', knownTitle: '门外的孔与挡板', knownPlace: '走廊房门' },
      { lensId: 'LENS_A3_T03_004', clueId: 'CLUE_A3_T03_48_72H', neutralTitle: '门牌近处', neutralPlace: '走廊房门', neutralPrompt: '核对门上标记', forbidden: '七十二小时', knownTitle: '四十八与七十二小时门', knownPlace: '四十八与七十二小时门' },
    ];
    for (const scenario of cases) {
      localStorage.clear();
      const state = createDefaultState();
      state.game.phase = 'A3_T03';
      state.modules.act3.stage = 'T03';
      state.modules.act3.currentLensId = scenario.lensId;
      const manager = new StateManager(new EventBus(), state);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
        const heading = container.querySelector('.investigation-shell__place h1')?.textContent;
        const frame = container.querySelector('.photo-viewport__frame');
        const marker = container.querySelector<HTMLButtonElement>('.photo-viewport__fallback button');
        expect(heading).toBe(scenario.neutralPlace);
        expect(frame?.getAttribute('aria-label')).toContain(scenario.neutralTitle);
        expect(marker?.textContent).toBe(scenario.neutralPrompt);
        for (const value of [heading, frame?.getAttribute('aria-label'), marker?.textContent]) expect(value).not.toContain(scenario.forbidden);

        marker?.focus();
        expect(manager.getState().modules.act3.inspectedClueIds).not.toContain(scenario.clueId);
        await act(async () => { marker?.click(); });
        expect(manager.getState().modules.act3.inspectedClueIds).toContain(scenario.clueId);
        await act(async () => { container.querySelector<HTMLButtonElement>('[role="dialog"] button')?.click(); });
        expect(container.querySelector('.photo-viewport__fallback button')?.textContent).not.toBe(scenario.neutralPrompt);
        if (scenario.lensId === 'LENS_A3_T03_003') {
          expect(container.querySelector('.investigation-shell__place h1')?.textContent).toBe(scenario.neutralPlace);
          await act(async () => {
            manager.enterAct3Lens('LENS_A3_T03_002');
            manager.inspectAct3Clue('CLUE_A3_T03_24H');
            manager.enterAct3Lens('LENS_A3_T03_003');
          });
          expect(container.querySelector('.investigation-shell__place h1')?.textContent).toBe('二十四小时房门');
        } else {
          expect(container.querySelector('.investigation-shell__place h1')?.textContent).toBe(scenario.knownPlace);
        }
        expect(container.querySelector('.photo-viewport__frame')?.getAttribute('aria-label')).toContain(scenario.knownTitle);
      } finally {
        await act(async () => { root.unmount(); });
        container.remove();
      }
    }
  });

  it('keeps the exterior view separate from the close pillar action and its revealed lettering', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T01';
    state.modules.act3.stage = 'T01';
    state.modules.act3.currentLensId = 'LENS_A3_T01_001';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    const marker = (clueId: string, fallbackText: string) => container.querySelector<HTMLButtonElement>(`[data-clue-id="${clueId}"]`)
      ?? [...container.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent?.includes(fallbackText))!;
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(container.querySelector('.photo-viewport__frame')?.getAttribute('aria-label')).toContain('外门正面');
      expect(container.querySelector('.photo-viewport__frame')?.getAttribute('aria-label')).not.toContain('启明');
      expect(marker('CLUE_A3_T01_GATE_VIEW', '锈门')?.textContent).toBe('查看锈门与右柱');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T01_PILLAR_CLOSE');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T01_SIGN_REVEALED');

      await click(container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T01_001_002"]')!);
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T01_002');
      expect(container.querySelector('.photo-viewport__frame')?.getAttribute('aria-label')).toContain('右柱近景');
      expect(container.querySelector('.photo-viewport__frame')?.getAttribute('aria-label')).not.toContain('启明');
      expect(container.querySelector('.act3-investigation__narration-panel')?.textContent).toContain('金属牌边');
      expect(container.querySelector('.act3-investigation__narration-panel')?.textContent).not.toContain('启明青少年成长中心');
      expect(marker('CLUE_A3_T01_PILLAR_CLOSE', '爬山虎')?.textContent).toBe('拨开爬山虎');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T01_PILLAR_CLOSE');

      await click(marker('CLUE_A3_T01_PILLAR_CLOSE', '爬山虎'));
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T01_PILLAR_CLOSE');
      expect(container.querySelector('[role="dialog"]')?.textContent).toContain('启明');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('tracks narration unread state per lens without reopening text or changing observation state', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T04';
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_002';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const getNarration = () => container.querySelector<HTMLDetailsElement>('.act3-investigation__narration')!;
      expect(getNarration().open).toBe(false);
      expect(getNarration().querySelector('summary')?.getAttribute('aria-label')).toBe('现场旁白，未读');
      await act(async () => { getNarration().querySelector('summary')?.click(); });
      expect(getNarration().open).toBe(true);
      expect(getNarration().querySelector('summary')?.getAttribute('aria-label')).toBe('现场旁白');
      expect(manager.getState().modules.act3.inspectedClueIds).toEqual([]);

      await act(async () => { manager.enterAct3Lens('LENS_A3_T04_003'); });
      expect(getNarration().open).toBe(false);
      expect(getNarration().querySelector('summary')?.getAttribute('aria-label')).toBe('现场旁白，未读');
      await act(async () => { getNarration().querySelector('summary')?.click(); });
      expect(getNarration().querySelector('summary')?.getAttribute('aria-label')).toBe('现场旁白');

      await act(async () => { manager.enterAct3Lens('LENS_A3_T04_002'); });
      expect(getNarration().open).toBe(false);
      expect(getNarration().querySelector('summary')?.getAttribute('aria-label')).toBe('现场旁白');
      expect(getNarration().querySelector('.act3-investigation__narration-unread')).toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('separates this stage’s required observations from hotspots on the current photo', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T02';
    state.modules.act3.stage = 'T02';
    state.modules.act3.currentLensId = 'LENS_A3_T02_001';
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T02_CORRIDOR'];
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const fieldRecord = container.querySelector<HTMLDetailsElement>('.act3-investigation__field-record')!;
      expect(fieldRecord.open).toBe(false);
      await act(async () => { fieldRecord.querySelector('summary')?.click(); });
      const progress = container.querySelector('.act3-investigation__observation-progress');
      expect(progress?.textContent).toContain('本阶段必需观察0 / 2');
      expect(progress?.textContent).toContain('当前照片已观察1 / 1');
      expect(progress?.querySelector('[data-observation-state="observed"]')?.textContent).toContain('已观察');
      expect(container.querySelector('.investigation-shell__status')?.textContent).toBe('本图已清 · 本阶段还差2项');
      expect(progress?.querySelector('.act3-investigation__photo-observation-note')?.textContent).toContain('当前照片热点已全部观察');
      expect(progress?.querySelectorAll('.act3-investigation__missing-required button')).toHaveLength(0);
      expect(container.querySelector('[data-action-id="A3_ROUTE_T02_001_002"]')?.textContent).toContain('下一张');
      await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T02_001_002"]')?.click(); });
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T02_002');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T02_BLACKBOARD');
      expect(container.querySelector('[role="dialog"]')).toBeNull();
      expect(container.querySelector('.act3-investigation__missing-required button')).toBeNull();
      await act(async () => { container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T02_002_003"]')?.click(); });
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T02_003');
      const blackboard = container.querySelector<HTMLButtonElement>('[data-clue-id="CLUE_A3_T02_BLACKBOARD"]')
        ?? [...container.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent?.includes('黑板'))
        ?? null;
      expect(blackboard).not.toBeNull();
      await act(async () => { blackboard?.click(); });
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T02_BLACKBOARD');
      expect(container.querySelector('[role="dialog"] h2')?.textContent).toBeTruthy();
      expect(container.querySelector('[data-action-id="A3_T02_LEAVE_AND_CONTINUE"]')?.textContent).toContain('结束本阶段');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('numbers different photos that share the same named location', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T04';
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_004';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(container.querySelector('.act3-investigation__progress-counts')?.textContent).toContain('同名现场照片2 / 3');
      expect(container.textContent).toContain('同名现场照片 2 / 3');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it.each([
    { stage: 'T00' as const, lensId: 'LENS_A3_T00_001', clueId: 'CLUE_A3_T00_DEPART', role: 'optional', label: '可选观察', note: '可按需要查看，也可沿现有地点路线继续。', routeActionId: 'A3_ROUTE_T00_001_002', routeTarget: 'LENS_A3_T00_002', routeState: 'ready' },
    { stage: 'T00' as const, lensId: 'LENS_A3_T00_005', clueId: 'CLUE_A3_T00_CABLE_BREAK', role: 'required', label: '阶段必需', note: '阶段必需观察未完成', routeActionId: 'A3_ROUTE_T00_005_006', routeTarget: 'LENS_A3_T00_006', routeState: 'ready' },
    { stage: 'T04' as const, lensId: 'LENS_A3_T04_004', clueId: 'CLUE_A3_T04_PAPER_EDGE', role: 'route', label: '路线依据', note: '路线依据待查看', routeActionId: 'A3_ROUTE_T04_004_005', routeTarget: 'LENS_A3_T04_005', routeState: 'blocked' },
    { stage: 'T06' as const, lensId: 'LENS_A3_T06_007', clueId: 'CLUE_A3_T06_EMPTY_BASE', role: 'required route', label: '阶段必需 · 路线依据', note: '阶段必需观察未完成', routeActionId: 'A3_ROUTE_T06_007_008', routeTarget: 'LENS_A3_T06_008', routeState: 'blocked' },
    { stage: 'T06' as const, lensId: 'LENS_A3_T06_002', clueId: 'CLUE_A3_T06_ROOM', role: 'optional', label: '可选观察', note: '可按需要查看，也可沿现有地点路线继续。', routeActionId: 'A3_ROUTE_T06_002_003', routeTarget: 'LENS_A3_T06_003', routeState: 'ready' },
  ])('labels $clueId by its existing stage and route role without changing access', async (scenario) => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = `A3_${scenario.stage}`;
    state.modules.act3.stage = scenario.stage;
    state.modules.act3.currentLensId = scenario.lensId;
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const fieldRecord = container.querySelector<HTMLDetailsElement>('.act3-investigation__field-record')!;
      await act(async () => { fieldRecord.querySelector('summary')?.click(); });
      const matchingRow = container.querySelector<HTMLElement>(`.act3-investigation__photo-status li[data-observation-clue-id="${scenario.clueId}"]`)!;
      expect(matchingRow).toBeTruthy();
      expect(matchingRow.dataset.observationRole).toBe(scenario.role);
      expect(matchingRow.querySelector('.act3-investigation__observation-role')?.textContent).toBe(scenario.label);
      expect(container.querySelector('.act3-investigation__photo-observation-note')?.textContent).toContain(scenario.note);
      expect(container.querySelector('.investigation-shell__status')?.textContent).not.toContain('本图已清');

      const route = container.querySelector<HTMLButtonElement>(`[data-action-id="${scenario.routeActionId}"]`)!;
      expect(route.getAttribute('data-action-state')).toBe(scenario.routeState);
      if (scenario.routeState === 'blocked') {
        await act(async () => { route.click(); });
        expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('还没有核对');
      }
      else {
        await act(async () => { route.click(); });
        expect(manager.getState().modules.act3.currentLensId).toBe(scenario.routeTarget);
        expect(manager.getState().modules.act3.inspectedClueIds).not.toContain(scenario.clueId);
      }
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it.each([
    { stage: 'T06' as const, lensId: 'LENS_A3_T06_001', inspectedClueIds: [] as string[], requiredCount: 0, observedCount: 0, xiaoyueMemoryUnobserved: false, siteExited: false },
    { stage: 'T06' as const, lensId: 'LENS_A3_T06_002', inspectedClueIds: [] as string[], requiredCount: 0, observedCount: 0, xiaoyueMemoryUnobserved: false, siteExited: false },
    { stage: 'T01' as const, lensId: 'LENS_A3_T01_006', inspectedClueIds: act3RequiredClueIds('T01'), requiredCount: 3, observedCount: 1, xiaoyueMemoryUnobserved: false, siteExited: false },
    { stage: 'T06' as const, lensId: 'LENS_A3_T06_001', inspectedClueIds: act3RequiredClueIds('T06'), requiredCount: 3, observedCount: 0, xiaoyueMemoryUnobserved: false, siteExited: false },
    { stage: 'T02' as const, lensId: 'LENS_A3_T02_001', inspectedClueIds: ['CLUE_A3_T02_CORRIDOR'], requiredCount: 0, observedCount: 1, xiaoyueMemoryUnobserved: false, siteExited: false },
    { stage: 'T07' as const, lensId: 'LENS_A3_T07_004', inspectedClueIds: [], requiredCount: 0, observedCount: 0, xiaoyueMemoryUnobserved: true, siteExited: false },
    { stage: 'T07' as const, lensId: 'LENS_A3_T07_001', inspectedClueIds: act3RequiredClueIds('T07'), requiredCount: 4, observedCount: 0, xiaoyueMemoryUnobserved: false, siteExited: true },
  ])('reports current-photo hotspots before separate phase requirements ($lensId)', async (scenario) => {
    localStorage.clear();
    const lens = act3StageDoc(scenario.stage).lenses.find((item) => item.id === scenario.lensId)!;
    const state = createDefaultState();
    state.game.phase = `A3_${scenario.stage}`;
    state.game.flags.FLAG_A3_SITE_EXITED = scenario.siteExited;
    state.modules.act3.stage = scenario.stage;
    state.modules.act3.currentLensId = scenario.lensId;
    state.modules.act3.inspectedClueIds = scenario.inspectedClueIds;
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const requiredCount = act3RequiredClueIds(scenario.stage).filter((id) => scenario.inspectedClueIds.includes(id)).length;
      const observedCount = lens.hotspots.filter((hotspot) => scenario.inspectedClueIds.includes(hotspot.clueId)).length;
      const routeRequiredIds = new Set(act3StageDoc(scenario.stage).lenses.flatMap((item) => item.requiresClueIds ?? []));
      const pendingHotspots = lens.hotspots.filter((hotspot) => !scenario.inspectedClueIds.includes(hotspot.clueId));
      const pendingRequiredCount = pendingHotspots.filter((hotspot) => act3RequiredClueIds(scenario.stage).includes(hotspot.clueId)).length;
      const pendingRouteOnlyCount = pendingHotspots.filter((hotspot) => routeRequiredIds.has(hotspot.clueId) && !act3RequiredClueIds(scenario.stage).includes(hotspot.clueId)).length;
      const pendingOptionalCount = pendingHotspots.length - pendingRequiredCount - pendingRouteOnlyCount;
      const fieldRecord = container.querySelector<HTMLDetailsElement>('.act3-investigation__field-record')!;
      expect(fieldRecord.open).toBe(false);
      await act(async () => { fieldRecord.querySelector('summary')?.click(); });
      const counts = container.querySelector('.act3-investigation__progress-counts');
      const note = container.querySelector('.act3-investigation__photo-observation-note')?.textContent ?? '';
      const status = container.querySelector('.investigation-shell__status')?.textContent ?? '';
      const hotspotRows = [...container.querySelectorAll<HTMLElement>('.act3-investigation__photo-status li')];

      expect(requiredCount).toBe(scenario.requiredCount);
      expect(observedCount).toBe(scenario.observedCount);
      expect(counts?.textContent).toContain(`本阶段必需观察${requiredCount} / ${act3RequiredClueIds(scenario.stage).length}`);
      expect(counts?.textContent).toContain(`当前照片已观察${observedCount} / ${lens.hotspots.length}`);
      expect(hotspotRows).toHaveLength(lens.hotspots.length);
      expect(hotspotRows.filter((row) => row.dataset.observationState === 'observed')).toHaveLength(observedCount);
      expect(hotspotRows.filter((row) => row.dataset.observationState === 'pending')).toHaveLength(lens.hotspots.length - observedCount);

      if (observedCount < lens.hotspots.length) {
        expect(note).toContain(`当前照片还有`);
        expect(status).toContain('本图');
        expect(status).toContain('待看');
        expect(status).not.toContain('本图已清');
        expect(note).not.toMatch(/当前照片(?:没有|已无|已全部)/);
        expect(status).not.toMatch(/当前照片(?:没有|已无|已全部)/);
        if (pendingRequiredCount > 0) expect(note).toContain('阶段必需观察未完成');
        if (pendingRouteOnlyCount > 0) expect(note).toContain('路线依据待查看');
        if (pendingOptionalCount > 0) expect(note).toContain('可选观察');
        if (pendingRequiredCount === 0 && pendingRouteOnlyCount === 0) {
          expect(note).toContain('可按需要查看，也可沿现有地点路线继续');
          expect(note).not.toContain('请主动查看对应热点');
        }
        if (scenario.xiaoyueMemoryUnobserved) {
          expect(status).not.toMatch(/^本阶段还缺\d+处必需观察。先听小月/);
        }
      } else {
        expect(status).toContain('本图已清');
        expect(note).toContain('当前照片热点已全部观察');
        expect(note).not.toContain('未观察热点');
        if (requiredCount < act3RequiredClueIds(scenario.stage).length) {
          expect(note).toContain('本阶段还缺');
          expect(note).toContain('沿现有地点路线');
        }
      }
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps required routes in the secondary menu without per-clue shortcut buttons', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T00';
    state.modules.act3.stage = 'T00';
    state.modules.act3.currentLensId = 'LENS_A3_T00_004';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const fieldRecord = container.querySelector<HTMLDetailsElement>('.act3-investigation__field-record')!;
      await act(async () => { fieldRecord.querySelector('summary')?.click(); });
      const missing = [...container.querySelectorAll<HTMLElement>('.act3-investigation__missing-required li')];
      const cableItem = missing.find((item) => item.getAttribute('data-missing-clue-id') === 'CLUE_A3_T00_CABLE_BREAK')!;
      const drainItem = missing.find((item) => item.getAttribute('data-missing-clue-id') === 'CLUE_A3_T00_DRAIN_DISCOVERED')!;
      expect(cableItem.querySelector('button')).toBeNull();
      expect(drainItem.querySelector('button')).toBeNull();
      expect(drainItem.textContent).toContain('先沿现有路线完成眼前可查看的必需观察');

      const otherActions = container.querySelector<HTMLDetailsElement>('.investigation-navigation__other-actions')!;
      await act(async () => { otherActions.querySelector('summary')?.click(); });
      await click(container.querySelector<HTMLButtonElement>('[data-action-id="A3_T00_LEAVE_AND_CONTINUE"]')!);
      const related = [...container.querySelectorAll<HTMLButtonElement>('.investigation-navigation__material')];
      expect(related).toHaveLength(1);
      expect(related[0].textContent).toContain('电缆');
      expect(related[0].textContent).not.toContain('排水沟');

      await click(related[0]);
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T00_005');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T00_CABLE_BREAK');
      const cableMarker = container.querySelector<HTMLButtonElement>('[data-clue-id="CLUE_A3_T00_CABLE_BREAK"]')
        ?? container.querySelector<HTMLButtonElement>('.photo-viewport__fallback button')!;
      await click(cableMarker);
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T00_CABLE_BREAK');
      const close = container.querySelector<HTMLButtonElement>('[role="dialog"] button');
      if (close) await click(close);
      expect(container.querySelector('.act3-investigation__missing-required button')).toBeNull();
      expect(manager.getState().modules.act3.currentLensId).toBe('LENS_A3_T00_005');
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T00_CABLE_BREAK');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps place, objective and exit controls available from the compact photo-stage menu', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    const manager = new StateManager(new EventBus(), state);
    manager.startAct3();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(container.querySelector('.investigation-shell__place h1')?.textContent).toBe('再次出发');
      const photoTools = container.querySelector<HTMLDetailsElement>('.investigation-shell__photo-tools')!;
      expect(photoTools.open).toBe(false);
      await act(async () => { photoTools.querySelector('summary')?.click(); });
      expect(photoTools.open).toBe(true);
      expect(photoTools.textContent).toContain('核对山路上的人工痕迹');
      expect(photoTools.querySelector('.investigation-shell__exit')?.textContent).toBe('退出调查，返回桌面');
      expect(photoTools.querySelector('.investigation-shell__header-actions')).not.toBeNull();
      expect(container.querySelector('.investigation-shell__operations')).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps unrevealed vocabulary out of the complete T04 and T05 interface', async () => {
    for (const scenario of [
      { stage: 'T04' as const, lensId: 'LENS_A3_T04_004', forbidden: ['VVaKe', '蜘蛛', '曼陀罗'], blockedRoute: 'A3_ROUTE_T04_004_005' },
      { stage: 'T05' as const, lensId: 'LENS_A3_T05_004', forbidden: ['13aCK', '老鼠', '草垛', '玫瑰'], blockedRoute: 'A3_ROUTE_T05_004_005' },
    ]) {
      localStorage.clear();
      const state = createDefaultState();
      state.game.phase = `A3_${scenario.stage}` as typeof state.game.phase;
      state.modules.act3.stage = scenario.stage;
      state.modules.act3.currentLensId = scenario.lensId;
      const manager = new StateManager(new EventBus(), state);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
        const initialDom = container.textContent ?? '';
        for (const word of scenario.forbidden) expect(initialDom).not.toContain(word);
        const otherActions = container.querySelector<HTMLDetailsElement>('.investigation-navigation__other-actions')!;
        await act(async () => { otherActions.querySelector('summary')?.click(); });
        expect(container.querySelector(`[data-action-id="${scenario.blockedRoute}"]`)?.textContent).toContain('下一张');
        expect(container.querySelector(`[data-action-id="${scenario.blockedRoute}"]`)?.getAttribute('data-action-state')).toBe('blocked');

        const route = container.querySelector<HTMLButtonElement>(`[data-action-id="${scenario.blockedRoute}"]`)!;
        await act(async () => { route.click(); });
        const fullDomWithBlockedReason = container.textContent ?? '';
        for (const word of scenario.forbidden) expect(fullDomWithBlockedReason).not.toContain(word);
        expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('还没有核对');
        expect(container.querySelector('.investigation-navigation__material')?.textContent).toContain('查看相关材料');
      } finally {
        await act(async () => { root.unmount(); });
        container.remove();
      }
    }
  });

  it('shows each paper transcription only after that paper has been opened and includes the discovered close-up art', async () => {
    for (const scenario of [
      { stage: 'T04' as const, lensId: 'LENS_A3_T04_005', clueId: 'CLUE_A3_T04_VVAKE_PAPER', assetId: 'IMG_A3_DETAIL_T04_VVAKE_PAPER', title: 'VVaKe', words: ['蜘蛛', '雨伞', '白走廊', '台灯', '风车', '曼陀罗'] },
      { stage: 'T05' as const, lensId: 'LENS_A3_T05_005', clueId: 'CLUE_A3_T05_13ACK_PAPER', assetId: 'IMG_A3_DETAIL_T05_13ACK_PAPER', title: '13aCK', words: ['老鼠', '血', '草垛', '木房子', '玫瑰', '表'] },
      { stage: 'T06' as const, lensId: 'LENS_A3_T06_007', clueId: 'CLUE_A3_T06_EMPTY_BASE', assetId: 'IMG_A3_DETAIL_T06_EMPTY_BASE', title: '空神龛底座', words: [] },
    ]) {
      const state = createDefaultState();
      state.game.phase = `A3_${scenario.stage}` as typeof state.game.phase;
      state.modules.act3.stage = scenario.stage;
      state.modules.act3.currentLensId = scenario.lensId;
      const manager = new StateManager(new EventBus(), state);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
        expect(container.querySelector(`.act3-investigation__detail-evidence[data-asset-id="${scenario.assetId}"]`)).toBeNull();
        expect(container.querySelector('.act3-investigation__paper-transcript')).toBeNull();
        const marker = container.querySelector<HTMLButtonElement>(`[data-clue-id="${scenario.clueId}"]`)
          ?? container.querySelector<HTMLButtonElement>('.photo-viewport__fallback button');
        expect(marker).toBeDefined();
        await act(async () => { marker!.click(); });
        const detail = container.querySelector('[role="dialog"]')!;
        expect(detail.querySelector(`.act3-investigation__detail-evidence[data-asset-id="${scenario.assetId}"]`)).not.toBeNull();
        if (scenario.words.length) {
          expect(detail.querySelector('.act3-investigation__paper-transcript strong')?.textContent).toBe(scenario.title);
          for (const word of scenario.words) expect(detail.querySelector('.act3-investigation__paper-transcript')?.textContent).toContain(word);
        } else {
          expect(detail.querySelector('.act3-investigation__detail-evidence figcaption')?.textContent).toContain('近景');
        }
      } finally {
        await act(async () => { root.unmount(); });
        container.remove();
      }
    }
  });

  it('keeps archive and broadcast paper discovery, close-up reading and put-away on their original inspect actions', async () => {
    for (const scenario of [
      { stage: 'T04' as const, from: 'LENS_A3_T04_004', to: 'LENS_A3_T04_005', routeId: 'A3_ROUTE_T04_004_005', edgeClue: 'CLUE_A3_T04_PAPER_EDGE', paperClue: 'CLUE_A3_T04_VVAKE_PAPER', forbidden: ['VVaKe', '蜘蛛'], readTitle: 'VVaKe', nextHint: '相邻走廊' },
      { stage: 'T05' as const, from: 'LENS_A3_T05_004', to: 'LENS_A3_T05_005', routeId: 'A3_ROUTE_T05_004_005', edgeClue: 'CLUE_A3_T05_PAPER_EDGE', paperClue: 'CLUE_A3_T05_13ACK_PAPER', forbidden: ['13aCK', '老鼠'], readTitle: '13aCK', nextHint: '并排核对' },
    ]) {
      localStorage.clear();
      const state = createDefaultState();
      state.game.phase = `A3_${scenario.stage}` as typeof state.game.phase;
      state.modules.act3.stage = scenario.stage;
      state.modules.act3.currentLensId = scenario.from;
      const manager = new StateManager(new EventBus(), state);
      const container = document.createElement('div');
      document.body.append(container);
      const root = createRoot(container);
      const click = async (button: HTMLButtonElement) => act(async () => { button.click(); });
      const marker = (clueId: string, fallbackText: string) => container.querySelector<HTMLButtonElement>(`[data-clue-id="${clueId}"]`)
        ?? [...container.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent?.includes(fallbackText))!;
      const closeDetail = async () => {
        const close = container.querySelector<HTMLButtonElement>('[role="dialog"] button');
        if (close) await click(close);
      };
      try {
        await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
        const nearLensCopy = container.querySelector('.act3-investigation__narration-panel')?.textContent ?? '';
        if (scenario.stage === 'T05') {
          expect(nearLensCopy).toContain('还卡在原处');
          expect(nearLensCopy).not.toContain('纸片已从桌脚处取出');
        }

        await click(marker(scenario.edgeClue, '纸'));
        expect(manager.getState().modules.act3.inspectedClueIds).toEqual([scenario.edgeClue]);
        if (scenario.stage === 'T05') {
          expect(container.querySelector('.act3-investigation__narration-panel')?.textContent).toContain('纸片已从桌脚处取出');
        }
        await closeDetail();
        await click(container.querySelector<HTMLButtonElement>(`[data-action-id="${scenario.routeId}"]`)!);
        expect(manager.getState().modules.act3.currentLensId).toBe(scenario.to);

        const beforeRead = container.querySelector('.act3-investigation__narration-panel')?.textContent ?? '';
        expect(beforeRead).toContain('查看纸片');
        for (const word of scenario.forbidden) expect(beforeRead).not.toContain(word);
        expect(marker(scenario.paperClue, '纸片')?.textContent).toBe('查看纸片');
        expect(container.querySelector('.act3-investigation__paper-transcript')).toBeNull();

        await click(marker(scenario.paperClue, '纸片'));
        expect(manager.getState().modules.act3.inspectedClueIds).toEqual([scenario.edgeClue, scenario.paperClue]);
        expect(container.querySelector('[role="dialog"] .act3-investigation__paper-transcript strong')?.textContent).toBe(scenario.readTitle);
        expect(container.querySelector('[role="dialog"]')?.textContent).toContain('观察已记入调查记录');
        expect(container.querySelector('.act3-investigation__narration-panel')?.textContent).toContain('收好');
        expect(container.querySelector('.investigation-shell__photo-tools-panel')?.textContent).toContain(scenario.nextHint);
      } finally {
        await act(async () => { root.unmount(); });
        container.remove();
      }
    }
  });

  it('opens comparison-photo zoom above the clipped record panel and restores focus to its trigger', async () => {
    const state = createDefaultState();
    state.game.phase = 'A3_T06';
    state.modules.act3.stage = 'T06';
    state.modules.act3.currentLensId = 'LENS_A3_T06_008';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const record = container.querySelector<HTMLDetailsElement>('.act3-investigation__field-record')!;
      await act(async () => { record.querySelector('summary')?.click(); });
      const comparison = container.querySelector<HTMLDetailsElement>('.act3-investigation__comparison-record')!;
      await act(async () => { comparison.querySelector('summary')?.click(); });
      const trigger = [...container.querySelectorAll<HTMLButtonElement>('.act3-investigation__temple-compare button')]
        .find((button) => button.textContent?.includes('放大查看'))!;
      expect(trigger.disabled).toBe(false);
      await act(async () => { trigger.click(); });
      const dialog = document.body.querySelector<HTMLElement>('.investigation-detail[role="dialog"]')!;
      expect(dialog).not.toBeNull();
      expect(dialog.closest('.act3-investigation__field-record-panel')).toBeNull();
      expect(dialog.parentElement?.parentElement).toBe(document.body);
      await act(async () => { dialog.querySelector<HTMLButtonElement>('button')?.click(); });
      expect(document.activeElement).toBe(trigger);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('keeps the T07 return action understandable without exposing the hidden object or location', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T07';
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_001';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const initialDom = container.textContent ?? '';
      for (const word of ['消防栓', '缝隙', '包裹', '笔记本']) expect(initialDom).not.toContain(word);
      const exit = container.querySelector<HTMLButtonElement>('[data-action-id="A3_T07_LEAVE_SITE"]')!;
      expect(exit.textContent).toContain('与小月一起离开旧址');
      expect(exit.getAttribute('data-action-state')).toBe('blocked');
      await act(async () => { exit.click(); });
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('当前照片还有1处可选观察；可按需要查看，也可沿现有地点路线继续。');
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('听小月说完这一段');
      expect(container.querySelector('.investigation-navigation__material')?.textContent).toContain('小月的回忆');
      const completeDom = container.textContent ?? '';
      for (const word of ['消防栓', '缝隙', '包裹', '笔记本']) expect(completeDom).not.toContain(word);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('requires the memory, crouched view, pickup and first-page confirmation in order', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.phase = 'A3_T07';
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_004';
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      expect(manager.enterAct3Lens('LENS_A3_T07_005')).toBe(false);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_XIAOYUE_MEMORY'); });
      let entered = false;
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_005'); });
      expect(entered).toBe(true);
      expect(container.textContent).not.toContain('笔记本');
      expect(manager.getState().modules.act3.inspectedClueIds).not.toContain('CLUE_A3_T07_NOTEBOOK_PICKUP');

      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_BACK_GAP'); });
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_006'); });
      expect(entered).toBe(true);
      expect(container.querySelector('.act3-investigation__narration-panel h2')?.textContent).toContain('缝隙里的物件');
      const beforePickup = container.textContent ?? '';
      for (const word of ['笔记本', '包裹', 'A.W']) expect(beforePickup).not.toContain(word);
      const firstPageRoute = container.querySelector<HTMLButtonElement>('[data-action-id="A3_ROUTE_T07_006_007"]')!;
      expect(firstPageRoute.textContent).toContain('下一张');
      expect(firstPageRoute.getAttribute('data-action-state')).toBe('blocked');
      await act(async () => { firstPageRoute.click(); });
      expect(container.querySelector('.investigation-navigation__reason')?.textContent).toContain('当前取物动作');
      const relatedMaterial = container.querySelector('.investigation-navigation__material')?.textContent ?? '';
      expect(relatedMaterial).toContain('查看相关材料');
      expect(relatedMaterial).toContain('缝隙里的物件');
      expect(relatedMaterial).not.toContain('笔记本');
      expect(relatedMaterial).not.toContain('包裹');
      expect(relatedMaterial).not.toContain('A.W');
      for (const word of ['笔记本', '包裹', 'A.W']) expect(container.textContent).not.toContain(word);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_NOTEBOOK_PICKUP'); });
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T07_NOTEBOOK_PICKUP');
      expect(container.textContent).toContain('笔记本');
      expect(container.querySelector('.act3-investigation__narration-panel h2')?.textContent).toContain('取出的笔记本');
      await act(async () => { entered = manager.enterAct3Lens('LENS_A3_T07_007'); });
      expect(entered).toBe(true);
      await act(async () => { manager.inspectAct3Clue('CLUE_A3_T07_FIRST_PAGE'); });
      expect(manager.getState().modules.act3.inspectedClueIds).toContain('CLUE_A3_T07_FIRST_PAGE');
      expect(manager.getState().game.flags.FLAG_A3_COMPLETE).not.toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });

  it('uses one ready action to confirm the current stage and advance it', async () => {
    localStorage.clear();
    const state = createDefaultState();
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.game.phase = 'A3_T00';
    state.modules.act3.stage = 'T00';
    state.modules.act3.currentLensId = 'LENS_A3_T00_001';
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T00_CABLE_BREAK', 'CLUE_A3_T00_DRAIN_DISCOVERED'];
    const manager = new StateManager(new EventBus(), state);
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<Act3Investigation manager={manager} onReturnToDesktop={() => {}} />); });
      const leave = container.querySelector<HTMLButtonElement>('[data-action-id="A3_T00_LEAVE_AND_CONTINUE"]')!;
      expect(leave.textContent).toContain('结束本阶段');
      await act(async () => { leave.click(); });
      expect(manager.getState().modules.act3.stage).toBe('T01');
      expect(manager.getState().game.flags.FLAG_A3_OLD_ROAD_FOUND).toBe(true);
      expect(manager.getState().game.flags.FLAG_A3_GATE_REACHED).toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
    }
  });
});

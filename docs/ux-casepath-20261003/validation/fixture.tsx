import { useEffect, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { SAVE_KEY, saveState } from '../../../src/core/saveManager';
import type { AppState } from '../../../src/core/types';
import { buildCheckpoint, FIXTURE_MODES, type FixtureMode, type FixtureViewport } from './fixtureCheckpoints';
import {
  clearFixtureSnapshot,
  installFixtureMemoryStorage,
  requireFixtureSnapshot,
  writeFixtureSnapshot,
} from './fixtureStorage';
import './fixture.css';

const labels: Record<FixtureMode, string> = {
  'a1-start': '第一幕新存档 / 开场',
  'a1-f': '第一幕 F / 照片调查',
  'a1-ending': '第一幕结尾',
  bridge: '第二幕 / 桥头老人',
  library: '第二幕 / 地方志',
  tales: '第二幕 / 志异',
  school: '第二幕 / 学校',
  qiming: '第二幕 / 启明个案起点',
  'qiming-zhong': '第二幕 / 仅钟子月已记录',
  'qiming-both': '第二幕 / 两人均已记录',
  'qiming-legacy': '第二幕 / 旧版 T06 迁移状态',
  finale: '第二幕 / T07 收尾',
  'a3-t04': '第三幕 / T04 刚进入',
  'a4-t05': '第四幕 / T05 刚进入',
};

type BootContext = {
  mode: FixtureMode;
  viewport: FixtureViewport;
  restoredFromSnapshot: boolean;
  storage: Storage;
};

function describeState(state: AppState) {
  return JSON.stringify({
    act: state.game.act,
    phase: state.game.phase,
    act2Stage: state.modules.act2Research.stage,
    act2ReviewedCases: state.modules.act2Research.t06.reviewedCases.map(({ caseId }) => caseId),
    act2VisitedPages: state.modules.browser.visitedPageIds.filter((id) => id.startsWith('PAGE_A2_T06_')),
    act3Stage: state.modules.act3.stage,
    act3InspectedClues: state.modules.act3.inspectedClueIds,
    act3ConfirmedFlags: state.modules.act3.confirmedFlagIds,
    act4Stage: state.modules.act4.stage,
    act4CompletedSections: state.modules.act4.completedNarrativeSectionIds,
    act4CompletedActions: state.modules.act4.completedNarrativeActionIds,
    flags: Object.fromEntries(Object.entries(state.game.flags).filter(([id]) => /^(FLAG_A2_|FLAG_A3_|FLAG_A4_)/.test(id))),
    isolatedStorage: document.documentElement.dataset.uxCasepathStorageIsolation,
  }, null, 2);
}

function replaceFixtureUrl(mode: FixtureMode, viewport: FixtureViewport): void {
  const next = new URL(window.location.href);
  next.searchParams.set('mode', mode);
  next.searchParams.set('viewport', viewport);
  next.searchParams.set('controls', '1');
  next.searchParams.delete('restore');
  window.location.assign(next.toString());
}

async function boot(): Promise<void> {
  const rootElement = document.querySelector<HTMLDivElement>('#fixture-root');
  const errorElement = document.querySelector<HTMLDivElement>('#fixture-error');
  if (!rootElement || !errorElement) throw new Error('fixture HTML 缺少挂载节点。');

  const storageHandle = installFixtureMemoryStorage(window);
  const params = new URLSearchParams(window.location.search);
  const requestedMode = params.get('mode') ?? 'a1-start';
  if (!FIXTURE_MODES.includes(requestedMode as FixtureMode)) throw new Error(`未知 checkpoint：${requestedMode}`);
  const requestedViewport = params.get('viewport') ?? 'default';
  if (!(['default', 'maximized', 'mobile'] as const).includes(requestedViewport as FixtureViewport)) throw new Error(`未知窗口模式：${requestedViewport}`);
  const mode = requestedMode as FixtureMode;
  const viewport = requestedViewport as FixtureViewport;
  const restoreRequested = params.get('restore') === '1';
  const snapshot = restoreRequested ? requireFixtureSnapshot(window.sessionStorage, mode) : null;
  if (snapshot) {
    storageHandle.storage.setItem(SAVE_KEY, snapshot.serializedSave);
  } else {
    const state = buildCheckpoint(mode, viewport);
    if (!saveState(state, storageHandle.storage)) throw new Error('无法写入验收专用内存存档。');
  }

  // Import the production singleton and App only after memory isolation and save seeding.
  const [{ default: App }, { stateManager }] = await Promise.all([
    import('../../../src/App'),
    import('../../../src/core/stateManager'),
  ]);
  if (stateManager.getState().schemaVersion !== 13) throw new Error('正式 StateManager 未从 schema 13 fixture 状态启动。');

  const bootContext: BootContext = { mode, viewport, restoredFromSnapshot: snapshot !== null, storage: storageHandle.storage };
  let ready: (() => void) | undefined;
  const appMounted = new Promise<void>((resolve) => { ready = resolve; });

  function FixtureRoot() {
    const state = useSyncExternalStore(stateManager.subscribe, stateManager.getState, stateManager.getState);
    useEffect(() => {
      document.documentElement.dataset.uxCasepathAppMounted = 'true';
      ready?.();
      return () => { delete document.documentElement.dataset.uxCasepathAppMounted; };
    }, []);

    const controlsVisible = params.get('controls') === '1' && params.get('clean') !== '1';
    return <>
      <App />
      {controlsVisible && <details className="casepath-fixture">
        <summary>隔离验收控制 · {labels[mode]}</summary>
        <section className="casepath-fixture__panel" aria-label="验收控制面板">
          <div className="casepath-fixture__controls">
            <label>Checkpoint
              <select aria-label="选择 fixture checkpoint" value={mode} onChange={(event) => replaceFixtureUrl(event.target.value as FixtureMode, viewport)}>
                {FIXTURE_MODES.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
              </select>
            </label>
            <label>窗口状态
              <select aria-label="选择 fixture 窗口状态" value={viewport} onChange={(event) => replaceFixtureUrl(mode, event.target.value as FixtureViewport)}>
                <option value="default">默认窗口 860×560</option>
                <option value="maximized">浏览器最大化</option>
                <option value="mobile">移动浏览器宽度</option>
              </select>
            </label>
            <button type="button" aria-label="重挂载当前临时存档" onClick={() => {
              const serializedSave = bootContext.storage.getItem(SAVE_KEY);
              if (!serializedSave) throw new Error('StateManager 未写入当前临时存档，已停止重挂载。');
              writeFixtureSnapshot(window.sessionStorage, mode, serializedSave);
              const next = new URL(window.location.href);
              next.searchParams.set('mode', mode);
              next.searchParams.set('viewport', viewport);
              next.searchParams.set('controls', '1');
              next.searchParams.set('restore', '1');
              window.location.assign(next.toString());
            }}>重挂载当前临时存档</button>
          </div>
          <p>存档隔离：<strong>{document.documentElement.dataset.uxCasepathStorageIsolation === 'memory' ? '内存存档已启用' : '未验证'}</strong>；启动路径：{bootContext.restoredFromSnapshot ? '从同一 session 快照恢复，未重新生成 checkpoint' : '按模式生成一次合法 checkpoint'}。</p>
          <pre className="casepath-fixture__state" aria-label="当前剧情状态">{describeState(state)}</pre>
        </section>
      </details>}
      <span hidden data-fixture-mode={mode} data-fixture-viewport={viewport} data-fixture-restored={bootContext.restoredFromSnapshot ? 'true' : 'false'} />
    </>;
  }

  createRoot(rootElement).render(<FixtureRoot />);
  await appMounted;
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  if (snapshot) clearFixtureSnapshot(window.sessionStorage);
  document.documentElement.dataset.uxCasepathCheckpoint = mode;
  if (params.get('restore') === '1') {
    const clean = new URL(window.location.href);
    clean.searchParams.delete('restore');
    window.history.replaceState(null, '', clean.toString());
  }
}

void boot().catch((error: unknown) => {
  const element = document.querySelector<HTMLDivElement>('#fixture-error');
  if (element) {
    element.hidden = false;
    element.textContent = `验收夹具已停止：${error instanceof Error ? error.message : String(error)}。正式存档未被读取或清除。`;
  }
});

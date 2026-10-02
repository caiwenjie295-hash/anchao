import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import type { StateManager } from '../../../src/core/stateManager';
import '../../../src/styles.css';
import './browser-check.css';

if (document.documentElement.dataset.a2FixtureStorage !== 'isolated') {
  throw new Error('A2 fixture stopped: its in-memory save storage was not installed before application modules loaded.');
}

// Load the application modules only after the HTML bootstrap has isolated localStorage.
const [
  { EventBus },
  { createDefaultState },
  { StateManager: StateManagerConstructor },
  { libraryCorrectSectionId, libraryTargetPageId, libraryTargetVolumeId },
  { LibraryResearch },
  { TalesInvestigation },
] = await Promise.all([
  import('../../../src/core/eventBus'),
  import('../../../src/core/defaultState'),
  import('../../../src/core/stateManager'),
  import('../../../src/data/act2LibraryData'),
  import('../../../src/scenes/act2/LibraryResearch'),
  import('../../../src/scenes/act2/TalesInvestigation'),
]);

type Scenario = 'library-locked' | 'library-open' | 'tales';
const scenarios: { id: Scenario; label: string }[] = [
  { id: 'library-locked', label: '地方志 · 未缩小目录' },
  { id: 'library-open', label: '地方志 · 书架入口已开放' },
  { id: 'tales', label: '同一阅读空间 · 卷末旧录' },
];

function createCheckManager(scenario: Scenario): StateManager {
  const state = createDefaultState();
  state.game.act = 2;
  state.game.phase = scenario === 'tales' ? 'A2_T04' : 'A2_T03';
  state.modules.act2Research.stage = scenario === 'tales' ? 'tales' : 'library';
  if (scenario === 'library-open' || scenario === 'tales') {
    state.modules.act2Research.library.visitedSectionIds = [libraryCorrectSectionId];
    state.modules.act2Research.library.openedVolumeIds = [libraryTargetVolumeId];
    state.modules.act2Research.library.currentPageId = libraryTargetPageId;
    state.game.flags.FLAG_A2_LIBRARY_ENTERED = true;
    state.game.flags.FLAG_A2_LOCAL_GAZETTE_FOUND = true;
  }
  if (scenario === 'tales') {
    state.game.flags.FLAG_A2_BUMUZHI_FOUND = true;
    state.game.flags.FLAG_A2_BUMU_RULE_BASIC_KNOWN = true;
  }
  return new StateManagerConstructor(new EventBus(), state);
}

function BrowserCheck() {
  const [scenario, setScenario] = useState<Scenario>('library-locked');
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const manager = useMemo(() => createCheckManager(scenario), [scenario]);
  const stage = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState).modules.act2Research.stage;
  const unavailableImage = imageUnavailable ? '/__a2_fixture_missing_shelf_image__.jpg' : undefined;

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    const fixture = controls?.parentElement;
    if (!controls || !fixture) return;
    const measure = () => fixture.style.setProperty('--a2-fixture-controls-height', `${controls.getBoundingClientRect().height}px`);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(controls);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return <div className="a2-browser-check">
    <div ref={controlsRef} className="a2-browser-check__controls" aria-label="A2 本地验收控制">
      <label className="a2-browser-check__scenario">验收片段
        <select aria-label="选择验收片段" value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>
          {scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label className="a2-browser-check__image"><input type="checkbox" checked={imageUnavailable} onChange={(event) => setImageUnavailable(event.target.checked)} />模拟书架照片载入失败</label>
      <div className="a2-browser-check__status">
        <span data-fixture-manager-stage={stage}>当前场景阶段：{stage}</span>
        <span>仅用正式组件、数据与图片；起始状态由独立测试 StateManager 提供。</span>
        <span>存档隔离：独立内存</span>
      </div>
    </div>
    {stage === 'tales'
      ? <TalesInvestigation manager={manager} shelfImageSrc={unavailableImage} />
      : stage === 'library'
        ? <LibraryResearch manager={manager} shelfImageSrc={unavailableImage} />
        : <p className="a2-browser-check__unsupported">当前验收片段不展示阶段 {stage}。</p>}
  </div>;
}

createRoot(document.getElementById('a2-browser-check')!).render(<BrowserCheck />);

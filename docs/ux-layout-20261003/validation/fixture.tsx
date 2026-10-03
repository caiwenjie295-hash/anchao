import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { createRoot } from 'react-dom/client';
import { installFixtureMemoryStorage } from './fixtureStorage';

async function bootFixture() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('宽松布局 fixture root 缺失。');

  try {
    installFixtureMemoryStorage(window);
  } catch (error) {
    rootElement.textContent = `无法隔离正式存档，fixture 已停止：${String(error)}`;
    return;
  }

  // Persistence, state, data and scene modules load only after localStorage is replaced and checked.
  const [defaultStateModule, eventBusModule, stateManagerModule, experienceModule] = await Promise.all([
    import('../../../src/core/defaultState'),
    import('../../../src/core/eventBus'),
    import('../../../src/core/stateManager'),
    import('../../../src/scenes/act2/Act2Experience'),
  ]);
  const { createDefaultState } = defaultStateModule;
  const { EventBus } = eventBusModule;
  const { StateManager } = stateManagerModule;
  const { Act2Experience } = experienceModule;

  type Mode = 'school-unread' | 'school-sources' | 'bridge';
  const modes: Array<{ id: Mode; label: string; description: string }> = [
    { id: 'school-unread', label: '高中 · 未读开始', description: '从刚进入高中调查的合法状态开始，沿地点、照片热点和老师/成绩记录读出材料。' },
    { id: 'school-sources', label: '高中 · 已读材料', description: '从合法的已读回忆、成绩记录与双 S 核对状态开始；来源尚未选择，可检查折叠、支持数和确认门槛。' },
    { id: 'bridge', label: '桥头 · 完整路线', description: '从已完成 T01 搜索的桥头初始状态开始：先闲谈、追问鸡公岭、出示照片，再按口述选择三字。' },
  ];
  const params = new URLSearchParams(window.location.search);
  const requestedMode = modes.find((item) => item.id === params.get('mode'))?.id;
  const initialMode: Mode = requestedMode ?? 'school-unread';
  const cleanViewport = params.get('clean') === '1';

  function makeSchoolManager(withSources: boolean) {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T04';
    state.game.flags = {
      FLAG_A1_COMPLETE: true,
      FLAG_A1_SS_FOUND: true,
      FLAG_A2_TALES_SORTED: true,
      FLAG_A2_TRANSFER_RULE_INFERRED: true,
    };
    state.modules.act2Research.stage = 'tales';
    state.modules.act2Research.tales = {
      ...state.modules.act2Research.tales,
      sorted: true,
      inferenceAcknowledged: true,
    };
    const manager = new StateManager(new EventBus(), state);
    manager.enterAct2School();

    if (withSources) {
      manager.visitAct2SchoolArea('AREA_A2_T05_TEACHER_OFFICE');
      manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_TEACHER');
      manager.acknowledgeAct2TeacherAccount();
      manager.visitAct2SchoolArea('AREA_A2_T05_HONOR_ROLL');
      manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_RANKS');
      manager.readAct2SchoolRanks();
      manager.visitAct2SchoolArea('AREA_A2_T05_XIAOA_CLASSROOM');
      manager.inspectAct2SchoolHotspot('HOTSPOT_A2_T05_SCHOLAR_NOTE');
      manager.inspectAct2SchoolNotebook();
      manager.confirmAct2SchoolSymbolMatch();
    }
    return manager;
  }

  function makeBridgeManager() {
    const state = createDefaultState();
    state.game.act = 2;
    state.game.phase = 'A2_T01';
    state.game.flags = { FLAG_A1_COMPLETE: true, FLAG_A2_OFFLINE_RESEARCH_NEEDED: true };
    state.modules.act2Research.stage = 'search';
    const manager = new StateManager(new EventBus(), state);
    manager.setAct2Stage('bridge');
    return manager;
  }

  const makeManager = (mode: Mode) => mode === 'bridge'
    ? makeBridgeManager()
    : makeSchoolManager(mode === 'school-sources');
  const root = createRoot(rootElement);

  function Fixture() {
    const [mode, setMode] = useState<Mode>(initialMode);
    const [manager, setManager] = useState(() => makeManager(initialMode));
    const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
    const [generation, setGeneration] = useState(0);
    const [toolbarHeight, setToolbarHeight] = useState(0);
    const toolbarRef = useRef<HTMLElement>(null);
    const selectedMode = modes.find((item) => item.id === mode)!;
    const actualStage = state.modules.act2Research.stage;
    const inScope = actualStage === 'school' || actualStage === 'bridge';
    const stageNames: Record<string, string> = {
      inactive: '幕间', search: 'T01 线索搜索', bridge: 'T02 桥头', library: 'T03 地方志',
      tales: 'T04 志异', school: 'T05 高中', qiming: 'T06 启明核查', finale: 'T07 影像核对',
    };

    useLayoutEffect(() => {
      const toolbar = toolbarRef.current;
      if (!toolbar) return;
      const measure = () => setToolbarHeight(Math.ceil(toolbar.getBoundingClientRect().height));
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(toolbar);
      return () => observer.disconnect();
    }, []);

    const reset = (nextMode: Mode = mode) => {
      setMode(nextMode);
      setManager(makeManager(nextMode));
      setGeneration((value) => value + 1);
    };
    const rootStyle = { '--ux-layout-fixture-toolbar-height': `${toolbarHeight}px` } as CSSProperties;

    return <main className={`ux-layout-fixture${cleanViewport ? ' ux-layout-fixture--clean' : ''}`} style={rootStyle} data-storage-isolation="memory">
      {!cleanViewport && <header className="ux-layout-fixture__toolbar" ref={toolbarRef}>
        <div className="ux-layout-fixture__toolbar-row">
          <strong>第二幕 · 定向验收</strong>
          <label htmlFor="ux-layout-fixture-mode">场景</label>
          <select id="ux-layout-fixture-mode" value={mode} onChange={(event) => reset(event.currentTarget.value as Mode)}>
            {modes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <button type="button" onClick={() => reset()}>重置</button>
          <details className="ux-layout-fixture__help">
            <summary>说明</summary>
            <div className="ux-layout-fixture__help-popover">
              <p>{selectedMode.description}</p>
              <p>正式 Act2Experience 包装层、组件、样式与图片；场景状态保存在独立内存 Storage。工具条按实测高度避让固定壳层。添加 <code>&amp;clean=1</code> 可隐藏工具条并以零偏移还原原始视口。</p>
            </div>
          </details>
        </div>
      </header>
      }
      <div className="ux-layout-fixture__scene" key={`${mode}-${generation}`}>
        {inScope ? <Act2Experience
          stage={actualStage}
          sceneOpen
          onDismissScene={() => {}}
          onResumeScene={() => {}}
          manager={manager}
        /> : <section className="ux-layout-fixture__scope-note" role="status" aria-live="polite">
          <h2>当前定向片段已完成</h2>
          <p>真实 StateManager 当前阶段：<strong>{stageNames[actualStage] ?? actualStage}</strong>（{actualStage}）。此入口只挂载高中和桥头场景，不会覆盖、回退或伪造游戏状态。</p>
          <p>{cleanViewport ? '刷新此 clean URL 可重新开始当前片段。' : '可在顶部选择或重置片段。'}</p>
        </section>}
      </div>
    </main>;
  }

  root.render(<Fixture />);
}

void bootFixture().catch((error: unknown) => {
  const rootElement = document.getElementById('root');
  if (rootElement) rootElement.textContent = `宽松布局 fixture 加载失败：${String(error)}`;
});

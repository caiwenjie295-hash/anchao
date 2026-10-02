import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { EventBus } from '../../../src/core/eventBus';
import { createDefaultState } from '../../../src/core/defaultState';
import { StateManager } from '../../../src/core/stateManager';
import { libraryCorrectSectionId, libraryTargetPageId, libraryTargetVolumeId } from '../../../src/data/act2LibraryData';
import { LibraryResearch } from '../../../src/scenes/act2/LibraryResearch';
import { TalesInvestigation } from '../../../src/scenes/act2/TalesInvestigation';
import '../../../src/styles.css';

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
  return new StateManager(new EventBus(), state);
}

function BrowserCheck() {
  const [scenario, setScenario] = useState<Scenario>('library-locked');
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const manager = useMemo(() => createCheckManager(scenario), [scenario]);
  const unavailableImage = imageUnavailable ? '/__a2_fixture_missing_shelf_image__.jpg' : undefined;

  return <div style={{ height: '100dvh', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
    <div className="a2-browser-check__controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, padding: 8, borderBottom: '1px solid #d9d9d9', background: '#fff' }}>
      <label>验收状态 <select value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>{scenarios.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><input type="checkbox" checked={imageUnavailable} onChange={(event) => setImageUnavailable(event.target.checked)} /> 模拟书架照片载入失败</label>
      <span>使用正式场景、正式图片资源和现有数据；仅通过本地 StateManager 初始化进入验收片段。</span>
    </div>
    <div style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto' }}>
      {scenario === 'tales'
        ? <TalesInvestigation manager={manager} shelfImageSrc={unavailableImage} />
        : <LibraryResearch manager={manager} shelfImageSrc={unavailableImage} />}
    </div>
  </div>;
}

createRoot(document.getElementById('a2-browser-check')!).render(<BrowserCheck />);

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createDefaultState } from '../../../src/core/defaultState';
import { EventBus } from '../../../src/core/eventBus';
import { StateManager } from '../../../src/core/stateManager';
import { SAVE_KEY } from '../../../src/core/saveManager';
import type { Act4NarrativeActionId } from '../../../src/data/narrative/act4Narrative';
import { Act3Investigation } from '../../../src/scenes/act3/Act3Investigation';
import { Act4LaterExperience } from '../../../src/scenes/act4/Act4LaterExperience';

type Mode = 'a3-t07' | 'a4-t05' | 'a4-t09' | 'a4-t10';
const modes: Array<{ id: Mode; label: string; description: string }> = [
  { id: 'a3-t07', label: 'A3 T07 · 回忆→观察', description: '从未确认小月回忆的合法当前镜头开始；听完回忆后可沿已有路线蹲下观察。' },
  { id: 'a4-t05', label: 'A4 T05 · 2014 亲历', description: '直接打开生日章节，检查王澳视角、来源标记和原文分页。' },
  { id: 'a4-t09', label: 'A4 T09 · 笔记→广播', description: '直接打开返山章节，按“藏好笔记→走向门外”解锁连续广播。' },
  { id: 'a4-t10', label: 'A4 T10 · 结尾', description: '从合法 T10 当前状态检查最后邮件动作与完成后的折叠回顾。' },
];

const priorA3Completions = [
  'FLAG_A3_OLD_ROAD_FOUND', 'FLAG_A3_QIMING_SITE_CONFIRMED', 'FLAG_A3_CLASSROOM_CONTRADICTION_NOTED',
  'FLAG_A3_CONFINEMENT_SITE_CONFIRMED', 'FLAG_A3_VVAKE_PAPER_FOUND', 'FLAG_A3_13ACK_PAPER_FOUND',
  'FLAG_A3_HEIBUMU_QIMING_LINK_CONFIRMED',
];
const priorA3Gates = [
  'FLAG_A3_GATE_REACHED', 'FLAG_A3_INNER_FENCE_PASSED', 'FLAG_A3_CLASSROOM_TURNED',
  'FLAG_A3_STAIRS_DESCENDED', 'FLAG_A3_BROADCAST_DOOR_REACHED', 'FLAG_A3_KITCHEN_DOOR_REACHED',
  'FLAG_A3_KITCHEN_EXITED',
];
const priorA4Sections = Array.from({ length: 9 }, (_, index) => `A4_READ_T${String(index + 1).padStart(2, '0')}`);
const priorA4Actions: Act4NarrativeActionId[] = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED', 'A4_T08_ARCHIVE_OPENED'];

function makeManager(mode: Mode): StateManager {
  const state = createDefaultState();
  if (mode === 'a3-t07') {
    state.game.act = 3;
    state.game.phase = 'A3_T07';
    for (const id of [...priorA3Completions, ...priorA3Gates]) state.game.flags[id] = true;
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_004';
    state.modules.act3.visitedLensIds = ['LENS_A3_T07_001', 'LENS_A3_T07_002', 'LENS_A3_T07_003', 'LENS_A3_T07_004'];
    state.modules.act3.confirmedFlagIds = priorA3Completions;
  } else {
    state.game.act = 4;
    state.game.phase = mode === 'a4-t05' ? 'A4_T05' : mode === 'a4-t09' ? 'A4_T09' : 'A4_T10';
    state.modules.act4.stage = mode === 'a4-t05' ? 'T05' : mode === 'a4-t09' ? 'T09' : 'T10';
    state.modules.act4.unlockedAccountIds = ['weibo', 'mail'];
    if (mode === 'a4-t05') {
      state.modules.act4.completedNarrativeSectionIds = priorA4Sections.slice(0, 4);
      state.modules.act4.completedNarrativeActionIds = priorA4Actions.slice(0, 2);
    } else if (mode === 'a4-t09') {
      state.modules.act4.completedNarrativeSectionIds = priorA4Sections.slice(0, 8);
      state.modules.act4.completedNarrativeActionIds = priorA4Actions;
    } else {
      state.modules.act4.completedNarrativeSectionIds = priorA4Sections;
      state.modules.act4.completedNarrativeActionIds = [...priorA4Actions, 'A4_T09_NOTE_HIDDEN', 'A4_T09_DOOR_EXITED'];
    }
  }
  return new StateManager(new EventBus(), state);
}

// Keep preview interactions in memory; never replace the app's saved campaign.
try {
  const storage = window.localStorage;
  const originalSetItem = storage.setItem.bind(storage);
  Object.defineProperty(storage, 'setItem', {
    configurable: true,
    value: (key: string, value: string) => { if (key !== SAVE_KEY) originalSetItem(key, value); },
  });
} catch {
  // A private browser context can deny storage; the in-memory fixture still works.
}

function Fixture() {
  const [mode, setMode] = useState<Mode>('a3-t07');
  const [manager, setManager] = useState(() => makeManager('a3-t07'));
  const selectedMode = modes.find((item) => item.id === mode)!;
  const selectMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setManager(makeManager(nextMode));
  };

  return <main className="a34-fixture">
    <header className="a34-fixture__header">
      <h1>A34 定向浏览器验收</h1>
      <p>{selectedMode.description}</p>
      <p className="a34-fixture__note">使用真实场景组件与隔离的内存状态；按钮只切换预置当前进度，不调用生产入口，也不写入正式存档。</p>
      <nav className="a34-fixture__modes" aria-label="选择验收场景">
        {modes.map((item) => <button type="button" key={item.id} aria-pressed={mode === item.id} onClick={() => selectMode(item.id)}>{item.label}</button>)}
      </nav>
    </header>
    {mode === 'a3-t07'
      ? <Act3Investigation manager={manager} onReturnToDesktop={() => {}} />
      : <Act4LaterExperience manager={manager} onExit={() => {}} />}
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);

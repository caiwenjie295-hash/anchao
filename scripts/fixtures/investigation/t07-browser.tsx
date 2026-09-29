import { createRoot } from 'react-dom/client';
import { createDefaultState } from '../../../src/core/defaultState';
import { EventBus } from '../../../src/core/eventBus';
import { StateManager } from '../../../src/core/stateManager';
import { act2T07 } from '../../../src/data/act2T07Data';
import { Act2Experience } from '../../../src/scenes/act2/Act2Experience';

const state = createDefaultState();
state.game.act = 2;
state.game.phase = 'A2_T06';
state.game.flags = {
  FLAG_A1_COMPLETE: true,
  FLAG_A1_SS_FOUND: true,
  FLAG_A2_TRANSFER_RULE_INFERRED: true,
  FLAG_A2_SCHOOL_ENTERED: true,
  FLAG_A2_SCHOOL_SS_FOUND: true,
  FLAG_A2_SS_MATCH_CONFIRMED: true,
  FLAG_A2_LEAVE_OF_ABSENCE_KNOWN: true,
  FLAG_A2_SCORE_CHANGE_KNOWN: true,
  FLAG_A2_QIMING_OFFICIAL_FOUND: true,
  FLAG_A2_QIMING_TESTIMONIALS_READ: true,
  FLAG_A2_QIMING_FORUM_FOUND: true,
  FLAG_A2_HUANG_MATCH_INFERRED: true,
  FLAG_A2_ZHONG_MATCH_INFERRED: true,
  FLAG_A2_OTHER_CASES_ABNORMAL: true,
};
state.modules.act2Research.stage = 'qiming';
state.modules.act2Research.school = {
  visitedAreaIds: ['AREA_A2_T05_XIAOA_CLASSROOM', 'AREA_A2_T05_HONOR_ROLL', 'AREA_A2_T05_TEACHER_OFFICE'],
  inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_RANKS', 'HOTSPOT_A2_T05_TEACHER'],
  selectedEvidenceIds: ['rank-record', 'teacher-account'],
  selectedInferenceId: 'bounded-timeline',
  symbolMatchConfirmed: true,
};
state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_006', 'PAGE_A2_T06_007', 'PAGE_A2_T06_008', 'PAGE_A2_T06_009'];
const manager = new StateManager(new EventBus(), state);
manager.enterAct2FinaleInvestigation();
manager.viewAct2T07Material(act2T07.photoMaterialId);
manager.confirmAct2T07PhotoSymbol();
manager.viewAct2T07Material(act2T07.video.materialId);
const sampleFrame = act2T07.video.keyFrames[0];
manager.captureAct2T07Frame(sampleFrame.id, sampleFrame.startMs);

createRoot(document.getElementById('root')!).render(
  <Act2Experience stage="finale" sceneOpen onDismissScene={() => {}} onResumeScene={() => {}} manager={manager} />,
);

// Headless visual captures opt in with ?screenshot=1; normal fixture visits stay interactive.
if (new URLSearchParams(window.location.search).get('screenshot') === '1') {
  window.setTimeout(() => {
    Array.from(document.querySelectorAll<HTMLButtonElement>('.t07-finale__tab')).find((button) => button.textContent?.includes('受访视频'))?.click();
    window.setTimeout(() => document.querySelector<HTMLButtonElement>('.t07-finale__screenshot-zoom')?.click(), 80);
  }, 160);
}

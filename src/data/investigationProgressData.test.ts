import { describe, expect, it } from 'vitest';
import { createDefaultState } from '../core/defaultState';
import { deriveInvestigationProgress, getDesktopTaskPresentation } from './investigationProgressData';

const qimingState = () => {
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
  };
  state.modules.act2Research.stage = 'qiming';
  state.modules.act2Research.school = {
    visitedAreaIds: [],
    inspectedHotspotIds: ['HOTSPOT_A2_T05_SCHOLAR_NOTE', 'HOTSPOT_A2_T05_TEACHER', 'HOTSPOT_A2_T05_RANKS'],
    selectedEvidenceIds: ['rank-record', 'teacher-account'],
    selectedInferenceId: 'bounded-timeline',
    symbolMatchConfirmed: true,
    legacyCompletionMigrated: false,
  };
  return state;
};

describe('investigation progress display model', () => {
  it('keeps undiscovered later people, places, and chapters out of the initial view', () => {
    const initial = deriveInvestigationProgress(createDefaultState());
    expect(initial.act).toBe(1);
    expect(initial.route.map((node) => node.label)).toEqual(['第一幕调查', '待发现的新方向']);
    expect(JSON.stringify(initial)).not.toContain('黄子山');
    expect(JSON.stringify(initial)).not.toContain('钟子月');
    expect(JSON.stringify(initial)).not.toContain('王澳');
    expect(JSON.stringify(initial)).not.toContain('禁闭室');
  });

  it('shows only facts backed by current read/inspection state and distinguishes reads from conclusions', () => {
    const state = qimingState();
    state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'];
    state.modules.act2Research.t06.reviewedCases = [{ caseId: 'huang', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], conclusionId: 'public-claims-and-followup-differ' }];
    const result = deriveInvestigationProgress(state);
    expect(result.knownFacts.map((fact) => fact.id)).toContain('PAGE_A2_T06_004');
    expect(result.knownFacts.map((fact) => fact.id)).toContain('PAGE_A2_T06_008');
    expect(result.knownFacts.map((fact) => fact.id)).toContain('review-huang');
    expect(result.knownFacts.map((fact) => fact.id)).not.toContain('PAGE_A2_T06_009');
    expect(result.knownFacts.find((fact) => fact.id === 'PAGE_A2_T06_004')?.source).toContain('机构公开资料');
    expect(result.knownFacts.find((fact) => fact.id === 'review-huang')?.summary).toContain('不据此认定原因');
  });

  it('does not turn opening the official page into a completed person review', () => {
    const state = qimingState();
    state.modules.browser.visitedPageIds = ['PAGE_A2_T06_004'];
    const desktop = getDesktopTaskPresentation(state);
    expect(desktop.steps.some((step) => step.label.includes('黄子山') && step.complete)).toBe(false);
    expect(desktop.steps.some((step) => step.label.includes('钟子月') && step.complete)).toBe(false);
    expect(desktop.steps.filter((step) => step.current)).toHaveLength(1);
    expect(deriveInvestigationProgress(state).knownFacts.some((fact) => fact.id.startsWith('review-'))).toBe(false);
  });

  it('uses the specific shared publicity page visit and preserves valid T06 completion paths', () => {
    const state = qimingState();
    state.game.flags.FLAG_A2_QIMING_OFFICIAL_FOUND = true;
    const pageStillNeeded = getDesktopTaskPresentation(state);
    expect(pageStillNeeded.steps.find((step) => step.id === 't06-official')?.complete).toBe(false);
    expect(pageStillNeeded.nextAction).toContain('打开启明旧站学员成长记录');

    state.modules.act2Research.t06.legacyCompletionMigrated = true;
    const legacy = deriveInvestigationProgress(state);
    expect(legacy.knownFacts.some((fact) => fact.id.startsWith('review-'))).toBe(false);
    expect(legacy.nextAction).toContain('与小月继续核对资料');
    expect(getDesktopTaskPresentation(state).nextAction).toContain('与小月继续核对资料');
    expect(getDesktopTaskPresentation(state).nextAction).not.toContain('黄子山');
    expect(getDesktopTaskPresentation(state).nextAction).not.toContain('钟子月');

    state.modules.act2Research.t06.reviewedCases = [
      { caseId: 'huang', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], conclusionId: 'public-claims-and-followup-differ' },
    ];
    const legacyWithOptionalReview = deriveInvestigationProgress(state);
    expect(legacyWithOptionalReview.nextAction).toContain('与小月继续核对资料');
    expect(legacyWithOptionalReview.knownFacts.map((fact) => fact.id)).toContain('review-huang');
    expect(legacyWithOptionalReview.knownFacts.map((fact) => fact.id)).not.toContain('review-zhong');
    expect(getDesktopTaskPresentation(state).nextAction).toContain('与小月继续核对资料');
    expect(getDesktopTaskPresentation(state).nextAction).not.toContain('钟子月');

    state.modules.act2Research.t06.legacyCompletionMigrated = false;
    state.modules.act2Research.t06.reviewedCases = [
      { caseId: 'huang', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_008'], conclusionId: 'public-claims-and-followup-differ' },
      { caseId: 'zhong', sourcePageIds: ['PAGE_A2_T06_004', 'PAGE_A2_T06_009'], conclusionId: 'public-claims-and-followup-differ' },
    ];
    expect(deriveInvestigationProgress(state).nextAction).toContain('与小月继续核对资料');
    expect(getDesktopTaskPresentation(state).nextAction).toContain('与小月继续核对资料');
    expect(getDesktopTaskPresentation(state).nextAction).not.toContain('黄子山');
    expect(getDesktopTaskPresentation(state).nextAction).not.toContain('钟子月');
  });

  it('keeps act three observations separate from confirmed stage conclusions', () => {
    const state = createDefaultState();
    state.game.act = 3;
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.modules.act3.stage = 'T00';
    state.modules.act3.currentLensId = 'LENS_A3_T00_001';
    const before = deriveInvestigationProgress(state);
    expect(before.route.map((node) => node.label)).toEqual(['再次出发', '待发现的新方向']);
    expect(JSON.stringify(before)).not.toContain('禁闭室');
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T00_CABLE_BREAK'];
    const inspected = deriveInvestigationProgress(state);
    expect(inspected.knownFacts.find((fact) => fact.id === 'CLUE_A3_T00_CABLE_BREAK')?.status).toBe('inspected');
    expect(inspected.route[0].status).toBe('current');
    state.modules.act3.confirmedFlagIds = ['FLAG_A3_OLD_ROAD_FOUND'];
    expect(deriveInvestigationProgress(state).route[0].status).toBe('complete');

    state.modules.act3.stage = 'T01';
    state.modules.act3.currentLensId = 'LENS_A3_T01_001';
    const laterStage = deriveInvestigationProgress(state);
    expect(laterStage.route[0].status).toBe('complete');
    expect(laterStage.route[1].status).toBe('current');
  });

  it('keeps the T05 paper identity hidden until the paper itself is read', () => {
    const state = createDefaultState();
    state.game.act = 3;
    state.game.phase = 'A3_T05';
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.modules.act3.stage = 'T05';
    state.modules.act3.currentLensId = 'LENS_A3_T05_004';
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T05_PAPER_EDGE'];

    const result = deriveInvestigationProgress(state);
    const serialized = JSON.stringify(result);

    expect(result.nextAction).toContain('继续探索');
    expect(result.nextAction).not.toContain('13aCK');
    expect(result.pendingDirections.join(' ')).toContain('继续探索');
    expect(serialized).not.toContain('13aCK');
    expect(serialized).not.toContain('老鼠、血、草垛');
  });

  it('points to the visible T04 door sign before an unknown paper or later room', () => {
    const state = createDefaultState();
    state.game.act = 3;
    state.game.phase = 'A3_T04';
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.modules.act3.stage = 'T04';
    state.modules.act3.currentLensId = 'LENS_A3_T04_001';

    const result = deriveInvestigationProgress(state);
    const serialized = JSON.stringify(result);

    expect(result.nextAction).toContain('照亮档案室门牌');
    expect(result.nextAction).not.toContain('沿当前调查路线');
    expect(result.nextAction).not.toContain('前往档案室门口');
    expect(serialized).not.toContain('VVAKE');
    expect(serialized).not.toContain('纸片');
  });

  it('keeps the unfinished T05 chapter title and date span neutral until the whole section is read', () => {
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T05';
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeSectionIds = ['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04'];
    state.modules.act4.completedNarrativeActionIds = ['A4_T02_LOGIN_SUCCEEDED', 'A4_T04_WAKE_MAIL_OPENED'];

    const result = deriveInvestigationProgress(state);
    const serialized = JSON.stringify(result);
    const desktop = getDesktopTaskPresentation(state);
    const currentRoute = result.route.find((node) => node.id === 'A4_READ_T05');
    const forbiddenBeforeReached = [
      '生日与门外来人', '生日白天', '家庭晚餐', '门外来人', '被带走以前',
      '28 日至 29 日', '28日至29日', '晚饭中父亲又恢复', '他不愿离开',
    ];

    expect(result.location).toBe('王澳的 2014 年亲历');
    expect(result.currentObjective).toContain('王澳亲历');
    expect(result.nextAction).toContain('翻开这一段，按页往下读');
    expect(desktop.summary).toContain('王澳亲历');
    expect(desktop.nextAction).toContain('翻开这一段，按页往下读');
    expect(currentRoute?.label).toBe('王澳的 2014 年亲历');
    expect(currentRoute?.detail).toContain('2014 年');
    expect(result.knownFacts.map((fact) => fact.id)).toEqual(['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04']);
    for (const term of forbiddenBeforeReached) expect(serialized).not.toContain(term);
    expect(serialized).not.toContain('晚自习');

    state.modules.act4.completedNarrativeSectionIds.push('A4_READ_T05');
    const completed = deriveInvestigationProgress(state);
    expect(completed.location).toBe('生日与门外来人');
    expect(completed.route.find((node) => node.id === 'A4_READ_T05')?.label).toBe('生日与门外来人');
    expect(completed.knownFacts.find((fact) => fact.id === 'A4_READ_T05')?.source).toContain('2014 年 12 月 28 日至 29 日');
  });

  it('keeps the A3 progress action synchronized with the visible stage-closure control', () => {
    const state = createDefaultState();
    state.game.act = 3;
    state.game.phase = 'A3_T00';
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.modules.act3.stage = 'T00';
    state.modules.act3.currentLensId = 'LENS_A3_T00_001';
    state.modules.act3.inspectedClueIds = ['CLUE_A3_T00_CABLE_BREAK', 'CLUE_A3_T00_DRAIN_DISCOVERED'];

    const result = deriveInvestigationProgress(state);
    expect(result.nextAction).toContain('离开这里，继续探索');
    expect(result.nextAction).not.toContain('继续探索”前往');
  });

  it('uses the reader’s visible A4 blog action label', () => {
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T03';
    state.modules.act4.stage = 'T03';
    const result = deriveInvestigationProgress(state);
    expect(result.nextAction).toBe('点击“查看动态”，按日期阅读；末尾可以继续。');
  });

  it('limits the act four route and recap to completed sections and the current Wang Ao chapter', () => {
    const state = createDefaultState();
    state.game.act = 4;
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.modules.act4.stage = 'T05';
    state.modules.act4.completedNarrativeSectionIds = ['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04'];
    const result = deriveInvestigationProgress(state);
    expect(result.route.map((node) => node.id)).toEqual(['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04', 'A4_READ_T05', 'a4-undiscovered']);
    expect(result.knownFacts.map((fact) => fact.id)).toEqual(['A4_READ_T01', 'A4_READ_T02', 'A4_READ_T03', 'A4_READ_T04']);
    expect(result.knownFacts[0].source).toContain('调查者视角原文');
    expect(result.currentObjective).toContain('王澳');
    expect(result.nextAction).toBe('翻开这一段，按页往下读；读完后继续。');
    expect(JSON.stringify(result)).not.toContain('T06_INSTITUTION');
    expect(JSON.stringify(result)).not.toContain('禁闭室');
  });

  it('does not leave an optional full-video watch as the current act two finale step', () => {
    const state = qimingState();
    state.modules.act2Research.stage = 'finale';
    state.game.phase = 'A2_T07';
    state.game.flags.FLAG_A2_PROMO_PHOTO_SS_FOUND = true;
    state.game.flags.FLAG_A2_PROMO_VIDEO_FOUND = true;
    state.game.flags.FLAG_A2_PROMO_VIDEO_WATCHED = false;
    state.modules.act2Research.t07.viewedMaterialIds = ['VIDEO_A2_T07_001'];
    const presentation = getDesktopTaskPresentation(state);
    expect(presentation.steps.find((step) => step.current)?.id).toBe('t07-compare');
    expect(presentation.nextAction).toContain('截取清晰画面');
    expect(presentation.nextAction).not.toContain('完整播放');
    expect(deriveInvestigationProgress(state).nextAction).toContain('截取清晰画面');
  });

  it('points the completed third act at the existing fourth-act entry', () => {
    const state = createDefaultState();
    state.game.act = 3;
    state.game.phase = 'A3_T07';
    state.game.flags.FLAG_A2_COMPLETE = true;
    state.game.flags.FLAG_A3_SITE_EXITED = true;
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.modules.act2Research.stage = 'finale';
    state.modules.act3.stage = 'T07';
    state.modules.act3.currentLensId = 'LENS_A3_T07_008';

    const progress = deriveInvestigationProgress(state);
    expect(progress.nextAction).toContain('翻开笔记，继续调查');
    expect(getDesktopTaskPresentation(state).nextAction).toContain('翻开笔记，继续调查');
  });

  it('marks the fourth act complete and directs players to the in-drawer recap', () => {
    const state = createDefaultState();
    state.game.act = 4;
    state.game.phase = 'A4_T10';
    state.game.flags.FLAG_A3_COMPLETE = true;
    state.game.flags.FLAG_A4_COMPLETE = true;
    state.modules.act2Research.stage = 'finale';
    state.modules.act4.stage = 'T10';
    const progress = deriveInvestigationProgress(state);

    expect(progress.currentObjective).toBe('第四幕已经完成。');
    expect(progress.nextAction).toContain('回顾已读篇章');
    expect(getDesktopTaskPresentation(state).nextAction).toContain('回顾已读篇章');
  });

  it('does not mutate the supplied state while deriving status and known facts', () => {
    const state = qimingState();
    const before = JSON.stringify(state);
    deriveInvestigationProgress(state);
    getDesktopTaskPresentation(state);
    expect(JSON.stringify(state)).toBe(before);
  });
});

import type { AppId, AppState, Act3ActiveStage, Act2Stage, Act4Stage } from '../core/types';
import { act1SceneHotspots, sceneById } from './sceneData';
import { browserPageById } from './browserData';
import { getCurrentTaskGuide } from './taskGuideData';
import { getAutoEntries } from './noteData';
import { mailById } from './mailData';
import { ACT3_REQUIRED_EVIDENCE, ACT3_STAGE_COMPLETION_FLAG, act3FirstLensId, act3LensById, act3RequiredClueIds, act3StageDoc, type AuthoredAct3Stage } from './act3Data';
import { act3ObjectiveFor, act3PlaceForLens } from './act3Presentation';
import { act4NarrativeSections } from './narrative/act4Narrative';
import { act4NarrativeActionsSatisfied, act4NarrativeRequiredActions } from '../story/act4/narrativePolicy';
import { findAct3RoutePathToClue, getAct3RouteAvailability } from '../story/investigation/act3RoutePolicy';
import { act3HotspotActionLabel, act3RouteActionLabel, act3StageActionLabel } from '../story/investigation/actionPresentation';

export type ProgressNodeStatus = 'complete' | 'current' | 'known' | 'upcoming';

export interface InvestigationProgressNode {
  id: string;
  label: string;
  status: ProgressNodeStatus;
  detail?: string;
}

export interface InvestigationProgressFact {
  id: string;
  title: string;
  source: string;
  summary: string;
  status: 'read' | 'noted' | 'recorded' | 'inspected';
}

export interface InvestigationProgressModel {
  act: 1 | 2 | 3 | 4;
  actLabel: string;
  location: string;
  currentObjective: string;
  nextAction: string;
  nextActionAppId?: AppId;
  route: readonly InvestigationProgressNode[];
  knownFacts: readonly InvestigationProgressFact[];
  pendingDirections: readonly string[];
}

export interface DesktopTaskStep {
  id: string;
  label: string;
  hint?: string;
  complete: boolean;
  current: boolean;
  appId?: AppId;
}

export interface DesktopTaskPresentation {
  title: string;
  summary: string;
  completedCount: number;
  totalCount: number;
  steps: readonly DesktopTaskStep[];
  nextAction: string;
  actionAppId?: AppId;
  actionLabel?: string;
}

const ACT2_STAGES: readonly { id: Act2Stage; label: string; flag?: string }[] = [
  { id: 'search', label: '网上搜索', flag: 'FLAG_A2_OFFLINE_RESEARCH_NEEDED' },
  { id: 'bridge', label: '桥头询问', flag: 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN' },
  { id: 'library', label: '县图书馆地方志', flag: 'FLAG_A2_BUMU_RULE_BASIC_KNOWN' },
  { id: 'tales', label: '卷末旧录', flag: 'FLAG_A2_TRANSFER_RULE_INFERRED' },
  { id: 'school', label: '学校旧资料', flag: 'FLAG_A2_SS_MATCH_CONFIRMED' },
  { id: 'qiming', label: '实名个案核对', flag: 'FLAG_A2_OTHER_CASES_ABNORMAL' },
  { id: 'finale', label: '宣传资料核对', flag: 'FLAG_A2_COMPLETE' },
];

const ACT2_PHASES = ['A2_T01', 'A2_T02', 'A2_T03', 'A2_T04', 'A2_T05', 'A2_T06', 'A2_T07'] as const;

const ACT3_STAGE_LABEL: Record<AuthoredAct3Stage, string> = {
  T00: '山路旧迹', T01: '旧址入口', T02: '教室记录', T03: '禁闭区',
  T04: '档案室', T05: '广播室', T06: '厨房与空神龛', T07: '返程路线',
};

const hasFlag = (state: AppState, flagId: string): boolean => state.game.flags[flagId] === true;

const pageFact = (pageId: string, status: InvestigationProgressFact['status'] = 'read'): InvestigationProgressFact | null => {
  const page = browserPageById.get(pageId);
  if (!page) return null;
  const kind = page.phase === 'A2_T06'
    ? page.pageType === 'forum' ? '论坛发言（身份未核实）' : page.pageType === 'news' ? '地方旧闻转述' : '机构公开资料'
    : '网页原文';
  return {
    id: page.id,
    title: page.headline,
    source: `${kind} · ${page.domain} · ${page.publishedAt}`,
    summary: page.snippet,
    status,
  };
};

const noteFacts = (state: AppState, act: number): InvestigationProgressFact[] => getAutoEntries(state.modules.notepad)
  .filter((entry) => entry.act <= act)
  .map((entry) => ({
    id: entry.id,
    title: entry.title,
    source: entry.source,
    summary: entry.content,
    status: 'noted' as const,
  }));

function act1Stage(state: AppState): { location: string; objective: string; nextAction: string; appId?: AppId } {
  const scene = state.modules.scene.currentSceneId ? sceneById.get(state.modules.scene.currentSceneId) : undefined;
  if (scene) return {
    location: scene.title,
    objective: scene.description,
    nextAction: '点击当前画面里已出现的线索标记阅读观察；满足底部提示后，按“继续”前往下一处。',
  };
  if (state.game.flags.FLAG_A1_COMPLETE === true) return {
    location: '第一幕收尾',
    objective: '第一幕线索已经整理完成。',
    nextAction: '在收尾页点击“回到桌面，继续调查”。',
  };
  if (state.game.phase === 'F' && !state.modules.scene.journeyStarted) return {
    location: '前往鸡公岭',
    objective: '已到出发提示页。',
    nextAction: '点击“继续”开始现场调查。',
  };
  const guide = getCurrentTaskGuide(state);
  if (guide) {
    const current = guide.steps.find((step) => step.current) ?? guide.steps.find((step) => !step.complete);
    return {
      location: guide.summary,
      objective: guide.summary,
      nextAction: current ? [current.label, current.hint].filter(Boolean).join(' ') : guide.summary,
      ...(current?.appId ? { appId: current.appId } : guide.actionAppId ? { appId: guide.actionAppId } : {}),
    };
  }
  return {
    location: '第一幕调查',
    objective: '从桌面当前提示继续已出现的线索。',
    nextAction: '打开桌面上的“当前步骤”提示，按其中的应用与材料名称操作。',
  };
}

function act2Stage(state: AppState): { location: string; objective: string; nextAction: string; appId?: AppId } {
  const stage = state.modules.act2Research.stage;
  if (stage === 'qiming') {
    const visited = new Set(state.modules.browser.visitedPageIds);
    const reviewed = new Set(state.modules.act2Research.t06.reviewedCases.map((entry) => entry.caseId));
    if (state.modules.act2Research.t06.legacyCompletionMigrated) return {
      location: '启明实名个案复核',
      objective: '旧存档中的个案调查已恢复。',
      nextAction: '在浏览器个案复核区，主动点击“与小月继续核对资料”。',
      appId: 'browser',
    };
    if (reviewed.has('huang') && reviewed.has('zhong')) return {
      location: '启明实名个案复核',
      objective: '两人的实名材料差异都已分别记录。',
      nextAction: '在浏览器个案复核区，主动点击“与小月继续核对资料”。',
      appId: 'browser',
    };
    if (!visited.has('PAGE_A2_T06_004') && !visited.has('PAGE_A2_T06_008') && !visited.has('PAGE_A2_T06_009')) return {
      location: '启明实名个案复核',
      objective: '从已出现的启明公开资料开始，分别核对宣传与后续报道。',
      nextAction: '在浏览器中打开启明公开来源；顺序不限，复制姓名和论坛内容都不是必需步骤。',
      appId: 'browser',
    };
    const missingNames = (['huang', 'zhong'] as const).filter((caseId) => !reviewed.has(caseId));
    const alreadyRecorded = reviewed.size ? `已有 ${reviewed.size} 位人物的材料差异记录。` : '';
    const knownFollowup = (caseId: 'huang' | 'zhong') => visited.has(caseId === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009');
    const nextNamed = missingNames.find((caseId) => knownFollowup(caseId));
    if (nextNamed) {
      const name = nextNamed === 'huang' ? '黄子山' : '钟子月';
      return {
        location: '启明实名个案复核',
        objective: `${alreadyRecorded}核对当前已打开的${name}后续报道与宣传原文。`,
        nextAction: `返回浏览器个案复核区，选择“核对${name}”，确认两份来源都已打开后记录材料差异。`,
        appId: 'browser',
      };
    }
    return {
      location: '启明实名个案复核',
      objective: `${alreadyRecorded}选择一位已在公开来源中出现的人物继续核对。`,
      nextAction: '在浏览器个案复核区选择尚未记录的人物，打开其缺少的后续报道；顺序不限。',
      appId: 'browser',
    };
  }
  if (stage === 'finale') {
    const flags = state.game.flags;
    if (flags.FLAG_A2_COMPLETE === true && state.modules.act3.stage === 'inactive') return {
      location: '第二幕资料核对完成',
      objective: '第二幕调查已完成。',
      nextAction: '点击“继续调查”，前往启明旧址开始下一幕。',
    };
    const nextAction = flags.FLAG_A2_PROMO_PHOTO_SS_FOUND !== true
      ? '和小月打开校门合影，核对照片中的双 S。'
      : flags.FLAG_A2_PROMO_VIDEO_FOUND !== true
        ? '打开创始人受访视频，找到可与第一次徒步拍下的破庙外景比较的画面。'
        : flags.FLAG_A2_TEMPLE_FRAME_FOUND !== true
          ? '在视频中截取清晰画面，再与第一次徒步拍下的破庙外景并排比对；不必完整播放视频。'
          : flags.FLAG_A2_QIMING_LOCATION_INFERRED !== true
            ? '把已截取的画面与第一次徒步拍下的破庙外景并排核对，再记录能支持的地点结论。'
            : flags.FLAG_A2_SECOND_TRIP_PLANNED !== true
              ? '和小月商量是否安排第二次进山。'
              : '点击黑幕中的“再次进山，调查启明旧址”完成第二幕并直接开始下一幕。';
    return {
      location: '与小月核对宣传资料',
      objective: '把已读资料与现场照片放在一起核对；只有满足条件的操作才会记录阶段进度。',
      nextAction: flags.FLAG_A2_SECOND_TRIP_PLANNED === true ? '点击黑幕中的“再次进山，调查启明旧址”记录完成并直接开始第三幕。' : nextAction,
    };
  }

  if (stage === 'search' && hasFlag(state, 'FLAG_A2_OFFLINE_RESEARCH_NEEDED')) return {
    location: '网上搜索',
    objective: '搜索结果没有回答疑问；可以把问题带到桥头继续调查。',
    nextAction: '在浏览器当前搜索结果页点击“去桥头问问当地人”。',
    appId: 'browser',
  };
  if (stage === 'bridge' && hasFlag(state, 'FLAG_A2_HEIBUMU_NAME_SOLVED')) return {
    location: '县城桥头',
    objective: '桥头对话和照片已支持这处地名的辨认。',
    nextAction: '在桥头调查底部点击“去县图书馆查地方志”。',
  };
  if (stage === 'bridge' && hasFlag(state, 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN')) return {
    location: '县城桥头',
    objective: '当地人提到这里曾留下过相关记录。',
    nextAction: '继续在桥头核对三字地名；确认后，底部会出现前往县图书馆的按钮。',
  };
  if (stage === 'library' && hasFlag(state, 'FLAG_A2_BUMU_RULE_BASIC_KNOWN')) return {
    location: '县图书馆地方志',
    objective: '目标页已读并摘录；可以继续对照卷末旧录。',
    nextAction: '在页面底部选择“继续对照三篇志异”。',
  };
  if (stage === 'tales' && hasFlag(state, 'FLAG_A2_TRANSFER_RULE_INFERRED')) return {
    location: '县图书馆卷末旧录',
    objective: '有边界的暂定判断已记录；可以回到高中核对不同来源。',
    nextAction: '选择“前往高中调查”继续。',
  };
  if (stage === 'school' && hasFlag(state, 'FLAG_A2_SS_MATCH_CONFIRMED')) return {
    location: '高中旧资料',
    objective: '新旧记号已经并排核对；可以在浏览器查看启明公开资料。',
    nextAction: '选择“前往浏览器核查启明”继续。',
    appId: 'browser',
  };

  const guide = getCurrentTaskGuide(state);
  if (guide) {
    const current = guide.steps.find((step) => step.current) ?? guide.steps.find((step) => !step.complete);
    return {
      location: guide.summary,
      objective: guide.summary,
      nextAction: current ? [current.label, current.hint].filter(Boolean).join(' ') : guide.summary,
      ...(current?.appId ? { appId: current.appId } : guide.actionAppId ? { appId: guide.actionAppId } : {}),
    };
  }
  const stageLabels: Partial<Record<Act2Stage, string>> = {
    search: '网上搜索', bridge: '县城桥头', library: '县图书馆', tales: '卷末旧录', school: '旧校资料',
  };
  return {
    location: stageLabels[stage] ?? '第二幕调查',
    objective: '沿着当前地点中已经出现的材料继续调查。',
    nextAction: '打开桌面“当前步骤”提示，按其中的应用与材料名称操作。',
  };
}

function act3Stage(state: AppState): { location: string; objective: string; nextAction: string } {
  const stage = state.modules.act3.stage as Act3ActiveStage;
  const currentLensId = state.modules.act3.currentLensId ?? act3FirstLensId(stage);
  const lens = act3LensById(stage, currentLensId);
  const location = lens ? act3PlaceForLens(lens.id, lens.title) : ACT3_STAGE_LABEL[stage];
  const inspected = state.modules.act3.inspectedClueIds;
  const objective = act3ObjectiveFor(stage, inspected);
  if (stage === 'T07' && hasFlag(state, 'FLAG_A3_SITE_EXITED') && hasFlag(state, 'FLAG_A3_COMPLETE') && state.modules.act4.stage === 'inactive') {
    return {
      location,
      objective: '第三幕现场调查已经收束。',
      nextAction: '点击“翻开笔记，继续调查”开始阅读第四幕；也可以回看启明旧址。',
    };
  }

  const missingRequiredIds = act3RequiredClueIds(stage).filter((id) => !inspected.includes(id));
  if (missingRequiredIds.length === 0) {
    const nextAction = stage === 'T07'
      ? '按底部“与小月一起离开旧址”完成离开前的确认。'
      : `按底部“${act3StageActionLabel()}”继续调查。`;
    return { location, objective, nextAction };
  }

  const currentPendingHotspot = lens?.hotspots.find((hotspot) => missingRequiredIds.includes(hotspot.clueId));
  if (currentPendingHotspot) {
    const actionLabel = act3HotspotActionLabel(stage, currentPendingHotspot.clueId, currentPendingHotspot.label, inspected);
    return { location, objective, nextAction: `点击当前画面上的“${actionLabel}”标记查看。` };
  }

  const pathToMissingClue = missingRequiredIds
    .map((clueId) => findAct3RoutePathToClue(stage, currentLensId, clueId, inspected))
    .find((path) => path !== null);
  if (pathToMissingClue?.length) {
    const firstRoute = lens?.routes.find((route) => route.target === pathToMissingClue[0]);
    if (firstRoute && getAct3RouteAvailability(stage, lens?.id ?? null, firstRoute.target, inspected).state === 'ready') {
      return { location, objective, nextAction: `按底部“${act3RouteActionLabel(firstRoute.kind)}”按钮移动到相邻视角，再查看现场。` };
    }
  }

  const visiblePendingHotspot = lens?.hotspots.find((hotspot) => !inspected.includes(hotspot.clueId));
  if (visiblePendingHotspot) {
    const actionLabel = act3HotspotActionLabel(stage, visiblePendingHotspot.clueId, visiblePendingHotspot.label, inspected);
    return { location, objective, nextAction: `点击当前画面上的“${actionLabel}”标记查看。` };
  }

  const readyRoute = lens?.routes.find((route) => getAct3RouteAvailability(stage, lens?.id ?? null, route.target, inspected).state === 'ready');
  if (readyRoute) {
    return { location, objective, nextAction: `按底部“${act3RouteActionLabel(readyRoute.kind)}”按钮移动到相邻视角，再查看现场。` };
  }

  const blockedRoute = lens?.routes.find((route) => getAct3RouteAvailability(stage, lens.id, route.target, inspected).state === 'blocked');
  if (blockedRoute) {
    return { location, objective, nextAction: '查看底部相邻路线的阻塞说明，先完成其中要求的现场观察。' };
  }
  return {
    location,
    objective,
    nextAction: '查看当前现场已出现的观察点；完成必需核对后，可按底部按钮继续。',
  };
}

type Act4NarrativeSection = (typeof act4NarrativeSections)[number];

function act4SectionTitleForDisplay(section: Act4NarrativeSection, isComplete: boolean): string {
  return section.stage === 'T05' && !isComplete ? '王澳的 2014 年亲历' : section.title;
}

function act4SectionPeriodForDisplay(section: Act4NarrativeSection, isComplete: boolean): string {
  return section.stage === 'T05' && !isComplete ? '2014 年' : section.periodLabel;
}

function act4Stage(state: AppState): { location: string; objective: string; nextAction: string } {
  const stage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
  if (hasFlag(state, 'FLAG_A4_COMPLETE')) return {
    location: '第四幕调查完成',
    objective: '第四幕已经完成。',
    nextAction: '可在调查进度中回顾已读篇章和已记录的事实。',
  };
  const section = act4NarrativeSections.find((item) => item.stage === stage);
  const actions = state.modules.act4.completedNarrativeActionIds;
  const pageReadingAction = '翻开这一段，按页往下读；读完后继续。';
  const actionSteps: Partial<Record<Exclude<Act4Stage, 'inactive'>, string>> = {
    T01: pageReadingAction,
    T02: actions.includes('A4_T02_LOGIN_SUCCEEDED') ? pageReadingAction : '对照两封旧邮件日期，输入八位数登录账号。',
    T03: '打开王澳的动态，按日期阅读；读到末尾后继续。',
    T04: actions.includes('A4_T04_WAKE_MAIL_OPENED') ? pageReadingAction : '找到并打开已出现的 VVaKe 邮件，随后按页阅读。',
    T05: pageReadingAction,
    T06: pageReadingAction,
    T07: pageReadingAction,
    T08: actions.includes('A4_T08_ARCHIVE_OPENED') ? pageReadingAction : '选择并打开当前页面提供的档案，再按页阅读。',
    T09: !actions.includes('A4_T09_NOTE_HIDDEN') ? '读到便签段落后，按页面动作把笔记藏好。' : !actions.includes('A4_T09_DOOR_EXITED') ? '按页面动作继续走向门外，明确完成离开。' : pageReadingAction,
    T10: actions.includes('A4_T10_FINAL_MAIL_OPENED') ? pageReadingAction : '读到邮件入口后，打开启明的最后一封邮件。',
  };
  const perspective = section?.perspective === 'wangao' ? '王澳亲历' : '调查者阅读';
  const sectionComplete = Boolean(section && state.modules.act4.completedNarrativeSectionIds.includes(section.id));
  const displayTitle = section ? act4SectionTitleForDisplay(section, sectionComplete) : '第四幕当前篇章';
  const displayPeriod = section ? act4SectionPeriodForDisplay(section, sectionComplete) : '';
  const period = displayPeriod ? ` · ${displayPeriod}` : '';
  const objective = stage === 'T05' && !sectionComplete
    ? '王澳亲历 · 2014 年。当前篇章仍在阅读。'
    : `${perspective}${period}。${displayTitle}`.trim();
  return {
    location: displayTitle,
    objective,
    nextAction: actionSteps[stage] ?? '点击“继续阅读”阅读当前篇章，并完成页面上明确要求的操作。',
  };
}

function currentInfo(state: AppState): { act: 1 | 2 | 3 | 4; location: string; objective: string; nextAction: string; appId?: AppId } {
  if (state.modules.act4.stage !== 'inactive') return { act: 4, ...act4Stage(state) };
  if (state.modules.act3.stage !== 'inactive') return { act: 3, ...act3Stage(state) };
  if (state.modules.act2Research.stage !== 'inactive') return { act: 2, ...act2Stage(state) };
  return { act: 1, ...act1Stage(state) };
}

function act1Route(state: AppState): InvestigationProgressNode[] {
  const nodes: InvestigationProgressNode[] = [];
  if (hasFlag(state, 'FLAG_A1_XIAOA_MISSING_KNOWN')) nodes.push({ id: 'a1-wechat', label: '微信消息', status: 'complete', detail: '母亲的新消息已读' });
  if (hasFlag(state, 'FLAG_A1_MAIL_XIAOA_OPENED')) nodes.push({ id: 'a1-mail', label: '小 A 的旧邮件', status: 'complete', detail: '邮件已打开' });
  if (hasFlag(state, 'FLAG_A1_NEWS_FOUND') || hasFlag(state, 'FLAG_A1_ROUTE_INFO_FOUND')) nodes.push({ id: 'a1-web', label: '失踪与路线网页', status: 'complete', detail: '至少一份网页资料已读' });
  if (state.modules.scene.visitedSceneIds.length || state.modules.scene.journeyStarted) {
    const current = state.modules.scene.currentSceneId ? sceneById.get(state.modules.scene.currentSceneId) : undefined;
    nodes.push({ id: 'a1-field', label: current?.title ?? '鸡公岭现场', status: current ? 'current' : 'known' });
  }
  if (state.modules.scene.capturedPhotoIds.length || hasFlag(state, 'FLAG_A1_SS_FOUND')) nodes.push({ id: 'a1-photo', label: '现场照片', status: hasFlag(state, 'FLAG_A1_SS_FOUND') ? 'complete' : 'known', detail: hasFlag(state, 'FLAG_A1_SS_FOUND') ? '照片线索已确认' : '照片已拍摄，线索仍待核对' });
  if (!nodes.length) nodes.push({ id: 'a1-current', label: '第一幕调查', status: 'current' });
  return [...nodes, { id: 'a1-undiscovered', label: '待发现的新方向', status: 'upcoming' }];
}

function act2Route(state: AppState): InvestigationProgressNode[] {
  const currentIndex = ACT2_STAGES.findIndex((stage) => stage.id === state.modules.act2Research.stage);
  const visibleStages = currentIndex < 0 ? [] : ACT2_STAGES.slice(0, currentIndex + 1);
  const nodes: InvestigationProgressNode[] = visibleStages.map((stage, index) => {
    const complete = stage.flag ? hasFlag(state, stage.flag) : false;
    const current = index === visibleStages.length - 1 && !complete;
    return {
      id: `a2-${stage.id}`,
      label: stage.label,
      status: complete ? 'complete' as const : current ? 'current' as const : 'known' as const,
    };
  });
  if (!nodes.length) nodes.push({ id: 'a2-current', label: '第二幕调查', status: 'current' });
  if (state.modules.act2Research.stage !== 'inactive' && state.modules.act2Research.stage !== 'finale') {
    nodes.push({ id: 'a2-undiscovered', label: '待发现的新方向', status: 'upcoming' });
  } else if (state.modules.act2Research.stage === 'finale' && !hasFlag(state, 'FLAG_A2_COMPLETE')) {
    nodes.push({ id: 'a2-undiscovered', label: '待完成的资料核对', status: 'upcoming' });
  }
  return nodes;
}

function act3Route(state: AppState): InvestigationProgressNode[] {
  const stage = state.modules.act3.stage as AuthoredAct3Stage;
  const stageOrder = Object.keys(ACT3_STAGE_LABEL) as AuthoredAct3Stage[];
  const currentIndex = stageOrder.indexOf(stage);
  const confirmed = new Set(state.modules.act3.confirmedFlagIds);
  const nodes: InvestigationProgressNode[] = stageOrder.slice(0, currentIndex + 1).map((item, index) => {
    const evidence = ACT3_REQUIRED_EVIDENCE[item];
    const completionFlag = ACT3_STAGE_COMPLETION_FLAG[item];
    const complete = confirmed.has(completionFlag) || hasFlag(state, completionFlag);
    const current = index === currentIndex && !complete;
    return {
      id: `a3-${item}`,
      label: item === stage
        ? state.modules.act3.currentLensId
          ? act3PlaceForLens(state.modules.act3.currentLensId, act3LensById(item, state.modules.act3.currentLensId)?.title ?? ACT3_STAGE_LABEL[item])
          : ACT3_STAGE_LABEL[item]
        : ACT3_STAGE_LABEL[item],
      status: complete ? 'complete' : current ? 'current' : 'known',
      ...(complete ? { detail: `${evidence.length} 项必需材料已确认` } : {}),
    };
  });
  nodes.push({ id: 'a3-undiscovered', label: '待发现的新方向', status: 'upcoming' });
  return nodes;
}

function act4Route(state: AppState): InvestigationProgressNode[] {
  const completed = new Set(state.modules.act4.completedNarrativeSectionIds);
  const currentStage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
  const currentIndex = act4NarrativeSections.findIndex((section) => section.stage === currentStage);
  const visible = act4NarrativeSections.slice(0, currentIndex + 1).filter((section) => completed.has(section.id) || section.stage === currentStage);
  const nodes: InvestigationProgressNode[] = visible.map((section) => {
    const isComplete = completed.has(section.id);
    const actionSatisfied = act4NarrativeActionsSatisfied(section.stage, state.modules.act4.completedNarrativeActionIds);
    const current = section.stage === currentStage && !isComplete;
    const perspective = section.perspective === 'wangao' ? '王澳亲历' : '调查者阅读';
    const displayTitle = act4SectionTitleForDisplay(section, isComplete);
    const displayPeriod = act4SectionPeriodForDisplay(section, isComplete);
    const detail = isComplete
      ? `${perspective} · 正文已读${act4NarrativeRequiredActions[section.stage]?.some((action) => !state.modules.act4.completedNarrativeActionIds.includes(action)) ? '，相关动作仍待核对' : ''}`
      : section.stage === currentStage
        ? `${perspective}${section.stage === 'T05' ? ` · ${displayPeriod}` : ''} · ${actionSatisfied ? '当前动作已完成，正文尚未收好' : '当前阅读与操作'}`
        : undefined;
    return {
      id: section.id,
      label: displayTitle,
      status: isComplete ? 'complete' as const : current ? 'current' as const : 'known' as const,
      ...(detail ? { detail } : {}),
    };
  });
  if (currentStage !== 'T10' || state.game.flags.FLAG_A4_COMPLETE !== true) {
    nodes.push({ id: 'a4-undiscovered', label: '后续内容待发现', status: 'upcoming' });
  }
  return nodes;
}

function act1Facts(state: AppState): InvestigationProgressFact[] {
  const facts: InvestigationProgressFact[] = [];
  for (const entryId of state.modules.mail.readIds) {
    const mail = mailById.get(entryId);
    if (mail && mail.act === 1) facts.push({ id: mail.id, title: mail.subject, source: `邮箱原文 · ${mail.fromName} · ${mail.sentAt}`, summary: mail.preview, status: 'read' });
  }
  for (const pageId of state.modules.browser.visitedPageIds) {
    const page = browserPageById.get(pageId);
    if (page?.act === 1) {
      const fact = pageFact(pageId);
      if (fact) facts.push(fact);
    }
  }
  for (const hotspotId of state.modules.scene.inspectedHotspotIds) {
    const hotspot = act1SceneHotspots.find((item) => item.id === hotspotId);
    if (hotspot) facts.push({ id: hotspot.id, title: hotspot.label, source: '鸡公岭现场观察', summary: hotspot.observation, status: 'inspected' });
  }
  return facts;
}

function act2Facts(state: AppState): InvestigationProgressFact[] {
  const currentStageIndex = ACT2_STAGES.findIndex((stage) => stage.id === state.modules.act2Research.stage);
  const maxPhaseIndex = currentStageIndex < 0 ? -1 : Math.min(currentStageIndex, ACT2_PHASES.length - 1);
  const pages = state.modules.browser.visitedPageIds.flatMap((pageId) => {
    const page = browserPageById.get(pageId);
    const pagePhaseIndex = page ? ACT2_PHASES.indexOf(page.phase as (typeof ACT2_PHASES)[number]) : -1;
    if (page?.act !== 2 || pagePhaseIndex < 0 || pagePhaseIndex > maxPhaseIndex) return [];
    const fact = pageFact(pageId);
    return fact ? [fact] : [];
  });
  const reviews = state.modules.act2Research.t06.reviewedCases.map((review) => ({
    id: `review-${review.caseId}`,
    title: `已记录${review.caseId === 'huang' ? '黄子山' : '钟子月'}材料差异`,
    source: '实名宣传与后续报道',
    summary: '记录内容限于宣传与后续报道说法存在差异，不据此认定原因，也不确认论坛昵称身份。',
    status: 'recorded' as const,
  }));
  return [...pages, ...reviews];
}

function act3Facts(state: AppState): InvestigationProgressFact[] {
  const inspected = new Set(state.modules.act3.inspectedClueIds);
  const facts: InvestigationProgressFact[] = [];
  const stageOrder = Object.keys(ACT3_REQUIRED_EVIDENCE) as AuthoredAct3Stage[];
  const currentIndex = stageOrder.indexOf(state.modules.act3.stage as AuthoredAct3Stage);
  for (const stage of stageOrder.slice(0, currentIndex + 1)) {
    const doc = act3StageDoc(stage);
    const hotspots = new Map(doc.lenses.flatMap((lens) => lens.hotspots.map((hotspot) => [hotspot.clueId, hotspot] as const)));
    for (const clueId of ACT3_REQUIRED_EVIDENCE[stage].map((item) => item.clueId)) {
      if (!inspected.has(clueId)) continue;
      const hotspot = hotspots.get(clueId);
      const reason = ACT3_REQUIRED_EVIDENCE[stage].find((item) => item.clueId === clueId)?.reason;
      facts.push({
        id: clueId,
        title: hotspot?.label ?? '已检视的现场材料',
        source: '第三幕现场观察 · 已检视，结论仍以阶段记录为准',
        summary: hotspot?.observation ?? reason ?? '这项观察已记录。',
        status: 'inspected',
      });
    }
  }
  return facts;
}

function act4Facts(state: AppState): InvestigationProgressFact[] {
  const completed = new Set(state.modules.act4.completedNarrativeSectionIds);
  const currentIndex = act4NarrativeSections.findIndex((section) => section.stage === state.modules.act4.stage);
  return act4NarrativeSections.slice(0, currentIndex + 1).flatMap((section) => {
    if (!completed.has(section.id)) return [];
    const firstBlock = section.blocks[0];
    const firstParagraph = firstBlock?.paragraphs[0];
    const source = section.perspective === 'wangao' ? '王澳亲历原文' : '调查者视角原文';
    return [{
      id: section.id,
      title: section.title,
      source: `${source} · ${section.periodLabel}`,
      summary: firstParagraph ?? '这一篇章已读完。',
      status: 'read' as const,
    }];
  });
}

function pendingDirections(state: AppState, act: 1 | 2 | 3 | 4, finished: boolean): string[] {
  if (finished) return ['如需回看，可在已完成内容中查找；新线索仍待发现。'];

  if (act === 1) {
    const sceneId = state.modules.scene.currentSceneId;
    if (!sceneId) return ['后续内容尚未展开；继续完成当前步骤即可。'];
    const remaining = act1SceneHotspots.filter((item) => item.sceneId === sceneId && !state.modules.scene.inspectedHotspotIds.includes(item.id)).length;
    return remaining
      ? [`当前画面还有 ${remaining} 处已出现的线索标记可检查。`]
      : ['当前画面已出现的线索都看过了；按底部提示继续。'];
  }

  if (act === 2 && state.modules.act2Research.stage === 'qiming') {
    const visited = new Set(state.modules.browser.visitedPageIds);
    const reviewed = new Set(state.modules.act2Research.t06.reviewedCases.map((item) => item.caseId));
    const knownFollowups = (['huang', 'zhong'] as const).filter((person) => visited.has(person === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009') && !reviewed.has(person));
    if (knownFollowups.length) return [`已打开的后续报道中还有 ${knownFollowups.map((person) => person === 'huang' ? '黄子山' : '钟子月').join('、')} 材料待核对并记录。`];
    if (visited.has('PAGE_A2_T06_004') && reviewed.size < 2) return ['宣传原文已经出现；可选择一位已经公开出现的人物，打开其后续报道并记录差异。'];
    return ['从已经出现的启明公开来源中继续核对；尚未出现的人物与后续材料不列在这里。'];
  }

  if (act === 2) {
    const stage = state.modules.act2Research.stage;
    if (stage === 'search' && hasFlag(state, 'FLAG_A2_OFFLINE_RESEARCH_NEEDED')) return ['搜索结果没有回答问题；浏览器里已经出现“去桥头问问当地人”的入口。'];
    if (stage === 'bridge' && hasFlag(state, 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN')) return ['桥头已经出现地名辨认的后续操作；完成后可前往县图书馆。'];
    if (stage === 'library' && hasFlag(state, 'FLAG_A2_BUMU_RULE_BASIC_KNOWN')) return ['地方志目标页已摘录；底部已出现继续对照三篇志异的入口。'];
    if (stage === 'tales' && hasFlag(state, 'FLAG_A2_TRANSFER_RULE_INFERRED')) return ['暂定判断已记录；页面已出现前往高中调查的入口。'];
    if (stage === 'school' && hasFlag(state, 'FLAG_A2_SS_MATCH_CONFIRMED')) return ['新旧记号已核对；页面已出现前往浏览器核查启明的入口。'];
    if (stage === 'finale' && hasFlag(state, 'FLAG_A2_SECOND_TRIP_PLANNED')) return ['第二次进山已商定；页面已出现“再次进山，调查启明旧址”的入口。'];
  }

  if (act === 3) {
    const stage = state.modules.act3.stage as AuthoredAct3Stage;
    const lensId = state.modules.act3.currentLensId ?? act3FirstLensId(stage);
    const lens = act3LensById(stage, lensId);
    const inspected = state.modules.act3.inspectedClueIds;
    const directions: string[] = [];
    const remainingHere = lens?.hotspots.filter((hotspot) => !inspected.includes(hotspot.clueId)).length ?? 0;
    if (remainingHere) directions.push(`当前位置还有 ${remainingHere} 处已出现的观察点可查看。`);
    const availableRoutes = lens?.routes.filter((route) => getAct3RouteAvailability(stage, lensId, route.target, inspected).state === 'ready') ?? [];
    const routeLabels = [...new Set(availableRoutes.map((route) => act3RouteActionLabel(route.kind)))];
    for (const routeLabel of routeLabels) directions.push(`按“${routeLabel}”移动到已出现的相邻视角。`);
    return directions.length ? directions : ['当前没有新的已知观察方向；按页面提示完成必需核对。'];
  }

  if (act === 4) {
    const stage = state.modules.act4.stage as Exclude<Act4Stage, 'inactive'>;
    const section = act4NarrativeSections.find((item) => item.stage === stage);
    const sectionRead = state.modules.act4.completedNarrativeSectionIds.includes(section?.id ?? '');
    const actionSatisfied = act4NarrativeActionsSatisfied(stage, state.modules.act4.completedNarrativeActionIds);
    if (!sectionRead && !actionSatisfied) return [`当前篇章的指定动作尚未完成：${act4Stage(state).nextAction}`];
    if (!sectionRead) return ['当前篇章动作已满足；翻开这一段，按页往下读。'];
    return stage === 'T03' ? ['当前动态已读完；按页面提示继续。'] : ['当前篇章已读完；按页面提示继续。'];
  }

  return ['后续内容尚未展开；继续完成当前步骤即可。'];
}

export function deriveInvestigationProgress(state: AppState): InvestigationProgressModel {
  const current = currentInfo(state);
  const actLabel = `第${['', '一', '二', '三', '四'][current.act]}幕`;
  const route = current.act === 1 ? act1Route(state)
    : current.act === 2 ? act2Route(state)
      : current.act === 3 ? act3Route(state)
        : act4Route(state);
  const facts = current.act === 1 ? act1Facts(state)
    : current.act === 2 ? act2Facts(state)
      : current.act === 3 ? act3Facts(state)
        : act4Facts(state);
  const priorNotes = noteFacts(state, current.act);
  const knownFacts = [...priorNotes, ...facts]
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const finished = current.act === 1 ? hasFlag(state, 'FLAG_A1_COMPLETE')
    : current.act === 2 ? hasFlag(state, 'FLAG_A2_COMPLETE')
      : current.act === 3 ? hasFlag(state, 'FLAG_A3_COMPLETE')
        : hasFlag(state, 'FLAG_A4_COMPLETE');
  return {
    act: current.act,
    actLabel,
    location: current.location,
    currentObjective: current.objective,
    nextAction: current.nextAction,
    ...(current.appId ? { nextActionAppId: current.appId } : {}),
    route,
    knownFacts,
    pendingDirections: pendingDirections(state, current.act, finished),
  };
}

const appLabel: Record<AppId, string> = {
  wechat: '打开微信', mail: '打开邮箱', browser: '打开浏览器', explorer: '打开资源管理器', notepad: '打开调查', photos: '打开照片',
};

function t06DesktopSteps(state: AppState): DesktopTaskStep[] {
  const visited = new Set(state.modules.browser.visitedPageIds);
  const reviewed = new Set(state.modules.act2Research.t06.reviewedCases.map((item) => item.caseId));
  if (state.modules.act2Research.t06.legacyCompletionMigrated || (reviewed.has('huang') && reviewed.has('zhong'))) {
    return [{ id: 't06-continue', label: '在浏览器个案复核区点击“与小月继续核对资料”进入宣传资料核对', complete: false, current: true, appId: 'browser' }];
  }
  const steps: DesktopTaskStep[] = [];
  const officialRead = visited.has('PAGE_A2_T06_004');
  steps.push({ id: 't06-official', label: '打开启明旧站学员成长记录，查看宣传原文', complete: officialRead, current: false, appId: 'browser' });
  const knownCases: readonly { id: 'huang' | 'zhong'; label: string; pageId: string }[] = [
    { id: 'huang', label: '核对黄子山的后续报道并记录材料差异', pageId: 'PAGE_A2_T06_008' },
    { id: 'zhong', label: '核对钟子月的后续报道并记录材料差异', pageId: 'PAGE_A2_T06_009' },
  ];
  const revealed = knownCases.filter((item) => officialRead || visited.has(item.pageId) || reviewed.has(item.id));
  if (revealed.length === 0 && !officialRead) {
    steps.push({ id: 't06-case', label: '从已出现的来源中选择一位人物，打开其后续报道并记录材料差异', complete: false, current: true, appId: 'browser' });
  } else {
    for (const person of revealed) steps.push({
      id: `t06-${person.id}`,
      label: person.label,
      complete: reviewed.has(person.id),
      current: false,
      appId: 'browser',
    });
  }
  const current = steps.findIndex((item) => !item.complete);
  if (current >= 0) steps[current] = { ...steps[current], current: true };
  return steps;
}

function t07DesktopSteps(state: AppState): DesktopTaskStep[] {
  const flags = state.game.flags;
  const steps: DesktopTaskStep[] = [
    { id: 't07-photo', label: '和小月查看校门合影，核对照片中的双 S', complete: flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true, current: false },
    { id: 't07-video', label: '打开受访视频，找到可比对的画面；不必完整播放', complete: flags.FLAG_A2_PROMO_VIDEO_FOUND === true, current: false },
    { id: 't07-compare', label: '截取清晰画面，与第一次徒步拍下的破庙外景并排比对', complete: flags.FLAG_A2_TEMPLE_FRAME_FOUND === true, current: false },
    { id: 't07-location', label: '记录材料能够支持的地点结论', complete: flags.FLAG_A2_QIMING_LOCATION_INFERRED === true, current: false },
    { id: 't07-trip', label: '和小月商量是否安排第二次进山', complete: flags.FLAG_A2_SECOND_TRIP_PLANNED === true, current: false },
  ];
  const current = steps.findIndex((item) => !item.complete);
  if (current >= 0) steps[current] = { ...steps[current], current: true };
  return steps;
}

function currentStageTaskPresentation(state: AppState): DesktopTaskPresentation {
  const current = currentInfo(state);
  const route = current.act === 1 ? act1Route(state)
    : current.act === 2 ? act2Route(state)
      : current.act === 3 ? act3Route(state)
        : act4Route(state);
  const completedCount = route.filter((node) => node.status === 'complete').length;
  return {
    title: '当前步骤',
    summary: current.objective,
    completedCount,
    totalCount: Math.max(completedCount + 1, route.length - 1),
    steps: [{ id: 'current-action', label: current.nextAction, complete: false, current: true, ...(current.appId ? { appId: current.appId } : {}) }],
    nextAction: current.nextAction,
    ...(current.appId ? { actionAppId: current.appId, actionLabel: appLabel[current.appId] } : {}),
  };
}

export function getDesktopTaskPresentation(state: AppState): DesktopTaskPresentation {
  const guide = getCurrentTaskGuide(state);
  if (state.modules.act4.stage !== 'inactive' || state.modules.act3.stage !== 'inactive') {
    return currentStageTaskPresentation(state);
  }
  if (state.modules.act2Research.stage === 'qiming') {
    const steps = t06DesktopSteps(state);
    const current = steps.find((step) => step.current) ?? steps.find((step) => !step.complete);
    return {
      title: '当前步骤',
      summary: '继续核对启明公开资料与已经出现的实名后续。',
      completedCount: steps.filter((step) => step.complete).length,
      totalCount: steps.length,
      steps,
      nextAction: current?.label ?? '两个人物的材料都已记录，可继续核对宣传资料。',
      actionAppId: 'browser',
      actionLabel: appLabel.browser,
    };
  }
  if (state.modules.act2Research.stage === 'finale') {
    const steps = t07DesktopSteps(state);
    if (state.game.flags.FLAG_A2_SECOND_TRIP_PLANNED === true && state.modules.act3.stage === 'inactive') {
      steps.push({ id: 't07-enter-act3', label: '点击“再次进山，调查启明旧址”开始现场调查', complete: false, current: true });
    }
    const current = steps.find((step) => step.current) ?? steps.find((step) => !step.complete) ?? steps[steps.length - 1];
    return {
      title: '当前步骤',
      summary: '和小月核对已读宣传资料与现场照片。',
      completedCount: steps.filter((step) => step.complete).length,
      totalCount: steps.length,
      steps,
      nextAction: current.label,
    };
  }
  if (guide) {
    const steps = [...guide.steps];
    const currentIndex = steps.findIndex((step) => step.current);
    const lastVisible = currentIndex >= 0 ? currentIndex : steps.findIndex((step) => !step.complete);
    const visible = lastVisible >= 0 ? steps.slice(0, lastVisible + 1) : steps;
    const current = visible.find((step) => step.current) ?? visible.find((step) => !step.complete);
    return {
      title: '当前步骤',
      summary: guide.summary,
      completedCount: visible.filter((step) => step.complete).length,
      totalCount: visible.length,
      steps: visible.map((step, index) => ({ ...step, id: `${guide.id}-${index}` })),
      nextAction: current ? [current.label, current.hint].filter(Boolean).join(' ') : guide.summary,
      ...(current?.appId ? { actionAppId: current.appId, actionLabel: appLabel[current.appId] } : {}),
    };
  }
  return currentStageTaskPresentation(state);
}

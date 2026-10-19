import type { AppId, AppState, Act2Stage } from '../../core/types';

import { browserPageById } from '../browserData';

import { getCurrentTaskGuide } from '../taskGuideData';

import { hasFlag, pageFact } from './shared';

import type { InvestigationProgressFact, InvestigationProgressNode } from './types';

export const ACT2_STAGES: readonly { id: Act2Stage; label: string; flag?: string }[] = [
  { id: 'search', label: '网上搜索', flag: 'FLAG_A2_OFFLINE_RESEARCH_NEEDED' },
  { id: 'bridge', label: '桥头询问', flag: 'FLAG_A2_COUNTY_RECORD_HINT_KNOWN' },
  { id: 'library', label: '县图书馆地方志', flag: 'FLAG_A2_BUMU_RULE_BASIC_KNOWN' },
  { id: 'tales', label: '卷末旧录', flag: 'FLAG_A2_TRANSFER_RULE_INFERRED' },
  { id: 'school', label: '学校旧资料', flag: 'FLAG_A2_SS_MATCH_CONFIRMED' },
  { id: 'qiming', label: '实名个案核对', flag: 'FLAG_A2_OTHER_CASES_ABNORMAL' },
  { id: 'finale', label: '宣传资料核对', flag: 'FLAG_A2_COMPLETE' },
];

export const ACT2_PHASES = ['A2_T01', 'A2_T02', 'A2_T03', 'A2_T04', 'A2_T05', 'A2_T06', 'A2_T07'] as const;

export function act2Stage(state: AppState): { location: string; objective: string; nextAction: string; appId?: AppId } {
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
      nextAction: '在浏览器搜索“启明青少年成长中心”，打开并阅读官网与地方报道。',
      appId: 'browser',
    };
    const namesKnown = visited.has('PAGE_A2_T06_004');
    const missingNames = (['huang', 'zhong'] as const).filter((caseId) => !reviewed.has(caseId));
    const alreadyRecorded = reviewed.size ? `已有 ${reviewed.size} 位人物的材料差异记录。` : '';
    const knownFollowup = (caseId: 'huang' | 'zhong') => visited.has(caseId === 'huang' ? 'PAGE_A2_T06_008' : 'PAGE_A2_T06_009');
    const nextNamed = missingNames.find((caseId) => knownFollowup(caseId));
    if (nextNamed) {
      const name = nextNamed === 'huang' ? '黄子山' : '钟子月';
      return {
        location: '启明实名个案复核',
        objective: `${alreadyRecorded}核对当前已打开的${name}后续报道与宣传原文。`,
        nextAction: `可搜索“启明 ${name}”打开后续报道，再返回个案复核区记录材料差异。`,
        appId: 'browser',
      };
    }
    return {
      location: '启明实名个案复核',
      objective: `${alreadyRecorded}选择一位已在公开来源中出现的人物继续核对。`,
      nextAction: namesKnown
        ? '可搜索“启明 黄子山”或“启明 钟子月”打开后续报道，再回到个案复核区记录材料差异。'
        : '在浏览器搜索“启明青少年成长中心”并阅读公开案例；姓名出现后再搜索对应人物的后续报道。',
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


export function act2Route(state: AppState): InvestigationProgressNode[] {
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


export function act2Facts(state: AppState): InvestigationProgressFact[] {
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

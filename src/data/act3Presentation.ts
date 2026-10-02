import type { Act3ActiveStage } from '../core/types';
import type { AuthoredAct3Stage } from './act3Data';

export type Act3NarrativeMovement = '进入' | '深入' | '撤离';

const MOVEMENT_BY_STAGE: Record<AuthoredAct3Stage, Act3NarrativeMovement> = {
  T00: '进入', T01: '进入', T02: '进入',
  T03: '深入', T04: '深入', T05: '深入', T06: '深入',
  T07: '撤离',
};

/** Stable place headings for lenses that change only the viewing position. */
const STABLE_PLACE_BY_LENS: Record<string, string> = {
  LENS_A3_T00_004: '山坡电缆断点',
  LENS_A3_T00_005: '山坡电缆断点',
  LENS_A3_T00_009: '山下排水沟',
  LENS_A3_T00_010: '山下排水沟',
  LENS_A3_T01_001: '启明旧址外门',
  LENS_A3_T01_002: '启明旧址外门',
  LENS_A3_T01_003: '启明旧址外门',
  LENS_A3_T01_004: '启明旧址外门',
  LENS_A3_T03_002: '二十四小时房门',
  LENS_A3_T03_003: '二十四小时房门',
  LENS_A3_T04_003: '档案室书架边',
  LENS_A3_T04_004: '档案室书架边',
  LENS_A3_T04_005: '档案室书架边',
  LENS_A3_T05_003: '广播室旧桌',
  LENS_A3_T05_004: '广播室旧桌',
  LENS_A3_T05_005: '广播室旧桌',
  LENS_A3_T06_002: '地下厨房',
  LENS_A3_T06_003: '地下厨房',
  LENS_A3_T06_004: '地下厨房',
  LENS_A3_T06_005: '地下厨房',
  LENS_A3_T06_006: '地下厨房',
  LENS_A3_T06_007: '地下厨房',
  LENS_A3_T07_002: '教室与厕所拐角',
  LENS_A3_T07_003: '教室与厕所拐角',
  LENS_A3_T07_004: '教室与厕所拐角',
  LENS_A3_T07_005: '教室与厕所拐角',
  LENS_A3_T07_006: '教室与厕所拐角',
  LENS_A3_T07_007: '教室与厕所拐角',
};

export function act3MovementForStage(stage: Act3ActiveStage): Act3NarrativeMovement {
  return MOVEMENT_BY_STAGE[stage];
}

export function act3MovementClassForStage(stage: Act3ActiveStage): 'entry' | 'depth' | 'return' {
  return stage === 'T07' ? 'return' : ['T00', 'T01', 'T02'].includes(stage) ? 'entry' : 'depth';
}

export function act3PlaceForLens(lensId: string, fallbackTitle: string): string {
  return STABLE_PLACE_BY_LENS[lensId] ?? fallbackTitle;
}

export function act3LensTitleFor(lensId: string, authoredTitle: string, inspectedClueIds: readonly string[]): string {
  if (lensId === 'LENS_A3_T04_005' && !inspectedClueIds.includes('CLUE_A3_T04_VVAKE_PAPER')) return '纸片近处';
  if (lensId === 'LENS_A3_T05_005' && !inspectedClueIds.includes('CLUE_A3_T05_13ACK_PAPER')) return '折起的纸片';
  if (lensId === 'LENS_A3_T07_006') {
    return inspectedClueIds.includes('CLUE_A3_T07_NOTEBOOK_PICKUP') ? '取出的笔记本' : '缝隙里的物件';
  }
  return authoredTitle;
}

export function act3LensDescriptionFor(lensId: string, authoredDescription: string, inspectedClueIds: readonly string[]): string {
  if (lensId === 'LENS_A3_T04_005' && !inspectedClueIds.includes('CLUE_A3_T04_VVAKE_PAPER')) {
    return '一张折旧纸片上还有文字，先检查内容，再决定是否带走。';
  }
  if (lensId === 'LENS_A3_T05_005' && !inspectedClueIds.includes('CLUE_A3_T05_13ACK_PAPER')) {
    return '折起的纸片上写着一行标题和几项词语；内容尚未辨认。';
  }
  if (lensId === 'LENS_A3_T07_006') {
    return inspectedClueIds.includes('CLUE_A3_T07_NOTEBOOK_PICKUP')
      ? '塑料袋里是一本褐色笔记本，需要带到外面再细看。'
      : '窄缝里塞着一件用透明胶包住的东西。可以选择取出，再到外面查看内容。';
  }
  return authoredDescription;
}

export function act3HotspotLabelFor(stage: Act3ActiveStage, clueId: string, authoredLabel: string, inspectedClueIds: readonly string[]): string {
  if ((stage === 'T04' && clueId === 'CLUE_A3_T04_VVAKE_PAPER')
    || (stage === 'T05' && clueId === 'CLUE_A3_T05_13ACK_PAPER')) {
    return inspectedClueIds.includes(clueId) ? authoredLabel : '读清纸片上的字';
  }
  if (stage === 'T07' && clueId === 'CLUE_A3_T07_NOTEBOOK_PICKUP') {
    return inspectedClueIds.includes(clueId) ? authoredLabel : '主动取出缝隙里的物件';
  }
  return authoredLabel;
}

export function act3MaterialLabel(stage: Act3ActiveStage, clueId: string, authoredLabel: string, inspectedClueIds: readonly string[]): string {
  const known = inspectedClueIds.includes(clueId);
  if (((stage === 'T04' && clueId === 'CLUE_A3_T04_VVAKE_PAPER')
    || (stage === 'T05' && clueId === 'CLUE_A3_T05_13ACK_PAPER')) && !known) return '查看待核对的材料';
  if (stage === 'T07' && clueId === 'CLUE_A3_T07_NOTEBOOK_PICKUP' && !known) return '继续核对当前发现';
  return authoredLabel;
}

export function act3ExitReason(stage: Act3ActiveStage, missingClueIds: readonly string[]): string {
  if (stage !== 'T07') return '还没有核对本阶段的必需材料。';
  if (missingClueIds.includes('CLUE_A3_T07_XIAOYUE_MEMORY')) return '先听小月把她记得的事情说完。';
  if (missingClueIds.includes('CLUE_A3_T07_BACK_GAP')) return '结合小月的回忆，再从不同高度查看这个拐角。';
  if (missingClueIds.includes('CLUE_A3_T07_NOTEBOOK_PICKUP')) return '沿着刚发现的缝隙，决定是否继续行动。';
  if (missingClueIds.includes('CLUE_A3_T07_FIRST_PAGE')) return '把带出的本子收好，再打开扉页确认字迹。';
  return '还没有完成离开前的核对。';
}

export function act3ObjectiveFor(stage: Act3ActiveStage, inspectedClueIds: readonly string[]): string {
  const has = (clueId: string) => inspectedClueIds.includes(clueId);
  switch (stage) {
    case 'T00': return '核对山路上的人工痕迹，判断旧址方向。';
    case 'T01': return '沿入口和围栏继续查看，确认旧址范围。';
    case 'T02': return '并列查看教室记录与现场宣传内容，留下尚未解释的矛盾。';
    case 'T03': return '记录门上的时长标记与观察结构，保留空间用途的依据。';
    case 'T04': return has('CLUE_A3_T04_VVAKE_PAPER')
      ? '带着刚读到的词语继续查看相邻走廊；它们的来处仍不清楚。'
      : '沿空置房间与相邻走廊，继续检查已经看见的痕迹。';
    case 'T05': return has('CLUE_A3_T05_13ACK_PAPER')
      ? '把刚读到的词语与前一处线索并排核对，暂时保留解释。'
      : '检查广播室留下的痕迹，并留意与走廊相连的方向。';
    case 'T06': return has('CLUE_A3_T06_TEMPLE_COMPARE')
      ? '照片和现场显示了可比对的细节；结论仍限于曾有关联的迹象。'
      : '记录厨房里能直接观察到的内容；需要时再与旧庙照片对照。';
    case 'T07':
      if (!has('CLUE_A3_T07_XIAOYUE_MEMORY')) return '与小月一起沿回程路线慢慢查看熟悉的地方。';
      if (!has('CLUE_A3_T07_BACK_GAP')) return '小月认出了熟悉的拐角；结合她的回忆，再从不同高度查看。';
      if (!has('CLUE_A3_T07_NOTEBOOK_PICKUP')) return '顺着刚发现的痕迹，判断下一步要不要行动。';
      if (!has('CLUE_A3_T07_FIRST_PAGE')) return '把取出的本子收好，只打开扉页核对字迹。';
      return '带着刚确认的记录，沿来路回到遗址出口。';
  }
}

import type { Act4State } from '../../core/types';
import type { LaterStage } from '../../data/act4/laterContent';

export function nextAct4Block(stage: LaterStage, nextId: string, state: Act4State): string | null {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  if (stage === 'T06' && nextId === 'A4_T06_ROOMMATE' && !solved('A4_P13')) return '先整理早晚广播。';
  if (stage === 'T07' && nextId === 'A4_T07_KITCHEN' && !solved('A4_P16')) return '先确认梦中姓名与自己不一致。';
  if (stage === 'T08' && nextId === 'A4_T08_MIRROR' && !solved('A4_P18')) return '先找到并阅读黄子山档案。';
  if (stage === 'T09' && nextId === 'A4_T09_EXIT' && !solved('A4_P21')) return '先包裹并藏好笔记。';
  if (stage === 'T09' && nextId === 'A4_T09_BLACKOUT' && state.broadcastIndex < 6) return '广播还有词语未播完。';
  if (stage === 'T10' && nextId === 'A4_T10_CAFE' && !solved('A4_P23')) return '先确认小月的读法只是一种可能。';
  return null;
}

export function finishAct4Block(stage: LaterStage, state: Act4State): string | null {
  const required: Record<LaterStage, string> = { T06: 'A4_P13', T07: 'A4_P16', T08: 'A4_P18', T09: 'A4_P21', T10: 'A4_P23' };
  if (!state.solvedPuzzleIds.includes(required[stage])) return '主线线索还未确认。';
  if (stage === 'T09' && state.broadcastIndex !== 6) return '尚未听完最后一组广播。';
  if (stage === 'T10' && !state.finalMailOpened) return '请主动打开并读完最后一封邮件。';
  return null;
}

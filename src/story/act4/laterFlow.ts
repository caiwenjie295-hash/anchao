import type { Act4State } from '../../core/types';
import type { LaterStage } from '../../data/act4/laterContent';

export function nextAct4Block(stage: LaterStage, nextId: string, state: Act4State): string | null {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  if (stage === 'T06' && nextId === 'A4_T06_ROOMMATE' && !solved('A4_P13')) return '先整理早晚广播。';
  if (stage === 'T07' && nextId === 'A4_T07_KITCHEN' && !solved('A4_P16')) return '先确认梦中姓名与自己不一致。';
  if (stage === 'T08' && nextId === 'A4_T08_MIRROR' && !solved('A4_P18')) return '先找到并阅读黄子山档案。';
  if (stage === 'T09' && nextId === 'A4_T09_EXIT' && state.packageStep < 3) return '先完成放袋、缠胶和藏好三个动作。';
  if (stage === 'T09' && nextId === 'A4_T09_BLACKOUT' && state.broadcastIndex < 6) return '广播还有词语未播完。';
  return null;
}

export function finishAct4Block(stage: LaterStage, state: Act4State): string | null {
  const required: Partial<Record<LaterStage, string>> = { T06: 'A4_P13', T07: 'A4_P16', T08: 'A4_P18' };
  if (required[stage] && !state.solvedPuzzleIds.includes(required[stage]!)) return '主线判断还未确认。';
  if (stage === 'T09' && (state.packageStep !== 3 || state.broadcastIndex !== 6)) return '笔记需要收好，广播还要听到最后一个词。';
  if (stage === 'T10' && !state.finalMailOpened) return '请主动打开并读完最后一封邮件。';
  return null;
}

import type { Act4NarrativeBlock } from '../../../data/narrative/act4Narrative';
import { act4ReaderTextPages, type Act4TextSegment } from '../../../data/narrative/act4Presentation';
import type { ActiveAct4NarrativeStage } from '../../../story/act4/narrativePolicy';

export const blockedReason: Partial<Record<ActiveAct4NarrativeStage, string>> = {
  T02: '先分别核对两封邮件的日期，再用这一天登录。',
  T04: '读完情境后打开 VVaKe 邮件，再继续阅读。',
  T08: '到达档案馆后，打开 2008 年的档案。',
  T09: '先把笔记藏好，再走到门外听完广播。',
  T10: '读完当下的故事后打开最后一封邮件。',
};

export function readerPagesForBlock(stage: ActiveAct4NarrativeStage, block: Act4NarrativeBlock): readonly Act4TextSegment[] {
  return act4ReaderTextPages(stage, block.id, block.paragraphs, block.kind === 'novel-excerpt');
}

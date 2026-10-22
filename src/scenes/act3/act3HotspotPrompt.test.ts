import { describe, expect, it } from 'vitest';
import { act3HotspotPrompt } from './act3HotspotPrompt';

describe('Act3 hotspot prompts', () => {
  it.each([
    { stage: 'T02' as const, id: 'CLUE_A3_T02_SS_SCRATCH', label: '检查黑板划痕', neutral: '检查划痕', forbidden: '双S' },
    { stage: 'T03' as const, id: 'CLUE_A3_T03_24H', label: '辨认二十四小时标记', neutral: '查看门上标记', forbidden: '二十四小时' },
    { stage: 'T03' as const, id: 'CLUE_A3_T03_48_72H', label: '逐扇核对四十八与七十二小时标记', neutral: '核对门上标记', forbidden: '七十二小时' },
    { stage: 'T04' as const, id: 'CLUE_A3_T04_VVAKE_PAPER', label: '读清并收起 VVaKe 纸片', neutral: '查看纸片', forbidden: 'VVaKe' },
    { stage: 'T05' as const, id: 'CLUE_A3_T05_13ACK_PAPER', label: '读清并收起 13aCK 纸片', neutral: '查看纸片', forbidden: '13aCK' },
    { stage: 'T06' as const, id: 'CLUE_A3_T06_TEMPLE_COMPARE', label: '对照破庙照片与空神龛并确认关联', neutral: '对照两张照片', forbidden: '确认关联' },
    { stage: 'T07' as const, id: 'CLUE_A3_T07_FIRST_PAGE', label: '确认 A.W 与字迹后合上', neutral: '核对第一页字迹', forbidden: 'A.W' },
  ])('uses a neutral pre-observation label for $id', ({ stage, id, label, neutral, forbidden }) => {
    const prompt = act3HotspotPrompt(stage, id, label, []);
    expect(prompt).toBe(neutral);
    expect(prompt).not.toContain(forbidden);
  });

  it('restores the existing informed action label after the observation is recorded', () => {
    expect(act3HotspotPrompt('T04', 'CLUE_A3_T04_VVAKE_PAPER', '读清并收起 VVaKe 纸片', ['CLUE_A3_T04_VVAKE_PAPER']))
      .toBe('读清并收起 VVaKe 纸片');
    expect(act3HotspotPrompt('T07', 'CLUE_A3_T07_NOTEBOOK_PICKUP', '主动取出包裹的笔记本', ['CLUE_A3_T07_NOTEBOOK_PICKUP']))
      .toBe('主动取出包裹的笔记本');
  });
});

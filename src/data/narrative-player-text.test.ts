import { describe, expect, it } from 'vitest';
import { act3StageDoc, type AuthoredAct3Stage } from './act3Data';
import { laterScenes } from './act4/laterContent';
import { birthdayScenes } from './act4/content';

/**
 * A34-NARRATIVE-0001 §5.1 / §13.1 TXT-01、TXT-02、TXT-03。
 *
 * 玩家可见字段不得出现画图指令、占位说明或源码说明。
 * 注意关键词在小说原文与正常教程中可能合法，所以这里只针对已确认的
 * 「制作/流程指令」句式，并配合结构断言（热点必须有独立正文）。
 */

/** 只在开发语境成立的表述；正常剧情与操作帮助不含这些句式。 */
const FORBIDDEN_TERMS = [
  ['不让模型', '模型生成指令'],
  ['由模型', '模型生成指令'],
  ['大模型', '模型生成指令'],
  ['提示词', '生成提示'],
  ['标语留白', '画图留白说明'],
  ['留白以供', '画图留白说明'],
  ['暂不阅读', '流程管制指令'],
  ['待接入', '占位说明'],
  ['待补', '占位说明'],
  ['最小实现', '开发说明'],
  ['不写入', '开发约束语句'],
  ['不得提前', '开发约束语句'],
  ['画面停在这里', '制作语气'],
  ['档案只在我这一段经历中出现', '视角元文案'],
  ['低饱和', '美术生成指令'],
  ['手机拍摄', '美术生成指令'],
  ['极度写实', '美术生成指令'],
];

const offendersIn = (text: string, id: string): string[] =>
  FORBIDDEN_TERMS.filter(([term]) => text.includes(term)).map(([term, reason]) => `${id} [${reason}: ${term}]`);

const STAGES: AuthoredAct3Stage[] = ['T00', 'T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07'];
const allLenses = STAGES.flatMap((stage) => act3StageDoc(stage).lenses);

describe('third-act player text has no development instructions', () => {
  it('keeps model and rendering instructions out of lens descriptions', () => {
    const offenders = allLenses.flatMap((lens) => offendersIn(lens.description, lens.id));
    expect(offenders).toEqual([]);
  });

  it('keeps development instructions out of stage intros', () => {
    const offenders = STAGES.flatMap((stage) => offendersIn(act3StageDoc(stage).intro, stage));
    expect(offenders).toEqual([]);
  });

  it('keeps development instructions out of hotspot observations', () => {
    const offenders = allLenses.flatMap((lens) => lens.hotspots.flatMap((hotspot) => offendersIn(hotspot.observation ?? '', hotspot.clueId)));
    expect(offenders).toEqual([]);
  });

  it('gives every hotspot its own observation text', () => {
    // TXT-02：不同热点不能全部重复同一段镜头说明。
    const missing = allLenses.flatMap((lens) => lens.hotspots.filter((h) => !h.observation?.trim()).map((h) => `${lens.id}/${h.clueId}`));
    expect(missing).toEqual([]);
  });

  it('does not repeat a lens description as the observation', () => {
    const duplicated = allLenses.flatMap((lens) =>
      lens.hotspots.filter((h) => h.observation?.trim() === lens.description.trim()).map((h) => `${lens.id}/${h.clueId}`));
    expect(duplicated).toEqual([]);
  });

  it('gives each hotspot a distinct observation within the same lens', () => {
    const duplicated: string[] = [];
    for (const lens of allLenses) {
      const seen = new Map<string, string>();
      for (const hotspot of lens.hotspots) {
        const text = hotspot.observation?.trim() ?? '';
        const first = seen.get(text);
        if (first) duplicated.push(`${first} === ${hotspot.clueId}`);
        else seen.set(text, hotspot.clueId);
      }
    }
    expect(duplicated).toEqual([]);
  });
});

describe('fourth-act player text has no development instructions', () => {
  it('keeps meta commentary out of later-scene character prose', () => {
    expect(laterScenes.flatMap((scene) => offendersIn(scene.text, scene.id))).toEqual([]);
  });

  it('keeps meta commentary out of birthday-scene prose', () => {
    expect(birthdayScenes.flatMap((scene) => offendersIn(scene.text, scene.id))).toEqual([]);
  });

  it('exposes a short alt separate from the art direction', () => {
    for (const scene of laterScenes) {
      // 结构性验证：无障碍名称不得来自制作字段。
      expect(scene.alt.length, `${scene.id} alt 过长`).toBeLessThanOrEqual(40);
      expect(scene.alt).not.toBe(scene.artDirection);
      expect(scene.alt).not.toContain('低饱和');
      expect(scene.alt).not.toContain('文字层');
    }
  });
});

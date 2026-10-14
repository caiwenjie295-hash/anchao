import type { ActiveAct4NarrativeStage } from '../../story/act4/narrativePolicy';

export type Act4EmphasisRun = { text: string; emphasized: boolean };

const emphasisPhrases: Partial<Record<ActiveAct4NarrativeStage, readonly string[]>> = {
  T01: ['凌晨一点', '凌晨两点半', '排水沟', '手电熄灭了', '教室 SS', 'Wangao.weibo.com', '密码是一样的'],
  T02: ['20200419', '不要担心', '接近真相'],
  T03: ['以前的我是谁', '我失去了什么', '我想把那些记忆就此遗忘', '我是自由的'],
  T04: ['很诡异的邮件', '“曼陀罗”'],
  T05: ['我不喜欢这个名字', '今天是 12 月 29 日', '我的生日', '我什么都明白了'],
  T06: ['我还是没有放弃逃跑', '一个人是逃不出这里的'],
  T07: ['梦中的我是谁', '黄子山', '我很好奇'],
  T08: ['我清楚地记得那一天', '我决定了', '至少，也要走出那扇门'],
  T09: ['回收完成', '朝门外走去'],
  T10: ['第三杯', '请回到正常的工作与生活'],
};

/** Emphasize one authored phrase at most; all output text is sliced directly from the source paragraph. */
export function act4EmphasisRuns(stage: ActiveAct4NarrativeStage, _blockId: string, paragraph: string): Act4EmphasisRun[] {
  const phrase = emphasisPhrases[stage]?.find((candidate) => paragraph.includes(candidate));
  if (!phrase) return [{ text: paragraph, emphasized: false }];
  const start = paragraph.indexOf(phrase);
  const end = start + phrase.length;
  return [
    ...(start > 0 ? [{ text: paragraph.slice(0, start), emphasized: false }] : []),
    { text: paragraph.slice(start, end), emphasized: true },
    ...(end < paragraph.length ? [{ text: paragraph.slice(end), emphasized: false }] : []),
  ];
}

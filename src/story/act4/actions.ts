export type Act4PuzzleId = `A4_P${string}`;

/** 可见按钮与键盘共用的答案核对；失败保留已选卡片。 */
export const act4Answer: Record<string, string> = {
  A4_P01: 'cave,gate,hydrant', A4_P02: 'cave,drain,hydrant', A4_P03: 'accounts',
  A4_P04: '20200419', A4_P05: 'both', A4_P06: '04-03,04-09,04-19',
  A4_P07: 'food,friends,xiaoyue', A4_P08: 'memory', A4_P09: 'VVaKe',
  A4_P10: 'mail-first', A4_P11: 'contact,two-months', A4_P12: 'birthday,river',
};

export const act4Hints: Record<string, [string, string]> = {
  A4_P01: ['看看三页笔记上的凌晨时刻。', '石洞在 02:30，机构门口在 03:50；消防栓在更后面。'],
  A4_P02: ['把地点按沿路出现的顺序点选。', '石洞、排水沟、消防栓。'],
  A4_P03: ['末页留下了两种账号。', '“微”和“箱”可能指微博和邮箱。'],
  A4_P04: ['两封信写的是同一天。', '只取 2020 年 4 月 19 日的八位日期，不取 23:41。'],
  A4_P05: ['末页写着两个账号密码一样。', '把同一日期用在微博和邮箱两个入口。'],
  A4_P06: ['先看三篇帖子的日期。', '注册在 04-03，怀疑旧我在 04-09，回去决定在 04-19。'],
  A4_P07: ['注意生活细节的变化。', '食堂对应吃饭、网吧对应朋友、梦见女孩对应小月。'],
  A4_P08: ['镜子和噩梦都在谈记忆。', '04-13 至 16 的梦可能关联过去经历，原因仍未知。'],
  A4_P09: ['先对照第一词。', '邮件第一词是“蜘蛛”，看六词及顺序是否都一致。'],
  A4_P10: ['比较同一天的时间。', '启明邮件是 00:00；微博是随后新注册记录。'],
  A4_P11: ['听父母和来人的两句关键话。', '“交给你们我们放心”以及“就两个月”说明事先安排。'],
  A4_P12: ['留意日记日期和河边。', '生日是 12 月 29 日，河边是他曾短暂感到自由的地方。'],
};

export function answerAct4Puzzle(id: string, selections: string[]): boolean {
  return act4Answer[id] === selections.join(',');
}

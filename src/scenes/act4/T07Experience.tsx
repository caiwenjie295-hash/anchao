import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { Puzzle } from './Act4Puzzle';

export function T07Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  return <>
    {state.laterNodeId === 'A4_T07_MIRROR' && <>
      <p><strong>梦中笔记：</strong>黄子山。<br /><strong>醒来时：</strong>我自认王澳。梦里的镜中是“我的脸”，并没有第二张脸可供确认。</p>
      <Puzzle id="A4_P16" title="姓名与自认身份" manager={manager} solved={solved('A4_P16')} choices={[{ id: 'wangao', label: '现实自认：王澳' }, { id: 'huang', label: '梦中笔记：黄子山' }]} />
      {solved('A4_P16') && <p className="a4-done">两者不一致；不能据此确定发生了什么机制。</p>}
    </>}
    {state.seenLaterNodeIds.includes('A4_T07_MATH') && <aside className="a4-recap"><strong>玩家回看 / 证据对照</strong><p>第二幕学霸笔记与这里的双 S 可以并看；2014 年小 A 没有拿到未来的调查材料。</p>
      <Puzzle id="A4_P17" title="双 S 与断开的记忆（可选）" manager={manager} solved={solved('A4_P17')} choices={[{ id: 'double-s', label: '数学笔记页边出现双 S' }, { id: 'unremembered', label: '小 A 不记得写过' }]} />
    </aside>}
  </>;
}

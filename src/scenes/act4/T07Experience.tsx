import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { Puzzle } from './Act4Puzzle';

export function T07Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  return <>
    {state.laterNodeId === 'A4_T07_MIRROR' && <>
      <p><strong>梦中笔记：</strong>黄子山。<br /><strong>醒来时：</strong>我是王澳。梦里的镜中，我却毫不迟疑地觉得：“这就是我的脸。”</p>
      <Puzzle id="A4_P16" title="姓名与自认身份" manager={manager} solved={solved('A4_P16')} choices={[{ id: 'wangao', label: '现实自认：王澳' }, { id: 'huang', label: '梦中笔记：黄子山' }]} />
      {solved('A4_P16') && <p className="a4-done">两者不一致；不能据此确定发生了什么机制。</p>}
    </>}
    {state.seenLaterNodeIds.includes('A4_T07_MATH') && <aside className="a4-recap"><strong>另一处双 S</strong><p>后来找到的学霸笔记上也有双 S。那时的我不知道另一页笔记的存在。</p>
      <Puzzle id="A4_P17" title="双 S 与断开的记忆（可选）" manager={manager} solved={solved('A4_P17')} choices={[{ id: 'double-s', label: '数学笔记页边出现双 S' }, { id: 'unremembered', label: '小 A 不记得写过' }]} />
    </aside>}
  </>;
}

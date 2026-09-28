import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { huangArchive } from '../../data/act4/laterContent';
import { Puzzle } from './Act4Puzzle';

export function T08Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  return <>
    {state.seenLaterNodeIds.includes('A4_T08_ROUTE') && <Puzzle id="A4_P19" title="沿旧路辨向（可选）" manager={manager} solved={solved('A4_P19')} choices={[
      { id: 'wall', label: '砖红围墙' }, { id: 'cave', label: '石洞' }, { id: 'drain', label: '排水沟' },
    ]} />}
    {state.laterNodeId === 'A4_T08_ARCHIVE' && <>
      <p>书架标有不同年份，书脊标有姓名。先找年份，再找人名；不用辨认图片小字。</p>
      <Puzzle id="A4_P18" title="档案架两步定位" manager={manager} solved={solved('A4_P18')} choices={[
        { id: 'huang', label: '黄子山书脊' }, { id: '2014', label: '2014 年架' }, { id: '2008', label: '2008 年架' },
      ]} />
      {solved('A4_P18') && <article className="a4-paper"><strong>黄子山档案</strong>{huangArchive.map((line) => <p key={line}>{line}</p>)}<p>寻找王澳 2014 年档案时，外面脚步逼近，我未及读成。</p></article>}
    </>}
    {state.laterNodeId === 'A4_T08_KITCHEN' && <>
      <Puzzle id="A4_P20" title="用手机看厨房深处（可选）" manager={manager} solved={solved('A4_P20')} choices={[{ id: 'phone', label: '打开手机相机放大' }, { id: 'statue', label: '看向深处黑色塑像' }]} />
      <p>铁钩上的肉来源无法辨明。即使放大塑像，也不能据此确认肉是什么。</p>
    </>}
  </>;
}

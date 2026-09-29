import { useState } from 'react';
import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { huangArchive } from '../../data/act4/laterContent';
import { Puzzle } from './Act4Puzzle';

export function T08Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  const [year, setYear] = useState('');
  const [person, setPerson] = useState('');
  const [notice, setNotice] = useState('');
  const openFile = () => {
    if (!year || !person) { setNotice('先选年份，再选姓名。'); return; }
    const opened = manager.solveAct4Puzzle('A4_P18', [year, person]);
    setNotice(opened ? '档案已打开。' : '这一年架和姓名没有对上，可回去再核对。');
  };
  return <>
    {state.seenLaterNodeIds.includes('A4_T08_ROUTE') && <Puzzle id="A4_P19" title="沿旧路辨向（可选）" manager={manager} solved={solved('A4_P19')} choices={[
      { id: 'wall', label: '砖红围墙' }, { id: 'cave', label: '石洞' }, { id: 'drain', label: '排水沟' },
    ]} />}
    {state.laterNodeId === 'A4_T08_ARCHIVE' && <>
      <p>书架先按年份排列。选定年份后，再找对应的姓名书脊并主动打开档案。</p>
      {!solved('A4_P18') && <section className="a4-archive-search" aria-label="档案两步检索">
        <h3>第一步：选择年份</h3>
        <div className="a4-choices">{['2008', '2014', '2016'].map(value => <button type="button" aria-pressed={year === value} key={value} onClick={() => { setYear(value); setPerson(''); setNotice(''); }}>{value} 年架</button>)}</div>
        {year && <><h3>第二步：选择书脊姓名</h3><div className="a4-choices">
          {[{ id: 'huang', label: '黄子山' }, { id: 'wangao', label: '王澳' }, { id: 'other', label: '其他姓名' }].map(item => <button type="button" aria-pressed={person === item.id} key={item.id} onClick={() => { setPerson(item.id); setNotice(''); }}>{item.label}</button>)}
        </div><button type="button" onClick={openFile}>打开这份档案</button></>}
        {notice && <p role="status">{notice}</p>}
      </section>}
      {solved('A4_P18') && <article className="a4-paper"><strong>黄子山档案</strong>{huangArchive.map((line) => <p key={line}>{line}</p>)}<p>寻找王澳 2014 年档案时，外面脚步逼近，我未及读成。</p></article>}
    </>}
    {state.laterNodeId === 'A4_T08_KITCHEN' && <>
      <Puzzle id="A4_P20" title="用手机看厨房深处（可选）" manager={manager} solved={solved('A4_P20')} choices={[{ id: 'phone', label: '打开手机相机放大' }, { id: 'statue', label: '看向深处黑色塑像' }]} />
      <p>铁钩上的肉来源无法辨明。即使放大塑像，也不能据此确认肉是什么。</p>
    </>}
  </>;
}

import { useState } from 'react';
import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { backWords, wakeWords } from '../../data/act4/content';
import { Puzzle } from './Act4Puzzle';

export function T06Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  const [notice, setNotice] = useState('');
  const confirm = (period: 'morning' | 'night', groupId: string) => {
    const accepted = manager.confirmAct4BroadcastPeriod(period, groupId);
    setNotice(accepted
      ? period === 'morning' ? '早读后的广播记录已核对。' : '睡前的广播记录已核对。'
      : '这组词与所选时段对不上，再看一次记录。');
  };
  const scene = state.laterNodeId;
  return <>
    {scene === 'A4_T06_BROADCAST' && <>
      <h2>一日作息与广播</h2>
      <p>早上五点起床跑操；早读结束后，走廊喇叭响起。睡前还有另一组词。</p>
      <section className="a4-broadcast-period" aria-label="早读后的广播">
        <h3>早读之后</h3><p>{backWords.join(' · ')}</p>
        {state.broadcastPeriodsConfirmed.includes('morning')
          ? <p className="a4-done">13aCK 与早读后的广播相符 ✓</p>
          : <div className="a4-choices"><button type="button" onClick={() => confirm('morning', '13aCK')}>13aCK</button><button type="button" onClick={() => confirm('morning', 'VVaKe')}>VVaKe</button></div>}
      </section>
      <section className="a4-broadcast-period" aria-label="睡前广播">
        <h3>睡前</h3><p>{wakeWords.join(' · ')}</p>
        {state.broadcastPeriodsConfirmed.includes('night')
          ? <p className="a4-done">VVaKe 与睡前的广播相符 ✓</p>
          : <div className="a4-choices"><button type="button" onClick={() => confirm('night', 'VVaKe')}>VVaKe</button><button type="button" onClick={() => confirm('night', '13aCK')}>13aCK</button></div>}
      </section>
      {notice && <p role="status">{notice}</p>}
      {solved('A4_P13') && <p className="a4-done">早间广播与脑雾同现，睡前播放另一组六词；原因尚不能确认。</p>}
      <aside className="a4-recap"><strong>另一条线索</strong><p>后来在启明旧址找到的两张纸，写着同样的词。那时的我还不知道它们会被人发现。</p>
        <Puzzle id="A4_P14" title="两张纸的回声（可选）" manager={manager} solved={solved('A4_P14')} choices={[{ id: 'paper-match', label: '两组词分别与第三幕纸片相同' }]} />
      </aside>
    </>}
    {scene === 'A4_T06_CONFINEMENT' && <>
      <p>铁门上有三个小孔，食物从翻盖口递进来。日夜难辨，我只能一遍遍看着那道门。</p>
      <Puzzle id="A4_P15" title="禁闭室结构（可选）" manager={manager} solved={solved('A4_P15')} choices={[{ id: 'flap', label: '翻盖送餐口' }, { id: 'three-holes', label: '三个小孔' }]} />
    </>}
  </>;
}

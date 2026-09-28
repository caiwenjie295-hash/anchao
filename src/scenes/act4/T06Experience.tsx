import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { backWords, wakeWords } from '../../data/act4/content';
import { Puzzle } from './Act4Puzzle';

export function T06Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  const scene = state.laterNodeId;
  return <>
    {scene === 'A4_T06_BROADCAST' && <>
      <h2>一日作息与广播</h2>
      <p>早读后：13aCK · {backWords.join(' · ')}</p><p>睡前：VVaKe · {wakeWords.join(' · ')}</p>
      <Puzzle id="A4_P13" title="排一日三段与两组广播" manager={manager} solved={solved('A4_P13')} choices={[
        { id: 'night-broadcast', label: '睡前广播' }, { id: 'VVaKe', label: '睡前 VVaKe' },
        { id: 'wake', label: '五点起床与跑操' }, { id: '13aCK', label: '早读后 13aCK' },
        { id: 'day-broadcast', label: '早读后广播' },
      ]} />
      {solved('A4_P13') && <p className="a4-done">早间广播与脑雾同现，睡前播放另一组六词；原因尚不能确认。</p>}
      <aside className="a4-recap"><strong>玩家回看 / 证据对照</strong><p>以下是玩家对第三幕纸片的回看，并非 2014 年小 A 手中的实物。</p>
        <Puzzle id="A4_P14" title="两张纸的回声（可选）" manager={manager} solved={solved('A4_P14')} choices={[{ id: 'paper-match', label: '两组词分别与第三幕纸片相同' }]} />
      </aside>
    </>}
    {scene === 'A4_T06_CONFINEMENT' && <>
      <p>铁门上有三个小孔，食物从翻盖口递进来。日夜难辨，我只能一遍遍看着那道门。</p>
      <Puzzle id="A4_P15" title="禁闭室结构（可选）" manager={manager} solved={solved('A4_P15')} choices={[{ id: 'flap', label: '翻盖送餐口' }, { id: 'three-holes', label: '三个小孔' }]} />
    </>}
  </>;
}

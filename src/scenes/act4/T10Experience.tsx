import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { backWords, wakeWords } from '../../data/act4/content';
import { finalQimingMail } from '../../data/act4/laterContent';
import { Puzzle } from './Act4Puzzle';

export function T10Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  return <>
    {state.laterNodeId === 'A4_T10_WORDS' && <>
      <p><strong>VVaKe：</strong>{wakeWords.join(' · ')}<br /><strong>13aCK：</strong>{backWords.join(' · ')}</p>
      <p>小月：“VVaKe 和 13aCK，像不像 wake 和 back？”这是我们的联想，不是机构自述。</p>
      <Puzzle id="A4_P23" title="并列观察两种读法" manager={manager} solved={solved('A4_P23')} choices={[{ id: 'certain', label: '已证实一种机制' }, { id: 'possible', label: '可能有关，尚未证实' }]} />
    </>}
    {state.laterNodeId === 'A4_T10_CAFE' && <>
      <p>桌上已有两杯。第三杯是给小 A 点的奶茶；不做 P24 也会留下三杯合照与碰杯。</p>
      <Puzzle id="A4_P24" title="摆好第三杯（可选）" manager={manager} solved={solved('A4_P24')} choices={[{ id: 'third-cup', label: '把奶茶放在两人之间，拍下三杯' }]} />
    </>}
    {state.laterNodeId === 'A4_T10_MAIL' && <>
      {!state.finalMailOpened ? <button type="button" onClick={() => manager.openAct4FinalMail()}>打开启明最后一封邮件</button> : <article className="a4-paper"><strong>主题：关于王澳同学相关事项的说明<br />发件人：启明</strong>{finalQimingMail.map((line) => <p key={line}>{line}</p>)}</article>}
      {state.finalMailOpened && <p>邮件没有给出小 A 的去向，也没有说明是谁发信。</p>}
    </>}
  </>;
}

import type { Act4State } from '../../core/types';
import type { StateManager } from '../../core/stateManager';
import { backWords } from '../../data/act4/content';
import { Puzzle } from './Act4Puzzle';

const packageActions = [
  { id: 'bag', label: '放进塑料袋' }, { id: 'tape', label: '用透明胶缠好' }, { id: 'hide', label: '塞到消防栓背后' },
] as const;

export function T09Experience({ state, manager }: { state: Act4State; manager: StateManager }) {
  const solved = (id: string) => state.solvedPuzzleIds.includes(id);
  return <>
    {state.seenLaterNodeIds.includes('A4_T09_REPLY') && <>
      <article className="a4-paper"><strong>发件人：Jay · 主题：回复小 A</strong><p>好久不见啊小 A，怎么想起来联系我了？什么时候有空，咱们叫上小月，三个人吃个饭聚聚，说不定又能在一个城市工作呢？期待三人组回归！</p></article>
      <Puzzle id="A4_P22" title="回信中的称呼（可选）" manager={manager} solved={solved('A4_P22')} choices={[{ id: 'xiaoa', label: '“好久不见啊小 A”' }]} />
    </>}
    {state.laterNodeId === 'A4_T09_NOTE' && <>
      <p>笔记末页只留下两个账号、同一密码和那些逐渐错乱的字句。</p>
      <div className="a4-actions">{packageActions.map((action, index) => <button type="button" key={action.id} disabled={state.packageStep !== index} onClick={() => manager.advanceAct4Package(action.id)}>{index + 1}. {action.label} {state.packageStep > index && '✓'}</button>)}</div>
      {state.packageStep === 3 && <Puzzle id="A4_P21" title="确认笔记已包裹藏好" manager={manager} solved={solved('A4_P21')} choices={packageActions.map((item) => ({ id: item.id, label: item.label }))} />}
    </>}
    {state.laterNodeId === 'A4_T09_EXIT' && <>
      <p>门外就是春天。广播逐词传来；每次点击都正常响应，没有限时或失败惩罚。</p>
      <ol className="a4-word-list">{backWords.slice(0, state.broadcastIndex).map((word, index) => <li key={word}>{word}{index === 4 && '——左脚迈出门槛'}</li>)}</ol>
      {state.broadcastIndex < 6 && <button type="button" onClick={() => manager.advanceAct4Broadcast()}>听下一个词</button>}
      {state.broadcastIndex === 6 && <p role="status">“表”。我倒下了；后面只有一句“回收完成”。</p>}
    </>}
  </>;
}

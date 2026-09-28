import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { backWords, wakeWords } from '../../data/act4/content';
import { firstLaterSceneId, lastLaterSceneId, laterSceneById, laterScenesByStage, type LaterStage } from '../../data/act4/laterContent';
import { finishAct4Block, nextAct4Block } from '../../story/act4/laterFlow';
import { T06Experience } from './T06Experience';
import { T07Experience } from './T07Experience';
import { T08Experience } from './T08Experience';
import { T09Experience } from './T09Experience';
import { T10Experience } from './T10Experience';
import '../../act4/act4.css';

const labels: Record<LaterStage, string> = {
  T06: '2014 / 王澳（小 A） · 机构日常与禁闭',
  T07: '2014 / 王澳（小 A） · 黄子山的梦',
  T08: '2020-04-03 → 04-19 / 王澳（小 A） · 独自返回',
  T09: '次日清晨 / 王澳（小 A） · 最后几步',
  T10: '当下 / 主角与小月 · 尾声',
};

export function Act4LaterExperience({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const whole = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const state = whole.modules.act4;
  const stage = state.stage as LaterStage;
  const [reviewId, setReviewId] = useState<string | null>(null);
  useEffect(() => setReviewId(null), [stage]);
  const scenes = laterScenesByStage(stage);
  const current = laterSceneById.get(state.laterNodeId ?? '') ?? laterSceneById.get(firstLaterSceneId[stage])!;
  const displayed = reviewId ? laterSceneById.get(reviewId) ?? current : current;
  const currentIndex = scenes.findIndex((scene) => scene.id === current.id);
  const next = scenes[currentIndex + 1];
  const nextBlock = next ? nextAct4Block(stage, next.id, state) : null;
  const finishBlock = finishAct4Block(stage, state);
  const atEnd = current.id === lastLaterSceneId[stage];
  const completed = whole.game.flags.FLAG_A4_COMPLETE === true;
  return <main className="a4 a4-later" aria-label={`第四幕 ${stage}`}>
    <header className="a4-header"><div><small>第四幕 · {stage}</small><h1>{labels[stage]}</h1></div><button type="button" onClick={onExit}>退出到桌面</button></header>
    <div className="a4-grid">
      <section className="a4-card">
        <p className="a4-perspective">{stage === 'T10' ? '当下调查：这里只引用主角与小月能取得的公开资料与纸片。' : '玩家专属第一人称经历：这段画面不是当下主角取得的录像或证言。'}</p>
        <article className={`a4-scene${displayed.id === 'A4_T09_BLACKOUT' ? ' a4-scene--blackout' : ''}`} data-asset-id={displayed.assetId} aria-label={displayed.imageDescription}>
          <h2>{displayed.title}</h2><p>{displayed.text}</p><small>图片待补 · 完整文字与操作仍可使用</small>
        </article>
        <div className="a4-actions">
          {reviewId ? <button type="button" onClick={() => setReviewId(null)}>回到当前进度</button> : <>
            {next && <button type="button" disabled={nextBlock !== null} onClick={() => manager.visitAct4LaterNode(next.id)}>继续经历</button>}
            {nextBlock && <p role="status">{nextBlock}</p>}
            {atEnd && !completed && <button type="button" disabled={finishBlock !== null} onClick={() => manager.advanceAct4LaterStage()}>{stage === 'T10' ? '读完邮件，收束第四幕' : `确认 ${stage} 结束，继续`}</button>}
            {atEnd && finishBlock && <p role="status">{finishBlock}</p>}
          </>}
        </div>
        {completed && <p className="a4-done">第四幕完结。邮件与已见片段可回看；小 A 的最终去向没有确证。</p>}
        <details className="a4-recap"><summary>回看本阶段已见片段</summary><div className="a4-page-list">{scenes.filter((scene) => state.seenLaterNodeIds.includes(scene.id)).map((scene) => <button type="button" key={scene.id} aria-current={displayed.id === scene.id ? 'page' : undefined} onClick={() => setReviewId(scene.id)}>{scene.title}</button>)}</div></details>
        <details className="a4-recap"><summary>玩家回看 / 先前证据</summary><p>笔记末页：Wangao.weibo.com、Wangao@163.com；两个账号同密，“不要担心那一天”。</p><p>第三幕纸片：13aCK · {backWords.join('、')}；VVaKe · {wakeWords.join('、')}。</p><p>2020-04-19 微博：小 A 决定返山，并把两个账号密码改为这一天。</p></details>
      </section>
      <section className="a4-card"><h2>当前行动</h2>
        {reviewId ? <p>正在回看已见片段。回到当前进度后可继续操作。</p> : <>
          {stage === 'T06' && <T06Experience state={state} manager={manager} />}
          {stage === 'T07' && <T07Experience state={state} manager={manager} />}
          {stage === 'T08' && <T08Experience state={state} manager={manager} />}
          {stage === 'T09' && <T09Experience state={state} manager={manager} />}
          {stage === 'T10' && <T10Experience state={state} manager={manager} />}
        </>}
      </section>
    </div>
  </main>;
}

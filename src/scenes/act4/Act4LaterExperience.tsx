import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { assetLoader } from '../../core/assetLoader';
import { PhotoViewport } from '../../components/PhotoViewport';
import { backWords, wakeWords } from '../../data/act4/content';
import { act4PhotoLayout } from '../../data/act4/act4PhotoLayout';
import { firstLaterSceneId, huangArchive, jayReply, laterSceneById, laterScenesByStage, type LaterStage } from '../../data/act4/laterContent';
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [routeNotice, setRouteNotice] = useState('');
  const [selectedNote, setSelectedNote] = useState('');
  useEffect(() => { setReviewId(null); setDetailOpen(false); setRouteNotice(''); setSelectedNote(''); }, [stage]);
  const scenes = laterScenesByStage(stage);
  const current = laterSceneById.get(state.laterNodeId ?? '') ?? laterSceneById.get(firstLaterSceneId[stage])!;
  const displayed = reviewId ? laterSceneById.get(reviewId) ?? current : current;
  const currentIndex = scenes.findIndex(scene => scene.id === current.id);
  const next = scenes[currentIndex + 1];
  const nextBlock = next ? nextAct4Block(stage, next.id, state) : null;
  const finishBlock = finishAct4Block(stage, state);
  const completed = whole.game.flags.FLAG_A4_COMPLETE === true;
  const layout = act4PhotoLayout[displayed.assetId];
  const goForward = () => {
    if (reviewId) { setReviewId(null); return; }
    const block = next ? nextBlock : finishBlock;
    if (block) { setRouteNotice(block); setDetailOpen(true); return; }
    setRouteNotice(''); setDetailOpen(false);
    if (next) manager.visitAct4LaterNode(next.id);
    else if (!completed) manager.advanceAct4LaterStage();
  };
  const detail = <>
    {stage === 'T06' && <T06Experience state={state} manager={manager} />}
    {stage === 'T07' && <T07Experience state={state} manager={manager} />}
    {stage === 'T08' && <T08Experience state={state} manager={manager} />}
    {stage === 'T09' && <T09Experience state={state} manager={manager} />}
    {stage === 'T10' && <T10Experience state={state} manager={manager} />}
  </>;
  return <main className="a4 a4-later a4-photo-experience" aria-label="第四幕">
    <header className="a4-header"><div><small>第四幕 · 王澳</small><h1>{labels[stage]}</h1></div><button type="button" onClick={onExit}>退出到桌面</button></header>
    <p className="a4-perspective">{stage === 'T10' ? '如今，我和小月把手中能查到的资料再次摊开。' : '那时我所见、所想的事，只有这段记忆知道。'}</p>
    <section className="a4-photo-stage" data-asset-id={displayed.assetId} aria-label={displayed.imageDescription}>
      <PhotoViewport sceneKey={displayed.id} imageUrl={assetLoader.get(displayed.assetId)?.src} imageAlt={displayed.imageDescription}
        hotspots={[{ id: `clue:${displayed.id}`, ...layout.focus, onActivate: () => { setDetailOpen(true); setRouteNotice(''); setSelectedNote(''); } }, ...(layout.details ?? []).map((point, index) => ({ id: `clue:${displayed.id}:${index}`, ...point, onActivate: () => { setDetailOpen(true); setRouteNotice(''); setSelectedNote(point.note ?? ''); } }))]}
        routes={[{ id: `route:${displayed.id}`, ...layout.route, disabled: completed && !reviewId, onActivate: goForward }]}
        transitionDirection={reviewId ? 'back' : 'forward'}>
        <div className="a4-photo-caption"><strong>{displayed.title}</strong><p>{displayed.text}</p></div>
      </PhotoViewport>
    </section>
    {completed && <p className="a4-done">第四幕完结。邮件与已见片段可回看；小 A 的最终去向没有确证。</p>}
    <details className="a4-recap"><summary>回看本阶段已见片段</summary><div className="a4-page-list">{scenes.filter(scene => state.seenLaterNodeIds.includes(scene.id)).map(scene => <button type="button" key={scene.id} aria-current={displayed.id === scene.id ? 'page' : undefined} onClick={() => { setReviewId(scene.id); setDetailOpen(false); }}>{scene.title}</button>)}<button type="button" onClick={() => setReviewId(null)}>回到当前进度</button></div></details>
    <details className="a4-recap"><summary>重看先前的线索</summary><p>笔记末页：Wangao.weibo.com、Wangao@163.com；两个账号同密，“不要担心那一天”。</p><p>第三幕纸片：13aCK · {backWords.join('、')}；VVaKe · {wakeWords.join('、')}。</p><p>2020-04-19 微博：小 A 决定返山，并把两个账号密码改为这一天。</p>
      {state.solvedPuzzleIds.includes('A4_P18') && <article className="a4-paper"><strong>那时读过的黄子山档案</strong><p>这几行只留在小 A 当年的记忆里；如今的我和小月没有拿到这份档案。</p>{huangArchive.map(line => <p key={line}>{line}</p>)}</article>}
      {state.seenLaterNodeIds.includes('A4_T09_REPLY') && <article className="a4-paper"><strong>那时收到的 Jay 的回信</strong><p>小 A 当时在手机上读到了这封信；如今的我还没有见到他的收件箱。</p><p>{jayReply}</p></article>}
    </details>
    {detailOpen && <div className="a4-detail-backdrop" onClick={() => setDetailOpen(false)}><section className="a4-detail" role="dialog" aria-modal="true" aria-label={`${displayed.title}的线索`} onKeyDown={event => { if (event.key === 'Escape') setDetailOpen(false); }} onClick={event => event.stopPropagation()}><div className="a4-detail-head"><h2>{displayed.title}</h2><button type="button" autoFocus onClick={() => setDetailOpen(false)}>关闭，返回画面</button></div>{selectedNote ? <p className="a4-detail-note">{selectedNote}</p> : <p>{displayed.text}</p>}{!reviewId && detail}{routeNotice && <p role="status" className="a4-hint">{routeNotice}</p>}</section></div>}
  </main>;
}

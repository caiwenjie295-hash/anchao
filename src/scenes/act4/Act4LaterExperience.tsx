import { useEffect, useState, useSyncExternalStore } from 'react';
import { stateManager, type StateManager } from '../../core/stateManager';
import { assetLoader } from '../../core/assetLoader';
import { PhotoViewport } from '../../components/PhotoViewport';
import { InvestigationDetail } from '../../components/investigation/InvestigationDetail';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction } from '../../components/investigation/types';
import { backWords, wakeWords } from '../../data/act4/content';
import { act4PhotoLayout } from '../../data/act4/act4PhotoLayout';
import { firstLaterSceneId, huangArchive, jayReply, laterSceneById, laterScenesByStage, type LaterStage } from '../../data/act4/laterContent';
import { finishAct4Block, nextAct4Block } from '../../story/act4/laterFlow';
import { T06Experience } from './T06Experience';
import { T07Experience } from './T07Experience';
import { T08Experience } from './T08Experience';
import { T09Experience } from './T09Experience';
import { T10Experience } from './T10Experience';
import { photoCaptionLead } from './photoCaption';
import '../../act4/act4.css';

const labels: Record<LaterStage, string> = {
  T06: '2014 / 王澳（小 A） · 机构日常与禁闭',
  T07: '2014 / 王澳（小 A） · 黄子山的梦',
  T08: '2020-04-03 → 04-19 / 王澳（小 A） · 独自返回',
  T09: '次日清晨 / 王澳（小 A） · 最后几步',
  T10: '当下 / 主角与小月 · 尾声',
};

const relatedScene: Partial<Record<LaterStage, { id: string; label: string }>> = {
  T06: { id: 'A4_T06_BROADCAST', label: '早晚广播记录' },
  T07: { id: 'A4_T07_MIRROR', label: '梦中姓名与镜像' },
  T08: { id: 'A4_T08_ARCHIVE', label: '2008 年档案架' },
  T09: { id: 'A4_T09_NOTE', label: '消防栓旁的笔记' },
  T10: { id: 'A4_T10_WORDS', label: '两张词表' },
};

export function Act4LaterExperience({ manager = stateManager, onExit }: { manager?: StateManager; onExit: () => void }) {
  const whole = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const state = whole.modules.act4;
  const stage = state.stage as LaterStage;
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState('');
  useEffect(() => { setReviewId(null); setDetailOpen(false); setSelectedNote(''); }, [stage]);

  const scenes = laterScenesByStage(stage);
  const current = laterSceneById.get(state.laterNodeId ?? '') ?? laterSceneById.get(firstLaterSceneId[stage])!;
  const displayed = reviewId ? laterSceneById.get(reviewId) ?? current : current;
  const currentIndex = scenes.findIndex(scene => scene.id === current.id);
  const next = scenes[currentIndex + 1];
  const nextBlock = next ? nextAct4Block(stage, next.id, state) : null;
  const finishBlock = finishAct4Block(stage, state);
  const completed = whole.game.flags.FLAG_A4_COMPLETE === true;
  const layout = act4PhotoLayout[displayed.assetId];
  const block = next ? nextBlock : finishBlock;
  const suggestedMaterial = block ? relatedScene[stage] : undefined;

  const goForward = () => {
    if (next) manager.visitAct4LaterNode(next.id);
    else if (!completed) manager.advanceAct4LaterStage();
  };

  const actions: InvestigationAction[] = reviewId
    ? [{ actionId: 'A4_RETURN_TO_CURRENT_PROGRESS', kind: 'review', label: '返回当前进度', state: 'ready', onActivate: () => { setReviewId(null); setDetailOpen(false); setSelectedNote(''); } }]
    : [{
      actionId: `A4_${stage}_CONTINUE`,
      kind: stage === 'T10' ? 'story' : 'memory',
      target: next?.id ?? `A4_${stage}_NEXT`,
      label: completed ? '本段已完成' : next ? (stage === 'T10' ? '继续当下' : '继续这段记忆') : '结束本段，继续之后',
      state: completed ? 'completed' : block ? 'blocked' : 'ready',
      reason: block ?? undefined,
      relatedMaterials: suggestedMaterial ? [{ id: suggestedMaterial.id, label: suggestedMaterial.label }] : undefined,
      onActivate: goForward,
      onOpenMaterial: suggestedMaterial ? () => { setReviewId(suggestedMaterial.id); setDetailOpen(false); setSelectedNote(''); } : undefined,
    }];

  const detail = <>
    {stage === 'T06' && <T06Experience state={state} manager={manager} />}
    {stage === 'T07' && <T07Experience state={state} manager={manager} />}
    {stage === 'T08' && <T08Experience state={state} manager={manager} />}
    {stage === 'T09' && <T09Experience state={state} manager={manager} />}
    {stage === 'T10' && <T10Experience state={state} manager={manager} />}
  </>;

  return <InvestigationShell
    ariaLabel="第四幕回忆调查"
    actLabel="第四幕"
    locationLabel={displayed.title}
    contextLabel={`${reviewId ? '回看中 · ' : ''}${labels[stage]} · ${stage === 'T10' ? '当下视角' : '王澳的亲历记忆'}`}
    objective={stage === 'T10' ? '和小月核对手中材料，保留仍然未知的部分。' : '跟随王澳当时看见和做过的事；回看不会改变当前进度。'}
    helpText="点击照片上的标记查看当前物件；底部行动用于继续剧情或返回当前进度。回看已出现片段只展示材料，不推进故事。"
    actions={actions}
    statusMessage={reviewId ? '回看中 · 只读展示，不会推进当前进度。' : undefined}
    onExit={onExit}
  >
    <section className="a4-photo-stage" data-asset-id={displayed.assetId} aria-label={displayed.alt}>
      <PhotoViewport sceneKey={displayed.id} imageUrl={assetLoader.get(displayed.assetId)?.src} imageAlt={displayed.alt}
        hotspots={[{ id: `clue:${displayed.id}`, ...layout.focus, onActivate: () => { setDetailOpen(true); setSelectedNote(''); } }, ...(layout.details ?? []).map((point, index) => ({ id: `clue:${displayed.id}:${index}`, ...point, onActivate: () => { setDetailOpen(true); setSelectedNote(point.note ?? ''); } }))]}
        routes={[]}
        transitionDirection={reviewId ? 'back' : 'forward'}>
        <div className="a4-photo-caption"><strong>{displayed.title}</strong><p>{photoCaptionLead(displayed.text)}</p></div>
      </PhotoViewport>
    </section>
    {completed && <p className="a4-done">第四幕完结。邮件与已见片段可回看；小 A 的最终去向没有确证。</p>}
    {!reviewId && <>
      <details className="a4-recap"><summary>回看本阶段已见片段</summary><div className="a4-page-list">{scenes.filter(scene => state.seenLaterNodeIds.includes(scene.id)).map(scene => <button type="button" key={scene.id} aria-current={displayed.id === scene.id ? 'page' : undefined} onClick={() => { setReviewId(scene.id); setDetailOpen(false); }}>
        {scene.title}</button>)}<button type="button" onClick={() => setReviewId(null)}>回到当前进度</button></div></details>
      <details className="a4-recap"><summary>重看先前的线索</summary><p>笔记末页：Wangao.weibo.com、Wangao@163.com；两个账号同密，“不要担心那一天”。</p><p>第三幕纸片：13aCK · {backWords.join('、')}；VVaKe · {wakeWords.join('、')}。</p><p>2020-04-19 微博：小 A 决定返山，并把两个账号密码改为这一天。</p>
        {state.solvedPuzzleIds.includes('A4_P18') && <article className="a4-paper"><strong>那时读过的黄子山档案</strong><p>这几行只留在小 A 当年的记忆里；如今的我和小月没有拿到这份档案。</p>{huangArchive.map(line => <p key={line}>{line}</p>)}</article>}
        {state.seenLaterNodeIds.includes('A4_T09_REPLY') && <article className="a4-paper"><strong>那时收到的 Jay 的回信</strong><p>小 A 当时在手机上读到了这封信；如今的我还没有见到他的收件箱。</p><p>{jayReply}</p></article>}
      </details>
    </>}
    {detailOpen && <InvestigationDetail title={displayed.title} onClose={() => setDetailOpen(false)} fallbackFocus={() => document.querySelector<HTMLElement>(`[data-clue-id="clue:${displayed.id}"]`)}>
      {selectedNote ? <p className="a4-detail-note">{selectedNote}</p> : <p>{displayed.text}</p>}
      {!reviewId && detail}
    </InvestigationDetail>}
  </InvestigationShell>;
}

import { useEffect, useRef, useState, type ComponentProps, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct3Snapshot, selectAct3Snapshot } from '../../core/store/selectors';
import type { Act3ActiveStage, Act3Hotspot, Act3Lens } from '../../core/types';
import '../../act3/act3Scene.css';
import { PhotoViewport, type PhotoMarker } from '../../components/PhotoViewport';
import { InvestigationDetail } from '../../components/investigation/InvestigationDetail';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction, InvestigationMaterialLink } from '../../components/investigation/types';
import { act3PhotoLayout } from '../../data/act3PhotoLayout';
import { act3ComparisonPhotoDetailAssetId } from '../../data/act3ComparisonPhotoDetails';
import { act3FirstLensId, act3LensById, act3RequiredClueIds, act3StageDoc, ACT3_STAGE_NEXT, act3DetailImageIdForClue } from '../../data/act3Data';
import { act3LensDescriptionFor, act3LensTitleFor, act3MovementClassForStage, act3MovementForStage, act3ObjectiveFor, act3PlaceForLens, act3RouteLabelFor, act3StageCompletionLabel } from '../../data/act3Presentation';
import { findAct3RoutePathToClue, getAct3RouteAvailability } from '../../story/investigation/act3RoutePolicy';
import { act3HotspotActionLabel } from '../../story/investigation/actionPresentation';
import { act3HotspotPrompt } from './act3HotspotPrompt';

type Act3PhotoViewportProps = ComponentProps<typeof PhotoViewport> & { explorationMode?: boolean; revealBeat?: boolean };
const Act3PhotoViewport = PhotoViewport as ComponentType<Act3PhotoViewportProps>;

export interface Act3InvestigationProps {
  manager?: StateManager;
  onReturnToDesktop?: () => void;
  onOpenAct4?: () => void;
}

const STAGE_TITLE: Record<Act3ActiveStage, string> = {
  T00: '再次进山',
  T01: '启明旧址入口',
  T02: '教室与标语',
  T03: '禁闭区',
  T04: '档案室',
  T05: '广播室',
  T06: '厨房与空神龛',
  T07: '一层返程',
};

const STANCE_LABEL: Record<Act3Lens['stance'], string> = {
  look: '远处观察',
  approach: '靠近查看',
  crouch: '低处观察',
  enter: '进入室内',
};

function displayedLensTitle(stage: Act3ActiveStage, lens: Act3Lens, inspectedClueIds: readonly string[]): string {
  const title = act3LensTitleFor(lens.id, lens.title, inspectedClueIds);
  if (stage === 'T03' && lens.id === 'LENS_A3_T03_002' && !inspectedClueIds.includes('CLUE_A3_T03_24H')) return '门牌近处';
  if (stage === 'T03' && lens.id === 'LENS_A3_T03_004' && !inspectedClueIds.includes('CLUE_A3_T03_48_72H')) return '门牌近处';
  return title;
}

function displayedLensPlace(stage: Act3ActiveStage, lens: Act3Lens, inspectedClueIds: readonly string[]): string {
  const hasObserved24HourMarker = inspectedClueIds.includes('CLUE_A3_T03_24H');
  if (stage === 'T03' && ['LENS_A3_T03_002', 'LENS_A3_T03_003'].includes(lens.id) && !hasObserved24HourMarker) return '走廊房门';
  if (stage === 'T03' && lens.id === 'LENS_A3_T03_004' && !inspectedClueIds.includes('CLUE_A3_T03_48_72H')) return '走廊房门';
  return act3PlaceForLens(lens.id, lens.title);
}

function ComparisonPhoto({ assetId, alt, caption, placeholder }: { assetId: string; alt: string; caption: string; placeholder: string }) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const [detailImageFailed, setDetailImageFailed] = useState(false);
  const zoomTrigger = useRef<HTMLButtonElement>(null);
  const src = assetLoader.get(assetId)?.src;
  const detailAssetId = act3ComparisonPhotoDetailAssetId(assetId);
  const detailSource = detailAssetId ? assetLoader.get(detailAssetId)?.src : undefined;
  const detail = zoomOpen && detailAssetId && typeof document !== 'undefined' ? createPortal(
    <InvestigationDetail title={caption} onClose={() => setZoomOpen(false)} fallbackFocus={() => zoomTrigger.current}>
      {detailSource && !detailImageFailed
        ? <img className="act3-investigation__comparison-zoom" src={detailSource} alt={alt} onError={() => setDetailImageFailed(true)} />
        : <p className="act3-investigation__comparison-zoom-fallback" role="status">{alt}的独立放大近景暂不可用。</p>}
    </InvestigationDetail>,
    document.body,
  ) : null;
  return <>
    <figure>
      {src ? <img src={src} alt={alt} /> : <div className="act3-investigation__comparison-placeholder">{placeholder}</div>}
      <figcaption>{caption}</figcaption>
      <button ref={zoomTrigger} type="button" disabled={!src || !detailAssetId} onClick={() => setZoomOpen(true)}>放大查看</button>
    </figure>
    {detail}
  </>;
}

const PAPER_TRANSCRIPTS: Record<string, { title: string; alt: string; lines: string[]; note: string }> = {
  CLUE_A3_T04_VVAKE_PAPER: {
    title: 'VVaKe', alt: '档案室发现的 VVaKe 纸片近景',
    lines: ['蜘蛛', '雨伞', '白走廊', '台灯', '风车', '曼陀罗'],
    note: '上方文字按纸片上能辨认的内容抄录；这些词之间的对应关系仍不清楚。',
  },
  CLUE_A3_T05_13ACK_PAPER: {
    title: '13aCK', alt: '广播室发现的 13aCK 纸片近景',
    lines: ['老鼠', '血', '草垛', '木房子', '玫瑰', '表'],
    note: '上方文字按纸片上能辨认的内容抄录；它与前一张纸的对应关系尚未确认。',
  },
};

function ClueDetailEvidence({ stage, hotspot }: { stage: Act3ActiveStage; hotspot: Act3Hotspot }) {
  const paper = PAPER_TRANSCRIPTS[hotspot.clueId];
  const assetId = act3DetailImageIdForClue(hotspot.clueId);
  if (!assetId) return null;
  const asset = assetLoader.get(assetId);
  return <figure className="act3-investigation__detail-evidence" data-asset-id={assetId}>
    {asset?.src
      ? <img src={asset.src} alt={paper?.alt ?? `${hotspot.label}的独立照片细节`} />
      : <div className="act3-investigation__comparison-placeholder" role="img" aria-label={`${hotspot.label}的独立照片细节暂不可用`}>{hotspot.observation ?? hotspot.label}</div>}
    <figcaption>{paper ? `${paper.title}纸片 · 实物细节` : stage === 'T06' && hotspot.clueId === 'CLUE_A3_T06_EMPTY_BASE' ? '空神龛底座 · 近景' : `${hotspot.label} · 独立细节`}</figcaption>
    {paper && <div className="act3-investigation__paper-transcript" aria-label={`${paper.title}纸片可辨文字`}>
      <h3>纸面文字</h3>
      <strong>{paper.title}</strong>
      <ul>{paper.lines.map((line) => <li key={line}>{line}</li>)}</ul>
      <p>{paper.note}</p>
    </div>}
  </figure>;
}

export function Act3Investigation({ manager = defaultManager, onReturnToDesktop, onOpenAct4 }: Act3InvestigationProps) {
  const state = useAppSelector(manager, selectAct3Snapshot, equalAct3Snapshot);
  const stage = state.modules.act3.stage;
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const [readNarrationLensIds, setReadNarrationLensIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (stage === 'inactive') return;
    const currentId = state.modules.act3.currentLensId;
    if (!currentId || !act3LensById(stage, currentId)) manager.enterAct3Lens(act3FirstLensId(stage));
  }, [stage, state.modules.act3.currentLensId, manager]);

  if (stage === 'inactive') {
    return <InvestigationShell className="act3-investigation" ariaLabel="第三幕调查" actLabel="第三幕" locationLabel="启明遗址调查" objective="第三幕尚未开始。" onExit={onReturnToDesktop ?? (() => {})}>
      <p className="act3-investigation__empty">第三幕尚未开始。</p>
    </InvestigationShell>;
  }

  const doc = act3StageDoc(stage);
  const currentLensId = state.modules.act3.currentLensId;
  const lens: Act3Lens | null = currentLensId ? act3LensById(stage, currentLensId) : null;
  if (!lens) return <InvestigationShell className={`act3-investigation investigation-shell--exploration act3-investigation--${act3MovementClassForStage(stage)}`} ariaLabel="第三幕调查" actLabel={`第三幕 · ${act3MovementForStage(stage)}`} locationLabel={STAGE_TITLE[stage]} objective={act3ObjectiveFor(stage, state.modules.act3.inspectedClueIds)} onExit={onReturnToDesktop ?? (() => {})}><p className="act3-investigation__empty">当前镜头暂时无法显示，可从已知地点返回。</p></InvestigationShell>;

  const assetSrc = assetLoader.get(lens.assetId)?.src;
  const lensHotspot = hotspotId ? lens.hotspots.find((item) => item.clueId === hotspotId) : undefined;
  const inspected = state.modules.act3.inspectedClueIds;
  const lensTitle = displayedLensTitle(stage, lens, inspected);
  const lensPlace = displayedLensPlace(stage, lens, inspected);
  const lensDescription = act3LensDescriptionFor(lens.id, lens.description, inspected);
  const samePlaceLenses = doc.lenses.filter((item) => act3PlaceForLens(item.id, item.title) === act3PlaceForLens(lens.id, lens.title));
  const samePlaceLensIndex = samePlaceLenses.findIndex((item) => item.id === lens.id) + 1;
  const requiredClueIds = act3RequiredClueIds(stage);
  const missingRequiredIds = requiredClueIds.filter((id) => !inspected.includes(id));
  const completedRequiredCount = requiredClueIds.length - missingRequiredIds.length;
  const observedPhotoHotspotCount = lens.hotspots.filter((hotspot) => inspected.includes(hotspot.clueId)).length;
  const unobservedPhotoHotspotCount = lens.hotspots.length - observedPhotoHotspotCount;
  const nextStage = ACT3_STAGE_NEXT[stage];

  const hotspotByClue = new Map(doc.lenses.flatMap((item) => item.hotspots.map((hotspot) => [hotspot.clueId, { hotspot, lensId: item.id }] as const)));
  const currentMissingRequiredHotspot = lens.hotspots.find((hotspot) => missingRequiredIds.includes(hotspot.clueId));
  const missingOnCurrentPhotoCount = lens.hotspots.filter((hotspot) => missingRequiredIds.includes(hotspot.clueId)).length;
  const nextMissingRequired = missingRequiredIds.map((id) => hotspotByClue.get(id)?.hotspot).find((hotspot) => hotspot !== undefined);
  const missingXiaoyueMemory = [currentMissingRequiredHotspot, nextMissingRequired]
    .some((hotspot) => hotspot?.clueId === 'CLUE_A3_T07_XIAOYUE_MEMORY');
  const currentPhotoNeedsObservationHint = `当前照片还有${unobservedPhotoHotspotCount}处未观察热点，请先查看黄色热点。`;
  const blockedForwardHint = unobservedPhotoHotspotCount > 0
    ? `${currentPhotoNeedsObservationHint} ${missingRequiredIds.length === 0
      ? '本阶段必需观察已齐。'
      : missingOnCurrentPhotoCount > 0
        ? `本阶段还缺${missingRequiredIds.length}处必需观察，其中${missingOnCurrentPhotoCount}处就在当前照片。`
        : missingXiaoyueMemory
          ? `本阶段还缺${missingRequiredIds.length}处必需观察；完成当前照片后，再听小月说完这一段。`
          : `本阶段还缺${missingRequiredIds.length}处必需观察；完成当前照片后，沿现有地点路线继续寻找。`}`
    : missingRequiredIds.length === 0
      ? '本阶段必需观察已齐，当前照片上的热点也都已观察。'
      : missingXiaoyueMemory
        ? `本阶段还缺${missingRequiredIds.length}处必需观察。先听小月说完这一段，再继续。`
        : `本阶段还缺${missingRequiredIds.length}处必需观察；当前照片热点已全部观察，请沿现有地点路线前往其他照片。`;
  const photoObservationNote = unobservedPhotoHotspotCount > 0
    ? `${currentPhotoNeedsObservationHint} ${missingRequiredIds.length === 0
      ? '本阶段必需观察已齐。'
      : missingOnCurrentPhotoCount > 0
        ? `本阶段还缺${missingRequiredIds.length}处必需观察，其中${missingOnCurrentPhotoCount}处就在当前照片。`
        : missingXiaoyueMemory
          ? `本阶段还缺${missingRequiredIds.length}处必需观察；完成当前照片后，再听小月说完这一段。`
          : `本阶段还缺${missingRequiredIds.length}处必需观察。`}`
    : missingRequiredIds.length === 0
      ? '本阶段必需观察已齐，当前照片上的热点也都已查看。'
      : missingXiaoyueMemory
        ? `当前照片热点已全部观察；本阶段还缺${missingRequiredIds.length}处必需观察，先听小月说完这一段。`
        : `当前照片热点已全部观察；本阶段还缺${missingRequiredIds.length}处必需观察，请沿现有地点路线继续寻找。`;
  const safePathToMissingRequiredClue = (clueId: string, currentLens = lens.id, alreadyInspected = inspected): string[] | null => {
    const path = findAct3RoutePathToClue(stage, currentLens, clueId, alreadyInspected);
    const target = hotspotByClue.get(clueId);
    if (path === null || !target) return null;
    const inspectedAfterOpening = [...new Set([...alreadyInspected, clueId])];
    const otherMissing = act3RequiredClueIds(stage).filter((requiredId) =>
      requiredId !== clueId && !inspectedAfterOpening.includes(requiredId));
    const reachableBeforeOpening = otherMissing.filter((requiredId) =>
      findAct3RoutePathToClue(stage, currentLens, requiredId, alreadyInspected) !== null);
    if (reachableBeforeOpening.some((requiredId) =>
      findAct3RoutePathToClue(stage, target.lensId, requiredId, inspectedAfterOpening) === null)) return null;
    return path;
  };
  const findMaterialLinks = (clueIds: string[]): InvestigationMaterialLink[] => clueIds.flatMap((clueId) => {
    const entry = hotspotByClue.get(clueId);
    if (!entry || safePathToMissingRequiredClue(clueId) === null) return [];
    return [{ id: clueId, label: act3HotspotPrompt(stage, clueId, entry.hotspot.label, inspected) }];
  });
  const hotspotLabel = (hotspot: Act3Hotspot) => act3HotspotPrompt(stage, hotspot.clueId, hotspot.label, inspected);

  const openHotspot = (clueId: string) => {
    manager.inspectAct3Clue(clueId);
    setHotspotId(clueId);
  };

  const openRelatedMaterial = (clueId: string) => {
    const liveState = manager.getState();
    const path = safePathToMissingRequiredClue(
      clueId,
      liveState.modules.act3.currentLensId ?? lens.id,
      liveState.modules.act3.inspectedClueIds,
    );
    if (path === null) return;
    if (path.length === 0) {
      openHotspot(clueId);
      return;
    }
    if (manager.enterAct3Lens(path[0])) setHotspotId(null);
  };

  const photoHotspots: PhotoMarker[] = lens.hotspots.map((hotspot) => ({
    id: hotspot.clueId,
    label: hotspotLabel(hotspot),
    ...act3PhotoLayout[lens.id]?.[hotspot.clueId],
    x: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.x ?? .5,
    y: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.y ?? .5,
    presentation: 'focus-box',
    active: inspected.includes(hotspot.clueId),
    onActivate: () => openHotspot(hotspot.clueId),
  }));

  const actions: InvestigationAction[] = lens.routes.flatMap((route) => {
    const target = act3LensById(stage, route.target);
    if (!target) return [];
    const availability = getAct3RouteAvailability(stage, lens.id, route.target, inspected);
    const routeLabel = act3RouteLabelFor(route.kind);
    const routeReason = stage === 'T07' && route.target === 'LENS_A3_T07_007' && !inspected.includes('CLUE_A3_T07_NOTEBOOK_PICKUP')
      ? '还没有先完成当前取物动作。'
      : availability.reason;
    return [{
      actionId: route.actionId,
      kind: route.kind,
      target: route.target,
      label: routeLabel,
      state: availability.state,
      reason: routeReason,
      relatedMaterials: findMaterialLinks(availability.relatedClueIds),
      onActivate: () => { if (manager.enterAct3Lens(route.target)) setHotspotId(null); },
    }];
  });

  if (stage === 'T07') {
    if (state.game.flags.FLAG_A3_SITE_EXITED === true) {
      actions.push({
        actionId: 'A3_T07_OPEN_NOTEBOOK', kind: 'memory', target: 'A4_T01', label: '翻开笔记，继续调查',
        state: onOpenAct4 ? 'ready' : 'blocked',
        reason: onOpenAct4 ? undefined : '笔记阅读入口暂不可用。',
        onActivate: () => onOpenAct4?.(),
      });
    } else {
      const readyToLeave = missingRequiredIds.length === 0;
      actions.push({
        actionId: 'A3_T07_LEAVE_SITE', kind: 'story', target: 'A3_EXIT', label: '与小月一起离开旧址',
        state: readyToLeave ? 'ready' : 'blocked',
      reason: readyToLeave ? undefined : blockedForwardHint,
        relatedMaterials: findMaterialLinks(missingRequiredIds),
        onActivate: () => { manager.leaveAct3Stage(); setHotspotId(null); },
      });
    }
  } else {
    actions.push({
      actionId: `A3_${stage}_LEAVE_AND_CONTINUE`, kind: 'story', target: nextStage ?? undefined,
      label: act3StageCompletionLabel(),
      state: missingRequiredIds.length ? 'blocked' : 'ready',
      reason: missingRequiredIds.length ? blockedForwardHint : undefined,
      relatedMaterials: findMaterialLinks(missingRequiredIds),
      onActivate: () => {
        if (missingRequiredIds.length) return;
        manager.confirmAct3Stage();
        manager.advanceAct3Stage();
        setHotspotId(null);
      },
    });
  }

  const movement = act3MovementForStage(stage);
  const revealBeat = (
    (stage === 'T04' && lens.id === 'LENS_A3_T04_005' && inspected.includes('CLUE_A3_T04_PAPER_EDGE'))
    || (stage === 'T05' && lens.id === 'LENS_A3_T05_005' && inspected.includes('CLUE_A3_T05_PAPER_EDGE'))
    || (stage === 'T06' && lens.id === 'LENS_A3_T06_006' && inspected.includes('CLUE_A3_T06_HOOKS'))
    || (stage === 'T06' && lens.id === 'LENS_A3_T06_007' && inspected.includes('CLUE_A3_T06_SHRINE'))
    || (stage === 'T07' && lens.id === 'LENS_A3_T07_007' && inspected.includes('CLUE_A3_T07_NOTEBOOK_PICKUP'))
  );
  const conciseStatus = unobservedPhotoHotspotCount > 0
    ? `本图待看${unobservedPhotoHotspotCount}处 · 本阶段还差${missingRequiredIds.length}项`
    : missingRequiredIds.length > 0
      ? `本图已清 · 本阶段还差${missingRequiredIds.length}项`
      : stage === 'T07' && state.game.flags.FLAG_A3_SITE_EXITED === true
        ? '本图已清 · 旧址调查已收束'
        : '本图已清 · 本阶段必需观察已齐';
  return <InvestigationShell
    className={`act3-investigation investigation-shell--exploration investigation-shell--act3-photo-stage act3-investigation--${act3MovementClassForStage(stage)}`}
    photoStage
    ariaLabel="第三幕调查"
    actLabel={`第三幕 · ${movement}`}
    locationLabel={lensPlace}
    contextLabel={samePlaceLenses.length > 1 ? `同名现场照片 ${samePlaceLensIndex} / ${samePlaceLenses.length}` : STANCE_LABEL[lens.stance]}
    objective={stage === 'T07' && state.game.flags.FLAG_A3_SITE_EXITED === true
      ? '已和小月离开旧址，手边的笔记还有内容可读。'
      : act3ObjectiveFor(stage, inspected)}
    helpText="滚轮或双指放大画面；放大后可拖动查看上下左右，方向键也可平移。“全图查看”显示完整原图，“复位”恢复默认视图。热点只在主动点击或按回车后记录。观察弹层可用 Esc、关闭按钮或点击遮罩返回。"
    actions={actions}
    statusMessage={conciseStatus}
    onExit={onReturnToDesktop ?? (() => {})}
    onOpenMaterial={(_actionId, materialId) => openRelatedMaterial(materialId)}
  >
    <main className="act3-investigation__lens" data-act3-stage={stage} data-asset-id={lens.assetId} data-observation-stance={lens.stance}>
      <Act3PhotoViewport sceneKey={lens.id} imageUrl={assetSrc} imageAlt={lensTitle} hotspots={photoHotspots} routes={[]} fit="cover" transitionDirection={lens.stance === 'crouch' ? 'back' : 'forward'} explorationMode revealBeat={revealBeat} quietHotspotLabels compactMobileControls>
        <div className="act3-investigation__photo-overlay" data-photo-control>
          <details
            key={lens.id}
            className="act3-investigation__narration"
            onToggle={(event) => {
              if (!event.currentTarget.open) return;
              setReadNarrationLensIds((previous) => {
                if (previous.has(lens.id)) return previous;
                const next = new Set(previous);
                next.add(lens.id);
                return next;
              });
            }}
          >
            <summary aria-label={readNarrationLensIds.has(lens.id) ? '现场旁白' : '现场旁白，未读'}>
              现场旁白{!readNarrationLensIds.has(lens.id) && <span className="act3-investigation__narration-unread" aria-hidden="true" />}
            </summary>
            <div className="act3-investigation__narration-panel">
              <h2>{lensTitle}</h2>
              <p>{lensDescription}</p>
              <p>{doc.intro}</p>
            </div>
          </details>
          <details className="act3-investigation__field-record">
            <summary>现场记录与阶段观察</summary>
            <div className="act3-investigation__field-record-panel">
              <aside className="act3-investigation__observation-progress" aria-label="现场观察进度">
                <div className="act3-investigation__progress-counts">
                  <p><strong>本阶段必需观察</strong><span>{completedRequiredCount} / {requiredClueIds.length}</span></p>
                  <p><strong>当前照片已观察</strong><span>{observedPhotoHotspotCount} / {lens.hotspots.length}</span></p>
                  {samePlaceLenses.length > 1 && <p><strong>同名现场照片</strong><span>{samePlaceLensIndex} / {samePlaceLenses.length}</span></p>}
                </div>
                <ul className="act3-investigation__photo-status" aria-label="当前照片观察状态">
                  {lens.hotspots.map((hotspot) => {
                    const known = inspected.includes(hotspot.clueId);
                    return <li key={hotspot.clueId} data-observation-state={known ? 'observed' : 'pending'}>
                      <span>{hotspotLabel(hotspot)}</span><strong>{known ? '已观察' : '待观察'}</strong>
                    </li>;
                  })}
                </ul>
                <p className="act3-investigation__photo-observation-note">{photoObservationNote}</p>
                {missingRequiredIds.length > 0 && <section className="act3-investigation__missing-required" aria-label="本阶段仍缺的必需观察">
                  <h2>本阶段仍缺的必需观察</h2>
                  <ul>
                    {missingRequiredIds.map((clueId) => {
                      const entry = hotspotByClue.get(clueId);
                      const path = entry ? findAct3RoutePathToClue(stage, lens.id, clueId, inspected) : null;
                      const safePath = entry ? safePathToMissingRequiredClue(clueId) : null;
                      return <li key={clueId} data-missing-clue-id={clueId}>
                        <span>{entry && entry.lensId === lens.id ? hotspotLabel(entry.hotspot) : '尚缺一处必需观察'}</span>
                        <small>{path === null
                          ? '当前路线尚未抵达；沿可通行地点继续查找。'
                          : safePath === null
                            ? '先沿现有路线完成眼前可查看的必需观察，再继续前往。'
                            : safePath.length === 0
                              ? '就在这张照片上；请主动选择黄色热点查看。'
                              : '可沿现有地点路线前往；抵达后仍需主动查看热点。'}</small>
                      </li>;
                    })}
                  </ul>
                </section>}
              </aside>
              {stage === 'T05' && state.game.flags.FLAG_A3_13ACK_PAPER_FOUND && <details className="act3-investigation__paper-compare">
                <summary>打开两张词表</summary>
                <div className="act3-investigation__paper-compare-content">
                  <article><h2>VVaKe</h2><p>蜘蛛、雨伞、白走廊、台灯、风车、曼陀罗</p></article>
                  <article><h2>13aCK</h2><p>老鼠、血、草垛、木房子、玫瑰、表</p></article>
                  <p>两张词表。含义暂时不明。</p>
                </div>
              </details>}
              {stage === 'T06' && lens.id === 'LENS_A3_T06_008' && <details className="act3-investigation__comparison-record">
                <summary>打开旧庙照片对照</summary>
                <div className="act3-investigation__comparison-record-content">
                  <details className="act3-investigation__exterior-photo">
                    <summary>查看当时的环境照片</summary>
                    <figure>{assetLoader.get('IMG_A1_I_001')?.src ? <img src={assetLoader.get('IMG_A1_I_001')!.src} alt="第一次进山拍下的鸡公岭破庙外景" /> : <div className="act3-investigation__comparison-placeholder">第一次进山时拍下的破庙外景。</div>}<figcaption>第一次进山 · 破庙外景</figcaption></figure>
                  </details>
                  <aside className="act3-investigation__temple-compare" aria-label="破庙塑像与厨房空神龛照片对照">
                    <p className="act3-investigation__compare-note">把这两张照片放在一起看看。</p>
                    <ComparisonPhoto assetId="IMG_A1_I_003" alt="第一次进山拍下的破庙塑像" caption="第一次进山 · 庙内塑像" placeholder="第一次进山时，庙里那尊塑像已经残缺，只剩底座和半截身子。" />
                    <ComparisonPhoto assetId="IMG_A3_T06_007" alt="厨房尽头空木神龛的石质底座" caption="启明厨房 · 空神龛" placeholder="厨房尽头只剩一座空木神龛，边角积着灰。" />
                  </aside>
                </div>
              </details>}
            </div>
          </details>
        </div>
      </Act3PhotoViewport>
    </main>
    {lensHotspot && <InvestigationDetail title={act3HotspotActionLabel(stage, lensHotspot.clueId, lensHotspot.label, inspected)} onClose={() => setHotspotId(null)} fallbackFocus={() => document.querySelector<HTMLElement>(`[data-clue-id="${lensHotspot.clueId}"]`) ?? [...document.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent === act3HotspotActionLabel(stage, lensHotspot.clueId, lensHotspot.label, inspected)) ?? null}>
      {/* A34-NARRATIVE-0001 D-3：热点详情只讲这一件物品。
          没有正文时宁可说明缺什么，也不回退到整段镜头说明。 */}
      <ClueDetailEvidence stage={stage} hotspot={lensHotspot} />
      {lensHotspot.observation
        ? <p>{lensHotspot.observation}</p>
        : <p className="act3-investigation__empty">这里暂时没有可记的观察文字。</p>}
      <p>这项观察已记入调查记录。</p>
    </InvestigationDetail>}
  </InvestigationShell>;
}

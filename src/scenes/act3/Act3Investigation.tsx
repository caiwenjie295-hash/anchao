import { useEffect, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { Act3ActiveStage, Act3Lens } from '../../core/types';
import '../../act3/act3Scene.css';
import { PhotoViewport, type PhotoMarker } from '../../components/PhotoViewport';
import { InvestigationDetail } from '../../components/investigation/InvestigationDetail';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import type { InvestigationAction, InvestigationMaterialLink } from '../../components/investigation/types';
import { act3PhotoLayout } from '../../data/act3PhotoLayout';
import { act3FirstLensId, act3LensById, act3RequiredClueIds, act3StageDoc, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_NEXT } from '../../data/act3Data';
import { act3ExitReason, act3HotspotLabelFor, act3LensDescriptionFor, act3LensTitleFor, act3MaterialLabel, act3MovementClassForStage, act3MovementForStage, act3ObjectiveFor, act3PlaceForLens } from '../../data/act3Presentation';
import { findAct3RoutePathToClue, getAct3RouteAvailability } from '../../story/investigation/act3RoutePolicy';

export interface Act3InvestigationProps {
  manager?: StateManager;
  onReturnToDesktop?: () => void;
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

export function Act3Investigation({ manager = defaultManager, onReturnToDesktop }: Act3InvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const stage = state.modules.act3.stage;
  const [hotspotId, setHotspotId] = useState<string | null>(null);

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
  const lensTitle = act3LensTitleFor(lens.id, lens.title, inspected);
  const lensDescription = act3LensDescriptionFor(lens.id, lens.description, inspected);
  const requiredClueIds = act3RequiredClueIds(stage);
  const missingRequiredIds = requiredClueIds.filter((id) => !inspected.includes(id));
  const stageAlreadyConfirmed = state.modules.act3.confirmedFlagIds.includes(ACT3_STAGE_COMPLETION_FLAG[stage]);
  const nextStage = ACT3_STAGE_NEXT[stage];

  const hotspotByClue = new Map(doc.lenses.flatMap((item) => item.hotspots.map((hotspot) => [hotspot.clueId, { hotspot, lensId: item.id }] as const)));
  const findMaterialLinks = (clueIds: string[]): InvestigationMaterialLink[] => clueIds.flatMap((clueId) => {
    const entry = hotspotByClue.get(clueId);
    if (!entry || !findAct3RoutePathToClue(stage, lens.id, clueId, inspected)) return [];
    return [{ id: clueId, label: act3MaterialLabel(stage, clueId, entry.hotspot.label, inspected) }];
  });

  const openHotspot = (clueId: string) => {
    manager.inspectAct3Clue(clueId);
    setHotspotId(clueId);
  };

  const openRelatedMaterial = (clueId: string) => {
    const path = findAct3RoutePathToClue(stage, lens.id, clueId, manager.getState().modules.act3.inspectedClueIds);
    if (path === null) return;
    for (const lensId of path) {
      if (!manager.enterAct3Lens(lensId)) return;
    }
    openHotspot(clueId);
  };

  const photoHotspots: PhotoMarker[] = lens.hotspots.map((hotspot) => ({
    id: hotspot.clueId,
    label: act3HotspotLabelFor(stage, hotspot.clueId, act3MaterialLabel(stage, hotspot.clueId, hotspot.label, inspected), inspected),
    ...act3PhotoLayout[lens.id]?.[hotspot.clueId],
    x: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.x ?? .5,
    y: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.y ?? .5,
    active: inspected.includes(hotspot.clueId),
    onActivate: () => openHotspot(hotspot.clueId),
  }));

  const actions: InvestigationAction[] = lens.routes.flatMap((route) => {
    const target = act3LensById(stage, route.target);
    if (!target) return [];
    const availability = getAct3RouteAvailability(stage, lens.id, route.target, inspected);
    const routeLabel = stage === 'T04' && route.target === 'LENS_A3_T04_005'
      ? inspected.includes('CLUE_A3_T04_PAPER_EDGE') ? '前往刚发现的纸片' : '继续查看架脚附近'
      : stage === 'T05' && route.target === 'LENS_A3_T05_005'
        ? inspected.includes('CLUE_A3_T05_PAPER_EDGE') ? '前往刚取出的纸片' : '继续查看桌脚附近'
        : stage === 'T07' && route.target === 'LENS_A3_T07_006'
          ? '继续查看窄缝'
          : stage === 'T07' && route.target === 'LENS_A3_T07_007' && !inspected.includes('CLUE_A3_T07_NOTEBOOK_PICKUP')
            ? '继续核对这一物件'
      : route.label || `${route.kind === 'return' ? '返回' : '前往'}${target.title}`;
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
    const readyToLeave = missingRequiredIds.length === 0;
    actions.push({
      actionId: 'A3_T07_LEAVE_SITE', kind: 'story', target: 'A3_EXIT', label: '与小月一起离开旧址',
      state: state.game.flags.FLAG_A3_SITE_EXITED ? 'completed' : readyToLeave ? 'ready' : 'blocked',
      reason: readyToLeave ? undefined : act3ExitReason(stage, missingRequiredIds),
      relatedMaterials: findMaterialLinks(missingRequiredIds),
      onActivate: () => { manager.leaveAct3Stage(); setHotspotId(null); },
    });
  } else {
    const destinationLabel = nextStage ? STAGE_TITLE[nextStage] : '后续地点';
    actions.push({
      actionId: `A3_${stage}_LEAVE_AND_CONTINUE`, kind: 'story', target: nextStage ?? undefined,
      label: `离开本处，前往${destinationLabel}`,
      state: missingRequiredIds.length ? 'blocked' : 'ready',
      reason: missingRequiredIds.length ? `还没有核对${findMaterialLinks(missingRequiredIds).map(({ label }) => label).join('、') || act3ExitReason(stage, missingRequiredIds)}` : undefined,
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
  return <InvestigationShell
    className={`act3-investigation investigation-shell--exploration act3-investigation--${act3MovementClassForStage(stage)}`}
    ariaLabel="第三幕调查"
    actLabel={`第三幕 · ${movement}`}
    locationLabel={act3PlaceForLens(lens.id, lens.title)}
    contextLabel={`${lensTitle} · ${STANCE_LABEL[lens.stance]} · ${doc.intro}`}
    objective={act3ObjectiveFor(stage, inspected)}
    helpText="点击照片上的标记查看物件；底部地点按钮用于移动或返回。可用滚轮、双指或加减按钮缩放，复位不会改变调查进度。"
    actions={actions}
    statusMessage={stageAlreadyConfirmed ? '本处结论已记录。选择一次离开行动即可继续。' : undefined}
    onExit={onReturnToDesktop ?? (() => {})}
    onOpenMaterial={(_actionId, materialId) => openRelatedMaterial(materialId)}
  >
    <main className={`act3-investigation__lens${lens.id === 'LENS_A3_T06_008' ? ' act3-investigation__lens--temple-compare' : ''}`} data-act3-stage={stage} data-asset-id={lens.assetId} data-observation-stance={lens.stance}>
      <PhotoViewport sceneKey={lens.id} imageUrl={assetSrc} imageAlt={lensTitle} hotspots={photoHotspots} routes={[]} transitionDirection={lens.stance === 'crouch' ? 'back' : 'forward'}>
        <div className="act3-investigation__caption"><strong>{lensTitle}</strong><span>{lensDescription}</span></div>
      </PhotoViewport>
      {stage === 'T05' && state.game.flags.FLAG_A3_13ACK_PAPER_FOUND && <aside className="act3-investigation__paper-compare" aria-label="两张词表"><article><h2>VVaKe</h2><p>蜘蛛、雨伞、白走廊、台灯、风车、曼陀罗</p></article><article><h2>13aCK</h2><p>老鼠、血、草垛、木房子、玫瑰、表</p></article><p>两张词表。含义暂时不明。</p></aside>}
      {stage === 'T06' && lens.id === 'LENS_A3_T06_008' && <aside className="act3-investigation__temple-compare" aria-label="破庙塑像与厨房空神龛对照">
        <p className="act3-investigation__compare-note">外景只说明地点。真正能对上的，是庙里那尊塑像和这里空着的底座。</p>
        <figure>{assetLoader.get('IMG_A1_I_001')?.src && <img src={assetLoader.get('IMG_A1_I_001')!.src} alt="第一次进山拍下的鸡公岭破庙外景" />}<figcaption>第一次进山 · 破庙外景（仅作地点背景）</figcaption></figure>
        <figure>{assetLoader.get('IMG_A1_I_003')?.src ? <img src={assetLoader.get('IMG_A1_I_003')!.src} alt="破庙内残缺的黑补母塑像" /> : <div className="act3-investigation__comparison-placeholder">第一次进山时，庙里那尊塑像已经残缺，只剩底座和半截身子。</div>}<figcaption>第一次进山 · 庙内黑补母塑像</figcaption></figure>
        <figure>{assetLoader.get('IMG_A3_T06_007')?.src ? <img src={assetLoader.get('IMG_A3_T06_007')!.src} alt="厨房尽头空木神龛的石质底座" /> : <div className="act3-investigation__comparison-placeholder">厨房尽头只剩一座空木神龛，边角积着灰。</div>}<figcaption>启明厨房 · 空神龛与底座</figcaption></figure>
      </aside>}
    </main>
    {lensHotspot && <InvestigationDetail title={act3HotspotLabelFor(stage, lensHotspot.clueId, lensHotspot.label, inspected)} onClose={() => setHotspotId(null)} fallbackFocus={() => document.querySelector<HTMLElement>(`[data-clue-id="${lensHotspot.clueId}"]`) ?? [...document.querySelectorAll<HTMLButtonElement>('.photo-viewport__fallback button')].find((button) => button.textContent === act3HotspotLabelFor(stage, lensHotspot.clueId, lensHotspot.label, inspected)) ?? null}>
      {/* A34-NARRATIVE-0001 D-3：热点详情只讲这一件物品。
          没有正文时宁可说明缺什么，也不回退到整段镜头说明。 */}
      {lensHotspot.observation
        ? <p>{lensHotspot.observation}</p>
        : <p className="act3-investigation__empty">这里暂时没有可记的观察文字。</p>}
      <p>这项观察已记入调查记录。</p>
    </InvestigationDetail>}
  </InvestigationShell>;
}

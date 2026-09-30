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
  T07: '消防栓与撤离',
};

const STAGE_LABEL: Record<Act3ActiveStage, string> = {
  T00: '第三幕 · 鸡头岭',
  T01: '第三幕 · 启明旧址',
  T02: '第三幕 · 教学区',
  T03: '第三幕 · 禁闭区',
  T04: '第三幕 · 档案室',
  T05: '第三幕 · 广播室',
  T06: '第三幕 · 地下厨房',
  T07: '第三幕 · 撤离途中',
};

const OBJECTIVE: Record<Act3ActiveStage, string> = {
  T00: '核对人工设施与旧路痕迹，判断旧址方向。',
  T01: '从入口标识和建筑确认这里是否为启明旧址。',
  T02: '比较教室记录与宣传内容，留下尚未解释的矛盾。',
  T03: '从时长标记与观察孔判断禁闭空间的用途。',
  T04: '找到并带走写有 VVaKe 的纸片。',
  T05: '找到 13aCK 词表，与先前纸片并排核对。',
  T06: '把空神龛和底座与旧庙照片比对，保留结论边界。',
  T07: '结合小月的回忆选择观察方式，取出并确认消防栓后的笔记。',
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
    return <InvestigationShell ariaLabel="第三幕调查" actLabel="第三幕" locationLabel="启明遗址调查" objective="第三幕尚未开始。" onExit={onReturnToDesktop ?? (() => {})}>
      <p className="act3-investigation__empty">第三幕尚未开始。</p>
    </InvestigationShell>;
  }

  const doc = act3StageDoc(stage);
  const currentLensId = state.modules.act3.currentLensId;
  const lens: Act3Lens | null = currentLensId ? act3LensById(stage, currentLensId) : null;
  if (!lens) return <InvestigationShell ariaLabel="第三幕调查" actLabel={STAGE_LABEL[stage]} locationLabel={STAGE_TITLE[stage]} objective={OBJECTIVE[stage]} onExit={onReturnToDesktop ?? (() => {})}><p className="act3-investigation__empty">当前镜头暂时无法显示，可从已知地点返回。</p></InvestigationShell>;

  const assetSrc = assetLoader.get(lens.assetId)?.src;
  const lensHotspot = hotspotId ? lens.hotspots.find((item) => item.clueId === hotspotId) : undefined;
  const inspected = state.modules.act3.inspectedClueIds;
  const requiredClueIds = act3RequiredClueIds(stage);
  const missingRequiredIds = requiredClueIds.filter((id) => !inspected.includes(id));
  const stageAlreadyConfirmed = state.modules.act3.confirmedFlagIds.includes(ACT3_STAGE_COMPLETION_FLAG[stage]);
  const nextStage = ACT3_STAGE_NEXT[stage];

  const hotspotByClue = new Map(doc.lenses.flatMap((item) => item.hotspots.map((hotspot) => [hotspot.clueId, { hotspot, lensId: item.id }] as const)));
  const findMaterialLinks = (clueIds: string[]): InvestigationMaterialLink[] => clueIds.flatMap((clueId) => {
    const entry = hotspotByClue.get(clueId);
    if (!entry || !findAct3RoutePathToClue(stage, lens.id, clueId, inspected)) return [];
    return [{ id: clueId, label: entry.hotspot.label }];
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
    label: hotspot.label,
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
    return [{
      actionId: route.actionId,
      kind: route.kind,
      target: route.target,
      label: route.label || `${route.kind === 'return' ? '返回' : '前往'}${target.title}`,
      state: availability.state,
      reason: availability.reason,
      relatedMaterials: findMaterialLinks(availability.relatedClueIds),
      onActivate: () => { if (manager.enterAct3Lens(route.target)) setHotspotId(null); },
    }];
  });

  if (stage === 'T07') {
    const readyToLeave = missingRequiredIds.length === 0;
    actions.push({
      actionId: 'A3_T07_LEAVE_SITE', kind: 'story', target: 'A3_EXIT', label: '与小月一起离开旧址',
      state: state.game.flags.FLAG_A3_SITE_EXITED ? 'completed' : readyToLeave ? 'ready' : 'blocked',
      reason: readyToLeave ? undefined : '笔记还没有完整确认。',
      relatedMaterials: findMaterialLinks(missingRequiredIds),
      onActivate: () => { manager.leaveAct3Stage(); setHotspotId(null); },
    });
  } else if (stageAlreadyConfirmed && nextStage) {
    actions.push({
      actionId: `A3_${stage}_LEAVE_STAGE`, kind: 'story', target: nextStage, label: `离开本处，前往${STAGE_TITLE[nextStage]}`,
      state: 'ready', onActivate: () => { manager.advanceAct3Stage(); setHotspotId(null); },
    });
  } else {
    actions.push({
      actionId: `A3_${stage}_CONFIRM`, kind: 'story', label: `确认${STAGE_TITLE[stage]}结论`,
      state: stageAlreadyConfirmed ? 'completed' : missingRequiredIds.length ? 'blocked' : 'ready',
      reason: missingRequiredIds.length ? `还没有核对${findMaterialLinks(missingRequiredIds).map(({ label }) => label).join('、') || '本阶段的必需材料'}。` : undefined,
      relatedMaterials: findMaterialLinks(missingRequiredIds),
      onActivate: () => { manager.confirmAct3Stage(); setHotspotId(null); },
    });
  }

  return <InvestigationShell
    ariaLabel="第三幕调查"
    actLabel={STAGE_LABEL[stage]}
    locationLabel={lens.title}
    contextLabel={`${STANCE_LABEL[lens.stance]} · ${doc.intro}`}
    objective={OBJECTIVE[stage]}
    helpText="点击照片上的标记查看物件；底部地点按钮用于移动或返回。可用滚轮、双指或加减按钮缩放，复位不会改变调查进度。"
    actions={actions}
    statusMessage={stageAlreadyConfirmed ? '本处结论已记录。选择底部行动后才会离开。' : undefined}
    onExit={onReturnToDesktop ?? (() => {})}
    onOpenMaterial={(_actionId, materialId) => openRelatedMaterial(materialId)}
  >
    <main className="act3-investigation__lens" data-act3-stage={stage} data-asset-id={lens.assetId}>
      <PhotoViewport sceneKey={lens.id} imageUrl={assetSrc} imageAlt={lens.title} hotspots={photoHotspots} routes={[]} transitionDirection={lens.stance === 'crouch' ? 'back' : 'forward'}>
        <div className="act3-investigation__caption"><strong>{lens.title}</strong><span>{lens.description}</span></div>
      </PhotoViewport>
      {stage === 'T05' && state.game.flags.FLAG_A3_13ACK_PAPER_FOUND && <aside className="act3-investigation__paper-compare" aria-label="两张词表"><article><h2>VVaKe</h2><p>蜘蛛、雨伞、白走廊、台灯、风车、曼陀罗</p></article><article><h2>13aCK</h2><p>老鼠、血、草垛、木房子、玫瑰、表</p></article><p>两张词表。含义暂时不明。</p></aside>}
      {stage === 'T06' && lens.id === 'LENS_A3_T06_008' && <aside className="act3-investigation__temple-compare" aria-label="破庙塑像与厨房空神龛对照">
        <p className="act3-investigation__compare-note">外景只说明地点。真正能对上的，是庙里那尊塑像和这里空着的底座。</p>
        <figure>{assetLoader.get('IMG_A1_I_001')?.src && <img src={assetLoader.get('IMG_A1_I_001')!.src} alt="第一次进山拍下的鸡公岭破庙外景" />}<figcaption>第一次进山 · 破庙外景（仅作地点背景）</figcaption></figure>
        <figure>{assetLoader.get('IMG_A1_I_003')?.src ? <img src={assetLoader.get('IMG_A1_I_003')!.src} alt="破庙内残缺的黑补母塑像" /> : <div className="act3-investigation__comparison-placeholder">第一次进山时，庙里那尊塑像已经残缺，只剩底座和半截身子。</div>}<figcaption>第一次进山 · 庙内黑补母塑像</figcaption></figure>
        <figure>{assetLoader.get('IMG_A3_T06_007')?.src ? <img src={assetLoader.get('IMG_A3_T06_007')!.src} alt="厨房尽头空木神龛的石质底座" /> : <div className="act3-investigation__comparison-placeholder">厨房尽头只剩一座空木神龛，边角积着灰。</div>}<figcaption>启明厨房 · 空神龛与底座</figcaption></figure>
      </aside>}
    </main>
    {lensHotspot && <InvestigationDetail title={lensHotspot.label} onClose={() => setHotspotId(null)} fallbackFocus={() => document.querySelector<HTMLElement>(`[data-clue-id="${lensHotspot.clueId}"]`)}>
      {/* A34-NARRATIVE-0001 D-3：热点详情只讲这一件物品。
          没有正文时宁可说明缺什么，也不回退到整段镜头说明。 */}
      {lensHotspot.observation
        ? <p>{lensHotspot.observation}</p>
        : <p className="act3-investigation__empty">这里暂时没有可记的观察文字。</p>}
      <p>这项观察已记入调查记录。</p>
    </InvestigationDetail>}
  </InvestigationShell>;
}

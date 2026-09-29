import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { Act3ActiveStage, Act3Lens } from '../../core/types';
import { act3FirstLensId, act3LensById, act3StageClueIds, act3StageDoc, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_NEXT } from '../../data/act3Data';
import '../../act3/act3Scene.css';
import { PhotoViewport, type PhotoMarker } from '../../components/PhotoViewport';
import { act3PhotoLayout } from '../../data/act3PhotoLayout';

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

export function Act3Investigation({ manager = defaultManager, onReturnToDesktop }: Act3InvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const stage = state.modules.act3.stage;
  const [hotspotId, setHotspotId] = useState<string | null>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (stage === 'inactive') return;
    const currentId = state.modules.act3.currentLensId;
    if (!currentId || !act3LensById(stage, currentId)) {
      const first = act3LensById(stage, act3FirstLensId(stage));
      if (first) manager.enterAct3Lens(first.id);
    }
  }, [stage, state.modules.act3.currentLensId, manager]);

  useEffect(() => {
    if (hotspotId) dialogRef.current?.querySelector<HTMLElement>('button')?.focus();
    else previousTriggerRef.current?.focus();
  }, [hotspotId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && hotspotId) setHotspotId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => void window.removeEventListener('keydown', onKeyDown);
  }, [hotspotId]);

  if (stage === 'inactive') {
    return (
      <section className="act3-investigation" aria-label="第三幕调查">
        <header className="act3-investigation__header">
          <div>
            <p>第三幕</p>
            <h1>启明遗址调查</h1>
          </div>
          <button type="button" className="act3-investigation__return" onClick={onReturnToDesktop}>返回桌面</button>
        </header>
        <p className="act3-investigation__empty">第三幕尚未开始。</p>
      </section>
    );
  }

  const doc = act3StageDoc(stage);
  const currentLensId = state.modules.act3.currentLensId;
  const lens: Act3Lens | null = currentLensId ? act3LensById(stage, currentLensId) : null;

  if (!lens) {
    // 还在重载过渡，上面的 effect 会重置为阶段首镜头
    return (
      <section className="act3-investigation" aria-label="第三幕调查" data-act3-stage={stage}>
        <header className="act3-investigation__header">
          <div>
            <p>{STAGE_LABEL[stage]}</p>
            <h1>{STAGE_TITLE[stage]}</h1>
          </div>
          <button type="button" className="act3-investigation__return" onClick={onReturnToDesktop}>返回桌面</button>
      </header>
      </section>
    );
  }

  const assetSrc = assetLoader.get(lens.assetId)?.src;
  const lensHotspot = hotspotId ? lens.hotspots.find((item) => item.clueId === hotspotId) : undefined;

  const stageClueIds = act3StageClueIds(stage);
  const allCluesInspected = stageClueIds.length > 0 && stageClueIds.every((id) => state.modules.act3.inspectedClueIds.includes(id));
  const missingClueIds = stageClueIds.filter((id) => !state.modules.act3.inspectedClueIds.includes(id));
  const finalLens = [...doc.lenses].reverse().find((item) => !item.id.endsWith('_000'));
  const reachedFinalLens = finalLens ? state.modules.act3.visitedLensIds.includes(finalLens.id) : false;
  const missingLens = doc.lenses.find((item) => item.hotspots.some((hotspot) => missingClueIds.includes(hotspot.clueId)));
  const missingHere = missingLens?.id === lens.id;
  const completionFlag = ACT3_STAGE_COMPLETION_FLAG[stage];
  const nextStage = ACT3_STAGE_NEXT[stage];
  const stageAlreadyConfirmed = state.modules.act3.confirmedFlagIds.includes(completionFlag);

  const onOpenHotspot = (clueId: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    manager.inspectAct3Clue(clueId);
    setHotspotId(clueId);
  };

  const photoHotspots: PhotoMarker[] = lens.hotspots.map((hotspot) => ({
    id: hotspot.clueId, label: hotspot.label,
    ...act3PhotoLayout[lens.id]?.[hotspot.clueId],
    x: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.x ?? .5,
    y: act3PhotoLayout[lens.id]?.[hotspot.clueId]?.y ?? .5,
    active: state.modules.act3.inspectedClueIds.includes(hotspot.clueId),
    onActivate: (trigger) => onOpenHotspot(hotspot.clueId, trigger),
  }));
  const photoRoutes: PhotoMarker[] = lens.links.flatMap((linkId, index) => {
    const target = act3LensById(stage, linkId);
    if (!target) return [];
    const locked = target.requiresClueIds?.some((required) => !state.modules.act3.inspectedClueIds.includes(required));
    const back = index > 0 || linkId.endsWith('_000');
    return [{ id: `route:${linkId}`, label: `${back ? '返回' : '前往'}${target.title}${locked ? '（先检查线索）' : ''}`, x: back ? .09 : .91, y: back ? .73 : .58, kind: 'direction' as const, disabled: locked, onActivate: () => { manager.enterAct3Lens(linkId); setHotspotId(null); } }];
  });
  return (
    <section className="act3-investigation" aria-label="第三幕调查" data-act3-stage={stage}>
      <header className="act3-investigation__header">
        <div><p>{STAGE_LABEL[stage]}</p><h1>{STAGE_TITLE[stage]}</h1><span>{doc.intro}</span></div>
        <button type="button" className="act3-investigation__return" onClick={onReturnToDesktop}>返回桌面</button>
      </header>
      <main className="act3-investigation__lens" data-asset-id={lens.assetId}>
        <PhotoViewport sceneKey={lens.id} imageUrl={assetSrc} imageAlt={lens.title} hotspots={photoHotspots} routes={photoRoutes} transitionDirection={lens.stance === 'crouch' ? 'back' : 'forward'}>
          <div className="act3-investigation__caption"><strong>{lens.title}</strong><span>{lens.description}</span></div>
          {reachedFinalLens && missingClueIds.length > 0 && <div className="act3-investigation__action" role="status">
            <span>本阶段还差 {missingClueIds.length} 条线索。{missingHere ? '点击照片中的线索标记继续查看。' : ''}</span>
            {!missingHere && missingLens && <button type="button" onClick={() => { manager.enterAct3Lens(missingLens.id); setHotspotId(null); }}>前往遗漏画面：{missingLens.title}</button>}
          </div>}
          {allCluesInspected && !stageAlreadyConfirmed && <div className="act3-investigation__action"><span>已检查全部线索</span><button type="button" onClick={() => { manager.confirmAct3Stage(); setHotspotId(null); }}>确认{STAGE_TITLE[stage]}结论</button></div>}
          {stageAlreadyConfirmed && nextStage && <div className="act3-investigation__action"><span>本阶段已确认</span><button type="button" onClick={() => manager.advanceAct3Stage()}>继续{STAGE_TITLE[nextStage]}</button></div>}
          {stageAlreadyConfirmed && !nextStage && <div className="act3-investigation__action" role="status">第三幕已完成。可以回看现场与线索。</div>}
        </PhotoViewport>
        {stage === 'T05' && state.game.flags.FLAG_A3_13ACK_PAPER_FOUND && <aside className="act3-investigation__paper-compare" aria-label="两张词表"><article><h2>VVaKe</h2><p>蜘蛛、雨伞、白走廊、台灯、风车、曼陀罗</p></article><article><h2>13aCK</h2><p>老鼠、血、草垛、木房子、玫瑰、表</p></article><p>两张词表。含义暂时不明。</p></aside>}
        {stage === 'T06' && lens.id === 'LENS_A3_T06_008' && <aside className="act3-investigation__temple-compare" aria-label="破庙与空神龛对照"><figure>{assetLoader.get('IMG_A1_I_001')?.src && <img src={assetLoader.get('IMG_A1_I_001')!.src} alt="第一次进山拍下的鸡公岭破庙外景" />}<figcaption>第一次进山 · 破庙外景</figcaption></figure><figure>{assetLoader.get('IMG_A3_T06_007')?.src ? <img src={assetLoader.get('IMG_A3_T06_007')!.src} alt="厨房空神龛" /> : <div className="act3-investigation__comparison-placeholder">厨房尽头只剩一座空木神龛，边角积着灰。</div>}<figcaption>启明厨房 · 空神龛与底座</figcaption></figure></aside>}
      </main>
      {lensHotspot && (
        <div className="act3-investigation__dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setHotspotId(null); }}>
          <section ref={dialogRef} className="act3-investigation__dialog" role="dialog" aria-modal="true" aria-labelledby="act3-dialog-title">
            <header>
              <h2 id="act3-dialog-title">{lensHotspot.label}</h2>
              <button type="button" aria-label="关闭" onClick={() => setHotspotId(null)}>关闭 ×</button>
            </header>
            <p>{lens.description}</p>
            <button type="button" onClick={() => setHotspotId(null)}>继续</button>
          </section>
        </div>
      )}
    </section>
  );
}

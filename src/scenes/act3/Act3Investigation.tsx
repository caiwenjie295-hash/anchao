import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import type { Act3ActiveStage, Act3Lens } from '../../core/types';
import { act3FirstLensId, act3LensById, act3StageClueIds, act3StageDoc, ACT3_STAGE_COMPLETION_FLAG, ACT3_STAGE_NEXT } from '../../data/act3Data';
import '../../act3/act3Scene.css';

export interface Act3InvestigationProps {
  manager?: StateManager;
  onReturnToDesktop?: () => void;
}

const STAGE_TITLE: Record<Act3ActiveStage, string> = {
  T00: '再次进山',
  T01: '启明旧址入口',
  T02: '教室与标语',
  T03: '禁闭区',
};

const STAGE_LABEL: Record<Act3ActiveStage, string> = {
  T00: '第三幕 · T00',
  T01: '第三幕 · T01',
  T02: '第三幕 · T02',
  T03: '第三幕 · T03',
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
  const completionFlag = ACT3_STAGE_COMPLETION_FLAG[stage];
  const nextStage = ACT3_STAGE_NEXT[stage];
  const stageAlreadyConfirmed = state.modules.act3.confirmedFlagIds.includes(completionFlag);

  const onOpenHotspot = (clueId: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    manager.inspectAct3Clue(clueId);
    setHotspotId(clueId);
  };

  return (
    <section className="act3-investigation" aria-label="第三幕调查" data-act3-stage={stage}>
      <header className="act3-investigation__header">
        <div>
          <p>{STAGE_LABEL[stage]}</p>
          <h1>{STAGE_TITLE[stage]}</h1>
          <span>{doc.intro}</span>
        </div>
        <button type="button" className="act3-investigation__return" onClick={onReturnToDesktop}>返回桌面</button>
      </header>
      <div className="act3-investigation__layout">
        <main className="act3-investigation__lens" data-asset-id={lens.assetId}>
          <div className={`act3-investigation__viewport act3-investigation__viewport--${lens.stance}${assetSrc ? '' : ' act3-investigation__viewport--placeholder'}`}>
            {assetSrc && <img src={assetSrc} alt="" />}
            <p className="act3-investigation__viewport-title">{lens.title}</p>
          </div>
          <p className="act3-investigation__description">{lens.description}</p>
          {lens.hotspots.length > 0 && (
            <nav className="act3-investigation__hotspots" aria-label="可执行动作">
              {lens.hotspots.map((hotspot) => (
                <button
                  type="button"
                  key={hotspot.clueId}
                  className="act3-investigation__hotspot"
                  data-clue-id={hotspot.clueId}
                  aria-pressed={hotspotId === hotspot.clueId}
                  onClick={(event) => onOpenHotspot(hotspot.clueId, event.currentTarget)}
                >
                  {hotspot.label}
                </button>
              ))}
            </nav>
          )}
          {lens.links.length > 0 && (
            <nav className="act3-investigation__routes" aria-label="前往相邻镜头">
              {lens.links.map((linkId) => {
                const target: Act3Lens | null = act3LensById(stage, linkId);
                return target ? (
                  <button type="button" key={linkId} onClick={() => { manager.enterAct3Lens(linkId); setHotspotId(null); }}>
                    {target.title} →
                  </button>
              ) : null;
              })}
            </nav>
          )}
        </main>
      </div>
      {allCluesInspected && !stageAlreadyConfirmed && (
        <div className="act3-investigation__confirm-bar">
          <p>已检查全部线索。确认本阶段结论后将{nextStage ? '进入下一阶段' : '记录当前发现'}。</p>
          <button
            type="button"
            className="act3-investigation__confirm-btn"
            onClick={() => {
              manager.confirmAct3Stage();
              setHotspotId(null);
            }}
          >
            确认{STAGE_TITLE[stage]}结论
          </button>
        </div>
      )}
      {stageAlreadyConfirmed && nextStage && (
        <div className="act3-investigation__confirm-bar act3-investigation__confirm-bar--done">
          <p>本阶段已确认。当前阶段：{STAGE_TITLE[nextStage]}。</p>
        </div>
      )}
      {stageAlreadyConfirmed && !nextStage && (
        <div className="act3-investigation__confirm-bar act3-investigation__confirm-bar--done" role="status">
          <p>本阶段调查已记录。可以回看现场与线索。</p>
        </div>
      )}
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

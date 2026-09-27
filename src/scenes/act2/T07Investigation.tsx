import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { act2T07, act2T06RecapPages, formatClock, keyFrameAt, segmentAt } from '../../data/act2T07Data';
import '../../act2/t07Finale.css';

export const ACT2_T07_ENTRY_LABEL = act2T07.entryLabel;
export const ACT2_T07_RESUME_LABEL = act2T07.resumeLabel;

type TabId = 'materials' | 'video' | 'compare' | 'inference' | 'trip';

const tabLabels: { id: TabId; label: string }[] = [
  { id: 'materials', label: '宣传资料' },
  { id: 'video', label: '受访视频' },
  { id: 'compare', label: '外景对照' },
  { id: 'inference', label: '地点结论' },
  { id: 'trip', label: '再次进山' },
];

const { video, comparison, inference, trip, finale } = act2T07;

/** 无正式图片时显示可操作的替代画面与文字说明，绝不渲染破图。 */
function FrameVisual({ assetId, altText, note, className = '', children }: { assetId: string; altText: string; note: string; className?: string; children?: ReactNode }) {
  const source = assetLoader.get(assetId)?.src;
  return (
    <div className={`t07-frame${source ? ' t07-frame--image' : ''}${className ? ` ${className}` : ''}`} data-asset-id={assetId}>
      {source
        ? <img src={source} alt={altText} />
        : <div className="t07-frame__placeholder" role="img" aria-label={altText}><span aria-hidden="true">▢</span><p>{note}</p></div>}
      {children}
    </div>
  );
}

/** 本地音效挂点：cue.file 指向本地音频后才发声；当前无音频文件，只保留字幕与无声路径。 */
function playCue(file: string | null): void {
  if (!file) return;
  try {
    const audio = new Audio(file);
    void audio.play().catch(() => undefined);
  } catch {
    // 无可用音频时保持无声路径，不影响收束完成。
  }
}

export interface T07InvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void }

export function T07Investigation({ manager = defaultManager, onReturnToDesktop }: T07InvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [tab, setTab] = useState<TabId>('materials');
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(0);
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const [zoomedShotId, setzoomedShotId] = useState<string | null>(null);
  const [zoomLeft, setZoomLeft] = useState(false);
  const [zoomRight, setZoomRight] = useState(false);
  const [cueIndex, setCueIndex] = useState(0);
  const [finaleOpen, setFinaleOpen] = useState(false);
  const photoMaterial = act2T07.materials.find((material) => material.id === act2T07.photoMaterialId)!;
  const videoMaterial = act2T07.materials.find((material) => material.id === video.materialId)!;
  const t07 = state.modules.act2Research.t07;
  const flags = state.game.flags;
  const reducedMotion = state.settings.reducedMotion || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  const shotDialogRef = useRef<HTMLElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);

  const videoFound = flags.FLAG_A2_PROMO_VIDEO_FOUND === true;
  const photoConfirmed = flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true;
  const templeConfirmed = flags.FLAG_A2_TEMPLE_FRAME_FOUND === true;
  const videoWatched = flags.FLAG_A2_PROMO_VIDEO_WATCHED === true;
  const locationInferred = flags.FLAG_A2_QIMING_LOCATION_INFERRED === true;
  const tripPlanned = flags.FLAG_A2_SECOND_TRIP_PLANNED === true;
  const complete = flags.FLAG_A2_COMPLETE === true;
  const capturedFrames = useMemo(() => video.keyFrames.filter((frame) => t07.capturedFrameIds.includes(frame.id)), [t07.capturedFrameIds]);
  const activeFrame = capturedFrames[0];
  // 缩放只是瞬时显示状态；已确认的线索由 Flag 记录。
  const photoZoom = photoZoomed || photoConfirmed;
  const segment = segmentAt(timeMs);
  const capturableFrame = keyFrameAt(timeMs);
  const watchedCount = video.requiredSegmentIds.filter((id) => t07.playedSegmentIds.includes(id)).length;
  const recapPages = useMemo(() => act2T06RecapPages.filter((page) => state.modules.browser.visitedPageIds.includes(page.id)), [state.modules.browser.visitedPageIds]);

  // 播放推进只由计时器驱动；暂停时拖动进度条不计入覆盖。
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = Math.min(timeRef.current + video.frameMs, video.durationMs);
      timeRef.current = next;
      setTimeMs(next);
      if (next >= video.durationMs) setPlaying(false);
      const current = segmentAt(next);
      if (current) manager.markAct2T07SegmentPlayed(current.id);
    }, video.frameMs);
    return () => window.clearInterval(timer);
  }, [playing, manager]);

  useEffect(() => { if (zoomedShotId && !capturedFrames.some((frame) => frame.id === zoomedShotId)) setzoomedShotId(null); }, [capturedFrames, zoomedShotId]);

  // 幕末黑屏只在行程确认后出现一次；完成后只保留回看入口。
  useEffect(() => {
    if (!tripPlanned || complete) return;
    setFinaleOpen(true);
    setCueIndex(reducedMotion ? finale.cues.length - 1 : 0);
  }, [tripPlanned, complete, reducedMotion]);

  useEffect(() => {
    if (!finaleOpen || complete) return;
    if (reducedMotion) { setCueIndex(finale.cues.length - 1); return; }
    const timer = window.setInterval(() => setCueIndex((index) => Math.min(index + 1, finale.cues.length - 1)), 2400);
    return () => window.clearInterval(timer);
  }, [finaleOpen, complete, reducedMotion]);

  useEffect(() => {
    if (!finaleOpen) return;
    playCue(finale.cues[cueIndex]?.file ?? null);
  }, [finaleOpen, cueIndex]);

  useEffect(() => {
    if (!finaleOpen) return;
    finaleRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [finaleOpen]);

  useEffect(() => {
    if (!zoomedShotId) return;
    shotDialogRef.current?.querySelector<HTMLElement>('button')?.focus();
  }, [zoomedShotId]);

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (zoomedShotId) setzoomedShotId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomedShotId]);

  const seek = (next: number) => {
    const value = Math.max(0, Math.min(video.durationMs, Math.round(next)));
    timeRef.current = value;
    setTimeMs(value);
  };
  const step = (delta: number) => seek(timeMs + delta);
  const onPlayerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); step(-video.frameMs); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); step(video.frameMs); }
    else if (event.key === ' ' && target.tagName !== 'BUTTON') { event.preventDefault(); setPlaying((value) => !value); }
  };
  const capture = () => {
    if (!capturableFrame) return;
    manager.captureAct2T07Frame(capturableFrame.id, timeMs);
  };
  const openShot = (frameId: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    setzoomedShotId(frameId);
  };
  const closeShot = () => {
    setzoomedShotId(null);
    previousTriggerRef.current?.focus();
  };
  const finishFinale = () => {
    manager.completeAct2T07Finale();
    setFinaleOpen(false);
  };

  return (
    <section className="t07-finale" aria-label="第二幕 T07 宣传资料调查" data-asset-id={photoMaterial.imageId}>
      <header className="t07-finale__header">
        <div>
          <p>第二幕 · T07</p>
          <h1>和小月核对旧资料</h1>
          <span>小月就坐在旁边，我们一起看这些材料。</span>
        </div>
        <button type="button" className="t07-finale__return" onClick={onReturnToDesktop}>返回桌面</button>
      </header>

      <p className="t07-finale__intro">{act2T07.intro}</p>

      <nav className="t07-finale__tabs" aria-label="调查步骤">
        {tabLabels.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`t07-finale__tab${tab === item.id ? ' is-active' : ''}`}
            aria-current={tab === item.id ? 'step' : undefined}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'materials' && <div className="t07-finale__panel">
        <div className="t07-finale__promo">
          <strong>宣传资料上的说法</strong>
          <ul>{act2T07.promoSurfaceText.map((text) => <li key={text}>{text}</li>)}</ul>
          <small>{act2T07.promoSurfaceNote}</small>
        </div>

        <article className="t07-finale__material">
          <h2>{photoMaterial.title}</h2>
          <p className="t07-finale__xiaoyue">{photoMaterial.xiaoyueLine}</p>
          <div className={`t07-finale__photo${photoZoom ? ' is-zoomed' : ''}`}>
            <FrameVisual assetId={photoMaterial.imageId} altText={photoMaterial.altText} note={photoMaterial.placeholderNote}>
              {photoZoom && <DoubleSSymbol className="t07-finale__photo-symbol" label="合影右下角的双 S 标志" />}
            </FrameVisual>
          </div>
          <p className="t07-finale__note">{photoMaterial.cornerNote}</p>
          {!photoZoom
            ? <button type="button" className="t07-finale__photo-zoom" onClick={() => { manager.viewAct2T07Material(photoMaterial.id); setPhotoZoomed(true); }}>{photoMaterial.zoomLabel}</button>
            : <>
              <p className="t07-finale__note">{photoMaterial.symbolNote}</p>
              <p className="t07-finale__xiaoyue">{photoMaterial.logoSpeculation}</p>
              {photoConfirmed
                ? <p className="t07-finale__done" aria-live="polite">{photoMaterial.confirmedNote}</p>
                : <button type="button" className="t07-finale__photo-confirm" onClick={() => manager.confirmAct2T07PhotoSymbol()}>{photoMaterial.confirmLabel}</button>}
            </>}
        </article>

        <article className="t07-finale__material">
          <h2>{videoMaterial.title}</h2>
          <FrameVisual assetId={videoMaterial.imageId} altText={videoMaterial.altText} note={videoMaterial.placeholderNote} className="t07-finale__cover" />
          <p className="t07-finale__note">{videoMaterial.caption}</p>
          {videoFound
            ? <p className="t07-finale__done">视频已经在播放器里打开了。</p>
            : <button type="button" className="t07-finale__video-open" onClick={() => { manager.viewAct2T07Material(video.materialId); setTab('video'); }}>{videoMaterial.openLabel}</button>}
        </article>

        {recapPages.length > 0 && <aside className="t07-finale__recap" aria-label="已查到的公开资料">
          <h2>之前查到的公开资料</h2>
          <ul>{recapPages.map((page) => <li key={page.id}><strong>{page.headline}</strong>{page.snippet ? <span>{page.snippet}</span> : null}</li>)}</ul>
        </aside>}
      </div>}

      {tab === 'video' && <div className="t07-finale__panel">
        {!videoFound
          ? <p className="t07-finale__locked">先在“宣传资料”里打开创始人受访视频。</p>
          : <div className="t07-finale__player" onKeyDown={onPlayerKeyDown}>
            <FrameVisual assetId={segment?.imageId ?? videoMaterial.imageId} altText={segment?.label ?? videoMaterial.altText} note={segment?.placeholderNote ?? videoMaterial.placeholderNote} className="t07-finale__screen">
              <p className="t07-finale__screen-label">{segment?.label ?? '视频封面'}</p>
            </FrameVisual>
            <p className="t07-finale__subtitle">{segment?.line ?? ''}</p>
            <div className="t07-finale__controls">
              <button type="button" className="t07-finale__play" onClick={() => setPlaying((value) => !value)}>{playing ? '暂停' : '播放'}</button>
              <button type="button" className="t07-finale__back" onClick={() => step(-video.stepMs)}>后退 5 秒</button>
              <button type="button" className="t07-finale__forward" onClick={() => step(video.stepMs)}>前进 5 秒</button>
              <button type="button" className="t07-finale__prev-frame" onClick={() => step(-video.frameMs)}>上一帧</button>
              <button type="button" className="t07-finale__next-frame" onClick={() => step(video.frameMs)}>下一帧</button>
              <button
                type="button"
                className="t07-finale__capture"
                disabled={!capturableFrame || t07.capturedFrameIds.includes(capturableFrame.id)}
                onClick={capture}
              >
                {capturableFrame ? (t07.capturedFrameIds.includes(capturableFrame.id) ? '这一帧已经截下' : video.captureLabel) : video.captureOutsideLabel}
              </button>
              <label className="t07-finale__seek-label">
                进度
                <input
                  className="t07-finale__seek"
                  type="range"
                  min={0}
                  max={video.durationMs}
                  step={video.frameMs}
                  value={timeMs}
                  aria-label="播放进度"
                  aria-valuetext={`${formatClock(timeMs)} / ${formatClock(video.durationMs)}`}
                  onChange={(event) => seek(Number(event.target.value))}
                />
                <span className="t07-finale__clock">{formatClock(timeMs)} / {formatClock(video.durationMs)}</span>
              </label>
            </div>
            <p className="t07-finale__note">{video.continuityNote}</p>
            <p className="t07-finale__note">已看过主要片段：{watchedCount} / {video.requiredSegmentIds.length}{videoWatched ? ` · ${video.watchedNote}` : ''}</p>
            {capturableFrame && !t07.capturedFrameIds.includes(capturableFrame.id) && <p className="t07-finale__hint" aria-live="polite">{video.captureHint}</p>}
          </div>}

        {capturedFrames.length > 0 && <div className="t07-finale__shots">
          <h2>截图</h2>
          {capturedFrames.map((frame) => (
            <article key={frame.id} className="t07-finale__shot">
              <FrameVisual assetId={frame.imageId} altText={frame.altText} note={frame.placeholderNote} />
              <p>{frame.caption}</p>
              <button type="button" className="t07-finale__screenshot-zoom" onClick={(event) => openShot(frame.id, event.currentTarget)}>{video.screenshotZoomLabel}</button>
            </article>
          ))}
        </div>}
      </div>}

      {tab === 'compare' && <div className="t07-finale__panel">
        {capturedFrames.length === 0
          ? <p className="t07-finale__locked">{comparison.lockedHint}</p>
          : <>
            <p className="t07-finale__xiaoyue">{comparison.xiaoyueLine}</p>
            <p className="t07-finale__note">{comparison.replyLine}</p>
            <div className="t07-finale__compare-grid">
              <figure className={`t07-finale__compare-side${zoomLeft ? ' is-zoomed' : ''}`}>
                <FrameVisual assetId={activeFrame!.imageId} altText={activeFrame!.altText} note={activeFrame!.placeholderNote} />
                <figcaption>{activeFrame!.caption}</figcaption>
                <button type="button" className="t07-finale__zoom-left" onClick={() => setZoomLeft((value) => !value)}>{comparison.zoomLabel}</button>
              </figure>
              <figure className={`t07-finale__compare-side${zoomRight ? ' is-zoomed' : ''}`}>
                <FrameVisual assetId={comparison.exteriorImageId} altText={comparison.exteriorAltText} note={comparison.exteriorNote} />
                <figcaption>{comparison.exteriorCaption}</figcaption>
                <button type="button" className="t07-finale__zoom-right" onClick={() => setZoomRight((value) => !value)}>{comparison.zoomLabel}</button>
              </figure>
            </div>
            {!zoomLeft || !zoomRight
              ? <p className="t07-finale__hint">{comparison.zoomBothHint}</p>
              : t07.comparedFrameIds.includes(activeFrame!.id)
                ? templeConfirmed
                  ? <p className="t07-finale__done" aria-live="polite">{comparison.structureNote}</p>
                  : <button type="button" className="t07-finale__temple-confirm" onClick={() => manager.confirmAct2T07TempleFrame()}>{comparison.confirmLabel}</button>
                : <button type="button" className="t07-finale__compare" onClick={() => manager.compareAct2T07TempleFrame(activeFrame!.id)}>{comparison.compareLabel}</button>}
          </>}
      </div>}

      {tab === 'inference' && <div className="t07-finale__panel">
        <h2>{inference.title}</h2>
        <div className="t07-finale__branches">
          <div>
            <h3>鸡公岭</h3>
            <ul>{inference.jigonglingBranch.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
          <div>
            <h3>启明</h3>
            <ul>{inference.qimingBranch.map((item) => <li key={item}>{item}</li>)}</ul>
          </div>
        </div>
        {locationInferred
          ? <>
            <p className="t07-finale__conclusion">{inference.conclusion}</p>
            <p className="t07-finale__note">{inference.caveat}</p>
          </>
          : photoConfirmed && templeConfirmed && videoWatched
            ? <button type="button" className="t07-finale__infer" onClick={() => manager.inferAct2T07Location()}>{inference.confirmLabel}</button>
            : <p className="t07-finale__locked">{inference.lockedHint}</p>}
      </div>}

      {tab === 'trip' && <div className="t07-finale__panel">
        <h2>{trip.title}</h2>
        <ol className="t07-finale__dialogue">
          {trip.lines.map((line) => <li key={`${line.speaker}-${line.text}`}><strong>{line.speaker}</strong><span>{line.text}</span></li>)}
        </ol>
        <FrameVisual assetId={trip.gearImageId} altText={trip.gearAltText} note={trip.gearNote} className="t07-finale__gear" />
        {tripPlanned
          ? <p className="t07-finale__done" aria-live="polite">{trip.plannedNote}</p>
          : locationInferred
            ? <button type="button" className="t07-finale__trip-confirm" onClick={() => manager.planAct2T07SecondTrip()}>{trip.confirmLabel}</button>
            : <p className="t07-finale__locked">{trip.lockedHint}</p>}
      </div>}

      {complete && <aside className="t07-finale__closing">
        <p>{finale.closingNote}</p>
        <button type="button" className="t07-finale__ending-replay" onClick={() => setTab('materials')}>{finale.replayLabel}</button>
      </aside>}

      {zoomedShotId && (() => {
        const frame = video.keyFrames.find((item) => item.id === zoomedShotId)!;
        return <div className="t07-finale__shot-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeShot(); }}>
          <section ref={shotDialogRef} className="t07-finale__shot-dialog" role="dialog" aria-modal="true" aria-label={frame.caption}>
            <header><h2>{frame.caption}</h2><button type="button" aria-label="关闭截图" onClick={closeShot}>关闭 ×</button></header>
            <FrameVisual assetId={frame.zoomImageId} altText={frame.altText} note={frame.placeholderNote} className="t07-finale__shot-large" />
            <p className="t07-finale__note">{frame.placeholderNote}</p>
          </section>
        </div>;
      })()}

      {finaleOpen && <div className="t07-finale__ending" role="dialog" aria-modal="true" aria-label="第二幕收束" ref={finaleRef}>
        <p className="t07-finale__cue" aria-live="polite">{finale.cues[cueIndex]?.label ?? finale.cues[finale.cues.length - 1].label}</p>
        {finale.lines.map((line, index) => (
          <p key={line} className={`t07-finale__narration${index <= cueIndex ? ' is-shown' : ''}`}>{index <= cueIndex ? line : ''}</p>
        ))}
        <button type="button" className="t07-finale__ending-continue" onClick={finishFinale}>{finale.continueLabel}</button>
      </div>}
    </section>
  );
}

/** T06 收束后出现在桌面的中性入口；点击才进入 T07，重载不会自动跳过。 */
export function Act2T07Entry({ manager = defaultManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  if (state.modules.act2Research.stage !== 'qiming' || state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL !== true) return null;
  return <button type="button" className="act2-t07-entry" onClick={() => manager.enterAct2FinaleInvestigation()}>{ACT2_T07_ENTRY_LABEL}</button>;
}

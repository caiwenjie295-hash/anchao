import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import { PhotoViewport } from '../../components/PhotoViewport';
import type { InvestigationAction } from '../../components/investigation/types';
import { assetLoader } from '../../core/assetLoader';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { act2T07, act2T06RecapPages, formatClock, keyFrameAt, segmentAt, visualFrameAt } from '../../data/act2T07Data';
import '../../act2/t07Finale.css';

export const ACT2_T07_ENTRY_LABEL = act2T07.entryLabel;
export const ACT2_T07_RESUME_LABEL = act2T07.resumeLabel;

type TabId = 'materials' | 'video' | 'compare';

const tabLabels: { id: TabId; label: string }[] = [
  { id: 'materials', label: '宣传资料' },
  { id: 'video', label: '受访视频' },
  { id: 'compare', label: '外景对照' },
];

const { video, comparison, inference, trip, finale } = act2T07;

/** 无正式图片时显示可操作的替代画面与文字说明，绝不渲染破图。 */
function FrameVisual({ assetId, altText, note, className = '', children, onImageAvailabilityChange }: { assetId: string; altText: string; note: string; className?: string; children?: ReactNode; onImageAvailabilityChange?: (available: boolean) => void }) {
  const source = assetLoader.get(assetId)?.src ?? '';
  const resourceKey = `${assetId}\u0000${source}`;
  const latestResourceKey = useRef(resourceKey);
  latestResourceKey.current = resourceKey;
  const [imageState, setImageState] = useState<{ key: string; status: 'loading' | 'loaded' | 'failed'; width: number; height: number }>({ key: '', status: 'loading', width: 0, height: 0 });
  const imageAvailable = Boolean(source && imageState.key === resourceKey && imageState.status === 'loaded');
  const imageFailed = Boolean(!source || (imageState.key === resourceKey && imageState.status === 'failed'));
  useEffect(() => { setImageState({ key: resourceKey, status: 'loading', width: 0, height: 0 }); }, [resourceKey]);
  useEffect(() => { onImageAvailabilityChange?.(imageAvailable); }, [imageAvailable, onImageAvailabilityChange]);
  return (
    <div className={`t07-frame${imageAvailable ? ' t07-frame--image' : ''}${className ? ` ${className}` : ''}`} data-asset-id={assetId} style={imageAvailable ? { aspectRatio: `${imageState.width} / ${imageState.height}` } : undefined}>
      {source && <div className="t07-frame__image-plane"><img key={resourceKey} src={source} alt={imageAvailable ? altText : ''} aria-hidden={!imageAvailable} data-resource-key={resourceKey} onLoad={(event) => {
        if (latestResourceKey.current !== resourceKey || event.currentTarget.dataset.resourceKey !== resourceKey || event.currentTarget.naturalWidth <= 0 || event.currentTarget.naturalHeight <= 0) return;
        setImageState({ key: resourceKey, status: 'loaded', width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
      }} onError={(event) => { if (latestResourceKey.current === resourceKey && event.currentTarget.dataset.resourceKey === resourceKey) setImageState({ key: resourceKey, status: 'failed', width: 0, height: 0 }); }} />{imageAvailable && children}</div>}
      {!imageAvailable && <div className="t07-frame__placeholder" role="img" aria-label={altText}><span aria-hidden="true">{imageFailed ? '!' : '…'}</span><p>{imageFailed ? '图片载入失败；可依据文字资料继续调查。' : note}</p></div>}
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

const formatMediaStamp = (timeMs: number): string => {
  const safeTime = Math.max(0, Math.floor(timeMs));
  const seconds = Math.floor(safeTime / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${Math.floor((safeTime % 1000) / 100)}`;
};
const frameTimeWindow = (frame: (typeof video.keyFrames)[number]): string => `${formatMediaStamp(frame.startMs)}–${formatMediaStamp(frame.endMs)}`;

export interface T07InvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void; onEnterAct3?: () => void }

export function T07Investigation({ manager = defaultManager, onReturnToDesktop, onEnterAct3 }: T07InvestigationProps) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  const [tab, setTab] = useState<TabId>('materials');
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timeRef = useRef(0);
  const [loadedVideoAssetId, setLoadedVideoAssetId] = useState('');
  const [photoZoomed, setPhotoZoomed] = useState(false);
  const [photoImageAvailable, setPhotoImageAvailable] = useState(false);
  const [comparisonFrameReady, setComparisonFrameReady] = useState(false);
  const [comparisonExteriorReady, setComparisonExteriorReady] = useState(false);
  const [zoomedShotId, setzoomedShotId] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState('');
  const [compareFeedback, setCompareFeedback] = useState('');
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
  const outcomesRef = useRef<HTMLElement>(null);

  const videoFound = flags.FLAG_A2_PROMO_VIDEO_FOUND === true;
  const photoConfirmed = flags.FLAG_A2_PROMO_PHOTO_SS_FOUND === true;
  const templeConfirmed = flags.FLAG_A2_TEMPLE_FRAME_FOUND === true;
  const videoWatched = flags.FLAG_A2_PROMO_VIDEO_WATCHED === true;
  const locationInferred = flags.FLAG_A2_QIMING_LOCATION_INFERRED === true;
  const tripPlanned = flags.FLAG_A2_SECOND_TRIP_PLANNED === true;
  const complete = flags.FLAG_A2_COMPLETE === true;
  // StateManager 按实际截取次序保存 ID；目录和对照候选也按该顺序呈现。
  const capturedFrames = useMemo(() => t07.capturedFrameIds.map((id) => video.keyFrames.find((frame) => frame.id === id)).filter((frame): frame is (typeof video.keyFrames)[number] => frame !== undefined), [t07.capturedFrameIds]);
  const activeFrame = capturedFrames.find((frame) => frame.id === selectedFrameId) ?? capturedFrames[0];
  const segment = segmentAt(timeMs);
  const capturableFrame = keyFrameAt(timeMs);
  const visualFrame = visualFrameAt(timeMs);
  const currentVideoImageId = visualFrame?.imageId ?? videoMaterial.imageId;
  const canCaptureCurrentFrame = Boolean(capturableFrame && loadedVideoAssetId === capturableFrame.imageId);
  const watchedCount = video.requiredSegmentIds.filter((id) => t07.playedSegmentIds.includes(id)).length;
  const recapPages = useMemo(() => act2T06RecapPages.filter((page) => state.modules.browser.visitedPageIds.includes(page.id)), [state.modules.browser.visitedPageIds]);
  const photoSource = assetLoader.get(photoMaterial.imageId)?.src;
  const exteriorSource = assetLoader.get(comparison.exteriorImageId)?.src;
  const onPhotoAvailability = useCallback((available: boolean) => setPhotoImageAvailable(available), []);
  const onComparisonFrameAvailability = useCallback((available: boolean) => setComparisonFrameReady(available), [activeFrame?.id]);
  const onComparisonExteriorAvailability = useCallback((available: boolean) => setComparisonExteriorReady(available), [activeFrame?.id]);

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

  const actions: InvestigationAction[] = [
    { actionId: 'A2_T07_MATERIALS', kind: 'review', target: 'materials', label: '查看宣传资料', state: 'ready', onActivate: () => setTab('materials') },
    { actionId: 'A2_T07_VIDEO', kind: 'review', target: 'video', label: '查看受访视频', state: 'ready', onActivate: () => setTab('video') },
    { actionId: 'A2_T07_COMPARE', kind: 'review', target: 'compare', label: '核对截图与旧庙外景', state: 'ready', onActivate: () => setTab('compare') },
    { actionId: 'A2_T07_INFER_LOCATION', kind: 'story', target: 'location', label: locationInferred ? '地点结论已记下' : '确认地点判断', state: locationInferred ? 'completed' : photoConfirmed && templeConfirmed ? 'ready' : 'blocked', reason: !photoConfirmed ? '先查看合影中的双 S 记号。' : '还要截取视频画面，并从画面和外景中核对相同特征。', relatedMaterials: [
      ...(!photoConfirmed ? [{ id: 'photo', label: '校门合影' }] : []),
      ...(!templeConfirmed ? [{ id: 'compare', label: '截图与外景对照' }] : []),
    ], onActivate: () => { manager.inferAct2T07Location(); if (typeof outcomesRef.current?.scrollIntoView === 'function') outcomesRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
    { actionId: 'A2_T07_PLAN_TRIP', kind: 'story', target: 'second-trip', label: tripPlanned ? '再次进山已商定' : trip.confirmLabel, state: tripPlanned ? 'completed' : locationInferred ? 'ready' : 'blocked', reason: '先核对合影和旧庙外景、记下地点判断，再商量是否再次进山。', relatedMaterials: locationInferred ? undefined : [{ id: 'compare', label: '截图与外景对照' }], onActivate: () => { manager.planAct2T07SecondTrip(); if (typeof outcomesRef.current?.scrollIntoView === 'function') outcomesRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } },
  ];

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
    <InvestigationShell
      ariaLabel="第二幕宣传视频与外景核对"
      className="investigation-shell--exploration"
      actLabel="第二幕 · 启明地点与出发"
      locationLabel="旧资料对照"
      contextLabel="时间回看 · 当前调查"
      objective="核对合影记号和视频画面中的石质轮廓，再决定是否回山确认。"
      helpText="合影、视频和对照可以按任意顺序查看。视频不必完整播放；在不同镜头截取候选画面，再选择其中的截图和可见特征进行核对。完整播放会保留为真实记录。"
      actions={actions}
      statusMessage={compareFeedback}
      onExit={() => onReturnToDesktop?.()}
      onOpenMaterial={(_actionId, materialId) => setTab(materialId === 'photo' ? 'materials' : materialId === 'video' ? 'video' : 'compare')}
    >
    <section className="t07-finale" aria-label="第二幕宣传资料调查" data-asset-id={photoMaterial.imageId}>
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
          <div className="t07-finale__photo">
              {photoZoomed
              ? <>
                <PhotoViewport
                  sceneKey="A2_T07_PROMO_PHOTO"
                  imageUrl={photoSource}
                  imageAlt={photoMaterial.altText}
                  hotspots={[]}
                  routes={[]}
                  onImageAvailabilityChange={onPhotoAvailability}
                  imageOverlay={<DoubleSSymbol className="t07-finale__photo-symbol" label="合影右下角的双 S 标志" />}
                />
                <button type="button" className="t07-finale__photo-close" onClick={() => setPhotoZoomed(false)}>收起放大查看</button>
              </>
              : <FrameVisual assetId={photoMaterial.imageId} altText={photoMaterial.altText} note={photoMaterial.placeholderNote} onImageAvailabilityChange={onPhotoAvailability} />}
          </div>
          <p className="t07-finale__note">{photoMaterial.cornerNote}</p>
          {!photoZoomed
            ? <button type="button" className="t07-finale__photo-zoom" disabled={!photoImageAvailable} onClick={() => { manager.viewAct2T07Material(photoMaterial.id); setPhotoZoomed(true); }}>{photoMaterial.zoomLabel}</button>
            : <>
              <p className="t07-finale__note">{photoMaterial.symbolNote}</p>
              <p className="t07-finale__xiaoyue">{photoMaterial.logoSpeculation}</p>
              {!photoConfirmed && <button type="button" className="t07-finale__photo-confirm" disabled={!photoImageAvailable} onClick={() => manager.confirmAct2T07PhotoSymbol()}>{photoMaterial.confirmLabel}</button>}
            </>}
          {photoConfirmed && <p className="t07-finale__done" aria-live="polite">{photoMaterial.confirmedNote}</p>}
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
            <FrameVisual key={currentVideoImageId} assetId={currentVideoImageId} altText={capturableFrame?.altText ?? segment?.label ?? videoMaterial.altText} note={capturableFrame?.placeholderNote ?? segment?.placeholderNote ?? videoMaterial.placeholderNote} className="t07-finale__screen" onImageAvailabilityChange={(available) => setLoadedVideoAssetId(available ? currentVideoImageId : '')}>
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
                disabled={!capturableFrame || !canCaptureCurrentFrame || t07.capturedFrameIds.includes(capturableFrame.id)}
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
              {capturableFrame && !t07.capturedFrameIds.includes(capturableFrame.id) && <p className="t07-finale__hint" aria-live="polite">{canCaptureCurrentFrame ? video.captureHint : '先等当前原图载入；载入失败时可继续查看其他资料。'}</p>}
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
            <div className="t07-finale__candidate-list" aria-label="选择要核对的截图">
              {capturedFrames.map((frame) => {
                const capturedAt = t07.capturedAtMsByFrameId[frame.id];
                return <button type="button" key={frame.id} aria-pressed={activeFrame?.id === frame.id} onClick={() => { if (frame.id !== activeFrame?.id) { setSelectedFrameId(frame.id); setComparisonFrameReady(false); setComparisonExteriorReady(false); } setSelectedFeatureId(''); setCompareFeedback(''); }}>{frame.caption} · {capturedAt === undefined ? `画面时段 ${frameTimeWindow(frame)}` : `截取于 ${formatMediaStamp(capturedAt)}`}</button>;
              })}
            </div>
            {activeFrame && <>
              <p className="t07-finale__source-line">来源一：创始人受访视频，画面时段 {frameTimeWindow(activeFrame)}。来源二：第一次徒步拍下的破庙外景。</p>
              <div className="t07-finale__compare-grid">
                <figure className="t07-finale__compare-side">
                  <PhotoViewport key={activeFrame.id} sceneKey={`A2_T07_COMPARE_${activeFrame.id}`} imageUrl={assetLoader.get(activeFrame.imageId)?.src} imageAlt={activeFrame.altText} hotspots={[]} routes={[]} onImageAvailabilityChange={onComparisonFrameAvailability} />
                  <figcaption>{activeFrame.caption}</figcaption>
                </figure>
                <figure className="t07-finale__compare-side">
                  <PhotoViewport key={activeFrame.id + comparison.exteriorImageId} sceneKey={`A2_T07_COMPARE_EXTERIOR_${activeFrame.id}`} imageUrl={exteriorSource} imageAlt={comparison.exteriorAltText} hotspots={[]} routes={[]} onImageAvailabilityChange={onComparisonExteriorAvailability} />
                  <figcaption>{comparison.exteriorCaption}</figcaption>
                </figure>
              </div>
              <fieldset className="t07-finale__feature-choice">
                <legend>哪项可见特征能与外景互相印证？</legend>
                {comparison.featureOptions.map((feature) => <label key={feature.id}><input type="radio" name="t07-comparison-feature" value={feature.id} checked={selectedFeatureId === feature.id} onChange={() => setSelectedFeatureId(feature.id)} />{feature.label}</label>)}
              </fieldset>
              {t07.comparedFrameIds.includes(activeFrame.id) && t07.comparisonFeatureIdByFrameId[activeFrame.id] === comparison.matchFeatureId
                ? <div className="t07-finale__comparison-record" aria-label="已记录的外观对照" aria-live="polite">
                  <p className="t07-finale__done">{comparison.structureNote}</p>
                  <ul>
                    <li>来源一：创始人受访视频，{t07.capturedAtMsByFrameId[activeFrame.id] === undefined ? `原截图保留了 ${frameTimeWindow(activeFrame)} 时段，未保留具体截取时刻` : `截取时刻 ${formatMediaStamp(t07.capturedAtMsByFrameId[activeFrame.id])}`}。</li>
                    <li>来源二：第一次徒步拍下的破庙外景。</li>
                    <li>依据：{comparison.featureOptions.find((feature) => feature.id === t07.comparisonFeatureIdByFrameId[activeFrame.id])?.label ?? '石砌开口外观'}。</li>
                  </ul>
                </div>
                : <button type="button" className="t07-finale__compare" disabled={!selectedFeatureId || !comparisonFrameReady || !comparisonExteriorReady} onClick={() => {
                  const result = manager.submitAct2T07Comparison(activeFrame.id, selectedFeatureId);
                  setCompareFeedback(result === 'recorded' || result === 'already-recorded' ? comparison.structureNote : comparison.mismatchNote);
                }}>{comparison.compareLabel}</button>}
              {(!comparisonFrameReady || !comparisonExteriorReady) && <p className="t07-finale__hint" role="status">正在载入两份原图；图片可见后再记录外观对照。</p>}
            </>}
          </>}
      </div>}

      <section ref={outcomesRef} className="t07-finale__outcomes" aria-label="地点判断与后续决定" tabIndex={-1}>
        <article className="t07-finale__outcome" aria-labelledby="t07-location-title">
          <h2 id="t07-location-title">{inference.title}</h2>
          {locationInferred
            ? <>
              <div className="t07-finale__branches">
                <div><h3>鸡公岭</h3><ul>{inference.jigonglingBranch.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><h3>启明</h3><ul>{inference.qimingBranch.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
              <p className="t07-finale__conclusion">{inference.conclusion}</p>
              <p className="t07-finale__note">{inference.caveat}</p>
            </>
            : <p className="t07-finale__locked">{inference.lockedHint}</p>}
        </article>
        <article className="t07-finale__outcome" aria-labelledby="t07-trip-title">
          <h2 id="t07-trip-title">{trip.title}</h2>
          {!locationInferred
            ? <p className="t07-finale__locked">先完成合影与外景核对，并记下地点判断，再决定是否再次进山。</p>
            : <>
              <ol className="t07-finale__dialogue">{trip.lines.map((line) => <li key={`${line.speaker}-${line.text}`}><strong>{line.speaker}</strong><span>{line.text}</span></li>)}</ol>
              <FrameVisual assetId={trip.gearImageId} altText={trip.gearAltText} note={trip.gearNote} className="t07-finale__gear" />
              {tripPlanned && <p className="t07-finale__done" aria-live="polite">{trip.plannedNote}</p>}
            </>}
        </article>
      </section>

      {complete && <aside className="t07-finale__closing">
        <p>{finale.closingNote}</p>
        {/* 工单 §15.1：第二幕收束页必须直接给出进入第三幕的主操作，
            玩家不应被迫先退出场景、回桌面，再去猜折叠的任务栏菜单。
            「进入第三幕」与「完成第二幕」是两个语义：此处只写完成，主按钮才启动第三幕。 */}
        <div className="t07-finale__closing-actions">
          {onEnterAct3
            ? <button type="button" className="t07-finale__enter-act3" onClick={onEnterAct3}>再次进山，调查启明旧址</button>
            : <p className="t07-finale__locked">回到桌面后，可在任务栏「调查」中开始启明旧址的调查。</p>}
          <button type="button" className="t07-finale__ending-replay" onClick={() => setTab('materials')}>{finale.replayLabel}</button>
        </div>
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
    </InvestigationShell>
  );
}

/** T06 收束后出现在桌面的中性入口；点击才进入 T07，重载不会自动跳过。 */
export function Act2T07Entry({ manager = defaultManager }: { manager?: StateManager }) {
  const state = useSyncExternalStore(manager.subscribe, manager.getState, manager.getState);
  if (state.modules.act2Research.stage !== 'qiming' || state.game.flags.FLAG_A2_OTHER_CASES_ABNORMAL !== true) return null;
  return <button type="button" className="act2-t07-entry" onClick={() => manager.enterAct2FinaleInvestigation()}>{ACT2_T07_ENTRY_LABEL}</button>;
}

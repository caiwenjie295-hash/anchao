import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { DoubleSSymbol } from '../../components/DoubleSSymbol';
import { InvestigationShell } from '../../components/investigation/InvestigationShell';
import { PhotoViewport } from '../../components/PhotoViewport';
import type { PhotoMarker } from '../../components/PhotoViewport';
import type { InvestigationAction } from '../../components/investigation/types';
import { assetLoader } from '../../core/assetLoader';
import { investigationAudio, readInvestigationAudioPreference, writeInvestigationAudioPreference } from '../../media/investigationAudio';
import { StateManager, stateManager as defaultManager } from '../../core/stateManager';
import { useAppSelector } from '../../core/hooks/useAppSelector';
import { equalAct2T07EntrySnapshot, equalAct2T07Snapshot, selectAct2T07EntrySnapshot, selectAct2T07Snapshot } from '../../core/store/selectors';
import { act2T07, act2T06RecapPages, comparisonReferenceForFrame, formatClock, keyFrameAt, resolveT07MismatchNote, segmentAt, visualFrameAt } from '../../data/act2T07Data';
import { T07FinaleCurtain } from '../../components/scenePolish/T07FinaleCurtain';
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

const formatMediaStamp = (timeMs: number): string => {
  const safeTime = Math.max(0, Math.floor(timeMs));
  const seconds = Math.floor(safeTime / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${Math.floor((safeTime % 1000) / 100)}`;
};
const frameTimeWindow = (frame: (typeof video.keyFrames)[number]): string => `${formatMediaStamp(frame.startMs)}–${formatMediaStamp(frame.endMs)}`;

export interface T07InvestigationProps { manager?: StateManager; onReturnToDesktop?: () => void; onEnterAct3?: () => void }

export function T07Investigation({ manager = defaultManager, onReturnToDesktop, onEnterAct3 }: T07InvestigationProps) {
  const state = useAppSelector(manager, selectAct2T07Snapshot, equalAct2T07Snapshot);
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
  const [recentlyCapturedFrameId, setRecentlyCapturedFrameId] = useState<string | null>(() => manager.getState().modules.act2Research.t07.capturedFrameIds.at(-1) ?? null);
  const [selectedFeatureId, setSelectedFeatureId] = useState('');
  const [observedVideoFrameIds, setObservedVideoFrameIds] = useState<string[]>([]);
  const [observedExteriorFrameIds, setObservedExteriorFrameIds] = useState<string[]>([]);
  const [compareFeedback, setCompareFeedback] = useState('');
  const [cueIndex, setCueIndex] = useState(0);
  const [ambienceEnabled, setAmbienceEnabled] = useState(false);
  const [ambiencePreference, setAmbiencePreference] = useState(() => readInvestigationAudioPreference());
  const [ambienceStatus, setAmbienceStatus] = useState(() => readInvestigationAudioPreference() === true
    ? '已记住你上次的选择；本次需要点按后才会播放。'
    : '环境声默认关闭；调查资料和幕末文字都可以无声阅读。');
  const [finaleOpen, setFinaleOpen] = useState(false);
  const photoMaterial = act2T07.materials.find((material) => material.id === act2T07.photoMaterialId)!;
  const videoMaterial = act2T07.materials.find((material) => material.id === video.materialId)!;
  const t07 = state.modules.act2Research.t07;
  const flags = state.game.flags;
  const reducedMotion = state.settings.reducedMotion || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true);
  const shotDialogRef = useRef<HTMLElement>(null);
  const previousTriggerRef = useRef<HTMLElement | null>(null);
  const outcomesRef = useRef<HTMLElement>(null);
  const photoArticleRef = useRef<HTMLElement>(null);
  const videoArticleRef = useRef<HTMLElement>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);
  const comparisonPanelRef = useRef<HTMLDivElement>(null);
  const tripArticleRef = useRef<HTMLElement>(null);
  const [tripConversationPresented, setTripConversationPresented] = useState(false);

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
  const activeComparisonConfirmed = Boolean(activeFrame?.frameKind === 'temple'
    && t07.comparedFrameIds.includes(activeFrame.id)
    && t07.comparisonFeatureIdByFrameId[activeFrame.id] === comparison.matchFeatureId);
  const activeReference = comparisonReferenceForFrame(activeFrame);
  const capturedTempleFrame = capturedFrames.find((frame) => frame.frameKind === 'temple');
  const segment = segmentAt(timeMs);
  const capturableFrame = keyFrameAt(timeMs);
  const visualFrame = visualFrameAt(timeMs);
  const currentVideoImageId = visualFrame?.imageId ?? videoMaterial.imageId;
  const canCaptureCurrentFrame = Boolean(capturableFrame && loadedVideoAssetId === capturableFrame.imageId);
  const watchedCount = video.requiredSegmentIds.filter((id) => t07.playedSegmentIds.includes(id)).length;
  const recapPages = useMemo(() => act2T06RecapPages.filter((page) => state.modules.browser.visitedPageIds.includes(page.id)), [state.modules.browser.visitedPageIds]);
  const photoSource = assetLoader.get(photoMaterial.imageId)?.src;
  const exteriorSource = assetLoader.get(activeReference.imageId)?.src;
  const onPhotoAvailability = useCallback((available: boolean) => setPhotoImageAvailable(available), []);
  const onComparisonFrameAvailability = useCallback((available: boolean) => setComparisonFrameReady(available), [activeFrame?.id]);
  const onComparisonExteriorAvailability = useCallback((available: boolean) => setComparisonExteriorReady(available), [activeFrame?.id]);
  const videoObservationLabel = activeFrame?.frameKind === 'trail' ? '视频里的树林环境' : activeFrame?.frameKind === 'interview' ? '受访者与机构门口' : '视频里的庙轮廓';
  const exteriorObservationLabel = activeFrame?.frameKind === 'trail' ? '树林环境相似处' : '旧庙石砌开口附近';
  const videoObservationMarkers: PhotoMarker[] = activeFrame ? [{
    id: `T07_OBSERVE_VIDEO_${activeFrame.id}`,
    label: observedVideoFrameIds.includes(activeFrame.id) ? `已标记${videoObservationLabel}` : `点选查看${videoObservationLabel}`,
    x: activeFrame.frameKind === 'trail' ? 0.49 : 0.445,
    y: activeFrame.frameKind === 'trail' ? 0.39 : 0.35,
    kind: 'memory',
    active: observedVideoFrameIds.includes(activeFrame.id),
    disabled: !comparisonFrameReady,
    onActivate: () => setObservedVideoFrameIds((ids) => ids.includes(activeFrame.id) ? ids : [...ids, activeFrame.id]),
  }] : [];
  const exteriorObservationMarkers: PhotoMarker[] = activeFrame ? [{
    id: `T07_OBSERVE_EXTERIOR_${activeFrame.id}`,
    label: observedExteriorFrameIds.includes(activeFrame.id) ? `已标记${exteriorObservationLabel}` : `点选查看${exteriorObservationLabel}`,
    x: activeFrame.frameKind === 'trail' ? 0.52 : 0.525,
    y: activeFrame.frameKind === 'trail' ? 0.43 : 0.46,
    kind: 'memory',
    active: observedExteriorFrameIds.includes(activeFrame.id),
    disabled: !comparisonExteriorReady,
    onActivate: () => setObservedExteriorFrameIds((ids) => ids.includes(activeFrame.id) ? ids : [...ids, activeFrame.id]),
  }] : [];

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

  useEffect(() => () => { investigationAudio.stop(); }, []);

  const focusAfterTab = (nextTab: TabId, getTarget: () => HTMLElement | null) => {
    setTab(nextTab);
    window.setTimeout(() => {
      const target = getTarget();
      target?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      target?.focus({ preventScroll: true });
    }, 0);
  };
  const focusTripConversation = () => {
    setTripConversationPresented(true);
    if (typeof outcomesRef.current?.scrollIntoView === 'function') outcomesRef.current.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    window.setTimeout(() => tripArticleRef.current?.focus({ preventScroll: true }), 0);
  };
  const toggleAmbience = () => {
    if (ambienceEnabled) {
      investigationAudio.stop();
      setAmbienceEnabled(false);
      setAmbiencePreference(false);
      writeInvestigationAudioPreference(false);
      setAmbienceStatus('环境声已关闭；文字与字幕仍可继续阅读。');
      return;
    }
    if (!investigationAudio.setEnabled(true)) {
      setAmbienceStatus('当前浏览器无法播放环境声；调查文字和字幕仍可无声阅读。');
      return;
    }
    setAmbienceEnabled(true);
    setAmbiencePreference(true);
    writeInvestigationAudioPreference(true);
    investigationAudio.play('keyboard');
    setAmbienceStatus('轻微键盘声、雨声和微风正在播放，可随时关闭。');
  };
  const leaveInvestigation = () => {
    investigationAudio.stop();
    setAmbienceEnabled(false);
    onReturnToDesktop?.();
  };
  const completeAndEnterAct3 = () => {
    investigationAudio.stop();
    setAmbienceEnabled(false);
    manager.completeAct2T07Finale();
    setFinaleOpen(false);
    onEnterAct3?.();
  };
  const currentStep = complete || tripPlanned ? 6
    : !photoConfirmed ? 1
      : !videoFound ? 2
        : capturedFrames.length === 0 ? 2
          : !templeConfirmed ? 3
            : !locationInferred ? 4
              : 5;
  const currentStepName = complete || tripPlanned ? '再次进山，调查启明旧址'
    : currentStep === 1 ? '查看校门合影'
      : currentStep === 2 && !videoFound ? '打开受访视频'
        : currentStep === 2 ? '截取清晰视频画面'
          : currentStep === 3 ? '并排核对视频截图与旧庙外景'
            : currentStep === 4 ? '记下地点判断'
              : tripConversationPresented ? '与小月商量是否再次进山' : '听听与小月的出发商量';
  const actions: InvestigationAction[] = complete
    ? []
    : tripPlanned
      ? [{ actionId: 'A2_T07_COMPLETE_AND_ENTER_ACT3', kind: 'story', target: 'A3_T00', label: '再次进山，调查启明旧址', state: 'ready', onActivate: completeAndEnterAct3 }]
      : currentStep === 1
        ? [{ actionId: 'A2_T07_CURRENT_PHOTO', kind: 'review', target: 'promo-photo', label: '第 1 步 · 查看校门合影', state: 'ready', onActivate: () => focusAfterTab('materials', () => photoArticleRef.current) }]
        : currentStep === 2 && !videoFound
          ? [{ actionId: 'A2_T07_CURRENT_VIDEO_OPEN', kind: 'review', target: 'promo-video', label: '第 2 步 · 在宣传资料中打开受访视频', state: 'ready', onActivate: () => focusAfterTab('materials', () => videoArticleRef.current) }]
          : currentStep === 2
            ? [{ actionId: 'A2_T07_CURRENT_VIDEO_CAPTURE', kind: 'review', target: 'video', label: '第 2 步 · 截取一张清晰视频画面', state: 'ready', onActivate: () => focusAfterTab('video', () => videoPlayerRef.current) }]
            : currentStep === 3
              ? [{ actionId: 'A2_T07_CURRENT_COMPARE', kind: 'review', target: 'compare', label: '第 3 步 · 并排核对截图与旧庙外景', state: 'ready', onActivate: () => focusAfterTab('compare', () => comparisonPanelRef.current) }]
              : currentStep === 4
                ? [{ actionId: 'A2_T07_CURRENT_INFER', kind: 'story', target: 'location', label: '第 4 步 · 记下地点判断', state: 'ready', onActivate: () => { manager.inferAct2T07Location(); if (typeof outcomesRef.current?.scrollIntoView === 'function') outcomesRef.current.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' }); } }]
                : tripConversationPresented
                  ? [{ actionId: 'A2_T07_CURRENT_PLAN_TRIP', kind: 'story', target: 'second-trip', label: `第 5 步 · ${trip.confirmLabel}`, state: 'ready', onActivate: () => { manager.planAct2T07SecondTrip(); if (typeof outcomesRef.current?.scrollIntoView === 'function') outcomesRef.current.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' }); } }]
                  : [{ actionId: 'A2_T07_CURRENT_TRIP_CONVERSATION', kind: 'review', target: 'second-trip', label: '第 5 步 · 和小月商量下一步', state: 'ready', onActivate: focusTripConversation }];

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
  const selectComparisonFrame = (frameId: string) => {
    if (frameId !== activeFrame?.id) {
      setSelectedFrameId(frameId);
      setComparisonFrameReady(false);
      setComparisonExteriorReady(false);
    }
    setSelectedFeatureId('');
    setCompareFeedback('');
  };
  const findTempleFrame = () => {
    if (capturedTempleFrame) {
      selectComparisonFrame(capturedTempleFrame.id);
      return;
    }
    const templeFrame = video.keyFrames.find((frame) => frame.frameKind === 'temple');
    if (!templeFrame) return;
    setPlaying(false);
    setSelectedFeatureId('');
    setCompareFeedback('');
    seek(templeFrame.startMs);
    focusAfterTab('video', () => videoPlayerRef.current);
  };
  const capture = () => {
    if (!capturableFrame) return;
    manager.captureAct2T07Frame(capturableFrame.id, timeMs);
    setRecentlyCapturedFrameId(capturableFrame.id);
    selectComparisonFrame(capturableFrame.id);
  };
  const openFrameInComparison = (frameId: string) => {
    if (!capturedFrames.some((frame) => frame.id === frameId)) return;
    selectComparisonFrame(frameId);
    setTab('compare');
    window.setTimeout(() => comparisonPanelRef.current?.focus({ preventScroll: true }), 0);
  };
  const openRecentCaptureInComparison = () => { if (recentlyCapturedFrameId) openFrameInComparison(recentlyCapturedFrameId); };
  const openShot = (frameId: string, trigger?: HTMLElement) => {
    if (trigger) previousTriggerRef.current = trigger;
    setzoomedShotId(frameId);
  };
  const closeShot = () => {
    setzoomedShotId(null);
    previousTriggerRef.current?.focus();
  };
  const reviewMaterials = () => {
    investigationAudio.stop();
    setAmbienceEnabled(false);
    setFinaleOpen(false);
    setTab('materials');
  };

  const mismatchStatus = Boolean(compareFeedback && compareFeedback !== comparison.structureNote && activeFrame?.frameKind !== 'trail');

  return (
    <InvestigationShell
      ariaLabel="第二幕宣传视频与外景核对"
      className={`investigation-shell--exploration${mismatchStatus ? ' t07-shell--mismatch-status' : ''}`}
      actLabel="第二幕 · 启明地点与出发"
      locationLabel="旧资料对照"
      contextLabel="时间回看 · 当前调查"
      objective={complete ? '第二幕调查已经收束。可以再次进山，直接开始启明旧址调查。' : `当前步骤 ${Math.min(currentStep, 5)} / 5：${currentStepName}。已读资料可以从上方标签回看。`}
      helpText="按当前步骤继续即可；已读资料仍可回看。视频不必完整播放，只有清晰截图与已选特征匹配后才会记录对照。"
      actions={actions}
      statusMessage={compareFeedback}
      onExit={leaveInvestigation}
      onOpenMaterial={(_actionId, materialId) => setTab(materialId === 'photo' ? 'materials' : materialId === 'video' ? 'video' : 'compare')}
    >
    <section className="t07-finale" aria-label="第二幕宣传资料调查" data-asset-id={photoMaterial.imageId}>
      <p className="t07-finale__step-indicator" aria-live="polite">{complete ? `第二幕已收束 · ${currentStepName}` : `当前步骤 · ${Math.min(currentStep, 5)} / 5 · ${currentStepName}`}</p>
      <p className="t07-finale__intro">{act2T07.intro}</p>
      <div className="t07-finale__ambience" role="group" aria-label="可选环境声">
        <button type="button" aria-pressed={ambienceEnabled} onClick={toggleAmbience}>{ambienceEnabled ? '关闭环境声' : '开启环境声'}</button>
        <p aria-live="polite">{ambienceStatus}{ambiencePreference === true && !ambienceEnabled ? '（已记住此偏好，点按后播放）' : ''}</p>
      </div>

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

        <article ref={photoArticleRef} className="t07-finale__material" tabIndex={-1}>
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
                  initialView={{ zoom: 2.8, focus: { x: .86, y: .86 } }}
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

        <article ref={videoArticleRef} className="t07-finale__material" tabIndex={-1}>
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
          : <div ref={videoPlayerRef} className="t07-finale__player" tabIndex={-1} onKeyDown={onPlayerKeyDown}>
            <FrameVisual key={currentVideoImageId} assetId={currentVideoImageId} altText={capturableFrame?.altText ?? segment?.label ?? videoMaterial.altText} note={capturableFrame?.placeholderNote ?? segment?.placeholderNote ?? videoMaterial.placeholderNote} className="t07-finale__screen" onImageAvailabilityChange={(available) => setLoadedVideoAssetId(available ? currentVideoImageId : '')}>
              <p className="t07-finale__screen-label">{segment?.label ?? '视频封面'}</p>
            </FrameVisual>
            <div className="t07-finale__timeline" role="group" aria-label="中性分段时间轴">
              <p>按分段定位（定位不会计作已播放）</p>
              <div className="t07-finale__timeline-track">
                {video.segments.map((item, index) => <button
                  key={item.id}
                  type="button"
                  aria-pressed={segment?.id === item.id}
                  aria-label={`第 ${index + 1} 段，${formatMediaStamp(item.startMs)} 到 ${formatMediaStamp(item.endMs)}`}
                  onClick={() => { setPlaying(false); seek(item.startMs); }}
                ><span>第 {index + 1} 段</span><small>{formatMediaStamp(item.startMs)}–{formatMediaStamp(item.endMs)}</small></button>)}
              </div>
            </div>
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
            {recentlyCapturedFrameId && capturedFrames.some((frame) => frame.id === recentlyCapturedFrameId) && <div className="t07-finale__capture-followup" role="status" aria-live="polite">
              <p>截图已收进调查资料，截取时刻 {formatMediaStamp(t07.capturedAtMsByFrameId[recentlyCapturedFrameId] ?? 0)}。接下来可以和第一次徒步的旧庙外景并排核对。</p>
              <button type="button" onClick={openRecentCaptureInComparison}>拿这张截图去并排核对</button>
            </div>}
            <p className="t07-finale__note">{video.continuityNote}</p>
            <p className="t07-finale__note">已看过主要片段：{watchedCount} / {video.requiredSegmentIds.length}{videoWatched ? ` · ${video.watchedNote}` : ''}</p>
              {capturableFrame && !t07.capturedFrameIds.includes(capturableFrame.id) && <p className="t07-finale__hint" aria-live="polite">{canCaptureCurrentFrame ? video.captureHint : '先等当前原图载入；载入失败时可继续查看其他资料。'}</p>}
          </div>}

        {capturedFrames.length > 0 && <section className="t07-finale__filmstrip" aria-label="已截取的视频画面">
          <h2>已截画面 · 按截取顺序</h2>
          <div className="t07-finale__filmstrip-track">
            {capturedFrames.map((frame) => {
              const capturedAt = t07.capturedAtMsByFrameId[frame.id];
              const muted = !frame.supportsExteriorMatch;
              return <article key={frame.id} className={`t07-finale__filmstrip-item${muted ? ' t07-finale__frame--muted' : ''}`} data-frame-kind={frame.frameKind} data-exterior-match={frame.supportsExteriorMatch ? 'true' : 'false'}>
                <button type="button" className="t07-finale__filmstrip-select" aria-pressed={selectedFrameId === frame.id || (!selectedFrameId && activeFrame?.id === frame.id)} onClick={() => selectComparisonFrame(frame.id)}>
                  <FrameVisual assetId={frame.imageId} altText={frame.altText} note={frame.placeholderNote} className="t07-finale__filmstrip-image" />
                  <span>{frame.caption}</span>
                  <small>{capturedAt === undefined ? `画面 ${frameTimeWindow(frame)}` : `截取 ${formatMediaStamp(capturedAt)}`}</small>
                  {muted && frame.muteLabel ? <span className="t07-finale__frame-tag">{frame.muteLabel}</span> : null}
                </button>
                <div className="t07-finale__filmstrip-actions">
                  <button type="button" className="t07-finale__screenshot-zoom" onClick={(event) => openShot(frame.id, event.currentTarget)}>{video.screenshotZoomLabel}</button>
                  <button type="button" onClick={() => openFrameInComparison(frame.id)}>带入对照</button>
                </div>
              </article>;
            })}
          </div>
        </section>}
      </div>}

      {tab === 'compare' && <div ref={comparisonPanelRef} className="t07-finale__panel" tabIndex={-1}>
        {capturedFrames.length === 0
          ? <p className="t07-finale__locked">{comparison.lockedHint}</p>
          : <>
            <p className="t07-finale__xiaoyue">{comparison.xiaoyueLine}</p>
            <p className="t07-finale__note">{comparison.replyLine}</p>
            <div className="t07-finale__candidate-list" aria-label="选择要核对的截图">
              {capturedFrames.map((frame) => {
                const capturedAt = t07.capturedAtMsByFrameId[frame.id];
                const muted = !frame.supportsExteriorMatch;
                return <button type="button" key={frame.id} className={muted ? 't07-finale__frame--muted' : undefined} data-frame-kind={frame.frameKind} data-exterior-match={frame.supportsExteriorMatch ? 'true' : 'false'} aria-pressed={activeFrame?.id === frame.id} onClick={() => selectComparisonFrame(frame.id)}>{frame.caption} · {capturedAt === undefined ? `画面时段 ${frameTimeWindow(frame)}` : `截取于 ${formatMediaStamp(capturedAt)}`}{muted && frame.muteLabel ? <span className="t07-finale__frame-tag">{frame.muteLabel}</span> : null}</button>;
              })}
            </div>
            {activeFrame && <>
              <section className="t07-finale__note" aria-label="地点对照三步引导">
                <ol>
                  <li>{comparison.guide.steps[0]}</li>
                  <li>{comparison.guide.steps[1]}{activeFrame.frameKind === 'trail' ? <> <button type="button" className="t07-finale__guide-next" onClick={findTempleFrame}>{capturedTempleFrame ? comparison.guide.findCapturedTemple : comparison.guide.findTempleInVideo}</button></> : null}</li>
                  <li>{activeComparisonConfirmed ? comparison.guide.confirmedStep : comparison.guide.steps[2]}</li>
                </ol>
              </section>
              <p className="t07-finale__source-line">来源一：创始人受访视频，画面时段 {frameTimeWindow(activeFrame)}。来源二：{activeReference.caption}。</p>
              <div className="t07-finale__compare-grid">
                <figure className="t07-finale__compare-side">
                  <PhotoViewport key={activeFrame.id} sceneKey={`A2_T07_COMPARE_${activeFrame.id}`} imageUrl={assetLoader.get(activeFrame.imageId)?.src} imageAlt={activeFrame.altText} hotspots={videoObservationMarkers} routes={[]} onImageAvailabilityChange={onComparisonFrameAvailability} />
                  <figcaption>{activeFrame.caption}</figcaption>
                  <button type="button" className="t07-finale__observe-text" aria-pressed={observedVideoFrameIds.includes(activeFrame.id)} disabled={!comparisonFrameReady} onClick={() => setObservedVideoFrameIds((ids) => ids.includes(activeFrame.id) ? ids : [...ids, activeFrame.id])}>用文字入口标记{videoObservationLabel}</button>
                </figure>
                <figure className="t07-finale__compare-side">
                  <PhotoViewport key={activeFrame.id + activeReference.imageId} sceneKey={`A2_T07_COMPARE_REFERENCE_${activeFrame.id}_${activeReference.imageId}`} imageUrl={exteriorSource} imageAlt={activeReference.altText} hotspots={exteriorObservationMarkers} routes={[]} onImageAvailabilityChange={onComparisonExteriorAvailability} />
                  <figcaption>{activeReference.caption}</figcaption>
                  <p className="t07-finale__note">{activeReference.note}</p>
                  <button type="button" className="t07-finale__observe-text" aria-pressed={observedExteriorFrameIds.includes(activeFrame.id)} disabled={!comparisonExteriorReady} onClick={() => setObservedExteriorFrameIds((ids) => ids.includes(activeFrame.id) ? ids : [...ids, activeFrame.id])}>用文字入口标记{exteriorObservationLabel}</button>
                </figure>
              </div>
              {activeFrame.frameKind === 'trail'
                ? <button type="button" className="t07-finale__compare" disabled={!comparisonFrameReady || !comparisonExteriorReady} onClick={() => setCompareFeedback(activeReference.note)}>核对树林相似处</button>
                : <>
                  <fieldset className="t07-finale__feature-choice">
                    <legend>哪项可见特征能与外景互相印证？</legend>
                    {comparison.featureOptions.map((feature) => <label key={feature.id}><input type="radio" name="t07-comparison-feature" value={feature.id} checked={selectedFeatureId === feature.id} onChange={() => setSelectedFeatureId(feature.id)} />{feature.label}</label>)}
                  </fieldset>
                  {activeComparisonConfirmed
                    ? <div className="t07-finale__comparison-record" aria-label="已记录的外观对照" aria-live="polite">
                      <p className="t07-finale__done">{comparison.structureNote}</p>
                      <ul>
                        <li>来源一：创始人受访视频，{t07.capturedAtMsByFrameId[activeFrame.id] === undefined ? `原截图保留了 ${frameTimeWindow(activeFrame)} 时段，未保留具体截取时刻` : `截取时刻 ${formatMediaStamp(t07.capturedAtMsByFrameId[activeFrame.id])}`}。</li>
                        <li>来源二：{activeReference.caption}。</li>
                        <li>依据：{comparison.featureOptions.find((feature) => feature.id === t07.comparisonFeatureIdByFrameId[activeFrame.id])?.label ?? '石砌开口外观'}。</li>
                      </ul>
                    </div>
                    : <button type="button" className="t07-finale__compare" disabled={!selectedFeatureId || !comparisonFrameReady || !comparisonExteriorReady} onClick={() => {
                      const result = manager.submitAct2T07Comparison(activeFrame.id, selectedFeatureId);
                      setCompareFeedback(result === 'recorded' || result === 'already-recorded' ? comparison.structureNote : resolveT07MismatchNote(activeFrame, selectedFeatureId));
                    }}>{comparison.compareLabel}</button>}
                </>}
              {(!comparisonFrameReady || !comparisonExteriorReady) && <p className="t07-finale__hint" role="status">正在载入两份原图；图片可见后再标记观察或继续核对。</p>}
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
        <article ref={tripArticleRef} className="t07-finale__outcome" aria-labelledby="t07-trip-title" tabIndex={-1}>
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
        <div className="t07-finale__closing-actions">
          {onEnterAct3 && <button type="button" className="t07-finale__enter-act3" onClick={() => { investigationAudio.stop(); setAmbienceEnabled(false); onEnterAct3(); }}>再次进山，调查启明旧址</button>}
          <button type="button" className="t07-finale__ending-replay" onClick={reviewMaterials}>{finale.replayLabel}</button>
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

      {finaleOpen && <T07FinaleCurtain lines={finale.lines} cueIndex={cueIndex} onContinue={completeAndEnterAct3} onReview={reviewMaterials} />}
    </section>
    </InvestigationShell>
  );
}

/** T06 收束后出现在桌面的中性入口；点击才进入 T07，重载不会自动跳过。 */
export function Act2T07Entry({ manager = defaultManager }: { manager?: StateManager }) {
  const state = useAppSelector(manager, selectAct2T07EntrySnapshot, equalAct2T07EntrySnapshot);
  if (state.stage !== 'qiming' || !state.complete) return null;
  return <button type="button" className="act2-t07-entry" onClick={() => manager.enterAct2FinaleInvestigation()}>{ACT2_T07_ENTRY_LABEL}</button>;
}

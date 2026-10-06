import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { InvestigationNavigation } from './investigation/InvestigationNavigation';
import type { InvestigationAction, InvestigationActionKind, InvestigationActionState } from './investigation/types';
import './photoViewport.css';

export interface PhotoMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: 'object' | 'sound' | 'memory' | 'direction';
  disabled?: boolean;
  active?: boolean;
  actionKind?: InvestigationActionKind;
  actionState?: InvestigationActionState;
  target?: string;
  reason?: string;
  relatedMaterials?: InvestigationAction['relatedMaterials'];
  onActivate: (trigger: HTMLButtonElement) => void;
  onOpenMaterial?: InvestigationAction['onOpenMaterial'];
}
export interface PhotoViewportProps {
  sceneKey: string;
  imageUrl?: string;
  imageAlt: string;
  hotspots: PhotoMarker[];
  routes: PhotoMarker[];
  children?: ReactNode;
  imageOverlay?: ReactNode;
  transitionDirection?: 'forward' | 'back' | 'fade';
  /** Exploration-only edge vignette; reading and comparison photos stay at their authored brightness. */
  explorationMode?: boolean;
  /** A slightly longer visual handoff for an already-authored key reveal. */
  revealBeat?: boolean;
  onImageAvailabilityChange?: (available: boolean) => void;
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const calculatePhotoPanLimits = (planeWidth: number, planeHeight: number, frameWidth: number, frameHeight: number, scale: number) => ({
  x: Math.max(0, (planeWidth * scale - frameWidth) / 2),
  y: Math.max(0, (planeHeight * scale - frameHeight) / 2),
});

export function PhotoViewport({ sceneKey, imageUrl, imageAlt, hotspots, routes, children, imageOverlay, transitionDirection = 'forward', explorationMode = false, revealBeat = false, onImageAvailabilityChange }: PhotoViewportProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const resourceKey = `${sceneKey}\u0000${imageUrl ?? ''}`;
  const latestResourceKey = useRef(resourceKey);
  latestResourceKey.current = resourceKey;
  const [loadedResourceKey, setLoadedResourceKey] = useState<string | null>(null);
  const [failedResourceKey, setFailedResourceKey] = useState<string | null>(null);
  const [handoffImage, setHandoffImage] = useState<{ url: string; width: number; height: number } | null>(null);
  const imageLoaded = Boolean(imageUrl && loadedResourceKey === resourceKey && imageSize.width > 0 && imageSize.height > 0);
  const imageFailed = Boolean(imageUrl && failedResourceKey === resourceKey);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const pointerMoved = useRef(false);
  const previousResourceKey = useRef(resourceKey);
  const latestLoadedImage = useRef<{ url: string; width: number; height: number } | null>(null);
  const focusedTarget = useRef<{ type: 'frame' } | { type: 'hotspot'; id: string } | null>(null);
  const restoringFocus = useRef(false);
  const handoffTimer = useRef<number | null>(null);
  const transitionMs = revealBeat ? 420 : 260;

  // 审查 P1：sceneKey 变化会重建 key={sceneKey} 子树，frame 节点被替换但组件不重挂载。
  // 依赖 sceneKey 重新绑定观察，并始终读取 ref.current，避免观察已分离的旧节点。
  useEffect(() => {
    let observer: ResizeObserver | null = null;
    const update = () => {
      const element = frame.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      setFrameSize((previous) => previous.width === bounds.width && previous.height === bounds.height
        ? previous
        : { width: bounds.width, height: bounds.height });
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(update);
      const element = frame.current;
      if (element) observer.observe(element);
    } else {
      window.addEventListener('resize', update);
    }
    return () => {
      observer?.disconnect();
      observer = null;
      window.removeEventListener('resize', update);
    };
  }, [sceneKey]);

  const bound = (next: { x: number; y: number }, scale = zoom) => {
    const box = frame.current?.getBoundingClientRect();
    const width = frameSize.width || box?.width || 0;
    const height = frameSize.height || box?.height || 0;
    const currentFit = imageLoaded && imageSize.width > 0 && imageSize.height > 0 && width > 0 && height > 0
      ? Math.min(width / imageSize.width, height / imageSize.height)
      : 0;
    const planeWidth = imageSize.width * currentFit;
    const planeHeight = imageSize.height * currentFit;
    // 边界必须按 contain 后真正绘制的照片平面计算；宽图在窄 frame 中、
    // 或高图在矮 frame 中，未被照片覆盖的方向不应继续平移出空白。
    const { x: maxX, y: maxY } = calculatePhotoPanLimits(planeWidth, planeHeight, width, height, scale);
    return {
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  };
  const changeZoom = (value: number) => {
    const next = clamp(value, 1, 3);
    setZoom(next);
    setOffset((previous) => bound(previous, next));
  };
  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    pointers.current.clear();
  }, [sceneKey]);
  // 工单 §16.2：imageUrl 变化时必须使上一张图的尺寸失效，
  // 否则新图会沿用旧图的 content plane，出现拉伸或热点串图。
  useEffect(() => {
    setImageSize({ width: 0, height: 0 });
    setLoadedResourceKey(null);
    setFailedResourceKey(null);
    latestLoadedImage.current = null;
  }, [resourceKey]);
  useEffect(() => { onImageAvailabilityChange?.(imageLoaded); }, [resourceKey, imageLoaded, onImageAvailabilityChange]);
  useEffect(() => {
    setOffset((previous) => {
      const next = bound(previous, zoom);
      return next.x === previous.x && next.y === previous.y ? previous : next;
    });
  }, [frameSize.width, frameSize.height, imageSize.width, imageSize.height, imageLoaded, zoom]);

  // Swap the story scene immediately; this short crossfade is presentation only and never gates an action.
  useLayoutEffect(() => {
    if (handoffTimer.current !== null) {
      window.clearTimeout(handoffTimer.current);
      handoffTimer.current = null;
    }
    if (previousResourceKey.current === resourceKey) return;
    previousResourceKey.current = resourceKey;
    const previousImage = latestLoadedImage.current;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    if (!previousImage || reducedMotion || !imageUrl || previousImage.url === imageUrl) {
      setHandoffImage(null);
    } else {
      setHandoffImage(previousImage);
      handoffTimer.current = window.setTimeout(() => {
        handoffTimer.current = null;
        setHandoffImage(null);
      }, transitionMs + 40);
    }
  }, [resourceKey]);

  useEffect(() => () => {
    if (handoffTimer.current !== null) window.clearTimeout(handoffTimer.current);
    handoffTimer.current = null;
  }, []);

  // The frame subtree is replaced on a lens change. Preserve keyboard focus on the frame or the
  // same hotspot so the visual handoff does not interrupt exploration.
  useLayoutEffect(() => {
    const target = focusedTarget.current;
    if (!target) return;
    if (target.type === 'hotspot' && imageLoaded) {
      const escapedId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(target.id) : target.id.replace(/["\\]/g, '\\$&');
      const matchingHotspot = frame.current?.querySelector<HTMLButtonElement>(`[data-clue-id="${escapedId}"]`);
      if (matchingHotspot) {
        restoringFocus.current = true;
        matchingHotspot.focus({ preventScroll: true });
        restoringFocus.current = false;
        return;
      }
    }
    restoringFocus.current = true;
    frame.current?.focus({ preventScroll: true });
    restoringFocus.current = false;
  }, [sceneKey, imageLoaded]);

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const fit = imageLoaded && imageSize.width > 0 && imageSize.height > 0 && frameSize.width > 0 && frameSize.height > 0
    ? Math.min(frameSize.width / imageSize.width, frameSize.height / imageSize.height)
    : 0;
  const planeStyle: CSSProperties = fit > 0
    ? { width: imageSize.width * fit, height: imageSize.height * fit }
    : { width: 0, height: 0, visibility: 'hidden' };
  const routeActions: InvestigationAction[] = routes.map((route) => ({
    actionId: route.id,
    kind: route.actionKind ?? (route.kind === 'direction' ? 'move' : 'story'),
    target: route.target,
    label: route.label,
    state: route.actionState ?? (route.disabled ? 'completed' : 'ready'),
    reason: route.reason,
    relatedMaterials: route.relatedMaterials,
    onActivate: (trigger) => route.onActivate(trigger),
    onOpenMaterial: route.onOpenMaterial,
  }));

  return (
    <div className={'photo-viewport photo-viewport--' + transitionDirection + (explorationMode ? ' photo-viewport--exploration' : '')}>
      <div className={'photo-viewport__scene' + (handoffImage ? ' is-transitioning' : '')} key={sceneKey} style={{ '--scene-transition-ms': `${transitionMs}ms` } as CSSProperties} onFocusCapture={(event) => {
        if (restoringFocus.current) return;
        const target = event.target as HTMLElement;
        const marker = target.closest<HTMLButtonElement>('[data-clue-id]');
        focusedTarget.current = marker ? { type: 'hotspot', id: marker.dataset.clueId ?? '' } : target.classList.contains('photo-viewport__frame') ? { type: 'frame' } : null;
      }}>
        {handoffImage && <div className="photo-viewport__handoff" aria-hidden="true"><img src={handoffImage.url} alt="" style={{ aspectRatio: `${handoffImage.width} / ${handoffImage.height}` }} /></div>}
      <div
        ref={frame}
        className="photo-viewport__frame"
        tabIndex={0}
        aria-label={imageAlt + '。方向键平移，加减键缩放，0 复位。'}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          const step = 45;
          if (event.key === '+' || event.key === '=') changeZoom(zoom + 0.25);
          else if (event.key === '-') changeZoom(zoom - 0.25);
          else if (event.key === '0') { changeZoom(1); setOffset({ x: 0, y: 0 }); }
          else if (event.key.startsWith('Arrow')) {
            setOffset(bound({
              x: offset.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0),
              y: offset.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0),
            }));
          } else return;
          event.preventDefault();
        }}
        onWheel={(event) => { if (imageLoaded) changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2)); }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('button')) return;
          frame.current?.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          pinch.current = pointers.current.size === 2 ? distance() : null;
          pointerMoved.current = false;
        }}
        onPointerMove={(event) => {
          const prior = pointers.current.get(event.pointerId);
          if (!prior) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size >= 2 && imageLoaded) {
            const now = distance();
            if (pinch.current) changeZoom(zoom * now / pinch.current);
            pinch.current = now;
            pointerMoved.current = true;
          } else if (zoom > 1 && imageLoaded) {
            const dx = event.clientX - prior.x;
            const dy = event.clientY - prior.y;
            if (Math.abs(dx) + Math.abs(dy) > 0) {
              setOffset(bound({ x: offset.x + dx, y: offset.y + dy }));
              pointerMoved.current = true;
            }
          }
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = null;
          if (!pointerMoved.current && imageLoaded && event.target === frame.current) changeZoom(zoom === 1 ? 1.7 : 1);
        }}
        onPointerCancel={(event) => { pointers.current.delete(event.pointerId); pinch.current = null; }}
      >
        <div className="photo-viewport__world" style={{ transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + zoom + ')' }}>
          {imageUrl && <div className="photo-viewport__plane" style={planeStyle}>
            <img
              key={resourceKey}
              src={imageUrl}
              alt={imageLoaded ? imageAlt : ''}
              aria-hidden={!imageLoaded}
              draggable={false}
              data-resource-key={resourceKey}
              onLoad={(event) => {
                if (latestResourceKey.current !== resourceKey || event.currentTarget.dataset.resourceKey !== resourceKey) return;
                const expectedUrl = new URL(imageUrl!, document.baseURI).href;
                if (event.currentTarget.currentSrc && event.currentTarget.currentSrc !== expectedUrl) return;
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth <= 0 || naturalHeight <= 0) return;
                setImageSize({ width: naturalWidth, height: naturalHeight });
                latestLoadedImage.current = { url: imageUrl!, width: naturalWidth, height: naturalHeight };
                setLoadedResourceKey(resourceKey);
                setFailedResourceKey(null);
              }}
              onError={(event) => {
                if (latestResourceKey.current !== resourceKey || event.currentTarget.dataset.resourceKey !== resourceKey) return;
                const expectedUrl = new URL(imageUrl!, document.baseURI).href;
                if (event.currentTarget.currentSrc && event.currentTarget.currentSrc !== expectedUrl) return;
                setFailedResourceKey(resourceKey);
                setLoadedResourceKey(null);
                setImageSize({ width: 0, height: 0 });
              }}
            />
            {imageLoaded && hotspots.map((marker) => (
              <button
                key={marker.id}
                data-clue-id={marker.id}
                type="button"
                className={'photo-viewport__marker photo-viewport__marker--' + (marker.kind ?? 'object') + (marker.active ? ' photo-viewport__marker--active' : '')}
                style={{
                  '--marker-x': (marker.x * 100) + '%',
                  '--marker-y': (marker.y * 100) + '%',
                  '--marker-scale': 1 / zoom,
                } as CSSProperties}
                disabled={marker.disabled}
                title={marker.label}
                aria-label={marker.label}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => marker.onActivate(event.currentTarget)}
              >
                <span aria-hidden="true">{marker.kind === 'sound' ? '◖))' : marker.kind === 'memory' ? '◌' : '＋'}</span>
                <span className="photo-viewport__marker-label">{marker.label}</span>
              </button>
            ))}
            {imageLoaded && imageOverlay && <div className="photo-viewport__image-overlay">{imageOverlay}</div>}
          </div>}
        </div>
        {imageUrl && !imageLoaded && <div className="photo-viewport__load-state" role="status">{imageFailed ? `${imageAlt}载入失败。可从下方文字线索继续调查。` : `正在载入${imageAlt}…`}</div>}
        {!imageUrl && <div className="photo-viewport__missing" role="img" aria-label={imageAlt}>眼前的景象隐入暗处。可从文字线索继续调查</div>}
        <div className="photo-viewport__controls" aria-label="画面操作">
          <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="缩小">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(zoom + 0.25)} aria-label="放大">＋</button>
          <button type="button" onClick={() => { changeZoom(1); setOffset({ x: 0, y: 0 }); }}>复位</button>
        </div>
        {children && <div className="photo-viewport__overlay">{children}</div>}
      </div>
      </div>
      {routeActions.length > 0 && <div className="photo-viewport__fixed-operations"><InvestigationNavigation actions={routeActions} compact /></div>}
      {(!imageUrl || imageFailed || !imageLoaded) && hotspots.length > 0 && (
        <nav className="photo-viewport__fallback" aria-label="无图文字入口">
          {hotspots.map((marker) => (
            <button key={marker.id} type="button" disabled={marker.disabled} onClick={(event) => marker.onActivate(event.currentTarget)}>{marker.label}</button>
          ))}
        </nav>
      )}
    </div>
  );
}

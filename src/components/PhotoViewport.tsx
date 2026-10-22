import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { InvestigationNavigation } from './investigation/InvestigationNavigation';
import type { InvestigationAction, InvestigationActionKind, InvestigationActionState } from './investigation/types';
import './photoViewport.css';

export interface PhotoMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  kind?: 'object' | 'sound' | 'memory' | 'direction';
  presentation?: 'pin' | 'focus-box';
  /** Optional photo-normalized hit region, centered on x/y and scaled with the image. */
  region?: { width: number; height: number };
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
  /** Opt-in framing for a photo-led scene; all existing callers keep the uncropped contain default. */
  fit?: PhotoFit;
  /** Optional first view for a real photo-plane detail view. Coordinates are fractions of the image. */
  initialView?: { zoom: number; focus?: { x: number; y: number } };
  transitionDirection?: 'forward' | 'back' | 'fade';
  /** Exploration-only edge vignette; reading and comparison photos stay at their authored brightness. */
  explorationMode?: boolean;
  /** A slightly longer visual handoff for an already-authored key reveal. */
  revealBeat?: boolean;
  /** Show labels only on hover/focus and use an adjustment disclosure on small screens. */
  quietHotspotLabels?: boolean;
  /** Opt-in compact zoom controls for mobile photo stages; other callers keep the full toolbar. */
  compactMobileControls?: boolean;
  onImageAvailabilityChange?: (available: boolean) => void;
}
export type PhotoFit = 'contain' | 'cover';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const calculatePhotoPanLimits = (planeWidth: number, planeHeight: number, frameWidth: number, frameHeight: number, scale: number) => ({
  x: Math.max(0, (planeWidth * scale - frameWidth) / 2),
  y: Math.max(0, (planeHeight * scale - frameHeight) / 2),
});
export const calculatePhotoFitScale = (
  mode: PhotoFit,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
) => {
  if (imageWidth <= 0 || imageHeight <= 0 || frameWidth <= 0 || frameHeight <= 0) return 0;
  const horizontal = frameWidth / imageWidth;
  const vertical = frameHeight / imageHeight;
  return mode === 'cover' ? Math.max(horizontal, vertical) : Math.min(horizontal, vertical);
};
export const calculatePhotoInitialOffset = (
  planeWidth: number,
  planeHeight: number,
  frameWidth: number,
  frameHeight: number,
  scale: number,
  focus: { x: number; y: number },
) => {
  const limits = calculatePhotoPanLimits(planeWidth, planeHeight, frameWidth, frameHeight, scale);
  return {
    x: clamp((0.5 - focus.x) * planeWidth * scale, -limits.x, limits.x),
    y: clamp((0.5 - focus.y) * planeHeight * scale, -limits.y, limits.y),
  };
};

export function PhotoViewport({ sceneKey, imageUrl, imageAlt, hotspots, routes, children, imageOverlay, fit = 'contain', initialView, transitionDirection = 'forward', explorationMode = false, revealBeat = false, quietHotspotLabels = false, compactMobileControls = false, onImageAvailabilityChange }: PhotoViewportProps) {
  const [zoom, setZoom] = useState(1);
  const [fullImageView, setFullImageView] = useState(false);
  const [compactViewport, setCompactViewport] = useState(() => compactMobileControls && typeof window !== 'undefined' && window.matchMedia?.('(max-width: 600px)').matches === true);
  const [adjustmentsOpen, setAdjustmentsOpen] = useState(false);
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
  const effectiveFit = fullImageView ? 'contain' : fit;
  const imageFailed = Boolean(imageUrl && failedResourceKey === resourceKey);
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const markerGestures = useRef(new Map<number, { markerId: string; startX: number; startY: number; lastX: number; lastY: number; moved: boolean }>());
  const suppressedMarkerClicks = useRef(new Set<string>());
  const markerClickTimers = useRef(new Map<string, number>());
  const pinch = useRef<number | null>(null);
  const pointerMoved = useRef(false);
  const previousResourceKey = useRef(resourceKey);
  const latestLoadedImage = useRef<{ url: string; width: number; height: number } | null>(null);
  const focusedTarget = useRef<{ type: 'frame' } | { type: 'hotspot'; id: string } | null>(null);
  const restoringFocus = useRef(false);
  const handoffTimer = useRef<number | null>(null);
  const initialViewAppliedResource = useRef<string | null>(null);
  const transitionMs = revealBeat ? 420 : 260;

  useEffect(() => {
    if (!compactMobileControls || typeof window === 'undefined') return;
    if (typeof window.matchMedia !== 'function') {
      setCompactViewport(window.innerWidth <= 600);
      return;
    }
    const media = window.matchMedia('(max-width: 600px)');
    const update = () => {
      setCompactViewport(media.matches);
      if (media.matches) setAdjustmentsOpen(false);
    };
    update();
    if (media.addEventListener) media.addEventListener('change', update);
    else media.addListener(update);
    return () => {
      if (media.removeEventListener) media.removeEventListener('change', update);
      else media.removeListener(update);
    };
  }, [compactMobileControls]);

  useEffect(() => { if (compactMobileControls) setAdjustmentsOpen(false); }, [sceneKey, compactMobileControls]);

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
      ? calculatePhotoFitScale(effectiveFit, imageSize.width, imageSize.height, width, height)
      : 0;
    const planeWidth = imageSize.width * currentFit;
    const planeHeight = imageSize.height * currentFit;
    // Bounds follow the exact plane used for this selected fit, per axis.
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
    setFullImageView(false);
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
  useEffect(() => {
    if (!initialView || !imageLoaded || frameSize.width <= 0 || frameSize.height <= 0 || initialViewAppliedResource.current === resourceKey) return;
    const nextZoom = clamp(initialView.zoom, 1, 3);
    const imageFit = calculatePhotoFitScale(effectiveFit, imageSize.width, imageSize.height, frameSize.width, frameSize.height);
    const focus = initialView.focus ?? { x: 0.5, y: 0.5 };
    const nextOffset = calculatePhotoInitialOffset(
      imageSize.width * imageFit,
      imageSize.height * imageFit,
      frameSize.width,
      frameSize.height,
      nextZoom,
      { x: clamp(focus.x, 0, 1), y: clamp(focus.y, 0, 1) },
    );
    setZoom(nextZoom);
    setOffset(bound(nextOffset, nextZoom));
    initialViewAppliedResource.current = resourceKey;
  }, [initialView, imageLoaded, imageSize.width, imageSize.height, frameSize.width, frameSize.height, resourceKey, effectiveFit]);

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
    for (const timer of markerClickTimers.current.values()) window.clearTimeout(timer);
    markerClickTimers.current.clear();
    markerGestures.current.clear();
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
  const fitScale = imageLoaded && imageSize.width > 0 && imageSize.height > 0 && frameSize.width > 0 && frameSize.height > 0
    ? calculatePhotoFitScale(effectiveFit, imageSize.width, imageSize.height, frameSize.width, frameSize.height)
    : 0;
  const currentPanLimits = calculatePhotoPanLimits(
    imageSize.width * fitScale,
    imageSize.height * fitScale,
    frameSize.width,
    frameSize.height,
    zoom,
  );
  const planeStyle: CSSProperties = fitScale > 0
    ? { width: imageSize.width * fitScale, height: imageSize.height * fitScale }
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
  const ensureMarkerVisible = (marker: HTMLButtonElement) => {
    if (effectiveFit !== 'cover' && marker.dataset.region !== 'true') return;
    const frameRect = frame.current?.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    if (!frameRect || frameRect.width <= 0 || frameRect.height <= 0) return;
    const inset = 10;
    const label = marker.querySelector<HTMLElement>('.photo-viewport__marker-label');
    const labelRect = label?.getBoundingClientRect();
    const labelVisible = quietHotspotLabels && label && getComputedStyle(label).display !== 'none' && labelRect && labelRect.width > 0 && labelRect.height > 0;
    const oversizedRegion = Boolean(marker.dataset.region === 'true'
      && (markerRect.width > frameRect.width - inset * 2 || markerRect.height > frameRect.height - inset * 2));
    let targetRect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom'> = markerRect;
    if (oversizedRegion) {
      if (labelVisible && labelRect) targetRect = labelRect;
      else {
        const centerX = markerRect.left + markerRect.width / 2;
        const centerY = markerRect.top + markerRect.height / 2;
        targetRect = { left: centerX - 22, right: centerX + 22, top: centerY - 22, bottom: centerY + 22 };
      }
    } else if (labelVisible && labelRect) {
      targetRect = {
        left: Math.min(markerRect.left, labelRect.left),
        right: Math.max(markerRect.right, labelRect.right),
        top: Math.min(markerRect.top, labelRect.top),
        bottom: Math.max(markerRect.bottom, labelRect.bottom),
      };
    }
    const dx = targetRect.left < frameRect.left + inset
      ? frameRect.left + inset - targetRect.left
      : targetRect.right > frameRect.right - inset
        ? frameRect.right - inset - targetRect.right
        : 0;
    const dy = targetRect.top < frameRect.top + inset
      ? frameRect.top + inset - targetRect.top
      : targetRect.bottom > frameRect.bottom - inset
        ? frameRect.bottom - inset - targetRect.bottom
        : 0;
    if ((dx || dy) && (effectiveFit === 'cover' || marker.dataset.region === 'true')) setOffset((previous) => {
      const markerMarginX = labelVisible && labelRect ? Math.max(38, labelRect.width / 2 + 8) : 38;
      const markerMarginY = labelVisible && labelRect ? Math.max(38, labelRect.height + 8) : 38;
      return {
        x: clamp(previous.x + dx, -currentPanLimits.x - markerMarginX, currentPanLimits.x + markerMarginX),
        y: clamp(previous.y + dy, -currentPanLimits.y - markerMarginY, currentPanLimits.y + markerMarginY),
      };
    });
  };
  const beginMarkerGesture = (event: ReactPointerEvent<HTMLButtonElement>, marker: PhotoMarker) => {
    event.stopPropagation();
    if (!marker.region || (typeof event.button === 'number' && event.button !== 0)) return;
    const oldTimer = markerClickTimers.current.get(marker.id);
    if (oldTimer !== undefined) window.clearTimeout(oldTimer);
    markerClickTimers.current.delete(marker.id);
    suppressedMarkerClicks.current.delete(marker.id);
    if (pointers.current.size === 0) pointerMoved.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch.current = pointers.current.size === 2 ? distance() : null;
    markerGestures.current.set(event.pointerId, {
      markerId: marker.id,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
    });
    if (pointers.current.size > 1) {
      pointerMoved.current = true;
      for (const activeGesture of markerGestures.current.values()) activeGesture.moved = true;
    }
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional in older browsers. */ }
  };
  const moveMarkerGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const gesture = markerGestures.current.get(event.pointerId);
    if (!gesture) return;
    event.stopPropagation();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2 && imageLoaded) {
      const now = distance();
      if (pinch.current && pinch.current > 0) changeZoom(zoom * now / pinch.current);
      pinch.current = now;
      pointerMoved.current = true;
      for (const [pointerId, activeGesture] of markerGestures.current) {
        activeGesture.moved = true;
        const point = pointers.current.get(pointerId);
        if (point) { activeGesture.lastX = point.x; activeGesture.lastY = point.y; }
      }
      event.preventDefault();
      return;
    }
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    if (!gesture.moved && Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) < 7) return;
    gesture.moved = true;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    event.preventDefault();
    setOffset((previous) => bound({ x: previous.x + dx, y: previous.y + dy }));
  };
  const endMarkerGesture = (event: ReactPointerEvent<HTMLButtonElement>, canceled = false) => {
    const gesture = markerGestures.current.get(event.pointerId);
    if (!gesture) return;
    event.stopPropagation();
    markerGestures.current.delete(event.pointerId);
    pointers.current.delete(event.pointerId);
    pinch.current = null;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* Capture may already be released. */ }
    if (!gesture.moved || canceled) return;
    event.preventDefault();
    suppressedMarkerClicks.current.add(gesture.markerId);
    const oldTimer = markerClickTimers.current.get(gesture.markerId);
    if (oldTimer !== undefined) window.clearTimeout(oldTimer);
    markerClickTimers.current.set(gesture.markerId, window.setTimeout(() => {
      suppressedMarkerClicks.current.delete(gesture.markerId);
      markerClickTimers.current.delete(gesture.markerId);
    }, 450));
  };
  const activateMarker = (event: ReactMouseEvent<HTMLButtonElement>, marker: PhotoMarker) => {
    if (event.detail > 0 && suppressedMarkerClicks.current.has(marker.id)) {
      event.preventDefault();
      event.stopPropagation();
      suppressedMarkerClicks.current.delete(marker.id);
      const timer = markerClickTimers.current.get(marker.id);
      if (timer !== undefined) window.clearTimeout(timer);
      markerClickTimers.current.delete(marker.id);
      return;
    }
    marker.onActivate(event.currentTarget);
  };

  return (
    <div className={'photo-viewport photo-viewport--' + transitionDirection + (explorationMode ? ' photo-viewport--exploration' : '') + (effectiveFit === 'cover' ? ' photo-viewport--cover' : '') + (quietHotspotLabels ? ' photo-viewport--quiet-hotspot-labels' : '')}>
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
          else if (event.key === '0') { setFullImageView(false); changeZoom(1); setOffset({ x: 0, y: 0 }); }
          else if (event.key.startsWith('Arrow')) {
            setOffset(bound({
              x: offset.x + (event.key === 'ArrowLeft' ? step : event.key === 'ArrowRight' ? -step : 0),
              y: offset.y + (event.key === 'ArrowUp' ? step : event.key === 'ArrowDown' ? -step : 0),
            }));
          } else return;
          event.preventDefault();
        }}
        onWheel={(event) => {
          if ((event.target as HTMLElement).closest('[data-photo-control]')) return;
          if (imageLoaded) changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2));
        }}
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest('button, summary, a, input, select, textarea, [role="button"], [data-photo-control]')) return;
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
          } else if (imageLoaded && (zoom > 1 || currentPanLimits.x > 0 || currentPanLimits.y > 0)) {
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
                data-region={marker.region ? 'true' : undefined}
                type="button"
                className={'photo-viewport__marker photo-viewport__marker--' + (marker.kind ?? 'object') + (marker.presentation === 'focus-box' ? ' photo-viewport__marker--focus-box' : '') + (marker.region ? ' photo-viewport__marker--region' : '') + (marker.active ? ' photo-viewport__marker--active' : '')}
                style={{
                  '--marker-x': (marker.x * 100) + '%',
                  '--marker-y': (marker.y * 100) + '%',
                  '--marker-scale': marker.region ? 1 : 1 / zoom,
                  ...(marker.region ? {
                    '--marker-region-width': (marker.region.width * 100) + '%',
                    '--marker-region-height': (marker.region.height * 100) + '%',
                    '--marker-hit-size': (44 / zoom) + 'px',
                    '--marker-label-scale': 1 / zoom,
                    '--marker-label-left': marker.x < 0.18 ? '0%' : marker.x > 0.82 ? '100%' : '50%',
                    '--marker-label-shift-x': marker.x < 0.18 ? '0%' : marker.x > 0.82 ? '-100%' : '-50%',
                    '--marker-label-top': marker.y > 0.82 ? 'auto' : 'calc(100% + 2px)',
                    '--marker-label-bottom': marker.y > 0.82 ? 'calc(100% + 2px)' : 'auto',
                    '--marker-label-origin': marker.y > 0.82
                      ? marker.x < 0.18 ? 'bottom left' : marker.x > 0.82 ? 'bottom right' : 'bottom center'
                      : marker.x < 0.18 ? 'top left' : marker.x > 0.82 ? 'top right' : 'top center',
                  } : {}),
                } as CSSProperties}
                disabled={marker.disabled}
                title={marker.label}
                aria-label={marker.label}
                onPointerDown={(event) => beginMarkerGesture(event, marker)}
                onPointerMove={moveMarkerGesture}
                onPointerUp={(event) => endMarkerGesture(event)}
                onPointerCancel={(event) => endMarkerGesture(event, true)}
                onLostPointerCapture={(event) => {
                  markerGestures.current.delete(event.pointerId);
                  pointers.current.delete(event.pointerId);
                  pinch.current = null;
                }}
                onFocus={(event) => ensureMarkerVisible(event.currentTarget)}
                onClick={(event) => activateMarker(event, marker)}
              >
                <span aria-hidden="true">{marker.presentation === 'focus-box' ? '＋' : marker.kind === 'sound' ? '◖))' : marker.kind === 'memory' ? '◌' : '＋'}</span>
                <span className="photo-viewport__marker-label">{marker.label}</span>
              </button>
            ))}
            {imageLoaded && imageOverlay && <div className="photo-viewport__image-overlay">{imageOverlay}</div>}
          </div>}
        </div>
        {imageUrl && !imageLoaded && <div className="photo-viewport__load-state" role="status">{imageFailed ? `${imageAlt}载入失败。可从下方文字线索继续调查。` : `正在载入${imageAlt}…`}</div>}
        {!imageUrl && <div className="photo-viewport__missing" role="img" aria-label={imageAlt}>眼前的景象隐入暗处。可从文字线索继续调查</div>}
        <div className={'photo-viewport__controls' + (compactMobileControls ? ' photo-viewport__controls--compact-mobile' : '')} aria-label="画面操作" data-photo-control={compactMobileControls ? true : undefined}>
          {compactMobileControls ? <>
            <button type="button" className={fit === 'cover' ? 'photo-viewport__zoom-in' : undefined} onClick={() => changeZoom(zoom + 0.25)} aria-label={fit === 'cover' ? '放大画面' : '放大'} title={fit === 'cover' ? '放大画面' : undefined}>{fit === 'cover' ? '放大' : '＋'}</button>
            {fit === 'cover' && <button type="button" className="photo-viewport__full-image" aria-pressed={fullImageView} onClick={() => { setFullImageView((current) => !current); setZoom(1); setOffset({ x: 0, y: 0 }); }}>{fullImageView ? '铺满画面' : '全图查看'}</button>}
            <details
              className="photo-viewport__adjustments"
              open={!compactViewport || adjustmentsOpen}
              onToggle={(event) => {
                if (compactViewport) setAdjustmentsOpen(event.currentTarget.open);
              }}
            >
              <summary aria-label={adjustmentsOpen ? '关闭缩放调节' : '打开缩放调节'}>调节</summary>
              <div className="photo-viewport__adjustment-panel">
                <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="缩小">−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => { setFullImageView(false); changeZoom(1); setOffset({ x: 0, y: 0 }); }}>复位</button>
              </div>
            </details>
          </> : <>
            <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="缩小">−</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" className={fit === 'cover' ? 'photo-viewport__zoom-in' : undefined} onClick={() => changeZoom(zoom + 0.25)} aria-label={fit === 'cover' ? '放大画面' : '放大'} title={fit === 'cover' ? '放大画面' : undefined}>{fit === 'cover' ? '放大' : '＋'}</button>
            {fit === 'cover' && <button type="button" aria-pressed={fullImageView} onClick={() => { setFullImageView((current) => !current); setZoom(1); setOffset({ x: 0, y: 0 }); }}>{fullImageView ? '铺满画面' : '全图查看'}</button>}
            <button type="button" onClick={() => { setFullImageView(false); changeZoom(1); setOffset({ x: 0, y: 0 }); }}>复位</button>
          </>}
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

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  transitionDirection?: 'forward' | 'back' | 'fade';
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function PhotoViewport({ sceneKey, imageUrl, imageAlt, hotspots, routes, children, transitionDirection = 'forward' }: PhotoViewportProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const pointerMoved = useRef(false);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      setFrameSize({ width: bounds.width, height: bounds.height });
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const bound = (next: { x: number; y: number }, scale = zoom) => {
    const box = frame.current?.getBoundingClientRect();
    return {
      x: clamp(next.x, -(box?.width ?? 0) * (scale - 1) / 2, (box?.width ?? 0) * (scale - 1) / 2),
      y: clamp(next.y, -(box?.height ?? 0) * (scale - 1) / 2, (box?.height ?? 0) * (scale - 1) / 2),
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

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const fit = imageSize.width > 0 && imageSize.height > 0 && frameSize.width > 0 && frameSize.height > 0
    ? Math.min(frameSize.width / imageSize.width, frameSize.height / imageSize.height)
    : 0;
  const planeStyle: CSSProperties = fit > 0
    ? { width: imageSize.width * fit, height: imageSize.height * fit }
    : { width: '100%', height: '100%' };
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
    <div className={'photo-viewport photo-viewport--' + transitionDirection} key={sceneKey}>
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
        onWheel={(event) => { if (imageUrl) changeZoom(zoom + (event.deltaY < 0 ? 0.2 : -0.2)); }}
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
          if (pointers.current.size >= 2) {
            const now = distance();
            if (pinch.current) changeZoom(zoom * now / pinch.current);
            pinch.current = now;
            pointerMoved.current = true;
          } else if (zoom > 1) {
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
          if (!pointerMoved.current && event.target === frame.current) changeZoom(zoom === 1 ? 1.7 : 1);
        }}
        onPointerCancel={(event) => { pointers.current.delete(event.pointerId); pinch.current = null; }}
      >
        <div className="photo-viewport__world" style={{ transform: 'translate(' + offset.x + 'px, ' + offset.y + 'px) scale(' + zoom + ')' }}>
          <div className="photo-viewport__plane" style={planeStyle}>
            {imageUrl
              ? <img
                  src={imageUrl}
                  alt={imageAlt}
                  draggable={false}
                  onLoad={(event) => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
                />
              : <div className="photo-viewport__missing" role="img" aria-label={imageAlt}>眼前的景象隐入暗处。可从文字线索继续调查</div>}
            {imageUrl && hotspots.map((marker) => (
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
          </div>
        </div>
        <div className="photo-viewport__controls" aria-label="画面操作">
          <button type="button" onClick={() => changeZoom(zoom - 0.25)} aria-label="缩小">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => changeZoom(zoom + 0.25)} aria-label="放大">＋</button>
          <button type="button" onClick={() => { changeZoom(1); setOffset({ x: 0, y: 0 }); }}>复位</button>
        </div>
        {children && <div className="photo-viewport__overlay">{children}</div>}
      </div>
      {routeActions.length > 0 && <div className="photo-viewport__fixed-operations"><InvestigationNavigation actions={routeActions} compact /></div>}
      {!imageUrl && hotspots.length > 0 && (
        <nav className="photo-viewport__fallback" aria-label="无图文字入口">
          {hotspots.map((marker) => (
            <button key={marker.id} type="button" disabled={marker.disabled} onClick={(event) => marker.onActivate(event.currentTarget)}>{marker.label}</button>
          ))}
        </nav>
      )}
    </div>
  );
}
